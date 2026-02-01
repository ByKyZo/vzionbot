export type PatternType =
  | "delegation"
  | "no_reflection"
  | "repetitive"
  | "vocabulary"
  | "clarity";

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

// Pattern record with UUID id for database storage
export interface PatternRecord {
  id: string; // UUID
  ts: string;
  pattern: PatternType;
  message: string;
  messageId: string | null;
  previousMessages: PreviousMessage[] | null;
  context: string | null;
  sessionKey: string | null;
  embedding: number[] | null;
}

// Search functionality types
export interface SearchResult {
  date: string;
  pattern: PatternType;
  message: string;
  similarity?: number;
  matchType: "semantic" | "exact";
  messageId?: string | null;
  previousMessages?: PreviousMessage[] | null;
  context?: string | null;
}

export interface SearchSummary {
  total: number;
  byType: Record<string, number>;
}

export interface SearchResponse {
  results: SearchResult[];
  summary: SearchSummary;
}

export interface Cluster {
  anchor: PatternRecord;
  members: Array<PatternRecord & { similarity: number }>;
}

// Record action response
export interface RecordResponse {
  success: true;
  recorded: {
    id: string;
    pattern: PatternType;
    message: string;
  };
  byType: {
    count: number;
    entries: Array<{
      date: string;
      message: string;
    }>;
  };
  similar: Array<{
    date: string;
    pattern: PatternType;
    message: string;
    similarity: number;
  }>;
}
