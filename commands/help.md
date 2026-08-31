---
description: Spiega cosa fa il plugin power-wp-audit e come si usa. Attivare quando l'utente chiede "cosa fa questo plugin", "come funziona power-wp-audit", "come si usa questo strumento", "a cosa serve questo plugin", "cosa può fare questo tool", "help", "aiuto", o qualsiasi domanda generica sullo scopo/uso del plugin.
---

# Power WP Audit — a cosa serve e come si usa

Rispondi all'utente spiegando in modo chiaro e discorsivo (non solo un elenco secco) i punti seguenti, adattando il livello di dettaglio a quanto ha effettivamente chiesto:

## Cosa fa questo plugin

**power-wp-audit** analizza i contenuti pubblicati su **poweritlucegas.it** (FAQ e articoli/post) per qualità SEO e leggibilità da parte dei motori di risposta AI (AEO — AI Overviews, Perplexity, ChatGPT). Recupera i contenuti via API REST pubblica di WordPress e propone un report con problemi rilevati e azioni suggerite (keyword, struttura, lunghezza, link interni).

## Cosa NON fa (importante)

Questo plugin è **di sola lettura**: non può modificare, pubblicare o cancellare nulla sul sito. Non contiene alcuna credenziale WordPress e non ne ha bisogno, perché legge solo contenuti già pubblicati e pubblicamente accessibili. La pubblicazione delle modifiche è uno strumento separato, riservato al proprietario del sito — se l'utente chiede di "applicare" o "pubblicare" le modifiche suggerite, chiarisci che questo plugin non può farlo e va richiesto al proprietario del sito.

## Come si usa

Comando principale (skill di audit):
```
/audit-powerit faq
/audit-powerit posts
/audit-powerit posts bolletta
```
(forma completa equivalente: `/power-wp-audit:audit-powerit`)

- `faq` → analizza tutte le FAQ pubblicate
- `posts` → analizza tutti gli articoli del blog
- si può aggiungere una parola di ricerca dopo il tipo per filtrare (es. `posts bolletta`)

Non serve alcuna configurazione: nessuna password, nessun URL da inserire, funziona subito dopo l'installazione.

## Cosa restituisce l'audit

Per ogni contenuto analizzato: valutazione SEO (keyword, titolo), valutazione AEO (risposta diretta, dati citabili), qualità/lunghezza del contenuto, ed eventuali suggerimenti di link interno verso altre pagine/FAQ del sito. Il risultato finale è una tabella prioritizzata (alta/media/bassa priorità) presentata direttamente in chat.

## Aggiornamenti

Quando viene rilasciata una nuova versione del plugin, esegui:
```
/plugin marketplace update power-wp-audit-marketplace
/plugin update power-wp-audit
```
poi riavvia la sessione di Claude Code — non serve reinstallare nulla.
