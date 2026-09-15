---
name: audit-powerit
description: Recupera e analizza i contenuti pubblicati su poweritlucegas.it (FAQ e articoli) via API REST pubblica di WordPress — SEO, schema markup, meta tag, citabilità per i motori di risposta (AEO) e per i motori generativi (GEO), incluse le AI Overviews di Google (AIO). Sola lettura: nessuna credenziale richiesta, nessuna modifica al sito. Attivare con "/power-wp-audit:audit-powerit [tipo]", "analizza le FAQ del sito", "controlla lo schema markup", "controlla i meta tag", "controlla i contenuti di tipo X", "suggerisci keyword per le pagine", "revisione contenuti WordPress".
when_to_use: analizza contenuti sito, revisione FAQ, suggerisci keyword, audit pagine WordPress, ottimizza per AI citation, controllo qualità contenuti, controllo schema markup, controllo meta title meta description, verifica llms.txt, ottimizzazione AI Overviews, GEO, AEO, AIO, topic cluster, link building interno
allowed-tools: Bash(node:*), WebFetch
---

# Power WP Audit

Skill di **sola lettura** per analizzare i contenuti pubblicati su poweritlucegas.it (FAQ e articoli/post) tramite l'API REST pubblica di WordPress.

## Modello di permessi

Questa skill non richiede e non usa mai alcuna credenziale WordPress: il sito espone pubblicamente in lettura i contenuti già pubblicati (verificato — `status=publish`; bozze e contenuti privati restano invisibili). Non esiste, in questo plugin, alcuna capacità di scrivere o pubblicare sul sito: la pubblicazione è gestita da uno strumento separato, riservato al proprietario del sito. Questa skill non può in alcun modo modificare poweritlucegas.it.

## Terminologia — non sono sinonimi

- **SEO**: farsi trovare e posizionare nei motori di ricerca tradizionali (KPI: posizionamento, traffico organico).
- **AEO (Answer Engine Optimization)**: farsi estrarre come risposta diretta da un motore di risposta qualunque — Perplexity, ricerca vocale, featured snippet (KPI: featured snippet ottenuti, copertura domande).
- **GEO (Generative Engine Optimization)**: farsi citare/raccomandare dai motori generativi (ChatGPT, Gemini, Perplexity) come fonte (KPI: citazioni e sentiment nelle risposte AI). È per l'80% disciplina strategica/di brand e per il 20% tecnica — qui copriamo la parte tecnica verificabile dal contenuto.
- **AIO**: le AI Overviews di Google nello specifico — un'implementazione particolare di AEO/GEO su Google, non un sinonimo generico dei due.

Il report finale (Fase 4) deve etichettare ogni finding con l'asse di appartenenza (SEO / AEO / GEO), non un bucket unico.

## When to use

Attivare quando l'utente:
- Scrive `/power-wp-audit:audit-powerit [tipo]` (o la forma breve `/audit-powerit [tipo]`) con un tipo di contenuto (`faq`, `posts`, `pages`)
- Vuole "analizzare le FAQ", "revisionare gli articoli", "controllare la qualità dei contenuti"
- Vuole keyword suggerite partendo dal contenuto esistente
- Vuole controllare schema markup, meta title/description
- Vuole ottimizzare contenuti per le citazioni nei motori AI (AI Overviews, Perplexity, ChatGPT) o per GEO/AEO
- Vuole suggerimenti di link building interno o di architettura a topic cluster

Non attivare se l'utente vuole pubblicare/modificare contenuti sul sito — questa capacità non è disponibile qui; indirizzarlo al proprietario del sito.

**Fuori scope (deliberatamente)**: Core Web Vitals, velocità di caricamento, crawlability tecnica del sito — sono coperti da un'altra skill dedicata (`wl-check`). Questa skill resta focalizzata su qualità/struttura/citabilità dei contenuti, non su infrastruttura/performance tecnica del sito.

## Instructions

### Fase 1 — Recupero contenuti

1. Eseguire **sempre ed esclusivamente** `node ${CLAUDE_PLUGIN_ROOT}/scripts/fetch-content.js <tipo> [query]` per recuperare i contenuti. Lo script gestisce da solo la paginazione (recupera SEMPRE tutti gli elementi pubblicati) e una cache locale di 10 minuti (usa `--no-cache` se serve un dato certamente fresco, es. subito dopo una pubblicazione). Stampa un array JSON su stdout.
   - **Non usare mai WebFetch (né curl/altre chiamate dirette) per recuperare i contenuti principali** — nemmeno per richieste come "ultimi N articoli" o "articoli su un argomento": recuperare comunque TUTTO con lo script e poi filtrare/ordinare/tagliare in questa fase di analisi. WebFetch passa da un'infrastruttura cloud condivisa che il sito può riconoscere come traffico automatizzato e bloccare con una challenge anti-bot (comportamento osservato), mentre lo script gira in locale e non ha questo problema. WebFetch va usato solo per la sitemap in Fase 2, mai per i contenuti.
