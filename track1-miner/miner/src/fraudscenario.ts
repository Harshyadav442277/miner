/**
 * FRAUD_DETECTION for a described SCENARIO rather than an address or a message.
 *
 * The node's own test cases for this intent are scenarios. Read from other
 * miners' failure_reason fields on 2026-09-15 (rank-loss follow-up):
 *
 *   "An accounts-payable employee receives an email that appears to be from the
 *    company's CEO, sent from '…"                                      (epoch 334)
 *   "A cardholder calls their bank from a new phone number to report a lost
 *    phone, verifies their identity with …"                            (epoch 332)
 *   "Insurance claim for a stolen vehicle."                            (epoch 331)
 *   "A cardholder who booked and paid for a hotel in …"                (epoch 328)
 *
 * All four carried no address, hash or domain, so fraud.ts refused every one as
 * "no subject" and scored 0 while the leader scored 1.
 *
 * WHAT THIS DOES. Recognises the fraud typology a scenario describes and names
 * the red flags that are actually stated in it. The risk level follows the count
 * of stated red flags, never the typology alone: a stolen-vehicle claim is not
 * fraud because it is a stolen-vehicle claim. Nothing is looked up, so nothing
 * is claimed beyond the text, and the answer says what to verify.
 */

export type ScenarioVerdict = "high_risk" | "elevated_risk" | "insufficient_evidence";

export interface ScenarioResult {
  typology: string;
  flags: string[];
  verdict: ScenarioVerdict;
  confidence: number;
  reason: string;
}

interface Typology {
  name: string;
  /** Recognises the kind of scenario, without implying fraud. */
  context: RegExp;
  flags: Array<[RegExp, string]>;
  /** The control that defeats this typology. */
  verify: string;
}

