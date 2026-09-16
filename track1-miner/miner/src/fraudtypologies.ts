/**
 * FRAUD_DETECTION scenario catalogue — the shared shape, and the typologies
 * whose evidence is what a MESSAGE or a CLAIM says.
 *
 * Split out of fraudscenario.ts on 2026-09-16 so neither file grows past
 * reading size. The companion catalogue, fraudaccount.ts, holds the typologies
 * whose evidence is what an ACCOUNT or a CARD did — the node tests both.
 *
 * The rule both catalogues obey: a typology name is not a verdict. The risk
 * level follows the count of red flags the text actually states, so a
 * stolen-vehicle claim is not fraud because it is a stolen-vehicle claim.
 */

/** A label may quote the text that matched, so the answer names the indicator. */
export type FlagLabel = string | ((m: RegExpMatchArray) => string);

export interface FlagSpec {
  re: RegExp;
  label: FlagLabel;
}

export interface Typology {
  name: string;
  /**
   * What the text is describing, as a plain noun phrase. Used by the
   * no-evidence answer, which has to name the thing it could not grade — a
   * truncated question ("The credit account activity described below is f…")
   * is not its own subject.
   */
  subject: string;
  /** Recognises the kind of scenario, without implying fraud. */
  context: RegExp;
  flags: FlagSpec[];
  /**
   * Controls the text states as ALREADY carried out: a verified payee, an
   * unchanged bank account, a callback to the number on file. They decide only
   * the no-red-flag case — low risk rather than unknown — and never cancel a
   * stated red flag. Most are phrased as a negation, and the engine's rule
   * keeps them: a pattern that starts at the negation cue is reading the
   * absence, not being cancelled by it.
   */
  clears?: FlagSpec[];
  /** Imperative: the control that defeats this typology. */
  verify: string;
  /** Noun phrase for the no-evidence answer ("… needs <needs>."). Defaults to `verify`, lower-cased. */
  needs?: string;
}

