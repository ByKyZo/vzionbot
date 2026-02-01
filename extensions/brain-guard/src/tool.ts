import { Type } from "@sinclair/typebox";
import { recordPattern, getHistory, searchRecords } from "./storage.js";
import type { PatternType, HistoryResult, PreviousMessage } from "./types.js";

const PATTERN_TYPES = [
  "delegation",
  "no_reflection",
  "repetitive",
  "vocabulary",
  "clarity",
] as const;

const PreviousMessageSchema = Type.Object({
  id: Type.String({ description: "Message identifier" }),
  text: Type.String({ description: "Message content. Copy exact text, do not paraphrase." }),
});

export const brainGuardSchema = Type.Object({
  action: Type.Unsafe<"record" | "search">({
    type: "string",
    enum: ["record", "search"],
    description: "record=record a pattern, search=search patterns",
  }),

  // For record
  pattern: Type.Optional(Type.Unsafe<PatternType>({
    type: "string",
    enum: [...PATTERN_TYPES],
    description: "Pattern type (required for record)",
  })),
  message: Type.Optional(Type.String({
    description: "User message showing the pattern (required for record)",
  })),
  messageId: Type.Optional(Type.String({
    description: "Unique identifier of the message",
  })),
  previousMessages: Type.Optional(Type.Array(PreviousMessageSchema, {
    description: "Array of previous messages for context",
  })),
  context: Type.Optional(Type.String({
    description: "AI-generated summary of the conversation context",
  })),

  // For search
  query: Type.Optional(Type.String({
    description: "Semantic search query (for search action)",
  })),
  type: Type.Optional(Type.Unsafe<PatternType>({
    type: "string",
    enum: [...PATTERN_TYPES],
    description: "Filter by pattern type (for search action)",
  })),
  days: Type.Optional(Type.Number({
    description: "Days to look back (default: 7 for record, 30 for search)",
  })),
});

export type BrainGuardParams = {
  action: "record" | "search";
  pattern?: PatternType;
  message?: string;
  messageId?: string;
  previousMessages?: PreviousMessage[];
  context?: string;
  query?: string;
  type?: PatternType;
  days?: number;
};

export type BrainGuardResult = {
  success: boolean;
  recorded?: {
    id: string;
    pattern: PatternType;
    message: string;
  };
  byType?: {
    count: number;
    entries: Array<{ date: string; message: string }>;
  };
  similar?: Array<{
    date: string;
    pattern: PatternType;
    message: string;
    similarity: number;
  }>;
  results?: Array<{
    date: string;
    pattern: PatternType;
    message: string;
    similarity?: number;
    matchType: "semantic" | "exact";
  }>;
  summary?: {
    total: number;
    byType: Record<string, number>;
  };
  error?: string;
};

export async function handleBrainGuardTool(
  params: BrainGuardParams,
  ctx: { sessionKey?: string },
): Promise<BrainGuardResult> {
  console.log("[brain_guard] Called with:", JSON.stringify(params));

  try {
    if (params.action === "record") {
      if (!params.pattern) {
        return { success: false, error: "pattern is required for record action" };
      }
      if (!params.message) {
        return { success: false, error: "message is required for record action" };
      }

      const { id, similar } = await recordPattern({
        patternType: params.pattern,
        message: params.message,
        messageId: params.messageId,
        previousMessages: params.previousMessages,
        context: params.context,
        sessionKey: ctx.sessionKey,
      });

      // Get history for this pattern type
      const history = getHistory({
        patternType: params.pattern,
        days: params.days ?? 7,
      });

      const result: BrainGuardResult = {
        success: true,
        recorded: {
          id,
          pattern: params.pattern,
          message: params.message.slice(0, 100),
        },
        byType: {
          count: history.summary.count,
          entries: history.entries.slice(0, 5).map((e) => ({
            date: e.date,
            message: e.message.slice(0, 100),
          })),
        },
        similar: similar.map((s) => ({
          date: s.ts,
          pattern: s.pattern,
          message: s.message.slice(0, 100),
          similarity: s.similarity,
        })),
      };

      console.log("[brain_guard] Record success");
      return result;
    }

    if (params.action === "search") {
      // Require at least one filter
      if (!params.query && !params.type && !params.days) {
        return { success: false, error: "At least one of query, type, or days is required for search action" };
      }

      const searchResult = await searchRecords({
        query: params.query,
        type: params.type,
        days: params.days ?? 30,
      });

      const result: BrainGuardResult = {
        success: true,
        results: searchResult.results.map((r) => ({
          date: r.date,
          pattern: r.pattern,
          message: r.message.slice(0, 100),
          similarity: r.similarity,
          matchType: r.matchType,
        })),
        summary: searchResult.summary,
      };

      console.log("[brain_guard] Search success");
      return result;
    }

    return { success: false, error: `Unknown action: ${params.action}` };
  } catch (err) {
    console.error("[brain_guard] Error:", err);
    return { success: false, error: String(err) };
  }
}
