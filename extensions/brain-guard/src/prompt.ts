const INITIAL_PROMPT_BASE = `## BrainGuard - Cognitive Health Monitor

You have access to the \`brain_guard\` tool to preserve user's cognitive autonomy.

### Philosophy
AI assistants can create cognitive dependency. Your role: help without creating reliance. Guide rather than do.

### Patterns to observe
- **delegation**: "Do it for me" without prior effort
- **no_reflection**: Direct question without thinking first
- **repetitive**: Same type of request repeated
- **vocabulary**: Impoverished language
- **clarity**: Difficulty expressing clearly

### Tool usage
When you detect a pattern, call \`brain_guard\`:

\`\`\`
brain_guard({
  action: "record",
  pattern: "delegation",
  message: "the message showing the pattern",
  messageId: "message id",
  previousMessages: [
    { id: "msg_001", text: "previous context" },
    { id: "msg_002", text: "another message" }
  ],
  context: "conversation summary",
  days: 7
})
\`\`\`

**Automatic return**: the tool returns count and history directly.
If count > 2 and recurring → prefer guiding over doing.

### How to respond
- Isolated pattern: respond normally
- Recurring pattern: suggest guided approach
- Never judge, never block`;

const EMBEDDING_AVAILABLE_NOTE = `

### Semantic search
Embeddings are enabled. You can use \`action: "search"\` with \`query\` for semantic search across past patterns.`;

const EMBEDDING_UNAVAILABLE_NOTE = `

### ⚠️ Limited features
**Semantic search is disabled** - no embedding API key configured.
- \`action: "search"\` works only with \`type\` or \`days\` filters (exact match)
- \`query\` parameter will return empty results
- Similar patterns detection unavailable

To enable: configure an OpenAI API key via \`openclaw models auth setup-token --provider openai\``;

function buildInitialPrompt(embeddingAvailable: boolean): string {
  return INITIAL_PROMPT_BASE + (embeddingAvailable ? EMBEDDING_AVAILABLE_NOTE : EMBEDDING_UNAVAILABLE_NOTE);
}

const REMINDER_PROMPT = `BrainGuard reminder: observe cognitive patterns (delegation, reflection, vocabulary, clarity). Use brain_guard tool if relevant.`;

// Track message counts per session for periodic reminders
const sessionMessageCounts = new Map<string, number>();

// Cached embedding status
let cachedEmbeddingAvailable: boolean = false;

export function setEmbeddingAvailable(available: boolean): void {
  cachedEmbeddingAvailable = available;
}

export function buildBrainGuardPrompt(ctx: {
  sessionKey?: string;
  reminderInterval?: number;
}): string {
  const sessionKey = ctx.sessionKey ?? "default";
  const reminderInterval = ctx.reminderInterval ?? 10;

  const count = sessionMessageCounts.get(sessionKey) ?? 0;
  sessionMessageCounts.set(sessionKey, count + 1);

  // First message: inject full methodology with embedding status
  if (count === 0) {
    return buildInitialPrompt(cachedEmbeddingAvailable);
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
