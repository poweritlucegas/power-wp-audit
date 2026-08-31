#!/usr/bin/env node
/**
 * fetch-content.js
 * Recupera TUTTI i contenuti pubblicati da poweritlucegas.it via REST API pubblica.
 * Sola lettura: nessuna credenziale richiesta, nessuna scrittura possibile da questo script.
 *
 * Usage: node fetch-content.js <tipo> [query]
 *
 * Esempi:
 *   node fetch-content.js faq
 *   node fetch-content.js posts bolletta
 */

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
const FIELDS_BY_TYPE = {
  faq:  'id,slug,link,title,modified,date,acf',
  faqs: 'id,slug,link,title,modified,date,acf',
  default: 'id,title,content,excerpt,slug,link,modified,date,status,type,categories,tags',
};

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
  const total = parseInt(response.headers.get('X-WP-Total') || '0', 10);
  const data = await response.json();
  return { data, totalPages, total };
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

async function main() {
  const args = process.argv.slice(2);
  const tipo = (args[0] || '').toLowerCase();
  const query = args.slice(1).join(' ') || null;

  if (!tipo) {
    console.error('Usage: node fetch-content.js <tipo> [query]');
    console.error('Tipi disponibili:', Object.keys(TYPE_ENDPOINTS).join(', '));
    process.exit(1);
  }

  const endpoint = TYPE_ENDPOINTS[tipo];
  if (!endpoint) {
    console.error(`Tipo "${tipo}" non riconosciuto.`);
    console.error('Tipi standard:', Object.keys(TYPE_ENDPOINTS).join(', '));
    console.error('Per custom post type, usa lo slug del CPT (es. "faq").');
    process.exit(1);
  }

  console.error(`Recupero contenuti tipo "${tipo}" da ${WP_SITE_URL} (lettura pubblica, nessuna credenziale)...`);
  if (query) console.error(`Filtro: "${query}"`);

  const fields = FIELDS_BY_TYPE[tipo] || FIELDS_BY_TYPE.default;
  let items;
  try {
    items = await wpFetchAll(endpoint, {
      search: query || undefined,
      status: 'publish',
      _fields: fields,
    });
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
    };
  });

  console.error(`${normalized.length} elementi recuperati (tutte le pagine).`);
  console.log(JSON.stringify(normalized, null, 2));
}

main().catch(err => {
  console.error('Errore:', err.message);
  process.exit(1);
});
