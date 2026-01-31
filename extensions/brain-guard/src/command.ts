import { getHistory } from "./storage.js";
import type { PatternType, Trend } from "./types.js";

const TREND_EMOJI: Record<Trend, string> = {
  up: "↑",
  down: "↓",
  stable: "→",
};

export function handleBrainCommand(args?: string): { text: string } {
  const days = args?.trim() ? parseInt(args.trim(), 10) || 7 : 7;

  const result = getHistory({ days });

  if (result.entries.length === 0) {
    return { text: `🧠 BrainGuard - last ${days} days\n\nNo pattern detected. 🎉` };
  }

  // Group by pattern type
  const byType = new Map<PatternType, number>();
  for (const entry of result.entries) {
    byType.set(entry.pattern, (byType.get(entry.pattern) ?? 0) + 1);
  }

  // Build summary
  const lines: string[] = [`🧠 BrainGuard - last ${days} days\n`];

  for (const [pattern, count] of byType.entries()) {
    const patternHistory = getHistory({ patternType: pattern, days });
    const trend = patternHistory.summary.trend;
    lines.push(`${pattern}: ${count} ${TREND_EMOJI[trend]} ${trend}`);
  }

  // Recent entries
  lines.push("\nRecent patterns:");
  for (const entry of result.entries.slice(0, 5)) {
    const date = new Date(entry.date);
    const ago = getTimeAgo(date);
    const preview = entry.message.slice(0, 40);
    lines.push(`• ${ago} - ${entry.pattern} - "${preview}..."`);
  }

  return { text: lines.join("\n") };
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
