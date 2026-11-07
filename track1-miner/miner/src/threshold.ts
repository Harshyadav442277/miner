/**
 * Temperature-threshold questions: "Will Riyadh reach 40°C today?"
 *
 * The forecast route answered these with the whole range ("from 21.3°C to
 * 32.8°C …") and never said no (audit replay 2026-11-04, row 14). The answer to
 * a yes/no question is yes or no, so it comes first, from the same forecast.
 */

export interface TemperatureThreshold {
  /** "above": reach, exceed, hit, top, go over. "below": drop or fall below, go under. */
  direction: "above" | "below";
  celsius: number;
  /** The threshold as the question wrote it, e.g. "40°C" or "100°F". */
  asked: string;
}

// One way to match the spaces: adjacent `\s*` runs backtracked quadratically (331 ms on 32,000 spaces; push
// security review, 2026-11-07).
const NUMBER = String.raw`(-?\d{1,3}(?:\.\d+)?)\s*(?:(?:°|º|degrees?|deg)\s*)?(C|F|celsius|fahrenheit)\b`;
const ABOVE = new RegExp(String.raw`\b(?:reach|exceed|hit|top|surpass|pass|go (?:above|over)|be (?:above|over)|rise (?:above|to)|climb (?:above|to)|get (?:above|to|up to)|above|over)\s+` + NUMBER, "i");
const BELOW = new RegExp(String.raw`\b(?:drop|fall|dip|go|get|be)\s+(?:below|under|beneath|to)\s+` + NUMBER + String.raw`|\bbelow\s+` + NUMBER, "i");

function toThreshold(direction: "above" | "below", value: string, unit: string): TemperatureThreshold | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const f = /^f/i.test(unit);
  const celsius = f ? ((n - 32) * 5) / 9 : n;
  return { direction, celsius, asked: `${value}°${f ? "F" : "C"}` };
}

export function temperatureThreshold(text: string): TemperatureThreshold | null {
  const question = text.slice(0, 500);
  const b = question.match(BELOW);
  if (b) {
    const value = b[1] ?? b[3];
    const unit = b[2] ?? b[4];
    if (value && unit) return toThreshold("below", value, unit);
  }
  const a = question.match(ABOVE);
  if (a && a[1] && a[2]) return toThreshold("above", a[1], a[2]);
  return null;
}

const fmt = (c: number) => `${Math.round(c * 10) / 10}°C`;

/**
 * The yes/no sentence, or null when the forecast has no temperature to compare.
 * `place` is the resolved place name, `span` the window in words ("the next 24 hours").
 */
export function thresholdSentence(
  t: TemperatureThreshold,
  place: string,
  span: string,
  minC: number | null,
  maxC: number | null,
): string | null {
  const shown = /F$/.test(t.asked) ? `${t.asked} (${fmt(t.celsius)})` : t.asked;
  if (t.direction === "above") {
    if (maxC === null) return null;
    return maxC >= t.celsius
      ? `Yes: the forecast high for ${place} over ${span} is ${fmt(maxC)}, which reaches ${shown}.`
      : `No: the forecast high for ${place} over ${span} is ${fmt(maxC)}, below ${shown}.`;
  }
  if (minC === null) return null;
  return minC < t.celsius
    ? `Yes: the forecast low for ${place} over ${span} is ${fmt(minC)}, below ${shown}.`
    : `No: the forecast low for ${place} over ${span} is ${fmt(minC)}, which stays at or above ${shown}.`;
}
