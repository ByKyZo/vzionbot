import { Type } from "@sinclair/typebox";
import { recordPattern, getHistory } from "./storage.js";
import type { PatternType, HistoryResult } from "./types.js";

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

export const brainGuardSchema = Type.Object({
  action: stringEnum(ACTION_TYPES),
  pattern: optionalStringEnum(PATTERN_TYPES),
  message: Type.Optional(Type.String()),
  context: Type.Optional(Type.String()),
  days: Type.Optional(Type.Number()),
});

export type BrainGuardParams = {
  action: "record" | "history";
  pattern?: PatternType;
  message?: string;
  context?: string;
  days?: number;
};

export function handleBrainGuardTool(
  params: BrainGuardParams,
  ctx: { sessionKey?: string },
): { success: boolean; data?: HistoryResult; error?: string } {
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
        context: params.context,
        sessionKey: ctx.sessionKey,
      });

      return { success: true };
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
