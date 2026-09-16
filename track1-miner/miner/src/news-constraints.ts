/** Constraints for headline lists, independent of the NEWS_SEARCH answer path. */
const NUMBERS: Record<string, number> = { one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10 };
const number = (s: string) => NUMBERS[s.toLowerCase()] ?? Number(s);

export function headlineCount(query: string): number | null {
  const m = query.match(/\b(?:top|latest|first|give(?:\s+me)?|show(?:\s+me)?|list|find)\s+(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\b/i)
    ?? query.match(/\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:[\w-]+\s+){0,5}headlines?\b/i);
  return m?.[1] ? Math.max(1, Math.min(10, number(m[1]))) : null;
}

export interface HeadlineWindow { start: number; end: number; label: string }
export function headlineWindow(query: string, now: number): HeadlineWindow | null {
  const relative = query.match(/\b(?:last|past|previous)\s+(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten)\s+(hours?|days?|weeks?)\b/i);
  if (relative) {
    const n = number(relative[1]!);
    const unit = relative[2]!.toLowerCase().replace(/s$/, "");
    const duration = n * (unit === "hour" ? 3600000 : unit === "day" ? 86400000 : 604800000);
    if (n > 0) return { start: now-duration, end: now, label:`in the last ${n} ${unit}${n === 1 ? "" : "s"}` };
  }
  // A caller-specified offset is honored. Without one, explicitly label UTC.
  const ist = /\b(?:IST|Asia\/Kolkata|Asia\/Calcutta)\b/i.test(query);
  const offset = ist ? 330*60000 : 0;
  const zone = ist ? "IST" : "UTC";
  const today = Math.floor((now+offset)/86400000)*86400000-offset;
  if (/\byesterday\b/i.test(query)) return { start:today-86400000, end:today-1, label:`yesterday (${zone})` };
  if (/\btoday\b/i.test(query)) return { start:today, end:now, label:`today (${zone})` };
  const date = query.match(/\b(?:on|dated|for)\s+(\d{4}-\d{2}-\d{2})\b/i)?.[1];
  if (date) {
    const start = Date.parse(date+"T00:00:00Z");
    if (Number.isFinite(start) && new Date(start).toISOString().slice(0,10) === date)
      return { start:start-offset, end:start-offset+86400000-1, label:`on ${date} (${zone})` };
  }
  return null;
}
