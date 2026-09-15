# power-wp-audit

Plugin Claude Code per analizzare i contenuti pubblicati su **poweritlucegas.it** (FAQ e articoli) su tre assi — **SEO** (posizionamento), **AEO** (risposta diretta/featured snippet, incluse le AI Overviews di Google) e **GEO** (citazioni nei motori generativi come ChatGPT/Perplexity) — via API REST pubblica di WordPress. Controlla anche schema markup, meta tag e freschezza dei contenuti.

**Sola lettura**: non richiede alcuna credenziale WordPress e non può in alcun modo modificare o pubblicare contenuti sul sito. La pubblicazione resta uno strumento separato, riservato al proprietario del sito.

**Fuori scope**: Core Web Vitals, velocità di caricamento e crawlability tecnica del sito non sono coperti da questo plugin (competenza di uno strumento separato) — qui l'attenzione è sulla qualità/struttura/citabilità dei contenuti.

## Installazione (una tantum)

Dentro Claude Code:
```
/plugin marketplace add poweritlucegas/power-wp-audit
/plugin install power-wp-audit@power-wp-audit-marketplace
```

Nessuna configurazione necessaria: l'URL del sito è già incorporato nello strumento.

## Uso

```
/audit-powerit faq
/audit-powerit posts
/audit-powerit posts bolletta
```

Per farsi spiegare cosa fa il plugin e come si usa, basta chiedere in linguaggio naturale ("cosa fa questo plugin?", "come si usa?") oppure eseguire `/help`.

## Restare aggiornati

Quando viene pubblicata una nuova versione, aggiorna il catalogo e il plugin con:
```
/plugin marketplace update power-wp-audit-marketplace
/plugin update power-wp-audit@power-wp-audit-marketplace
```
Poi riavvia la sessione di Claude Code per applicare l'aggiornamento.

Se questi comandi risultano non disponibili nel tuo ambiente (es. alcune integrazioni non supportano la gestione plugin interattiva), usa l'equivalente da terminale, fuori da una sessione Claude Code:
```
claude plugin marketplace update power-wp-audit-marketplace
claude plugin update power-wp-audit@power-wp-audit-marketplace
```

## Struttura

```
power-wp-audit/
├── .claude-plugin/
│   ├── plugin.json          # manifest del plugin
│   └── marketplace.json     # catalogo per /plugin marketplace add
├── commands/
│   └── help.md              # spiegazione plugin, si attiva anche in linguaggio naturale
├── skills/
│   └── audit-powerit/
│       ├── SKILL.md
│       └── scripts/
│           └── fetch-content.js
└── README.md
```
