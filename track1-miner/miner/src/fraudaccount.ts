/**
 * FRAUD_DETECTION scenario catalogue — the typologies whose evidence is what an
 * ACCOUNT or a CARD did, rather than what a message said.
 *
 * The node tests these. Its inputs leak through other miners' failure_reason
 * fields (G144); the ones read on 2026-09-15/16 were:
 *
 *   "The credit account activity described below is f…"                (e335)
 *   "A cardholder calls their bank from a new phone number to report a
 *    lost phone, verifies their identity with…"                       (e332)
 *   "Evaluate the likelihood of fraud in the describe…"                (e330)
 *
 * and a production probe, "Assess this credit account activity: ten purchases
 * in five minutes from two countries, followed by a request to increase the
 * credit limit", was answered "no wallet address, transaction hash, domain or
 * affirmative scam-language signal was identified" — a refusal, for a question
 * that states its own evidence.
 *
 * So the indicators here are the ones a card issuer's own rules look for, and
 * the labels QUOTE the text that matched: "ten purchases in five minutes" is
 * the finding, not "transaction velocity".
 */

import type { FlagSpec, Typology } from "./fraudtypologies";

/** The matched text, normalised, so an answer can quote the question back. */
const said = (m: RegExpMatchArray): string => (m.slice(1).find(Boolean) ?? m[0]).trim().replace(/\s+/g, " ");

const COUNT = "\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|fifty";
const EVENT = "(?:card\\s+|online\\s+|contactless\\s+|separate\\s+)?(?:purchases|transactions|charges|authori[sz]ations|swipes|payments|withdrawals|attempts)";
const SOON = "(?:in|within|over|across)\\s+(?:just\\s+|only\\s+|under\\s+|less\\s+than\\s+)?";
/** Ten or more, however the text spells it — the threshold the hours branch needs. */
const MANY = "\\d{2,}|ten|twelve|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundreds?\\s+of|dozens?\\s+of";

/**
 * A burst, not merely a count with a clock beside it.
 *
 * Sub-hour is a velocity signal at any count: "ten purchases in five minutes"
 * is the production probe's own wording. An HOUR is not — "three purchases in
 * two hours" is an ordinary morning, and the first draft of this pattern called
 * it a red flag. So the hours branch asks for a double-digit count.
 */
const VELOCITY = new RegExp(
  `\\b((?:${COUNT}|several|multiple|dozens?\\s+of|a\\s+dozen)\\s+${EVENT}\\s+${SOON}(?:${COUNT}|a|an)\\s*(?:seconds?|minutes?|mins?))\\b` +
    `|\\b((?:${MANY})\\s+${EVENT}\\s+${SOON}(?:\\d+|a|an|one|two|three)\\s*hours?)\\b`,
  "i",
);

const GEOGRAPHY = new RegExp(
  `\\b((?:${COUNT}|multiple|several|different)\\s+(?:different\\s+|separate\\s+)?` +
    `(?:countries|continents|cities|states|time\\s+zones))\\b`,
  "i",
);

