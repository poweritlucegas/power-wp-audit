---
name: audit-powerit
description: Recupera e analizza i contenuti pubblicati su poweritlucegas.it (FAQ e articoli) via API REST pubblica di WordPress — SEO, schema markup, meta tag, citabilità per i motori di risposta (AEO) e per i motori generativi (GEO), incluse le AI Overviews di Google (AIO). Sola lettura: nessuna credenziale richiesta, nessuna modifica al sito. Attivare con "/power-wp-audit:audit-powerit [tipo]", "analizza le FAQ del sito", "controlla lo schema markup", "controlla i meta tag", "controlla i contenuti di tipo X", "suggerisci keyword per le pagine", "revisione contenuti WordPress".
when_to_use: analizza contenuti sito, revisione FAQ, suggerisci keyword, audit pagine WordPress, ottimizza per AI citation, controllo qualità contenuti, controllo schema markup, controllo meta title meta description, verifica llms.txt, ottimizzazione AI Overviews, GEO, AEO, AIO, topic cluster, link building interno
allowed-tools: Bash(node:*), WebFetch, mcp__Semrush__keyword_research, mcp__Semrush__get_report_schema, mcp__Semrush__execute_report, mcp__claude_ai_Semrush__keyword_research, mcp__claude_ai_Semrush__get_report_schema, mcp__claude_ai_Semrush__execute_report
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

Il report finale (Fase 4) etichetta ogni finding con un asse del vocabolario chiuso definito in Fase 4 (SEO, AEO/AIO, GEO, Schema, Meta, Accuratezza, Link interni, Contenuto, Freschezza), non un bucket unico.

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
   - **Non usare mai WebFetch (né curl/altre chiamate dirette) per recuperare i contenuti principali** — nemmeno per richieste come "ultimi N articoli" o "articoli su un argomento": recuperare comunque TUTTO con lo script e poi filtrare/ordinare/tagliare in questa fase di analisi. WebFetch passa da un'infrastruttura cloud condivisa che il sito può riconoscere come traffico automatizzato e bloccare con una challenge anti-bot (comportamento osservato), mentre lo script gira in locale e non ha questo problema. WebFetch va usato solo per la sitemap (Fase 2) e per verificare le fonti esterne citate (Fase 2bis), mai per i contenuti principali del sito.
2. Se non specificato dall'utente, chiedere quale tipo di contenuto analizzare (`faq`, `posts`, `pages`).
3. Per le FAQ, il testo della risposta arriva già estratto in `contenuto_testo` (dal campo ACF `risposta_faq`).
4. Ogni elemento include già, senza chiamate aggiuntive: `meta_title`, `meta_description` (i meta tag SEO reali), `schema_types` (elenco dei tipi `@type` presenti nello schema JSON-LD del sito), e per le FAQ `schema_faq_question_count` (quante domande sono effettivamente popolate nello schema FAQPage).

### Fase 2 — Segnali di sessione (una tantum, non per elemento)

5. Eseguire **una sola volta per l'intero audit** `node ${CLAUDE_PLUGIN_ROOT}/scripts/fetch-content.js llms-check` per verificare presenza/freschezza di `llms.txt`. Il risultato va riportato **una sola volta nel report finale**, mai ripetuto per ogni elemento, e sempre come nota informativa a bassa priorità — Google ha dichiarato che `llms.txt` non influenza di per sé le citazioni AI (paragonabile al vecchio meta-tag keywords), quindi non è mai un problema critico, solo un segnale emergente da tenere d'occhio.
6. Se rilevante, recuperare `https://poweritlucegas.it/sitemap_index.xml` (ed eventualmente `page-sitemap.xml` / `faq-sitemap.xml`) via WebFetch per la mappa di link interni e per valutare l'architettura a topic cluster (vedi Fase 3). Escludere sempre pagine LP (`/lp/...`), di ringraziamento (`/grazie/...`) o di sistema.

### Fase 2bis — Verifica fattuale sulle fonti citate

- Se un contenuto cita esplicitamente una fonte esterna (link ad ARERA o ad altro ente) a supporto di un'affermazione specifica — una data, una soglia, una regola — eseguire WebFetch della pagina citata e confrontare testualmente l'affermazione dell'articolo con quanto scrive la fonte.
- Se l'affermazione non trova riscontro letterale nella fonte citata (es. una formulazione o un termine tecnico inventato o parafrasato in modo impreciso), segnalarlo SEMPRE come criticità di **Priorità Alta**, Asse **"Accuratezza"**, indicando nel dettaglio: cosa dice l'articolo, cosa dice davvero la fonte e il link alla fonte verificata.
- Verificare solo le affermazioni con una fonte esplicita nel testo, non ogni frase. Non ripetere la verifica su fonti già controllate in run precedenti nella stessa sessione.

