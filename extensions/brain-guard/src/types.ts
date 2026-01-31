export type PatternType =
  | "delegation"
  | "no_reflection"
  | "repetitive"
  | "vocabulary"
  | "clarity";

export type Trend = "up" | "down" | "stable";

export interface PreviousMessage {
  id: string;
  text: string;
}

export interface PatternEntry {
  id: number;
  timestamp: string;
  patternType: PatternType;
  message: string;
  messageId: string | null;
  previousMessages: PreviousMessage[] | null;
  context: string | null;
  sessionKey: string | null;
}

export interface HistorySummary {
  count: number;
  trend: Trend;
}

export interface HistoryResult {
  summary: HistorySummary;
  entries: Array<{
    date: string;
    pattern: PatternType;
    message: string;
    messageId: string | null;
    previousMessages: PreviousMessage[] | null;
    context: string | null;
  }>;
}
