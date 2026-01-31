import Database from "better-sqlite3";
import { homedir } from "os";
import { join } from "path";
import { mkdirSync, existsSync } from "fs";
import type { PatternType, Trend, HistoryResult, PreviousMessage } from "./types.js";

const DB_DIR = join(homedir(), "clawd", "brain-guard");
const DB_PATH = join(DB_DIR, "brain-guard.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS patterns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  pattern_type TEXT NOT NULL,
  message TEXT NOT NULL,
  message_id TEXT,
  previous_messages TEXT,
  context TEXT,
  session_key TEXT
);

CREATE INDEX IF NOT EXISTS idx_patterns_timestamp ON patterns(timestamp);
CREATE INDEX IF NOT EXISTS idx_patterns_type ON patterns(pattern_type);
`;

const MIGRATIONS = [
  "ALTER TABLE patterns ADD COLUMN message_id TEXT",
  "ALTER TABLE patterns ADD COLUMN previous_messages TEXT",
];

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  if (!existsSync(DB_DIR)) {
    mkdirSync(DB_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);

  // Run migrations (ignore errors for already existing columns)
  for (const migration of MIGRATIONS) {
    try {
      db.exec(migration);
    } catch {
      // Column already exists, ignore
    }
  }

  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function recordPattern(params: {
  patternType: PatternType;
  message: string;
  messageId?: string;
  previousMessages?: PreviousMessage[];
  context?: string;
  sessionKey?: string;
}): number {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO patterns (pattern_type, message, message_id, previous_messages, context, session_key)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    params.patternType,
    params.message.slice(0, 1000),
    params.messageId ?? null,
    params.previousMessages ? JSON.stringify(params.previousMessages) : null,
    params.context?.slice(0, 2000) ?? null,
    params.sessionKey ?? null,
  );

  return result.lastInsertRowid as number;
}

interface PatternRow {
  id: number;
  timestamp: string;
  pattern_type: string;
  message: string;
  message_id: string | null;
  previous_messages: string | null;
  context: string | null;
  session_key: string | null;
}

export function getHistory(params: {
  patternType?: PatternType;
  days?: number;
}): HistoryResult {
  const database = getDb();
  const days = params.days ?? 7;

  // Get entries
  const entriesStmt = params.patternType
    ? database.prepare(`
        SELECT * FROM patterns
        WHERE pattern_type = ?
        AND timestamp >= datetime('now', '-' || ? || ' days')
        ORDER BY timestamp DESC
      `)
    : database.prepare(`
        SELECT * FROM patterns
        WHERE timestamp >= datetime('now', '-' || ? || ' days')
        ORDER BY timestamp DESC
      `);

  const rows = params.patternType
    ? (entriesStmt.all(params.patternType, days) as PatternRow[])
    : (entriesStmt.all(days) as PatternRow[]);

  const entries = rows.map((row) => ({
    date: row.timestamp,
    pattern: row.pattern_type as PatternType,
    message: row.message,
    messageId: row.message_id,
    previousMessages: row.previous_messages
      ? (JSON.parse(row.previous_messages) as PreviousMessage[])
      : null,
    context: row.context,
  }));

  // Calculate trend
  const trend = calculateTrend(params.patternType, days);

  return {
    summary: {
      count: entries.length,
      trend,
    },
    entries,
  };
}

function calculateTrend(patternType?: PatternType, days: number = 7): Trend {
  const database = getDb();

  const baseWhere = patternType
    ? `WHERE pattern_type = '${patternType}'`
    : "WHERE 1=1";

  const stmt = database.prepare(`
    SELECT
      (SELECT COUNT(*) FROM patterns ${baseWhere}
       AND timestamp >= datetime('now', '-${days} days')) as recent,
      (SELECT COUNT(*) FROM patterns ${baseWhere}
       AND timestamp >= datetime('now', '-${days * 2} days')
       AND timestamp < datetime('now', '-${days} days')) as previous
  `);

  const row = stmt.get() as { recent: number; previous: number };

  if (row.previous === 0) return "stable";
  const ratio = row.recent / row.previous;
  if (ratio > 1.3) return "up";
  if (ratio < 0.7) return "down";
  return "stable";
}