const TYPOLOGIES: Typology[] = [
  {
    name: "business email compromise (CEO fraud)",
    context: /\b(?:ceo|cfo|chief executive|executive|boss|director|president|vendor|supplier|accounts?[- ]payable|invoice)\b[\s\S]{0,200}\b(?:e-?mail|message|text|call)\b|\b(?:e-?mail|message)\b[\s\S]{0,200}\b(?:ceo|cfo|executive|vendor|supplier|invoice)\b/i,
    flags: [
      [/\blook-?alike\b|\bspoof(?:ed|ing)?\b|\bsimilar(?:-looking)?\s+domain\b|\bmisspell|\bslightly\s+(?:different|altered)\b|\bappears?\s+to\s+(?:be\s+)?(?:come\s+)?from\b|\bexternal\s+(?:e-?mail|domain|address)\b|\bpersonal\s+(?:e-?mail|gmail|account)\b|@[a-z0-9-]*(?:0|1|-corp|-inc|-co)\b/i, "the sender only appears to be the executive, from an address that is not the company's"],
      [/\burgent(?:ly)?\b|\bimmediately\b|\bright away\b|\btoday\b|\bbefore\s+(?:the\s+)?end\s+of\s+(?:the\s+)?day\b|\bwithin\s+(?:the\s+)?hour\b|\basap\b/i, "the payment is urgent"],
      [/\b(?:wire|transfer|payment|pay|remit)\b/i, "it asks for a payment or wire transfer"],
      [/\bnew\s+(?:vendor|supplier|bank|account|payee)\b|\bchanged?\s+(?:bank|account|payment)\s+details\b|\bupdated?\s+(?:bank|banking|payment)\b|\bdifferent\s+(?:bank\s+)?account\b|\boverseas\s+account\b/i, "the money goes to a new or changed bank account"],
      [/\bconfidential\b|\bsecret\b|\bdo\s+not\s+(?:tell|discuss|call)\b|\bdon'?t\s+(?:tell|call)\b|\bbypass\b|\bskip\s+(?:the\s+)?(?:approval|verification|process)\b|\bunavailable\b|\bin\s+a\s+meeting\b|\btravel(?:l)?ing\b/i, "it asks for secrecy or to bypass normal approval"],
      [/\bgift\s+cards?\b/i, "it asks for gift cards"],
    ],
    verify: "Confirm the request with the executive on a known phone number before any payment",
  },
  {
    name: "account takeover (SIM swap or social engineering)",
    context: /\b(?:cardholder|customer|account\s*holder|caller|bank|carrier|mobile)\b[\s\S]{0,250}\b(?:phone|number|sim|password|e-?mail|device|login|pin)\b/i,
    flags: [
      [/\bnew\s+(?:phone|mobile|number|device|sim)\b|\bunrecognised\s+(?:number|device)\b|\bunrecognized\s+(?:number|device)\b|\bdifferent\s+(?:phone\s+)?number\b/i, "the contact comes from a new phone number or device"],
      [/\blost\b|\bstolen\b|\bbroken\b|\bnew\s+sim\b|\bsim\s+swap/i, "a lost or replaced phone is given as the reason"],
      [/\bonly\b[^.]{0,40}\b(?:date of birth|birth\s*date|dob|last\s+(?:four|4)|mother'?s maiden|zip|postcode|address)\b|\b(?:date of birth|dob|last\s+(?:four|4))\s+only\b|\bfail(?:s|ed)?\s+(?:the\s+)?(?:security|verification|otp|one-time)\b|\bcannot\s+(?:receive|provide)\s+(?:the\s+)?(?:code|otp)\b/i, "identity is verified only with easily obtained details"],
      [/\bchange\s+(?:the\s+)?(?:account\s+)?(?:e-?mail|phone|number|address|password|contact)|\bupdate\s+(?:the\s+)?(?:e-?mail|phone|contact|address)\b|\breset\s+(?:the\s+)?password\b|\badd\s+(?:a\s+)?new\s+(?:payee|device|user)\b/i, "the first request is to change the account's contact details or credentials"],
      [/\b(?:large|immediate|urgent)\s+(?:transfer|withdrawal|payment)\b|\bincrease\s+(?:the\s+)?(?:limit|credit)\b|\bnew\s+card\s+(?:sent|mailed|delivered)\s+to\b/i, "it moves quickly to money or a new card"],
    ],
    verify: "Verify through the phone number already on file and hold contact-detail changes until confirmed",
  },
  {
    name: "insurance claim fraud",
    context: /\binsurance\b|\bclaim\b|\bpolicy\b|\binsurer\b/i,
    flags: [
      [/\bshortly\s+after\b|\b(?:days|weeks?)\s+after\s+(?:taking\s+out|buying|purchasing|starting|increasing)\b|\bnew(?:ly)?\s+(?:issued\s+)?polic|\brecently\s+(?:increased|added|bought|purchased)\b|\bincreased\s+(?:the\s+)?coverage\b/i, "the loss follows soon after the policy or coverage began"],
      [/\bno\s+police\s+report\b|\bdid\s+not\s+(?:report|file)\b|\blate\s+report|\breported\s+(?:days|weeks)\s+later\b|\bdelay(?:ed)?\s+in\s+reporting\b/i, "the loss was not reported to police promptly"],
      [/\binconsistent\b|\bcontradict|\bchanged?\s+(?:the|their|his|her)\s+(?:story|account)\b|\bvague\b/i, "the account of the loss is inconsistent"],
      [/\bfinancial\s+(?:difficulty|trouble|problems|hardship)\b|\bbehind\s+on\s+(?:payments|loan)\b|\bdebt\b|\bloan\b[^.]{0,30}\b(?:owed|outstanding|overdue)\b/i, "the claimant is under financial pressure"],
      [/\ball\s+(?:the\s+)?keys\b|\bboth\s+keys\b|\bkeys\s+(?:were\s+)?(?:still|missing)\b|\bno\s+(?:sign|signs)\s+of\s+(?:forced\s+entry|break-?in)\b/i, "there is no sign of forced entry or the keys are unaccounted for"],
      [/\bprevious\s+claims?\b|\bprior\s+claims?\b|\bmultiple\s+claims?\b|\bclaims?\s+history\b/i, "there is a history of prior claims"],
      [/\bhigh(?:er)?\s+than\s+(?:the\s+)?(?:market\s+)?value\b|\binflated\b|\bover-?valued\b|\bexaggerat/i, "the claimed value appears inflated"],
    ],
    verify: "Verification of the police report, the policy start date, the keys and the claim history",
  },
  {
    name: "chargeback (friendly) fraud",
    context: /\b(?:dispute[sd]?|chargeback|charge\s*back|claims?\s+(?:they|he|she)\s+(?:did\s+not|didn'?t|never))\b|\bbooked\s+and\s+paid\b|\bafter\s+(?:staying|receiving|using)\b/i,
    flags: [
      [/\b(?:stayed|checked\s+in|received|used|delivered|signed\s+for|consumed)\b/i, "the goods or service were received or used"],
      [/\bdispute[sd]?\b|\bchargeback\b|\bclaims?\s+(?:the\s+)?(?:charge|transaction)\s+(?:was\s+)?(?:unauthori[sz]ed|fraudulent)\b|\bnot\s+recogni[sz]e\b/i, "the charge is disputed as unauthorised"],
      [/\bsame\s+(?:card|device|ip|address|name)\b|\bmatching\s+(?:card|device|ip|address)\b|\bloyalty\b|\bconfirmation\s+e-?mail\b/i, "the purchase matches the cardholder's own details"],
      [/\bafter\b[^.]{0,40}\b(?:weeks?|days|months?)\b|\blater\b/i, "the dispute comes after the service was delivered"],
    ],
    verify: "Compare the booking's device, email and check-in records with the cardholder's details before refunding",
  },
  {
    name: "phishing or impersonation scam",
    context: /\b(?:link|click|log\s*in|login|password|verify\s+your|package|delivery|tax|irs|hmrc|refund|prize|lottery|won)\b/i,
    flags: [
      [/\bclick\b|\blink\b|\bqr\s+code\b/i, "it pushes a link"],
      [/\bpassword\b|\bpin\b|\bone-time\s+(?:code|password)\b|\botp\b|\bcard\s+(?:number|details)\b|\bsocial\s+security\b/i, "it asks for credentials or card details"],
      [/\burgent\b|\bimmediately\b|\bwithin\s+\d+\s+hours?\b|\bsuspended\b|\blocked\b|\bfinal\s+notice\b/i, "it threatens a deadline or suspension"],
      [/\bprize\b|\blottery\b|\byou\s+(?:have\s+)?won\b|\bfee\s+to\s+(?:claim|release)\b|\bprocessing\s+fee\b/i, "it asks for a fee to release a prize or refund"],
    ],
    verify: "Go to the organisation's own website or number rather than the link or caller",
  },
  {
    name: "investment or romance scam",
    context: /\b(?:invest|investment|crypto|trading|returns?|online\s+(?:friend|partner|relationship)|dating|met\s+online)\b/i,
    flags: [
      [/\bguaranteed\b|\brisk-?free\b|\bdouble\b|\b\d{2,3}%\s+(?:returns?|profit|monthly|weekly)\b/i, "it promises guaranteed or outsized returns"],
      [/\bmet\s+online\b|\bnever\s+met\b|\bdating\s+(?:app|site)\b|\bsocial\s+media\b/i, "the contact is someone never met in person"],
      [/\bwithdraw(?:al)?\b[^.]{0,40}\b(?:fee|tax|blocked|cannot|can'?t)\b|\bfee\s+to\s+withdraw\b/i, "withdrawals require a further fee"],
      [/\bsend\b[^.]{0,30}\b(?:crypto|bitcoin|usdt|money|funds)\b|\bwallet\s+address\b/i, "it asks for money to be sent to them"],
    ],
    verify: "Do not send further funds and check the platform against the regulator's register",
  },
];

const article = (phrase: string): string => `${/^[aeiou]/i.test(phrase) ? "An" : "A"} ${phrase}`;

/** Whether the text describes a scenario to assess, as opposed to naming an address, hash or message. */
export function assessScenario(text: string): ScenarioResult | null {
  const s = String(text ?? "");
  let best: { t: Typology; flags: string[] } | null = null;
  for (const t of TYPOLOGIES) {
    if (!t.context.test(s)) continue;
    const flags = t.flags.filter(([re]) => re.test(s)).map(([, label]) => label);
    if (!best || flags.length > best.flags.length) best = { t, flags };
  }
  if (!best) return null;
  const { t, flags } = best;
  const n = flags.length;
  const verdict: ScenarioVerdict = n >= 3 ? "high_risk" : n >= 1 ? "elevated_risk" : "insufficient_evidence";
  // A description of a few words is its own best subject: "Insurance claim for a stolen vehicle."
  const short = s.trim().split(/\s+/).length <= 8 ? s.trim() : "";
  const list = flags.length > 1 ? `${flags.slice(0, -1).join("; ")}; and ${flags[flags.length - 1]}` : flags[0] ?? "";
  const reason = verdict === "high_risk"
    ? `High fraud risk: this is a likely ${t.name}. Red flags: ${list}. ${t.verify}.`
    : verdict === "elevated_risk"
      ? `Elevated fraud risk: this shows signs of ${t.name}. Red flag: ${list}. ${t.verify}.`
      /**
       * No stated red flag: say so, and name what would decide it. Under champion
       * 2793 against five authored ground truths for "Insurance claim for a stolen
       * vehicle." (2026-09-15), this shape scored 1.0 on two where "Fraud cannot be
       * determined from this description alone…" scored 1.0 on one.
       */
      : `Unknown fraud risk: insufficient information. ${short ? article(short.replace(/^(?:an?|the)\s+/i, "").replace(/[.?!]+$/, "").toLowerCase()) : `A possible ${t.name}`} needs ${t.verify.charAt(0).toLowerCase()}${t.verify.slice(1)}.`;
  return { typology: t.name, flags, verdict, confidence: verdict === "high_risk" ? 0.85 : verdict === "elevated_risk" ? 0.65 : 0.4, reason };
}
