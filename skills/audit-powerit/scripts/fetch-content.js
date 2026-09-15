#!/usr/bin/env node
/**
 * fetch-content.js
 * Recupera TUTTI i contenuti pubblicati da poweritlucegas.it via REST API pubblica.
 * Sola lettura: nessuna credenziale richiesta, nessuna scrittura possibile da questo script.
 *
 * Usage: node fetch-content.js <tipo> [query] [--no-cache]
 *
 * Esempi:
 *   node fetch-content.js faq
 *   node fetch-content.js posts bolletta
 *   node fetch-content.js llms-check
 */

const os = require('os');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');

const DEFAULT_SITE_URL = 'https://poweritlucegas.it';
const WP_SITE_URL = (process.env.WP_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, '');

const TYPE_ENDPOINTS = {
  posts:      '/wp/v2/posts',
  pages:      '/wp/v2/pages',
  faq:        '/wp/v2/faq',
  faqs:       '/wp/v2/faqs',
  categories: '/wp/v2/categories',
  tags:       '/wp/v2/tags',
};

// Campi da chiedere per tipo. Le FAQ di questo sito usano un campo ACF
// (risposta_faq) invece del campo content standard — va richiesto esplicitamente.
// yoast_head_json è incluso ovunque: nessuna chiamata di rete in più, ma dà
// accesso a meta title/description reali e allo schema JSON-LD completo.
const FIELDS_BY_TYPE = {
  faq:  'id,slug,link,title,modified,date,acf,yoast_head_json',
  faqs: 'id,slug,link,title,modified,date,acf,yoast_head_json',
  default: 'id,title,content,excerpt,slug,link,modified,date,status,type,categories,tags,yoast_head_json',
};

// --- Cache locale (solo dati pubblici, TTL breve, in temp dir di sistema) ---
const CACHE_SCHEMA_VERSION = 1; // bump quando cambia la forma dei dati normalizzati
const CACHE_TTL_MS = parseInt(process.env.WP_AUDIT_CACHE_TTL_MS || '', 10) || 10 * 60 * 1000; // 10 min
const CACHE_DISABLED = process.env.WP_AUDIT_NO_CACHE === '1' || process.argv.includes('--no-cache');
const CACHE_DIR = path.join(os.tmpdir(), 'power-wp-audit-cache');

