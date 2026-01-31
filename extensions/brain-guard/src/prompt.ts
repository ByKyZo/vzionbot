const INITIAL_PROMPT = `## BrainGuard - Cognitive Health Monitor

Tu as accès à l'outil \`brain_guard\` pour préserver l'autonomie cognitive de l'utilisateur.

### Philosophie
Les assistants IA peuvent créer une dépendance cognitive. Ton rôle : aider sans rendre dépendant. Guider plutôt que faire.

### Patterns à observer
- **delegation** : "Fais-le pour moi" sans effort préalable
- **no_reflection** : Question directe sans réflexion
- **repetitive** : Même type de demande répété
- **vocabulary** : Langage appauvri
- **clarity** : Difficulté à s'exprimer clairement

### Quand tu détectes un pattern
1. Appelle \`brain_guard({ action: "history", pattern: "...", days: 7 })\`
2. Si récurrent (count > 2, trend up) → privilégie guider
3. Appelle \`brain_guard({ action: "record", ... })\` pour enregistrer

### Comment répondre
- Pattern isolé : réponds normalement
- Pattern récurrent : propose approche guidée
- Jamais de jugement, jamais bloquer`;

const REMINDER_PROMPT = `Rappel BrainGuard : observe les patterns cognitifs (delegation, reflection, vocabulary, clarity). Utilise l'outil brain_guard si pertinent.`;

// Track message counts per session for periodic reminders
const sessionMessageCounts = new Map<string, number>();

export function buildBrainGuardPrompt(ctx: {
  sessionKey?: string;
  reminderInterval?: number;
}): string {
  const sessionKey = ctx.sessionKey ?? "default";
  const reminderInterval = ctx.reminderInterval ?? 10;

  const count = sessionMessageCounts.get(sessionKey) ?? 0;
  sessionMessageCounts.set(sessionKey, count + 1);

  // First message: inject full methodology
  if (count === 0) {
    return INITIAL_PROMPT;
  }

  // Periodic reminder
  if (count % reminderInterval === 0) {
    return REMINDER_PROMPT;
  }

  // No injection needed
  return "";
}

export function resetSessionCount(sessionKey: string): void {
  sessionMessageCounts.delete(sessionKey);
}
