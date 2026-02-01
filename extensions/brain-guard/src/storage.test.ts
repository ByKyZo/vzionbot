import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  recordPattern,
  searchRecords,
  getHistory,
  findSimilar,
  initStorage,
  closeStorage,
  loadRecords,
} from "./storage.js";
import { generateMockEmbedding } from "./test-utils.js";

// Mock the OpenAI module
vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    embeddings: {
      create: vi.fn().mockImplementation(({ input }: { input: string }) => {
        return Promise.resolve({
          data: [{ embedding: generateMockEmbedding(input) }],
        });
      }),
    },
  })),
}));

describe("storage", () => {
  beforeEach(() => {
    // Set the API key BEFORE storage operations
    process.env.OPENAI_API_KEY = "test-key-for-mocking";
    initStorage({ inMemory: true });
  });

  afterEach(() => {
    closeStorage();
    vi.clearAllMocks();
  });

  describe("recordPattern", () => {
    it("records and returns id", async () => {
      const result = await recordPattern({
        patternType: "delegation",
        message: "fais-le pour moi",
      });

      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    });

    it("stores embedding with record", async () => {
      await recordPattern({
        patternType: "delegation",
        message: "fais-le pour moi",
      });

      const records = loadRecords();
      expect(records[0].embedding).toBeDefined();
      expect(records[0].embedding).toHaveLength(4); // Mock = 4D
    });

    it("truncates long messages to 1000 chars", async () => {
      const longMessage = "x".repeat(2000);
      await recordPattern({
        patternType: "delegation",
        message: longMessage,
      });

      const records = loadRecords();
      expect(records[0].message).toHaveLength(1000);
    });

    it("truncates context to 2000 chars", async () => {
      const longContext = "y".repeat(3000);
      await recordPattern({
        patternType: "delegation",
        message: "test",
        context: longContext,
      });

      const records = loadRecords();
      expect(records[0].context).toHaveLength(2000);
    });

    it("stores all optional fields", async () => {
      await recordPattern({
        patternType: "delegation",
        message: "test",
        messageId: "msg_123",
        previousMessages: [{ id: "p1", text: "previous" }],
        context: "some context",
        sessionKey: "session_abc",
      });

      const records = loadRecords();
      expect(records[0].messageId).toBe("msg_123");
      expect(records[0].previousMessages).toHaveLength(1);
      expect(records[0].context).toBe("some context");
      expect(records[0].sessionKey).toBe("session_abc");
    });
  });

  describe("findSimilar", () => {
    it("returns empty when no records", async () => {
      const similar = await findSimilar([0.5, 0.5, 0.5, 0.5]);
      expect(similar).toEqual([]);
    });

    it("finds semantically similar records", async () => {
      // Record "delegation" type messages
      await recordPattern({
        patternType: "delegation",
        message: "fais-le pour moi",
      });
      await recordPattern({
        patternType: "no_reflection",
        message: "écris le code",
      });
      await recordPattern({
        patternType: "vocabulary",
        message: "c'est quoi une API",
      });

      // Query vector similar to "delegation" messages
      const delegationVector = [0.9, 0.1, 0.1, 0.1];
      const similar = await findSimilar(delegationVector);

      expect(similar.length).toBeGreaterThan(0);
      expect(similar[0].similarity).toBeGreaterThan(0.5);
    });

    it("excludes record by id", async () => {
      const { id } = await recordPattern({
        patternType: "delegation",
        message: "fais-le",
      });

      const similar = await findSimilar([0.9, 0.1, 0.1, 0.1], id);
      expect(similar.find((s) => s.id === id)).toBeUndefined();
    });

    it("respects limit parameter", async () => {
      for (let i = 0; i < 10; i++) {
        await recordPattern({
          patternType: "delegation",
          message: `fais le numéro ${i}`,
        });
      }

      const similar = await findSimilar([0.9, 0.1, 0.1, 0.1], undefined, 3);
      expect(similar).toHaveLength(3);
    });
  });

  describe("searchRecords", () => {
    beforeEach(async () => {
      await recordPattern({ patternType: "delegation", message: "fais-le pour moi" });
      await recordPattern({ patternType: "delegation", message: "écris le code" });
      await recordPattern({ patternType: "no_reflection", message: "dis-moi quoi faire" });
      await recordPattern({ patternType: "vocabulary", message: "c'est quoi une API" });
    });

    it("searches by semantic query", async () => {
      const result = await searchRecords({ query: "fais le travail" });

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0].matchType).toBe("semantic");
      expect(result.results[0].similarity).toBeDefined();
    });

    it("filters by type", async () => {
      const result = await searchRecords({ type: "delegation" });

      expect(result.results.every((r) => r.pattern === "delegation")).toBe(true);
      expect(result.summary.byType.delegation).toBe(2);
    });

    it("returns summary with counts by type", async () => {
      const result = await searchRecords({ days: 30 });

      expect(result.summary.total).toBe(4);
      expect(result.summary.byType).toEqual({
        delegation: 2,
        no_reflection: 1,
        vocabulary: 1,
      });
    });
  });

  describe("getHistory", () => {
    it("returns entries sorted by date descending", async () => {
      await recordPattern({ patternType: "delegation", message: "first" });
      await recordPattern({ patternType: "delegation", message: "second" });

      const result = getHistory({ patternType: "delegation" });

      const dates = result.entries.map((e) => new Date(e.date).getTime());
      expect(dates[0]).toBeGreaterThanOrEqual(dates[1]);
    });

    it("filters by pattern type", async () => {
      await recordPattern({ patternType: "delegation", message: "test1" });
      await recordPattern({ patternType: "vocabulary", message: "test2" });

      const result = getHistory({ patternType: "delegation" });

      expect(result.entries.every((e) => e.pattern === "delegation")).toBe(true);
    });
  });
});
