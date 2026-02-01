# BrainGuard - Cognitive Health Monitor

Plugin OpenClaw pour préserver l'autonomie cognitive de l'utilisateur.

## Philosophie

Les assistants IA peuvent créer une dépendance cognitive. BrainGuard observe les patterns d'interaction et guide l'agent pour favoriser l'autonomie plutôt que la délégation.

## Patterns observés

| Pattern | Description | Exemple |
|---------|-------------|---------|
| `delegation` | Demande sans effort préalable | "Fais-le pour moi" |
| `no_reflection` | Question directe sans réflexion | "C'est quoi X ?" sans contexte |
| `repetitive` | Même type de demande répétée | Toujours les mêmes questions |
| `vocabulary` | Langage appauvri | Utilisation de mots vagues |
| `clarity` | Difficulté à s'exprimer clairement | Messages confus |

## Installation

Le plugin est inclus dans le build Moltbot. Activer dans `moltbot-base.json` :

```json
{
  "plugins": {
    "entries": {
      "brain-guard": { "enabled": true }
    }
  }
}
```

## Configuration

```json
{
  "brain-guard": {
    "enabled": true,
    "reminderInterval": 10
  }
}
```

- `enabled` : Activer/désactiver le plugin
- `reminderInterval` : Injecter un rappel tous les N messages

## Usage

### Tool `brain_guard`

**Action: record** - Enregistrer un pattern observé
```json
{
  "action": "record",
  "pattern": "delegation",
  "message": "le message montrant le pattern",
  "messageId": "msg_123",
  "previousMessages": [{"id": "p1", "text": "contexte"}],
  "context": "résumé de la conversation"
}
```

Retourne : `{ recorded, byType, similar }`

**Action: search** - Rechercher dans l'historique
```json
{
  "action": "search",
  "query": "recherche sémantique",
  "type": "delegation",
  "days": 30
}
```

Retourne : `{ results, summary }`

### Commande `/brain`

```
/brain          # Stats des 7 derniers jours
/brain 30       # Stats des 30 derniers jours
/brain report   # Génère un rapport (via agent)
```

## Embeddings (optionnel)

Pour activer la recherche sémantique et la détection de patterns similaires :

```bash
openclaw models auth setup-token --provider openai
```

Sans clé API, le plugin fonctionne mais sans recherche sémantique.

## Architecture

```
brain-guard/
├── index.ts           # Registration du plugin
├── src/
│   ├── storage.ts     # JSONL storage + embeddings
│   ├── tool.ts        # Handler du tool brain_guard
│   ├── prompt.ts      # System prompts injectés
│   ├── command.ts     # Commande /brain
│   ├── report.ts      # Génération de rapport
│   └── types.ts       # Types TypeScript
└── README.md
```

## Stockage

Les données sont stockées en JSONL dans `~/clawd/brain-guard/patterns.jsonl` :

```jsonl
{"id":"uuid","ts":"2026-01-31T...","pattern":"delegation","message":"...","embedding":[...]}
```

## Licence

MIT
