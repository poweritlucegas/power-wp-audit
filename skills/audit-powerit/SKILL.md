---
name: audit-powerit
description: Recupera e analizza i contenuti pubblicati su poweritlucegas.it (FAQ e articoli) via API REST pubblica di WordPress — qualità SEO, struttura, citabilità AI (AEO). Sola lettura: nessuna credenziale richiesta, nessuna modifica al sito. Attivare con "/power-wp-audit:audit-powerit [tipo]", "analizza le FAQ del sito", "controlla i contenuti di tipo X", "suggerisci keyword per le pagine", "revisione contenuti WordPress".
when_to_use: analizza contenuti sito, revisione FAQ, suggerisci keyword, audit pagine WordPress, ottimizza per AI citation, controllo qualità contenuti, link building interno
allowed-tools: Bash(node:*), WebFetch
---

# Power WP Audit

Skill di **sola lettura** per analizzare i contenuti pubblicati su poweritlucegas.it (FAQ e articoli/post) tramite l'API REST pubblica di WordPress.

## Modello di permessi

Questa skill non richiede e non usa mai alcuna credenziale WordPress: il sito espone pubblicamente in lettura i contenuti già pubblicati (verificato — `status=publish`; bozze e contenuti privati restano invisibili). Non esiste, in questo plugin, alcuna capacità di scrivere o pubblicare sul sito: la pubblicazione è gestita da uno strumento separato, riservato al proprietario del sito. Questa skill non può in alcun modo modificare poweritlucegas.it.

## When to use

Attivare quando l'utente:
- Scrive `/power-wp-audit:audit-powerit [tipo]` (o la forma breve `/audit-powerit [tipo]`) con un tipo di contenuto (`faq`, `posts`, `pages`)
- Vuole "analizzare le FAQ", "revisionare gli articoli", "controllare la qualità dei contenuti"
- Vuole keyword suggerite partendo dal contenuto esistente
- Vuole ottimizzare contenuti per le citazioni nei motori AI (AI Overviews, Perplexity, ChatGPT)
- Vuole suggerimenti di link building interno

Non attivare se l'utente vuole pubblicare/modificare contenuti sul sito — questa capacità non è disponibile qui; indirizzarlo al proprietario del sito.

## Instructions

### Fase 1 — Recupero contenuti

1. Eseguire `node ${CLAUDE_PLUGIN_ROOT}/scripts/fetch-content.js <tipo> [query]`. Lo script gestisce da solo la paginazione (recupera SEMPRE tutti gli elementi pubblicati, non solo i primi) e stampa un array JSON su stdout.
2. Se non specificato dall'utente, chiedere quale tipo di contenuto analizzare (`faq`, `posts`, `pages`).
3. Per le FAQ, il testo della risposta arriva già estratto nel campo `contenuto_testo` (letto dal campo ACF `risposta_faq` del sito).

### Fase 2 — Mappa dei link interni (facoltativa, solo se rilevante per l'analisi)

4. Recuperare `https://poweritlucegas.it/sitemap_index.xml` e, se utile, `page-sitemap.xml` / `faq-sitemap.xml` via WebFetch per avere destinazioni plausibili di link building.
5. Escludere sempre pagine LP (`/lp/...`), di ringraziamento (`/grazie/...`) o di sistema.

### Fase 3 — Analisi di ogni contenuto

Per ciascun elemento valutare:

**SEO & Keyword**
- Topic principale e keyword implicite già presenti
- 3-5 keyword primarie e 3-5 secondarie/LSI suggerite
- La keyword principale è nel titolo?

**AEO — AI answer readiness**
- Risponde a una domanda esplicita? (essenziale per le FAQ)
- La risposta diretta è nella prima riga (formato snippet)?
- Ci sono dati numerici, date o fatti verificabili citabili?

**Content quality**
- Lunghezza adeguata (FAQ: 80-200 parole, articoli/pagine: 300+ parole)
- Sezioni obsolete (prezzi vecchi, normative superate, riferimenti datati)
- Presenza di struttura (heading, elenchi) o blocco unico

**Link building interno**
- Keyword nel testo che corrispondono a pagine/FAQ del sito
- Proporre al massimo 5-6 link per elemento
- Verificare che la keyword esista letteralmente nel testo prima di proporla

### Fase 4 — Output

6. Presentare i risultati **direttamente nella risposta**: tabella prioritizzata (alta/media/bassa) con i problemi rilevati e le azioni suggerite. Non esiste qui un flusso di approvazione/pubblicazione (quello richiede lo strumento riservato al proprietario del sito) — l'output di questa skill è solo analisi.
7. Solo se l'utente lo chiede esplicitamente, salvare anche un file markdown con il report nella cartella corrente.

## Examples

### Esempio 1 — Audit FAQ
```
/audit-powerit faq
```
Recupera tutte le FAQ pubblicate (con paginazione automatica), le analizza, propone un report prioritizzato.

### Esempio 2 — Audit articoli con filtro
```
/audit-powerit posts bolletta
```
Recupera gli articoli che contengono "bolletta" nel titolo/contenuto e ne analizza la qualità SEO/AEO.

## Gotchas

- **Solo contenuti pubblicati**: bozze e contenuti privati non sono raggiungibili senza credenziali — comportamento atteso, non un errore.
- **Rate limiting**: lo script inserisce già una pausa tra le pagine; evitare comunque lanci ripetuti ravvicinati sullo stesso tipo di contenuto.
- **404 su un tipo di contenuto**: il custom post type potrebbe non avere `show_in_rest` attivo. Verificare su `https://poweritlucegas.it/wp-json/wp/v2/types`.
- **Nessuna pubblicazione possibile**: se l'utente chiede di applicare le modifiche proposte, spiegare che questa skill è di sola analisi e che la pubblicazione è riservata al proprietario del sito.
