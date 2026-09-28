---
description: Spiega cosa fa il plugin power-wp-audit e come si usa. Attivare quando l'utente chiede "cosa fa questo plugin", "come funziona power-wp-audit", "come si usa questo strumento", "a cosa serve questo plugin", "cosa può fare questo tool", "help", "aiuto", o qualsiasi domanda generica sullo scopo/uso del plugin.
---

# Power WP Audit — a cosa serve e come si usa

Rispondi all'utente spiegando in modo chiaro e discorsivo (non solo un elenco secco) i punti seguenti, adattando il livello di dettaglio a quanto ha effettivamente chiesto:

## Cosa fa questo plugin

**power-wp-audit** analizza i contenuti pubblicati su **poweritlucegas.it** (FAQ e articoli/post) su tre assi distinti: **SEO** (farsi trovare e posizionare), **AEO** (farsi estrarre come risposta diretta — featured snippet, AI Overviews di Google incluse) e **GEO** (farsi citare come fonte dai motori generativi come ChatGPT o Perplexity). Controlla anche schema markup (dati strutturati JSON-LD), meta title/description, la freschezza dei contenuti, l'**accuratezza delle fonti citate** (confronta le affermazioni con la pagina ARERA o dell'ente linkato) e i **link interni in entrata**, cioè da quali articoli e FAQ arrivano collegamenti a ciascun contenuto. Recupera i contenuti via API REST pubblica di WordPress e propone un report con problemi rilevati e azioni suggerite, etichettate per asse.

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

**Semrush (facoltativo)**: se nella sessione è collegato Semrush, l'audit usa dati reali di volume, CPC, keyword difficulty e SERP per le keyword di ogni contenuto. Se non è collegato, l'audit funziona comunque e lo dichiara esplicitamente nel report ("dati di volume non disponibili in questa sessione"), senza mai stimare numeri a memoria.

## Cosa restituisce l'audit

Il report ha sempre la stessa struttura, con sezioni fisse nello stesso ordine:

1. **Opportunità di ricerca** — keyword, volume e difficoltà (dati Semrush reali quando disponibili) e chi presidia la SERP.
2. **Posizione nel cluster** — se il contenuto è pillar, satellite o isolato, chi lo collega (link in entrata da articoli e FAQ) e quale è il pillar di riferimento.
3. **Cosa funziona già** — i punti di forza verificati.
4. **Miglioramenti in ordine di priorità** — tabella alta/media/bassa, con ogni problema etichettato per asse (SEO, AEO/AIO, GEO, Schema, Meta, Accuratezza, Link interni, Contenuto, Freschezza). Include la verifica delle fonti citate: un'affermazione non riscontrata nella fonte linkata è sempre priorità alta.
5. **Blocco di apertura proposto** — circa 40-60 parole di risposta diretta da mettere in cima.
6. **FAQ suggerite per lo schema** — le domande da coprire con FAQPage.

Il report può avere una sezione in più, "Approfondimento specifico", quando chiedi di concentrarti su un tema. Se chiedi di guardare un solo asse (es. "solo AIO") le sezioni restano tutte e quell'asse passa per primo. Con più di 3 contenuti il report diventa una panoramica in tabella, con il report completo per quelli che scegli. Una nota sul file `llms.txt` compare una sola volta, a bassa priorità. I titoli di articoli e FAQ sono sempre link cliccabili.

Su richiesta esplicita ci sono altri due output: l'**analisi dell'architettura del blog** (mappa dei cluster, grafo dei link, criticità) e, dopo un'analisi, la **versione riscritta** del contenuto pronta da incollare in WordPress, con `[inserire dato verificato]` dove un dato non è confermato e le note per chi pubblica.

**Cosa NON copre**: velocità del sito, Core Web Vitals, aspetti tecnici infrastrutturali — coperti da un altro strumento dedicato, non da questo plugin.

## Aggiornamenti

Quando viene rilasciata una nuova versione del plugin, esegui:
```
/plugin marketplace update power-wp-audit-marketplace
/plugin update power-wp-audit@power-wp-audit-marketplace
```
poi riavvia la sessione di Claude Code — non serve reinstallare nulla. Se questi comandi non sono disponibili nell'ambiente in uso, l'equivalente da terminale è `claude plugin marketplace update power-wp-audit-marketplace` seguito da `claude plugin update power-wp-audit@power-wp-audit-marketplace`.