function cacheKeyFor(endpoint, params) {
  const raw = JSON.stringify({ v: CACHE_SCHEMA_VERSION, site: WP_SITE_URL, endpoint, params });
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function readCache(key) {
  if (CACHE_DISABLED) return null;
  try {
    const raw = await fs.readFile(path.join(CACHE_DIR, `${key}.json`), 'utf8');
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null; // cache assente/corrotta: fallback trasparente al fetch di rete
  }
}

async function writeCache(key, data) {
  if (CACHE_DISABLED) return;
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(path.join(CACHE_DIR, `${key}.json`), JSON.stringify({ cachedAt: Date.now(), data }));
  } catch (err) {
    console.error(`Avviso: cache locale non scrivibile (${err.message}) — proseguo senza cache.`);
  }
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// --- Estrazione schema JSON-LD da yoast_head_json (nessuna chiamata aggiuntiva) ---
function extractSchemaTypes(yoastHeadJson) {
  const graph = yoastHeadJson?.schema?.['@graph'];
  if (!Array.isArray(graph)) return [];
  const types = new Set();
  for (const node of graph) {
    const t = node?.['@type'];
    if (Array.isArray(t)) {
      t.forEach(x => typeof x === 'string' && types.add(x));
    } else if (typeof t === 'string') {
      types.add(t);
    }
  }
  return Array.from(types);
}

function extractFaqSchemaDetail(yoastHeadJson) {
  const graph = yoastHeadJson?.schema?.['@graph'];
  if (!Array.isArray(graph)) return { has_faqpage: false, question_count: 0 };
  const faqNode = graph.find(n => {
    const t = n?.['@type'];
    return t === 'FAQPage' || (Array.isArray(t) && t.includes('FAQPage'));
  });
  if (!faqNode) return { has_faqpage: false, question_count: 0 };
  const questions = Array.isArray(faqNode.mainEntity) ? faqNode.mainEntity : [];
  const question_count = questions.filter(q => q?.['@type'] === 'Question' && q?.acceptedAnswer?.text).length;
  return { has_faqpage: true, question_count };
}

async function wpFetchPage(endpoint, params, page) {
  const url = new URL(`${WP_SITE_URL}/wp-json${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, value);
  }
  url.searchParams.set('per_page', '100');
  url.searchParams.set('page', String(page));

  const response = await fetch(url.toString(), {
    headers: { 'Content-Type': 'application/json' }, // nessuna Authorization: lettura pubblica
  });

  if (!response.ok) {
    const body = await response.text();
    const err = new Error(`WP API ${response.status}: ${body.slice(0, 200)}`);
    err.status = response.status;
    throw err;
  }

  const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1', 10);
  const data = await response.json();
  return { data, totalPages };
}

async function wpFetchAll(endpoint, params) {
  let page = 1;
  let all = [];
  let totalPages = 1;
  while (page <= totalPages) {
    const result = await wpFetchPage(endpoint, params, page);
    all = all.concat(result.data);
    totalPages = result.totalPages || 1;
    page++;
    if (page <= totalPages) await new Promise(r => setTimeout(r, 150)); // rate limiting rispettoso
  }
  return all;
}

// --- Controllo llms.txt (una tantum per esecuzione, non per elemento) ---
async function checkLlmsTxt() {
  const url = `${WP_SITE_URL}/llms.txt`;
  const result = {
    present: false, url, http_status: null,
    last_updated: null, update_frequency: null,
    days_since_update: null, stale: null, note: null,
  };
  let response;
  try {
    response = await fetch(url);
  } catch (err) {
    result.note = `Impossibile raggiungere ${url}: ${err.message}`;
    return result;
  }
  result.http_status = response.status;
  if (!response.ok) {
    result.note = response.status === 404
      ? 'llms.txt assente sul sito (segnale informativo/emergente, non un problema SEO critico).'
      : `Risposta inattesa (${response.status}) su ${url}.`;
    return result;
  }
  result.present = true;
  const text = await response.text();
  const fmMatch = text.match(/^---\s*([\s\S]*?)\s*---/);
  const frontmatter = fmMatch ? fmMatch[1] : '';
  const getField = (name) => {
    const m = frontmatter.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
  };
  result.last_updated = getField('last_updated');
  result.update_frequency = getField('update_frequency');

  if (result.last_updated) {
    const lastDate = new Date(result.last_updated);
    if (!isNaN(lastDate.getTime())) {
      const days = Math.floor((Date.now() - lastDate.getTime()) / 86400000);
      result.days_since_update = days;
      const thresholdDays = {
        daily: 2, weekly: 10, monthly: 45, quarterly: 100, yearly: 400,
      }[String(result.update_frequency || '').toLowerCase()] ?? 90;
      result.stale = days > thresholdDays;
      result.note = result.stale
        ? `Ultimo aggiornamento dichiarato ${days} giorni fa, oltre la soglia attesa per frequenza "${result.update_frequency}".`
        : `Aggiornato entro la frequenza dichiarata ("${result.update_frequency}").`;
    }
  } else {
    result.note = 'Campo last_updated non trovato nel frontmatter di llms.txt.';
  }
  return result;
}

async function main() {
  const args = process.argv.slice(2).filter(a => a !== '--no-cache');
  const tipo = (args[0] || '').toLowerCase();

  if (!tipo) {
    console.error('Usage: node fetch-content.js <tipo> [query] [--no-cache]');
    console.error('Tipi disponibili:', Object.keys(TYPE_ENDPOINTS).join(', '), ', llms-check');
    process.exit(1);
  }

  // Pseudo-tipo: controllo llms.txt, una tantum, non legato a un endpoint di contenuto
  if (tipo === 'llms-check') {
    const cacheKey = cacheKeyFor('llms-check', {});
    let result = await readCache(cacheKey);
    if (result) {
      console.error('llms-check servito da cache locale (TTL 10 min).');
    } else {
      result = await checkLlmsTxt();
      await writeCache(cacheKey, result);
    }
    console.error(`llms.txt: ${result.present ? 'presente' : 'assente'} (${result.http_status ?? 'errore rete'}).`);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const query = args.slice(1).join(' ') || null;
  const endpoint = TYPE_ENDPOINTS[tipo];
  if (!endpoint) {
    console.error(`Tipo "${tipo}" non riconosciuto.`);
    console.error('Tipi standard:', Object.keys(TYPE_ENDPOINTS).join(', '), ', llms-check');
    console.error('Per custom post type, usa lo slug del CPT (es. "faq").');
    process.exit(1);
  }

  console.error(`Recupero contenuti tipo "${tipo}" da ${WP_SITE_URL} (lettura pubblica, nessuna credenziale)...`);
  if (query) console.error(`Filtro: "${query}"`);

  const fields = FIELDS_BY_TYPE[tipo] || FIELDS_BY_TYPE.default;
  const params = { search: query || undefined, status: 'publish', _fields: fields };
  const cacheKey = cacheKeyFor(endpoint, params);

  let items = await readCache(cacheKey);
  if (items) {
    console.error('Dati serviti da cache locale (TTL 10 min) — usa --no-cache per forzare il refresh.');
  } else {
    try {
      items = await wpFetchAll(endpoint, params);
    } catch (err) {
      if (err.status === 404) {
        console.error(`Endpoint "${endpoint}" non trovato (404). Il post type potrebbe non avere show_in_rest attivo, oppure usare uno slug diverso.`);
        console.error(`Verifica su: ${WP_SITE_URL}/wp-json/wp/v2/types`);
      } else if (err.status === 400) {
        console.error(`Richiesta non valida (400) — possibile filtro/query non supportato dall'endpoint.`);
      } else {
        console.error('Errore durante il fetch:', err.message);
      }
      process.exit(1);
    }
    await writeCache(cacheKey, items);
  }

  if (!items || items.length === 0) {
    console.error(`Nessun elemento trovato per tipo "${tipo}"${query ? ` con query "${query}"` : ''}.`);
    console.log(JSON.stringify([]));
    return;
  }

  const isFaq = tipo === 'faq' || tipo === 'faqs';
  const normalized = items.map(item => {
    const rawContent = isFaq
      ? (item.acf?.risposta_faq || '')
      : (item.content?.rendered || '');
    const testo = stripHtml(rawContent);
    const yh = item.yoast_head_json || null;
    const faqDetail = isFaq ? extractFaqSchemaDetail(yh) : null;
    return {
      wp_id: item.id,
      tipo: item.type || tipo,
      slug: item.slug,
      url: item.link,
      titolo: stripHtml(item.title?.rendered || ''),
      contenuto_html: rawContent,
      contenuto_testo: testo,
      parole: testo ? testo.split(/\s+/).filter(Boolean).length : 0,
      data_pubblicazione: item.date?.split('T')[0] || null,
      ultima_modifica: item.modified?.split('T')[0] || 'N/D',
      categorie: item.categories || item['faq-category'] || undefined,
      meta_title: yh?.title || null,
      meta_description: yh?.description || null,
      schema_types: extractSchemaTypes(yh),
      schema_faq_question_count: faqDetail ? faqDetail.question_count : null,
    };
  });

  console.error(`${normalized.length} elementi recuperati (tutte le pagine).`);
  console.log(JSON.stringify(normalized, null, 2));
}

main().catch(err => {
  console.error('Errore:', err.message);
  process.exit(1);
});