2. Se non specificato dall'utente, chiedere quale tipo di contenuto analizzare (`faq`, `posts`, `pages`).
3. Per le FAQ, il testo della risposta arriva già estratto in `contenuto_testo` (dal campo ACF `risposta_faq`).
4. Ogni elemento include già, senza chiamate aggiuntive: `meta_title`, `meta_description` (i meta tag SEO reali), `schema_types` (elenco dei tipi `@type` presenti nello schema JSON-LD del sito), e per le FAQ `schema_faq_question_count` (quante domande sono effettivamente popolate nello schema FAQPage).

### Fase 2 — Segnali di sessione (una tantum, non per elemento)

5. Eseguire **una sola volta per l'intero audit** `node ${CLAUDE_PLUGIN_ROOT}/scripts/fetch-content.js llms-check` per verificare presenza/freschezza di `llms.txt`. Il risultato va riportato **una sola volta nel report finale**, mai ripetuto per ogni elemento, e sempre come nota informativa a bassa priorità — Google ha dichiarato che `llms.txt` non influenza di per sé le citazioni AI (paragonabile al vecchio meta-tag keywords), quindi non è mai un problema critico, solo un segnale emergente da tenere d'occhio.
6. Se rilevante, recuperare `https://poweritlucegas.it/sitemap_index.xml` (ed eventualmente `page-sitemap.xml` / `faq-sitemap.xml`) via WebFetch per la mappa di link interni e per valutare l'architettura a topic cluster (vedi Fase 3). Escludere sempre pagine LP (`/lp/...`), di ringraziamento (`/grazie/...`) o di sistema.

### Fase 3 — Analisi di ogni contenuto

Per ciascun elemento valutare:

**SEO & Keyword**
- Topic principale e keyword implicite già presenti
- 3-5 keyword primarie e 3-5 secondarie/LSI suggerite
- La keyword principale è nel titolo e nel `meta_title`?

**Schema markup** (fattore critico 2026, non più "nice to have")
- Usare `schema_types` e, per le FAQ, `schema_faq_question_count`.
- FAQ: atteso `FAQPage` nel grafo. Se `schema_faq_question_count` è 0 pur avendo `FAQPage` in `schema_types`, segnalare "schema FAQPage presente ma vuoto" — problema più subdolo di un'assenza totale, va distinto esplicitamente.
- Articoli: atteso `Article`; considerare positivamente anche `BreadcrumbList`/`Organization`/`WebSite` come segnali di entità.
- Se `schema_types` è vuoto per un item, segnalarlo come **"non verificabile"**, mai come "schema assente" — evita falsi positivi quando manca solo il dato, non lo schema reale.

**Meta tag**
- `meta_title`/`meta_description` assenti o vuoti
- `meta_description` troppo corta (<70 caratteri) o troppo lunga (>160)
- Duplicazioni tra elementi diversi analizzati nella stessa run (confronto diretto in memoria tra i risultati recuperati, nessuna chiamata aggiuntiva)

**AEO — risposta diretta**
- Risponde a una domanda esplicita? (essenziale per le FAQ)
- Le prime 150-200 parole rispondono in modo completo e autonomo alla domanda principale (struttura "TL;DR-first")?
- È presente, vicino all'inizio, un blocco di risposta diretta di circa 40-60 parole facilmente estraibile? È lo standard 2026 per l'estrazione da parte dei motori di risposta.
- Ci sono dati numerici, date o fatti verificabili citabili?

**GEO — citabilità per i motori generativi**
- Presenza di citazioni/quote da fonti autorevoli (dato misurato: aumentano di circa il 41% la probabilità di essere citati in una risposta AI)
- Presenza di statistiche/dati numerici concreti (+31% circa)
- Presenza di riferimenti a fonti esterne/citazioni (+28% circa)
- Consistenza del naming del brand nel testo (es. "Power.it" usato in modo coerente, senza varianti incoerenti)

**Architettura per entità e topic cluster**
- Il contenuto fa parte di un cluster coerente (pagina pillar + articoli/FAQ satellite) con internal linking che descrive relazioni esplicite, o è isolato?
- Il contenuto è una "unità autosufficiente", comprensibile anche estratto dal contesto della pagina (rilevante perché i motori AI estraggono frammenti, non intere pagine)?
- Negli articoli lunghi, sono presenti blocchi domanda-risposta nativi (sotto-domande in grassetto o H3 con risposta immediata), non solo nelle FAQ dedicate?
- I paragrafi sono monotematici (un concetto per paragrafo) o misti/confusi?

