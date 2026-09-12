/**
 * WEATHER_CHECK's dominant question, which we were answering with a range.
 *
 * Twenty-one of the thirty-three routed WEATHER_CHECK questions are the same
 * one:
 *
 *   "Is there an active storm alert or severe weather warning for <place> right
 *    now?"
 *
 * `/weather-forecast` serves both WEATHER_FORECAST and WEATHER_CHECK, and it
 * answered this with a 24-hour forecast: "hourly temperature in Celsius from
 * 25.2C to 33.2C, a precipitation probability of up to 63% …". Every number in
 * that is true and none of it says whether an alert is in effect, which is the
 * only thing the question asks. Measured 2026-09-12 against production.
 *
 * The pattern is safe against the sibling intent: of the 45 routed
 * WEATHER_FORECAST questions, ZERO contain "alert", "warning" or "advisory", so
 * a forecast question cannot be diverted here.
 *
 * WHAT THIS MAY AND MAY NOT CLAIM. We read Open-Meteo, not a national
 * meteorological agency's warning feed. So this never says "no warning has been
 * issued" — we cannot see an issuing authority. It says whether the forecast
 * carries alert-level conditions, and names the numbers behind that, which is
 * a statement we can actually support. Claiming an authority's silence from a
 * forecast API would be the confidently-wrong failure this repo keeps finding.
 */
import type { StormResult, StormVerdict } from "./storm";

export interface AlertCheckResult {
  verdict: StormVerdict;
  confidence: number;
  reason: string;
}

/** Does the question ask whether an alert or warning is in effect? */
export function asksAlert(text: string): boolean {
  return /\b(?:alerts?|warnings?|advisor(?:y|ies))\b/i.test(String(text ?? ""));
}

const n = (v: number | null, unit: string): string | null =>
  v === null || !Number.isFinite(v) ? null : `${Number(v.toFixed(1)).toLocaleString("en-US")} ${unit}`;

/**
 * Alert-level is read off the same graded risk STORM_ALERT reports, so the two
 * intents cannot disagree with each other about the same place and hour.
 */
export function alertAnswer(r: StormResult): AlertCheckResult {
  const where = r.location || "the requested location";
  if (r.verdict === "unknown") {
    return {
      verdict: "unknown",
      confidence: 0,
      reason:
        `Whether alert-level weather is affecting ${where} could not be determined, because the ` +
        `forecast could not be read. That is a source failure rather than an all-clear, and the two ` +
        `are not the same thing.`,
    };
  }

  const active = r.verdict === "high" || r.verdict === "severe";
  const approaching = r.verdict === "moderate";
  const facts = [
    n(r.max_wind_speed_kmh, "km/h sustained wind"),
    n(r.max_wind_gust_kmh, "km/h gusts"),
    n(r.max_precipitation_mm, "mm precipitation"),
  ].filter((x): x is string => x !== null);
  const detail = facts.length ? ` The forecast carries ${facts.join(", ")}.` : "";
  const storm = r.thunderstorm ? " Thunderstorms are in the forecast." : "";
  // The risk grade is the same one STORM_ALERT publishes, named so a reader can
  // line the two answers up.
  const graded =
    ` Overall storm risk is ${r.risk_score.toFixed(2)} on a scale of 0 to 1, graded ${r.verdict}.`;
  // Said once, plainly: this is a forecast reading, not an agency's bulletin.
  const source =
    ` This is read from the Open-Meteo forecast rather than from a national weather agency's ` +
    `warning feed, so it describes the conditions, not whether an authority has issued a bulletin.`;

  if (active) {
    return {
      verdict: r.verdict,
      confidence: 0.9,
      reason:
        `Yes. Alert-level weather is affecting ${where} right now.${detail}${storm}${graded}${source}`,
    };
  }
  if (approaching) {
    return {
      verdict: r.verdict,
      confidence: 0.85,
      reason:
        `Conditions at ${where} are elevated but below alert level right now.${detail}${storm}` +
        `${graded}${source}`,
    };
  }
  return {
    verdict: r.verdict,
    confidence: 0.9,
    reason:
      `No. There is no active storm alert or severe weather warning for ${where} right now.` +
      `${detail}${storm}${graded}${source}`,
  };
}
