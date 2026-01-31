import { Type } from "@sinclair/typebox";
import { recordPattern, getHistory } from "./storage.js";
import type { PatternType, HistoryResult, PreviousMessage } from "./types.js";

const PATTERN_TYPES = [
  "delegation",
  "no_reflection",
  "repetitive",
  "vocabulary",
  "clarity",
] as const;

const ACTION_TYPES = ["record", "history"] as const;

// Use Type.Unsafe with enum instead of Type.Union to avoid anyOf in schema
function stringEnum<T extends readonly string[]>(values: T) {
  return Type.Unsafe<T[number]>({
    type: "string",
    enum: [...values],
  });
}

function optionalStringEnum<T extends readonly string[]>(values: T) {
  return Type.Optional(stringEnum(values));
}

const PreviousMessageSchema = Type.Object({
  id: Type.String({ description: "Message identifier" }),
  text: Type.String({ description: "Message content. Copy exact text, do not paraphrase." }),
});

export const brainGuardSchema = Type.Object({
  action: Type.Unsafe<"record" | "history">({
    type: "string",
    enum: ["record", "history"],
    description: "Action to perform: record a pattern or query history",
  }),
  pattern: Type.Optional(Type.Unsafe<PatternType>({
    type: "string",
    enum: [...PATTERN_TYPES],
    description: "Cognitive pattern type to record or filter",
  })),
  message: Type.Optional(Type.String({
    description: "The exact user message that shows the pattern. Copy verbatim, do not paraphrase.",
  })),
  messageId: Type.Optional(Type.String({
    description: "Unique identifier of the message",
  })),
  previousMessages: Type.Optional(Type.Array(PreviousMessageSchema, {
    description: "Array of previous messages for context. Copy exact message text, do not paraphrase.",
  })),
  context: Type.Optional(Type.String({
    description: "AI-generated summary of the conversation context",
  })),
  days: Type.Optional(Type.Number({
    description: "Number of days to look back in history (default: 7)",
  })),
});

export type BrainGuardParams = {
  action: "record" | "history";
  pattern?: PatternType;
  message?: string;
  messageId?: string;
  previousMessages?: PreviousMessage[];
  context?: string;
  days?: number;
};

export function handleBrainGuardTool(
  params: BrainGuardParams,
  ctx: { sessionKey?: string },
): { success: boolean; count?: number; entries?: HistoryResult["entries"]; data?: HistoryResult; error?: string } {
  try {
    if (params.action === "record") {
      if (!params.pattern) {
        return { success: false, error: "pattern is required for record action" };
      }
      if (!params.message) {
        return { success: false, error: "message is required for record action" };
      }

      recordPattern({
        patternType: params.pattern,
        message: params.message,
        messageId: params.messageId,
        previousMessages: params.previousMessages,
        context: params.context,
        sessionKey: ctx.sessionKey,
      });

      // Return history automatically
      const result = getHistory({
        patternType: params.pattern,
        days: params.days ?? 7,
      });

      return {
        success: true,
        count: result.summary.count,
        entries: result.entries,
      };
    }

    if (params.action === "history") {
      const result = getHistory({
        patternType: params.pattern,
        days: params.days,
      });

      return { success: true, data: result };
    }

    return { success: false, error: `Unknown action: ${params.action}` };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