**Content quality & freschezza**
- Lunghezza adeguata (FAQ: 80-200 parole, articoli/pagine: 300+ parole)
- Sezioni obsolete (prezzi vecchi, normative superate, riferimenti datati)
- Freschezza: confrontare `ultima_modifica` con la data odierna — segnalare "da rivedere" oltre 90 giorni, priorità alta oltre 180 giorni (revisione trimestrale raccomandata)

**Link building interno**
- Keyword nel testo che corrispondono a pagine/FAQ del sito
- Proporre al massimo 5-6 link per elemento
- Verificare che la keyword esista letteralmente nel testo prima di proporla

### Fase 4 — Output

7. Presentare i risultati **direttamente nella risposta**, seguendo questo formato standard (adattivo: includere solo le sezioni/tabelle pertinenti alla richiesta specifica, non applicarle meccanicamente tutte a ogni report — un audit mirato su un solo articolo non ha bisogno di tabelle di cluster/grafo-link):

   - **Frase introduttiva**: cosa è stato analizzato (tipo, quanti elementi, eventuale filtro), con link cliccabile se ci si concentra su un singolo elemento o pochi elementi nominati.
   - **Tabella "Elementi analizzati"** (quando l'analisi copre più di un contenuto): colonne minime `Articolo`/`FAQ` (sempre **link markdown cliccabile** al suo URL reale, mai testo semplice) | `Pubblicato` | `Parole`.
   - **Tabelle di supporto**, solo se la richiesta le rende pertinenti:
     - mappa cluster tematici: `Cluster` | `Articoli` | `Parole tot.` | `Coesione interna`
     - grafo di link interni: `Articolo` (linkato) | `In` | `Out` | `Nota`
   - **Tabella principale "Criticità prioritizzate"**: colonne minime `Priorità` | `Problema` | `Dettaglio`. Aggiungere `Asse` (SEO/AEO/GEO/Schema/Meta) quando il report copre più discipline insieme; aggiungere `Dove` e `Azione` quando più elementi richiedono interventi puntuali distinti.
   - **Grassetto** per numeri, percentuali e giudizi sintetici chiave dentro le celle (es. "**Isolato totale**", "**50% degli articoli orfani**"), non testo piatto.
   - **Link markdown cliccabili** ovunque si nomini un articolo/FAQ specifico, in tabella e nel testo.
   - **Sintesi di chiusura** (1-2 frasi, con il dato più rilevante in **grassetto**) quando l'insieme analizzato è abbastanza ampio da avere un pattern trasversale da segnalare — non forzarla su un singolo elemento isolato.

   Includere la nota su `llms.txt` una sola volta, in coda, come informazione a bassa priorità. Non esiste qui un flusso di approvazione/pubblicazione — l'output di questa skill è solo analisi.
8. Solo se l'utente lo chiede esplicitamente, salvare anche un file markdown con il report nella cartella corrente.

## Examples

### Esempio 1 — Audit FAQ
```
/audit-powerit faq
```
Recupera tutte le FAQ pubblicate (con paginazione e cache automatiche), le analizza su SEO/schema/meta/AEO/GEO, propone un report prioritizzato.

### Esempio 2 — Audit articoli con filtro
```
/audit-powerit posts bolletta
```
Recupera gli articoli che contengono "bolletta" e ne analizza la qualità SEO/schema/AEO/GEO.

## Gotchas

- **Solo contenuti pubblicati**: bozze e contenuti privati non sono raggiungibili senza credenziali — comportamento atteso, non un errore.
- **`yoast_head_json` assente su un item**: non è un errore, semplicemente quell'item non ha dati Yoast — trattare schema/meta come "non verificabili", non come "assenti".
- **Cache locale**: risultati cachati per 10 minuti (temp dir di sistema, solo dati già pubblici). Usa `--no-cache` per forzare un fetch fresco, utile subito dopo una pubblicazione.
- **`llms-check` è uno pseudo-tipo interno**, da eseguire una volta per sessione di audit, non un tipo di contenuto da esporre come opzione principale all'utente.
- **Rate limiting**: lo script inserisce già una pausa tra le pagine; evitare comunque lanci ripetuti ravvicinati sullo stesso tipo di contenuto.
- **404 su un tipo di contenuto**: il custom post type potrebbe non avere `show_in_rest` attivo. Verificare su `https://poweritlucegas.it/wp-json/wp/v2/types`.
- **Nessuna pubblicazione possibile**: se l'utente chiede di applicare le modifiche proposte, spiegare che questa skill è di sola analisi e che la pubblicazione è riservata al proprietario del sito.
- **"Failed to fetch" / challenge anti-bot su un URL costruito manualmente**: sintomo di aver usato WebFetch (o un fetch diretto) invece dello script — vedi Fase 1. Lo script `fetch-content.js` non ha questo problema perché gira in locale via `node`, non dall'infrastruttura cloud di WebFetch.
