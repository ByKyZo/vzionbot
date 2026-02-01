import { randomUUID } from "crypto";
import { homedir } from "os";
import { join } from "path";
import { mkdirSync, existsSync, appendFileSync, readFileSync } from "fs";
import OpenAI from "openai";
import type {
  PatternType,
  HistoryResult,
  PreviousMessage,
  PatternRecord,
  SearchResult,
  SearchSummary,
} from "./types.js";

const DATA_DIR = join(homedir(), "clawd", "brain-guard");
const DATA_FILE = join(DATA_DIR, "patterns.jsonl");

// In-memory store for testing
let inMemoryStore: PatternRecord[] | null = null;

// OpenAI client cache
let openaiClient: OpenAI | null = null;
let embeddingAvailable: boolean | null = null; // null = not checked yet

/**
 * Initialize storage with options. Call before any other storage function.
 * @param options.inMemory - Use in-memory storage (for testing)
 */
export function initStorage(options?: { inMemory?: boolean }): void {
  if (options?.inMemory) {
    inMemoryStore = [];
  } else {
    inMemoryStore = null;
  }
  openaiClient = null;
}

export function closeStorage(): void {
  inMemoryStore = null;
  openaiClient = null;
  embeddingAvailable = null;
}

/**
 * Check if embedding provider is available (has OPENAI_API_KEY configured).
 * Caches the result after first check.
 */
export async function checkEmbeddingAvailable(): Promise<boolean> {
  if (embeddingAvailable !== null) {
    return embeddingAvailable;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    embeddingAvailable = false;
    return false;
  }

  try {
    // Test with a simple query to verify it works
    openaiClient = new OpenAI({ apiKey });
    await openaiClient.embeddings.create({
      model: "text-embedding-3-small",
      input: "test",
    });
    embeddingAvailable = true;
  } catch {
    embeddingAvailable = false;
    openaiClient = null;
  }

  return embeddingAvailable;
}

/**
 * Get cached embedding availability status (sync, returns null if not checked yet)
 */
export function isEmbeddingAvailable(): boolean | null {
  return embeddingAvailable;
}

function ensureDir(): void {
  if (!inMemoryStore && !existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

async function getEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    if (!openaiClient) {
      openaiClient = new OpenAI({ apiKey });
    }
    const response = await openaiClient.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  } catch {
    return null; // API error or no key
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
  return magnitude === 0 ? 0 : dot / magnitude;
}

export function loadRecords(): PatternRecord[] {
  if (inMemoryStore) {
    return inMemoryStore;
  }

  if (!existsSync(DATA_FILE)) {
    return [];
  }

  const content = readFileSync(DATA_FILE, "utf-8");
  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as PatternRecord);
}

export async function findSimilar(
  embedding: number[],
  excludeId?: string,
  limit: number = 5
): Promise<Array<PatternRecord & { similarity: number }>> {
  const records = loadRecords();

  return records
    .filter((r) => r.embedding && r.id !== excludeId)
    .map((r) => ({
      ...r,
      similarity: cosineSimilarity(embedding, r.embedding!),
    }))
    .filter((r) => r.similarity > 0.5)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

export async function recordPattern(params: {
  patternType: PatternType;
  message: string;
  messageId?: string;
  previousMessages?: PreviousMessage[];
  context?: string;
  sessionKey?: string;
}): Promise<{ id: string; similar: Array<PatternRecord & { similarity: number }> }> {
  ensureDir();

  // Generate embedding
  const embedding = await getEmbedding(params.message);

  const record: PatternRecord = {
    id: randomUUID(),
    ts: new Date().toISOString(),
    pattern: params.patternType,
    message: params.message.slice(0, 1000),
    messageId: params.messageId ?? null,
    previousMessages: params.previousMessages ?? null,
    context: params.context?.slice(0, 2000) ?? null,
    sessionKey: params.sessionKey ?? null,
    embedding,
  };

  if (inMemoryStore) {
    inMemoryStore.push(record);
  } else {
    appendFileSync(DATA_FILE, JSON.stringify(record) + "\n");
  }

  // Find similar patterns
  const similar = embedding ? await findSimilar(embedding, record.id) : [];

  return { id: record.id, similar };
}

export function getHistory(params: {
  patternType?: PatternType;
  days?: number;
}): HistoryResult {
  const days = params.days ?? 7;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const records = loadRecords();

  // Filter by date and pattern
  let entries = records.filter((r) => new Date(r.ts) >= cutoff);
  if (params.patternType) {
    entries = entries.filter((r) => r.pattern === params.patternType);
  }

  // Sort by date descending
  entries.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  return {
    summary: {
      count: entries.length,
    },
    entries: entries.map((r) => ({
      date: r.ts,
      pattern: r.pattern,
      message: r.message,
      messageId: r.messageId,
      previousMessages: r.previousMessages,
      context: r.context,
    })),
  };
}

export async function searchRecords(params: {
  query?: string;
  type?: PatternType;
  days?: number;
}): Promise<{
  results: SearchResult[];
  summary: SearchSummary;
}> {
  const days = params.days ?? 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  let records = loadRecords().filter((r) => new Date(r.ts) >= cutoff);

  // Filter by type if specified
  if (params.type) {
    records = records.filter((r) => r.pattern === params.type);
  }

  // Calculate summary
  const byType: Record<string, number> = {};
  for (const r of records) {
    byType[r.pattern] = (byType[r.pattern] || 0) + 1;
  }
  const summary: SearchSummary = {
    total: records.length,
    byType,
  };

  // If no query, return all matching records
  if (!params.query) {
    return {
      results: records.map((r) => ({
        date: r.ts,
        pattern: r.pattern,
        message: r.message,
        matchType: "exact" as const,
        messageId: r.messageId,
        previousMessages: r.previousMessages,
        context: r.context,
      })),
      summary,
    };
  }

  // Semantic search
  const queryVector = await getEmbedding(params.query);
  if (!queryVector) {
    return { results: [], summary: { total: 0, byType: {} } };
  }

  const scored = records
    .filter((r) => r.embedding)
    .map((r) => ({
      ...r,
      similarity: cosineSimilarity(queryVector, r.embedding!),
    }))
    .filter((r) => r.similarity > 0.5)
    .sort((a, b) => b.similarity - a.similarity);

  return {
    results: scored.map((r) => ({
      date: r.ts,
      pattern: r.pattern,
      message: r.message,
      similarity: r.similarity,
      matchType: "semantic" as const,
      messageId: r.messageId,
      previousMessages: r.previousMessages,
      context: r.context,
    })),
    summary,
  };
}