export const MESSAGE_TYPOLOGIES: Typology[] = [
  {
    name: "business email compromise (CEO fraud)",
    subject: "payment request",
    context: /\b(?:ceo|cfo|chief executive|executive|boss|director|president|vendor|supplier|accounts?[- ]payable|invoice)\b[\s\S]{0,200}\b(?:e-?mail|message|text|call)\b|\b(?:e-?mail|message)\b[\s\S]{0,200}\b(?:ceo|cfo|executive|vendor|supplier|invoice)\b/i,
    flags: [
      { re: /\blook-?alike\b|\bspoof(?:ed|ing)?\b|\bsimilar(?:-looking)?\s+domain\b|\bmisspell|\bslightly\s+(?:different|altered)\b|\bappears?\s+to\s+(?:be\s+)?(?:come\s+)?from\b|\bexternal\s+(?:e-?mail|domain|address)\b|\bpersonal\s+(?:e-?mail|gmail|account)\b|@[a-z0-9-]*(?:0|1|-corp|-inc|-co)\b/i, label: "the sender only appears to be the executive, from an address that is not the company's" },
      { re: /\burgent(?:ly)?\b|\bimmediately\b|\bright away\b|\btoday\b|\bbefore\s+(?:the\s+)?end\s+of\s+(?:the\s+)?day\b|\bwithin\s+(?:the\s+)?hour\b|\basap\b/i, label: "the payment is urgent" },
      { re: /\b(?:wire|transfer|payment|pay|remit)\b/i, label: "it asks for a payment or wire transfer" },
      { re: /\bnew\s+(?:vendor|supplier|bank|account|payee)\b|\bchanged?\s+(?:bank|account|payment)\s+details\b|\bupdated?\s+(?:bank|banking|payment)\b|\bdifferent\s+(?:bank\s+)?account\b|\boverseas\s+account\b/i, label: "the money goes to a new or changed bank account" },
      { re: /\bconfidential\b|\bsecret\b|\bdo\s+not\s+(?:tell|discuss|call)\b|\bdon'?t\s+(?:tell|call)\b|\bbypass\b|\bskip\s+(?:the\s+)?(?:approval|verification|process)\b|\bunavailable\b|\bin\s+a\s+meeting\b|\btravel(?:l)?ing\b/i, label: "it asks for secrecy or to bypass normal approval" },
      { re: /\bgift\s+cards?\b/i, label: "it asks for gift cards" },
    ],
    verify: "Confirm the request with the executive on a known phone number before any payment",
    needs: "confirmation with the executive on a number already on file, and a check of the payee against the vendor master file",
  },
  {
    name: "insurance claim fraud",
    subject: "insurance claim",
    context: /\binsurance\b|\bclaim\b|\bpolicy\b|\binsurer\b/i,
    flags: [
      { re: /\bshortly\s+after\b|\b(?:days|weeks?)\s+after\s+(?:taking\s+out|buying|purchasing|starting|increasing)\b|\bnew(?:ly)?\s+(?:issued\s+)?polic|\brecently\s+(?:increased|added|bought|purchased)\b|\bincreased\s+(?:the\s+)?coverage\b/i, label: "the loss follows soon after the policy or coverage began" },
      { re: /\bno\s+police\s+report\b|\bdid\s+not\s+(?:report|file)\b|\blate\s+report|\breported\s+(?:days|weeks)\s+later\b|\bdelay(?:ed)?\s+in\s+reporting\b/i, label: "the loss was not reported to police promptly" },
      { re: /\binconsistent\b|\bcontradict|\bchanged?\s+(?:the|their|his|her)\s+(?:story|account)\b|\bvague\b/i, label: "the account of the loss is inconsistent" },
      { re: /\bfinancial\s+(?:difficulty|trouble|problems|hardship)\b|\bbehind\s+on\s+(?:payments|loan)\b|\bdebt\b|\bloan\b[^.]{0,30}\b(?:owed|outstanding|overdue)\b/i, label: "the claimant is under financial pressure" },
      { re: /\ball\s+(?:the\s+)?keys\b|\bboth\s+keys\b|\bkeys\s+(?:were\s+)?(?:still|missing)\b|\bno\s+(?:sign|signs)\s+of\s+(?:forced\s+entry|break-?in)\b/i, label: "there is no sign of forced entry or the keys are unaccounted for" },
      { re: /\bprevious\s+claims?\b|\bprior\s+claims?\b|\bmultiple\s+claims?\b|\bclaims?\s+history\b/i, label: "there is a history of prior claims" },
      { re: /\bhigh(?:er)?\s+than\s+(?:the\s+)?(?:market\s+)?value\b|\binflated\b|\bover-?valued\b|\bexaggerat/i, label: "the claimed value appears inflated" },
    ],
    clears: [
      { re: /\bpolice\s+report\s+(?:was\s+)?(?:filed|obtained|on\s+file|matches)\b|\breported\s+to\s+(?:the\s+)?police\s+(?:the\s+same|within|immediately|straight)\b/i, label: "the loss was reported to police promptly and the report is on file" },
      { re: /\bno\s+(?:prior|previous)\s+claims?\b|\bfirst\s+claim\b|\bclean\s+claims?\s+history\b/i, label: "there is no prior claims history" },
      { re: /\bboth\s+keys\s+(?:were\s+)?(?:produced|surrendered|handed|accounted)\b|\bsigns?\s+of\s+forced\s+entry\b|\bforced\s+entry\s+(?:was\s+)?(?:confirmed|evident)\b/i, label: "forced entry is evidenced and the keys are accounted for" },
    ],
    verify: "Verification of the police report, the policy start date, the keys and the claim history",
  },
  {
    name: "chargeback (friendly) fraud",
    subject: "disputed charge",
    context: /\b(?:dispute[sd]?|chargeback|charge\s*back|claims?\s+(?:they|he|she)\s+(?:did\s+not|didn'?t|never))\b|\bbooked\s+and\s+paid\b|\bafter\s+(?:staying|receiving|using)\b/i,
    flags: [
      { re: /\b(?:stayed|checked\s+in|received|used|delivered|signed\s+for|consumed)\b/i, label: "the goods or service were received or used" },
      { re: /\bdispute[sd]?\b|\bchargeback\b|\bclaims?\s+(?:the\s+)?(?:charge|transaction)\s+(?:was\s+)?(?:unauthori[sz]ed|fraudulent)\b|\bnot\s+recogni[sz]e\b/i, label: "the charge is disputed as unauthorised" },
      { re: /\bsame\s+(?:card|device|ip|address|name)\b|\bmatching\s+(?:card|device|ip|address)\b|\bloyalty\b|\bconfirmation\s+e-?mail\b/i, label: "the purchase matches the cardholder's own details" },
      { re: /\bafter\b[^.]{0,40}\b(?:weeks?|days|months?)\b|\blater\b/i, label: "the dispute comes after the service was delivered" },
    ],
    verify: "Compare the booking's device, email and check-in records with the cardholder's details before refunding",
    needs: "comparison of the booking's device, email and check-in records with the cardholder's own details",
  },
  {
    name: "phishing or impersonation scam",
    subject: "message",
    context: /\b(?:link|click|log\s*in|login|password|verify\s+your|package|delivery|tax|irs|hmrc|refund|prize|lottery|won)\b/i,
    flags: [
      { re: /\bclick\b|\blink\b|\bqr\s+code\b/i, label: "it pushes a link" },
      { re: /\bpassword\b|\bpin\b|\bone-time\s+(?:code|password)\b|\botp\b|\bcard\s+(?:number|details)\b|\bsocial\s+security\b/i, label: "it asks for credentials or card details" },
      { re: /\burgent\b|\bimmediately\b|\bwithin\s+\d+\s+hours?\b|\bsuspended\b|\blocked\b|\bfinal\s+notice\b/i, label: "it threatens a deadline or suspension" },
      { re: /\bprize\b|\blottery\b|\byou\s+(?:have\s+)?won\b|\bfee\s+to\s+(?:claim|release)\b|\bprocessing\s+fee\b/i, label: "it asks for a fee to release a prize or refund" },
    ],
    verify: "Go to the organisation's own website or number rather than the link or caller",
    needs: "going to the organisation's own website or published number rather than the link or the caller",
  },
  {
    name: "investment or romance scam",
    subject: "investment or online contact",
    context: /\b(?:invest|investment|crypto|trading|returns?|online\s+(?:friend|partner|relationship)|dating|met\s+online)\b/i,
    flags: [
      { re: /\bguaranteed\b|\brisk-?free\b|\bdouble\b|\b\d{2,3}%\s+(?:returns?|profit|monthly|weekly)\b/i, label: "it promises guaranteed or outsized returns" },
      { re: /\bmet\s+online\b|\bnever\s+met\b|\bdating\s+(?:app|site)\b|\bsocial\s+media\b/i, label: "the contact is someone never met in person" },
      { re: /\bwithdraw(?:al)?\b[^.]{0,40}\b(?:fee|tax|blocked|cannot|can'?t)\b|\bfee\s+to\s+withdraw\b/i, label: "withdrawals require a further fee" },
      { re: /\bsend\b[^.]{0,30}\b(?:crypto|bitcoin|usdt|money|funds)\b|\bwallet\s+address\b/i, label: "it asks for money to be sent to them" },
    ],
    verify: "Do not send further funds and check the platform against the regulator's register",
    needs: "a check of the platform against the regulator's register before any further funds are sent",
  },
];
