import { vi, beforeEach } from "vitest";

/**
 * Generate deterministic embedding vectors based on semantic content.
 * Similar messages → close vectors → high cosine similarity
 */
export function generateMockEmbedding(text: string): number[] {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);

  // Simulated semantic dimensions
  const delegation = words.some(w =>
    ["fais", "faire", "place", "moi", "écris", "génère", "do", "write", "generate"].includes(w)
  ) ? 0.9 : 0.1;

  const reflection = words.some(w =>
    ["pourquoi", "comment", "pense", "réfléchir", "comprendre", "why", "how", "think", "understand"].includes(w)
  ) ? 0.9 : 0.1;

  const vocab = words.some(w =>
    ["quoi", "définition", "signifie", "veut", "dire", "what", "definition", "mean"].includes(w)
  ) ? 0.9 : 0.1;

  const clarity = words.some(w =>
    ["truc", "machin", "chose", "bidule", "euh", "thing", "stuff", "um"].includes(w)
  ) ? 0.9 : 0.1;

  // 4D vector for tests (production = 1536D)
  return [delegation, reflection, vocab, clarity];
}

/**
 * Create a mock OpenAI class that produces deterministic embeddings.
 */
export function createMockOpenAI() {
  return vi.fn().mockImplementation(() => ({
    embeddings: {
      create: vi.fn().mockImplementation(({ input }: { input: string }) => {
        return Promise.resolve({
          data: [{ embedding: generateMockEmbedding(input) }],
        });
      }),
    },
  }));
}

export function setupOpenAIMock() {
  vi.mock("openai", () => ({
    default: createMockOpenAI(),
  }));

  // Set the API key for tests
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key-for-mocking";
  });
}