### Fase 3 — Analisi di ogni contenuto

Per ciascun elemento valutare i criteri qui sotto. Nel report (Fase 4, formato A) confluiscono così: dati keyword e SERP → sezione 1; architettura a cluster e link in entrata → sezione 2; punti di forza verificati → sezione 3; tutti i problemi → sezione 4 (ognuno con il suo asse); criteri AEO → sezioni 5 e 6.

**SEO & Keyword**
- Topic principale e keyword implicite già presenti
- La keyword principale è nel titolo e nel `meta_title`?
- Proporre 3-5 keyword primarie e 3-5 secondarie/LSI, **validate con dati reali e mai stimate a memoria**:
  - Se i tool Semrush (`mcp__Semrush__*`, oppure `mcp__claude_ai_Semrush__*` se collegato come connettore claude.ai) sono disponibili nella sessione, usarli SEMPRE per la query principale di ogni contenuto analizzato: prima `get_report_schema` per i parametri, poi `execute_report`.
  - Report `phrase_these` (database `it`) per volume, CPC e keyword difficulty della keyword principale e di 2-4 varianti.
  - Report `phrase_organic` per vedere chi occupa la SERP e se poweritlucegas.it è già posizionato.
  - Riportare nel report i numeri reali (volume, KD) in una tabella, mai stime.
  - Se Semrush NON è disponibile nella sessione (tool assente), scriverlo esplicitamente nel report ("dati di volume non disponibili in questa sessione — connettere Semrush per numeri reali") invece di ometterlo silenziosamente o di stimare a memoria.

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
- Il contenuto fa parte di un cluster coerente (pagina pillar + articoli/FAQ satellite) con internal linking che descrive relazioni esplicite, o è isolato? Assegnare il ruolo **Pillar** (tratta l'argomento in modo ampio e riceve link dai contenuti di approfondimento), **Satellite** (approfondisce un sotto-tema ed è collegato al pillar) o **Isolato** (nessun collegamento con contenuti affini) e individuare il pillar di riferimento, oppure dichiararne l'assenza.
- Come raggruppare i contenuti affini: per gli articoli usare la categoria WP (l'output riporta solo gli ID; tradurli in `slug` con `node ${CLAUDE_PLUGIN_ROOT}/scripts/fetch-content.js categories`) più l'affinità tematica; per le FAQ lo script non restituisce la categoria, quindi raggruppare per affinità tematica di titolo e testo.
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
- **Link in entrata (controllo inverso)**: oltre ai link in USCITA da proporre, scansionare gli elementi di **entrambi i tipi `posts` e `faq`** (campo `contenuto_html` restituito da `fetch-content.js`) cercando `href` che puntano all'URL del contenuto in analisi, escludendo i link del contenuto a se stesso. Se la run ha recuperato un solo tipo, eseguire lo script anche per l'altro prima di contare (la cache locale rende la seconda chiamata quasi immediata): le FAQ vanno sempre incluse nel conteggio. Riportare i link in entrata distinguendo quelli da articoli e quelli da FAQ. Le pagine costruite con page builder non espongono il contenuto via REST e non vengono scansionate.
- Se un contenuto pubblicato di recente ha zero link in entrata da altri contenuti del sito (articoli o FAQ), segnalarlo come criticità (Priorità Media o Alta a seconda del volume di ricerca della keyword target) elencando i contenuti più affini (articoli o FAQ) da cui aggiungere un link.

### Fase 4 — Output (scheletro fisso, adattività controllata)

7. Presentare i risultati **direttamente nella risposta**. Scegliere il formato in base alla richiesta: **A** (default) per l'analisi di uno o più contenuti; **B** solo se l'utente chiede esplicitamente l'analisi dell'architettura/dei cluster dell'intero blog; **C** solo dopo il formato A e solo se l'utente chiede la versione riscritta.

**Cosa è fisso e cosa è adattivo.** Il formato ha uno scheletro fisso e una quota limitata di adattività.
- **Fisso, sempre uguale**: titoli delle sezioni, ordine, colonne delle tabelle, vocabolario degli assi, riga di chiusura. Non rinominare, non riordinare, non aggiungere colonne.
- **Adattivo**:
  - il numero di righe e di punti dipende da ciò che c'è davvero: non riempire per arrivare a un numero;
  - una sezione senza contenuto resta con il titolo e "Nessun elemento rilevato" oppure "Non applicabile: [motivo breve]";
  - **un solo slot facoltativo** `### Approfondimento specifico`, in posizione fissa tra "FAQ suggerite per lo schema" e la chiusura, al massimo uno per report: usarlo solo per il tema su cui l'utente ha chiesto di concentrarsi o per un elemento che non entra nelle sezioni fisse (es. un errore fattuale che richiede spazio). Se non serve, non compare: è l'unica sezione che può mancare;
  - **filtro per asse** se l'utente chiede un focus (es. "solo AIO"): tutte le sezioni restano; nella tabella dei miglioramenti l'asse richiesto va per primo e gli altri assi compaiono solo se di priorità Alta; sotto il titolo della tabella aggiungere la riga `Filtrato su: [asse]`;
  - tono e formulazione delle frasi sono liberi dentro le sezioni.

**Formato A — Analisi di un contenuto.** Aprire con `## Analisi: [Titolo](url)` e una riga con data di pubblicazione, parole e quali fonti sono state riverificate. Poi queste sezioni, con questi titoli, in questo ordine:

1. `### Opportunità di ricerca` — tabella `Keyword | Volume/mese | KD` (keyword principale e 2-4 varianti) e 3-4 punti: confronto col resto del blog, trend/stagionalità, chi presidia la SERP e se poweritlucegas.it è nei primi 12, cosa serve per competere. Senza Semrush la sezione resta, con la frase fissa "dati di volume non disponibili in questa sessione — connettere Semrush per numeri reali".
2. `### Posizione nel cluster` — tabella `Contenuto | Ruolo | In | Out` con il contenuto analizzato (in grassetto) e i contenuti affini, articoli e FAQ. Sotto la tabella tre righe fisse:
   - `Ruolo di questo contenuto: Pillar | Satellite | Isolato` con la motivazione in una frase;
   - `Pillar di riferimento del cluster: [link]` oppure `assente`;
   - `Link in entrata: nessuno` oppure `Link in entrata: N contenuti (X articoli, Y FAQ)` (con link cliccabili ai contenuti sorgente).
3. `### Cosa funziona già` — elenco con etichette in grassetto (Accuratezza, Citazioni, Struttura, Schema…), solo elementi effettivamente verificati.
4. `### Miglioramenti in ordine di priorità` — tabella `Priorità | Asse | Problema | Cosa fare`, ordinata Alta → Media → Bassa. **Assi ammessi (vocabolario chiuso)**: SEO, AEO/AIO, GEO, Schema, Meta, Accuratezza, Link interni, Contenuto, Freschezza. Sotto la tabella, una sola volta per risposta, la nota informativa su `llms.txt` a bassa priorità.
5. `### Blocco di apertura proposto (circa 40-60 parole)` — testo proposto in citazione, più una riga che dice se i dati usati sono già nel contenuto o confermati dalla fonte.
6. `### FAQ suggerite per lo schema` — 5-6 domande da coprire con FAQPage. Per un contenuto che è già una FAQ: "Non applicabile: il contenuto è già una FAQ".
7. (facoltativo) `### Approfondimento specifico`.
8. Chiusura fissa: "Nessuna modifica è stata applicata al sito. Vuoi che prepari il testo completo della versione migliorata, con tabella e FAQ? Il JSON-LD solo su richiesta."

**Più contenuti.** Fino a 3 contenuti: il formato A completo per ciascuno, in ordine di data decrescente e separati da `---`; la nota `llms.txt` e la chiusura fissa compaiono una sola volta, in fondo. Oltre 3 contenuti: al posto dei report completi, `### Panoramica` con tabella `Contenuto (link) | Pubblicato | Parole | Ruolo nel cluster | Criticità alte | Media | Bassa | Problema principale`, ordinata per criticità alte decrescenti; poi 3-5 punti sui pattern trasversali e la chiusura che offre il formato A per i contenuti scelti dall'utente. Nella panoramica non eseguire Semrush né la verifica delle fonti per tutti i contenuti: farlo solo per quelli approfonditi.

**Formato B — Architettura del blog** (solo su richiesta esplicita). È la vista sull'intero blog, mentre "Posizione nel cluster" è la vista locale su un contenuto. Sezioni fisse: `### 1. Mappa dei cluster` (`Cluster | Articoli | Parole tot. | Coesione interna`), `### 2. Grafo di link interno` (`Articolo | In | Out | Nota`, seguita da una frase di sintesi con il dato principale in grassetto), `### 3. Criticità prioritizzate` (`Priorità | Problema | Dettaglio`).

**Formato C — Versione riscritta** (solo dopo il formato A e solo su richiesta). Struttura fissa: `Title SEO`, `Meta description`, `H1`, `Ultimo aggiornamento: [data]`, corpo (apertura con il blocco definitorio, sezioni H2 con ancora, tabella comparativa se pertinente, Domande frequenti, CTA finale), poi `### Note per chi pubblica` con l'elenco "Da verificare prima di pubblicare". Usare solo dati già presenti nel contenuto o confermati dalla fonte; tutto il resto come `[inserire dato verificato]`. Niente JSON-LD salvo richiesta esplicita. È testo da incollare in WordPress: il plugin non pubblica nulla.

**Regole comuni a tutti i formati.** Ogni articolo o FAQ nominato è un link markdown cliccabile al suo URL reale, in tabella e nel testo. Grassetto per numeri, percentuali e giudizi chiave dentro le celle (es. "**Isolato**", "**0 link in entrata**"). Nessun flusso di approvazione o pubblicazione: l'output di questa skill è solo analisi.

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

### Esempio 3 — Focus su un asse
```
analizza l'ultimo articolo, solo AIO
```
Formato A completo, con la riga `Filtrato su: AIO` sotto il titolo della tabella dei miglioramenti e l'asse AEO/AIO per primo.

### Esempio 4 — Architettura del blog
```
analizza l'architettura del blog
```
Formato B: mappa dei cluster, grafo di link interno, criticità prioritizzate.

### Esempio 5 — Versione riscritta
```
sì, prepara la versione migliorata
```
Detto dopo un'analisi in formato A: formato C, con `[inserire dato verificato]` per i dati non confermati e `Note per chi pubblica` in fondo.

## Gotchas

- **Solo contenuti pubblicati**: bozze e contenuti privati non sono raggiungibili senza credenziali — comportamento atteso, non un errore.
- **`yoast_head_json` assente su un item**: non è un errore, semplicemente quell'item non ha dati Yoast — trattare schema/meta come "non verificabili", non come "assenti".
- **Cache locale**: risultati cachati per 10 minuti (temp dir di sistema, solo dati già pubblici). Usa `--no-cache` per forzare un fetch fresco, utile subito dopo una pubblicazione.
- **`llms-check` è uno pseudo-tipo interno**, da eseguire una volta per sessione di audit, non un tipo di contenuto da esporre come opzione principale all'utente.
- **Rate limiting**: lo script inserisce già una pausa tra le pagine; evitare comunque lanci ripetuti ravvicinati sullo stesso tipo di contenuto.
- **404 su un tipo di contenuto**: il custom post type potrebbe non avere `show_in_rest` attivo. Verificare su `https://poweritlucegas.it/wp-json/wp/v2/types`.
- **Nessuna pubblicazione possibile**: se l'utente chiede di applicare le modifiche proposte, spiegare che questa skill è di sola analisi e che la pubblicazione è riservata al proprietario del sito.
- **"Failed to fetch" / challenge anti-bot su un URL costruito manualmente**: sintomo di aver usato WebFetch (o un fetch diretto) invece dello script — vedi Fase 1. Lo script `fetch-content.js` non ha questo problema perché gira in locale via `node`, non dall'infrastruttura cloud di WebFetch.
- **Sezioni del formato A sempre presenti**: non saltare una sezione perché "non c'è niente da dire" e non cambiarne titolo o ordine. Se non c'è contenuto, tenere il titolo con "Nessun elemento rilevato" o "Non applicabile: [motivo]". L'unica sezione che può mancare è `### Approfondimento specifico`.
- **Semrush non connesso**: se i tool `mcp__Semrush__*` (o `mcp__claude_ai_Semrush__*`) non sono nella lista dei tool disponibili, non bloccare l'audit — procedere senza dati di volume e segnalarlo nel report, mai stimare numeri di fantasia.
