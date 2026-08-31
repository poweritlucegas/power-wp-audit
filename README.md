# power-wp-audit

Plugin Claude Code per analizzare i contenuti pubblicati su **poweritlucegas.it** (FAQ e articoli) via API REST pubblica di WordPress.

**Sola lettura**: non richiede alcuna credenziale WordPress e non può in alcun modo modificare o pubblicare contenuti sul sito. La pubblicazione resta uno strumento separato, riservato al proprietario del sito.

## Installazione (una tantum)

Dentro Claude Code:
```
/plugin marketplace add <org>/power-wp-audit
/plugin install power-wp-audit@power-wp-audit-marketplace
```

Nessuna configurazione necessaria: l'URL del sito è già incorporato nello strumento.

## Uso

```
/power-wp-audit:audit faq
/power-wp-audit:audit posts
/power-wp-audit:audit posts bolletta
```

## Restare aggiornati

Gli aggiornamenti vengono rilevati automaticamente quando viene pubblicata una nuova versione. Quando Claude Code segnala un aggiornamento disponibile, eseguire:
```
/reload-plugins
```

## Struttura

```
power-wp-audit/
├── .claude-plugin/
│   ├── plugin.json          # manifest del plugin
│   └── marketplace.json     # catalogo per /plugin marketplace add
├── skills/
│   └── audit/
│       ├── SKILL.md
│       └── scripts/
│           └── fetch-content.js
└── README.md
```
