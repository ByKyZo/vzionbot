import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { handleBrainGuardTool, type BrainGuardParams } from "./tool.js";
import { initStorage, closeStorage } from "./storage.js";
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

describe("brain_guard tool", () => {
  beforeEach(() => {
    // Set the API key BEFORE storage operations
    process.env.OPENAI_API_KEY = "test-key-for-mocking";
    initStorage({ inMemory: true });
  });

  afterEach(() => {
    closeStorage();
    vi.clearAllMocks();
  });

  describe("record action", () => {
    it("requires pattern", async () => {
      const result = await handleBrainGuardTool(
        { action: "record", message: "test" } as BrainGuardParams,
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("pattern");
    });

    it("requires message", async () => {
      const result = await handleBrainGuardTool(
        { action: "record", pattern: "delegation" } as BrainGuardParams,
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("message");
    });

    it("returns recorded info with id", async () => {
      const result = await handleBrainGuardTool(
        {
          action: "record",
          pattern: "delegation",
          message: "fais-le pour moi",
        },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.recorded).toBeDefined();
      expect(result.recorded?.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(result.recorded?.pattern).toBe("delegation");
    });

    it("returns byType with count", async () => {
      const result = await handleBrainGuardTool(
        {
          action: "record",
          pattern: "delegation",
          message: "fais-le pour moi",
        },
        {}
      );

      expect(result.byType).toBeDefined();
      expect(result.byType?.count).toBe(1);
    });

    it("returns similar patterns array", async () => {
      // First record
      await handleBrainGuardTool(
        { action: "record", pattern: "delegation", message: "fais-le pour moi" },
        {}
      );

      // Second record with similar message
      const result = await handleBrainGuardTool(
        { action: "record", pattern: "no_reflection", message: "fais ça" },
        {}
      );

      expect(result.similar).toBeDefined();
      expect(Array.isArray(result.similar)).toBe(true);
    });

    it("passes sessionKey to storage", async () => {
      const result = await handleBrainGuardTool(
        { action: "record", pattern: "delegation", message: "test" },
        { sessionKey: "session_123" }
      );

      expect(result.success).toBe(true);
    });

    it("handles previousMessages", async () => {
      const result = await handleBrainGuardTool(
        {
          action: "record",
          pattern: "delegation",
          message: "test",
          previousMessages: [{ id: "p1", text: "previous" }],
        },
        {}
      );

      expect(result.success).toBe(true);
    });
  });

  describe("search action", () => {
    beforeEach(async () => {
      // Seed data
      await handleBrainGuardTool(
        { action: "record", pattern: "delegation", message: "fais-le pour moi" },
        {}
      );
      await handleBrainGuardTool(
        { action: "record", pattern: "vocabulary", message: "c'est quoi une API" },
        {}
      );
    });

    it("requires at least query, type, or days", async () => {
      const result = await handleBrainGuardTool(
        { action: "search" } as BrainGuardParams,
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("query, type, or days");
    });

    it("searches by semantic query", async () => {
      const result = await handleBrainGuardTool(
        { action: "search", query: "fais le travail" },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.results).toBeDefined();
    });

    it("filters by type", async () => {
      const result = await handleBrainGuardTool(
        { action: "search", type: "delegation" },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.results?.every((r) => r.pattern === "delegation")).toBe(true);
    });

    it("filters by days", async () => {
      const result = await handleBrainGuardTool(
        { action: "search", days: 7 },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
    });

    it("returns summary with counts by type", async () => {
      const result = await handleBrainGuardTool(
        { action: "search", days: 30 },
        {}
      );

      expect(result.summary?.total).toBe(2);
      expect(result.summary?.byType).toBeDefined();
    });
  });

  describe("unknown action", () => {
    it("returns error", async () => {
      const result = await handleBrainGuardTool(
        { action: "invalid" } as any,
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown action");
    });
  });
});
