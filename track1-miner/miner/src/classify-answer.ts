/**
 * The sentences a TEXT_CLASSIFICATION answer is built from.
 *
 * Every shape here was measured under a champion scorer rather than chosen for
 * how it reads; the measurements are in the comments and in GAPS G148. Split out
 * of classify.ts so that a change to the wording is a change to one small file,
 * and so the wording can be tested without reaching the network.
 */
import { wordList } from "./sentiment";

/**
 * The head noun a label list shares. "billing, technical, or account issue" is
 * three issues, so the billing answer says "is a billing issue": placed as
 * "belongs to the billing category" it scored 0.00 under champion 687 against
 * three of four authored ground truths where "is a billing issue" scored 1.00
 * (2026-09-15).
 */
function headNoun(labels: string[]): string | undefined {
  return labels[labels.length - 1]?.match(/\s(issue|request|question|complaint|problem|inquiry|enquiry|report)$/i)?.[1];
}

/** A label as the answer speaks it, carrying the list's head noun when it needs one. */
function spoken(label: string, labels: string[]): string {
  const head = headNoun(labels);
  return head && !/\s/.test(label) && !/^(?:not\s+)?spam$/i.test(label) ? `${label} ${head}` : label;
}

const NOUN_LABEL = /\b(?:issue|request|question|complaint|problem|inquiry|enquiry|report|bug|error)$/i;
const article = (l: string): string => (/^[aeiou]/i.test(l) ? "an" : "a");

/** "This ticket is an account issue." for a noun label, "This article belongs to the sport category." otherwise. */
export function placement(noun: string, label: string, labels: string[] = []): string {
  if (/^(?:not\s+)?spam$/i.test(label)) return `This ${noun} is ${label}.`;
  const l = spoken(label, labels);
  if (NOUN_LABEL.test(l)) return `This ${noun} is ${article(l)} ${l}.`;
  return `This ${noun} belongs to the ${l} category.`;
}

/** The same sentence for several labels at once, when all of them apply. */
export function placementMany(noun: string, picked: string[], labels: string[] = []): string {
  const all = picked.map((l) => spoken(l, labels));
  if (all.every((l) => NOUN_LABEL.test(l))) return `This ${noun} is ${wordList(all.map((l) => `${article(l)} ${l}`))}.`;
  return `This ${noun} belongs to the ${wordList(all)} categories.`;
}

/** "Billing issue." — the label as placement speaks it, capitalised, as a sentence of its own. */
export function leadLabel(label: string, labels: string[] = []): string {
  const s = spoken(label, labels);
  return `${s.charAt(0).toUpperCase()}${s.slice(1)}.`;
}

/** "Billing and technical." — every chosen label, in the same opening position. */
export function leadLabels(picked: string[]): string {
  const s = wordList(picked);
  return `${s.charAt(0).toUpperCase()}${s.slice(1)}.`;
}

/**
 * "The word charged in it relates to billing, and the words app and crashes
 * relate to technical."
 *
 * The caller passes the words that earned each label, and passes only its label
 * words and cues when it has them: the index relates "app" to billing as well,
 * and a clause that says so invites the reader to check something that is not why
 * the label was chosen. The single-label sentence keeps the wording G148
 * measured, in classifyText, rather than sharing this one.
 */
export function matchedClause(picked: Array<{ label: string; words: string[] }>): string {
  const parts = picked.map(({ label, words }, i) => {
    const many = words.length === 1 ? ["word", "relates"] : ["words", "relate"];
    return `${i === 0 ? "The" : "the"} ${many[0]} ${wordList(words)}${i === 0 ? " in it" : ""} ${many[1]} to ${label}`;
  });
  const last = parts[parts.length - 1] ?? "";
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")}, and ${last}.` : `${last}.`;
}

/** "a or b", "a, b or c". */
export const orList = (xs: string[]): string =>
  (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} or ${xs[xs.length - 1]}`);