const CARD_CLEARS: FlagSpec[] = [
  { re: /\bcard-?present\b|\bchip\s+and\s+pin\b|\bchip-?and-?pin\b|\btapped\s+(?:at|in)\b|\bcontactless\s+at\s+the\s+terminal\b|\bpin\s+(?:was\s+)?entered\b/i, label: "every transaction was card-present, read at the terminal" },
  { re: /\bcardholder\s+(?:has\s+)?confirm(?:ed|s)\b|\bconfirmed\s+by\s+the\s+cardholder\b|\bcardholder\s+recogni[sz]es\b/i, label: "the cardholder has confirmed the purchases" },
  { re: /\btravel\s+notice\b|\bnotified\s+(?:the\s+)?bank\s+(?:of\s+)?(?:the\s+)?travel\b|\btravel\s+(?:plans?|dates?)\s+(?:were\s+)?(?:registered|on\s+file|notified)\b/i, label: "a travel notice is already on file" },
  { re: /\b(?:all|each|every)\b[\s\S]{0,50}\b(?:home|usual|same|regular)\s+(?:city|town|country|region|merchants?)\b|\bin\s+the\s+cardholder'?s\s+home\s+(?:city|country|region)\b/i, label: "the purchases stay in the cardholder's usual location" },
  { re: /\b(?:matches|consistent\s+with|in\s+line\s+with)\s+(?:the\s+)?(?:usual|typical|normal|established|prior)\s+(?:pattern|spending|history|behaviou?r)\b/i, label: "the spending matches the account's established pattern" },
  { re: /\b(?:3-?d\s+secure|3ds|two-factor|strong\s+customer\s+authentication|sca)\b[\s\S]{0,40}\b(?:passed|completed|approved|verified)\b|\bone-time\s+(?:code|password)\s+(?:was\s+)?(?:passed|entered|verified|approved)\b/i, label: "strong customer authentication was completed on each transaction" },
];

export const ACCOUNT_TYPOLOGIES: Typology[] = [
  {
    name: "card compromise (anomalous credit-account activity)",
    subject: "credit-account activity",
    /**
     * Deliberately narrow. "Cardholder" plus "charge" appears in a chargeback
     * scenario too, and that typology reads the same words to the opposite
     * conclusion, so this one asks for an activity frame or one of the
     * anomalies by name.
     */
    context: /\b(?:credit|debit|card|account|transaction|spending)\s+(?:card\s+)?activity\b|\b(?:transactions?|purchases?|charges?|authori[sz]ations?|swipes)\b[\s\S]{0,60}\b(?:in|within)\s+(?:\w+|\d+)\s*(?:seconds?|minutes?|mins?|hours?)\b|\b(?:credit[- ]?)?limit\s+increase\b|\bcash\s+advance\b|\bcard-?not-?present\b|\bcard\s+testing\b|\b(?:dormant|inactive)\b[\s\S]{0,80}\b(?:purchases?|transactions?|charges?|spend)/i,
    flags: [
      { re: VELOCITY, label: (m) => `${said(m)}, a transaction velocity a single cardholder does not produce` },
      { re: GEOGRAPHY, label: (m) => `the activity spans ${said(m)}, which one physical card cannot do in a single session` },
      { re: /\bimpossible\s+travel\b|\bgeographically\s+impossible\b|\b(?:minutes?|seconds?)\s+apart\b/i, label: "the locations are only minutes apart, which is impossible travel for one physical card" },
      { re: /\b(?:dormant|inactive|unused|idle)\b|\bno\s+(?:transactions?|activity|purchases?)\s+(?:for|in)\s+(?:\w+|\d+)\s+(?:days?|weeks?|months?|years?)\b|\b(?:months?|years?)\s+of\s+(?:no|small|low|routine|minor)\b|\bquiet\s+(?:history|account|period)\b/i, label: "the account was dormant or low-value until this activity" },
      { re: /\bsudden(?:ly)?\b|\babruptly\b|\bout\s+of\s+(?:character|pattern)\b|\bunusual(?:ly)?\b|\bfirst\s+time\b|\bnever\s+(?:bought|purchased|shopped|used)\b|\bhigher\s+than\s+(?:the\s+)?(?:usual|typical|average|customary|normal)\b|\bnew\s+(?:merchant\s+)?categor(?:y|ies)\b|\b(?:luxury|electronics|gift\s+cards?|jewell?ery)\b/i, label: "the spending category or amount changes sharply from the account's own history" },
      { re: /\b(?:credit[- ]?)?limit\s+increase\b|\bincrease\s+(?:the\s+|their\s+|his\s+|her\s+|its\s+|a\s+)?(?:credit\s+)?limit\b|\braise\s+(?:the\s+)?(?:credit\s+)?limit\b/i, label: "a credit-limit increase is requested straight after the spending, which is how a compromised line is drained" },
      { re: /\bcash\s+advance\b|\bbalance\s+transfer\b|\bwire\s+from\s+the\s+card\b/i, label: "a cash advance or balance transfer is requested, which converts the line into funds that cannot be recalled" },
      { re: /\bcard-?not-?present\b|\bonline\s+(?:purchases|orders|transactions)\b|\be-?commerce\b|\bwithout\s+the\s+(?:physical\s+)?card\b|\bmanually\s+keyed\b/i, label: "the purchases are card-not-present, so the physical card was never read" },
      { re: /\bdeclined\b[\s\S]{0,60}\b(?:retried|re-?attempted|again|repeatedly)\b|\bsmall\s+(?:test\s+)?(?:charge|transaction|purchase|authori[sz]ation)\b[\s\S]{0,60}\b(?:followed|then|larger|large)\b|\b\$1(?:\.00)?\s+(?:charge|authori[sz]ation|transaction)\b/i, label: "a small test charge is followed by a large one, the card-testing pattern" },
      { re: /\bnew\s+(?:device|ip\s+address|browser)\b|\bunrecogni[sz]ed\s+(?:device|ip)\b|\bshipping\s+address\b[\s\S]{0,60}\b(?:differs?|different|new|does\s+not\s+match)\b|\bbilling\s+and\s+shipping\b[\s\S]{0,40}\b(?:differ|do\s+not\s+match)\b/i, label: "the orders come from a new device or ship somewhere the account has not used" },
    ],
    clears: CARD_CLEARS,
    verify: "Confirm the transactions with the cardholder on the number already on file, and read the authorisation log for card-present, device and IP",
    needs: "confirmation of the transactions with the cardholder on the number already on file, and the authorisation log's card-present, device and IP fields",
  },
  {
    /**
     * The name is load-bearing: epoch 332's case is an account-recovery call,
     * and this typology has answered it under this name since 2026-09-15.
     */
    name: "account takeover (SIM swap or social engineering)",
    subject: "account-recovery request",
    context: /\b(?:cardholder|customer|account\s*holder|caller|bank|carrier|mobile)\b[\s\S]{0,250}\b(?:phone|number|sim|password|e-?mail|device|login|pin)\b/i,
    flags: [
      { re: /\bnew\s+(?:phone|mobile|number|device|sim)\b|\bunrecognised\s+(?:number|device)\b|\bunrecognized\s+(?:number|device)\b|\bdifferent\s+(?:phone\s+)?number\b/i, label: "the contact comes from a new phone number or device" },
      { re: /\blost\b|\bstolen\b|\bbroken\b|\bnew\s+sim\b|\bsim\s+swap/i, label: "a lost or replaced phone is given as the reason" },
      { re: /\bonly\b[^.]{0,40}\b(?:date of birth|birth\s*date|dob|last\s+(?:four|4)|mother'?s maiden|zip|postcode|address)\b|\b(?:date of birth|dob|last\s+(?:four|4))\s+only\b|\bfail(?:s|ed)?\s+(?:the\s+)?(?:security|verification|otp|one-time)\b|\bcannot\s+(?:receive|provide)\s+(?:the\s+)?(?:code|otp)\b/i, label: "identity is verified only with easily obtained details" },
      { re: /\bchange\s+(?:the\s+)?(?:account\s+)?(?:e-?mail|phone|number|address|password|contact)|\bupdate\s+(?:the\s+)?(?:e-?mail|phone|contact|address)\b|\breset\s+(?:the\s+)?password\b|\badd\s+(?:a\s+)?new\s+(?:payee|device|user)\b/i, label: "the first request is to change the account's contact details or credentials" },
      { re: /\b(?:large|immediate|urgent)\s+(?:transfer|withdrawal|payment)\b|\bincrease\s+(?:the\s+)?(?:limit|credit)\b|\bnew\s+card\s+(?:sent|mailed|delivered)\s+to\b|\badd(?:s|ing)?\s+(?:a\s+)?(?:new\s+)?(?:payee|beneficiary|recipient)\b|\bset\s+up\s+(?:a\s+)?new\s+(?:payee|beneficiary|standing\s+order)\b|\bmove\s+(?:the\s+)?(?:funds|money|balance)\b|\btransfer\s+(?:funds|money)\s+to\s+(?:a\s+)?(?:new|another|external)\b/i, label: "it moves quickly to money or a new card" },
      { re: /\burgent(?:ly)?\b|\bimmediately\b|\bright\s+away\b|\bin\s+a\s+hurry\b|\bpressur(?:e|es|ed|ing)\b|\binsist(?:s|ed|ing)?\b|\bbecomes?\s+(?:angry|irate|agitated|abusive)\b|\bthreatens?\s+to\s+(?:complain|close)\b/i, label: "the caller presses for it to be done immediately" },
      { re: /\brefus(?:e|es|ed|ing)\b[\s\S]{0,60}\b(?:call-?\s?back|number\s+on\s+file|branch|security\s+questions?|verification)\b|\bdeclines?\s+(?:a\s+)?call-?\s?back\b|\bcannot\s+(?:be\s+)?reach(?:ed)?\s+on\s+the\s+(?:registered|old|number\s+on\s+file)\b|\basks?\s+(?:the\s+bank\s+)?not\s+to\s+call\b|\bsays?\s+the\s+(?:old|registered|previous)\s+number\s+(?:no\s+longer\s+works|is\s+disconnected|is\s+dead)\b|\bwill\s+not\s+(?:visit|come\s+in|attend)\s+(?:a\s+|the\s+)?branch\b/i, label: "the caller will not accept the standard callback or branch check" },
    ],
    clears: [
      { re: /\bcall(?:ed|s)?\s+back\b[\s\S]{0,60}\b(?:number|line)\s+(?:already\s+)?on\s+(?:the\s+)?file\b|\bcall-?back\s+to\s+the\s+(?:registered|recorded)\s+number\b|\bcalled\s+the\s+(?:registered|recorded)\s+number\b/i, label: "the bank called back on the number already on file" },
      { re: /\bone-time\s+(?:code|password)\s+(?:was\s+)?sent\s+to\s+the\s+(?:registered|recorded|number\s+on\s+file)\b|\bpassed\s+(?:the\s+)?(?:full\s+)?(?:security|identity)\s+(?:questions?|verification|checks?)\b|\bcompleted\s+(?:two-factor|2fa|step-?up)\s+authentication\b/i, label: "the caller passed the full identity checks, not only the easily obtained details" },
      { re: /\bin\s+branch\b|\bin\s+person\b|\bwith\s+photo\s+id\b|\bpresented\s+(?:photo\s+)?identification\b/i, label: "the request was made in branch with identification" },
      { re: /\bno\s+(?:contact\s+)?details?\s+(?:were\s+)?changed\b|\bdid\s+not\s+(?:ask|request)\s+to\s+change\b|\bno\s+(?:transfer|payment|withdrawal)\s+(?:was\s+)?(?:requested|attempted|made)\b/i, label: "no contact detail was changed and no money was requested" },
      { re: /\bcooling-?off\s+period\b|\bchange\s+(?:was\s+)?held\s+for\b|\b24\s+hours?\s+before\s+(?:any\s+)?(?:payment|transfer)\b/i, label: "a cooling-off period is applied before any payment" },
    ],
    verify: "Verify through the phone number already on file and hold contact-detail changes until confirmed",
    needs: "verification through the phone number already on file, with contact-detail changes held until it is confirmed",
  },
  {
    /**
     * Last in the catalogue on purpose: it reads the same words as business
     * email compromise, and BEC is the better name whenever both match with the
     * same number of red flags. What this one adds is the benign case — an
     * invoice paid to a verified account with nothing changed — which must not
     * be answered with account-takeover advice.
     */
    name: "vendor payment diversion (invoice fraud)",
    subject: "vendor invoice",
    context: /\b(?:invoice|vendor|supplier|payee|accounts?[- ]payable|purchase\s+order)\b[\s\S]{0,200}\b(?:bank|account|payment|pay|paid|remit|wire|transfer|details|iban)\b|\b(?:bank|account|payment|remit|wire|transfer|iban)\b[\s\S]{0,200}\b(?:invoice|vendor|supplier|payee)\b/i,
    flags: [
      { re: /\bnew\s+(?:bank|account|payee|iban|routing)\b|\bchang(?:e|ed|ing)\s+(?:the\s+)?(?:bank|account|payment|remittance)\s+(?:details|account|instructions)\b|\bupdat(?:e|ed|ing)\s+(?:the\s+)?(?:bank|banking|payment|remittance)\s+(?:details|account|instructions)\b|\bdifferent\s+(?:bank\s+)?account\b|\bnew\s+(?:vendor|supplier)\s+account\b/i, label: "the payment is redirected to a new or changed bank account" },
      { re: /\burgent(?:ly)?\b|\bimmediately\b|\bbefore\s+(?:the\s+)?(?:end\s+of\s+)?(?:day|week)\b|\boverdue\b|\bfinal\s+(?:notice|demand)\b|\bto\s+avoid\s+(?:late\s+fees|suspension|service\s+interruption)\b/i, label: "the request is urgent or threatens a consequence for delay" },
      { re: /\b(?:e-?mail|message|attachment|pdf)\b[\s\S]{0,80}\b(?:invoice|payment|remittance|bank)\b|\binvoice\b[\s\S]{0,80}\b(?:e-?mailed|attached)\b/i, label: "the instruction arrives by email rather than through the agreed procurement channel" },
      { re: /\bcould\s+not\s+(?:reach|contact)\b|\bno\s+(?:answer|reply)\s+(?:from\s+)?(?:the\s+)?(?:vendor|supplier)\b|\bwithout\s+(?:calling|confirming|verifying|checking)\b|\bskip(?:ped|ping)?\s+(?:the\s+)?(?:callback|verification|approval)\b|\bnot\s+verified\b/i, label: "the change was never confirmed with the vendor out of band" },
    ],
    clears: [
      { re: /\bverified\s+(?:vendor|supplier|payee|bank)\b|\b(?:vendor|supplier|payee)'?s?\s+verified\s+(?:bank\s+)?account\b|\baccount\s+(?:already\s+)?on\s+(?:the\s+)?(?:vendor\s+master|supplier\s+master|file)\b|\bexisting\s+(?:vendor|supplier|payee)\b/i, label: "the bank account is the vendor's verified one already on file" },
      { re: /\bno\s+(?:bank|banking|account|payment|payee|remittance)\s+details?\s+(?:were\s+|was\s+|had\s+|have\s+)?(?:changed|altered|updated|modified)\b|\b(?:bank|account|payment)\s+details?\s+(?:were\s+|are\s+|remain(?:ed)?\s+)?unchanged\b|\bsame\s+(?:bank\s+)?account\s+as\s+(?:the\s+)?(?:previous|prior|last)\b/i, label: "no bank details were changed" },
      { re: /\bconfirmed\b[\s\S]{0,60}\bby\s+(?:phone|telephone|a\s+call|callback|call-?back)\b|\bcall(?:ed)?\s+(?:the\s+)?(?:vendor|supplier|payee)\s+on\s+(?:a\s+|the\s+)?(?:known|contracted|file)\b|\bout-?of-?band\b|\bverbal(?:ly)?\s+confirm/i, label: "the payment was confirmed out of band, by phone" },
      { re: /\bmatches\s+(?:the\s+)?(?:purchase\s+order|contract|po\b|agreed\s+schedule)\b|\bthree-?way\s+match\b|\bapproved\s+by\s+(?:two|both)\b|\bdual\s+authori[sz]ation\b/i, label: "the invoice matches the purchase order and the agreed approval path" },
    ],
    verify: "Call the vendor on the number from the contract rather than one printed on the invoice, and check the account against the vendor master file",
    needs: "a call to the vendor on the number from the contract rather than one printed on the invoice, and a check of the account against the vendor master file",
  },
];
