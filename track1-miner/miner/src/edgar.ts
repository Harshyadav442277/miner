/**
 * SEC EDGAR, keyless: who a US filer is and what it has filed.
 *
 *   www.sec.gov/files/company_tickers.json        ticker and title to CIK   0.8 MB, once per instance
 *   data.sec.gov/submissions/CIK##########.json   identity and filing index  ~160 KB, 0.5 s (Tesla, 2026-10-13)
 *
 * SEC refuses anonymous clients; this descriptive user agent, with no email in
 * it, was answered 200 on 2026-09-15 and 2026-10-13 (fundamentals.ts).
 */
import { nameScore, nameTokens } from "./sanctions";

const UA = "livecert-miner/1.0 (+https://miner-wine.vercel.app)";
const TIMEOUT_MS = Number(process.env.EDGAR_TIMEOUT_MS ?? 5_000);

export interface Filing {
  form: string;
  filed: string;
  /** EDGAR acceptance time, UTC. */
  accepted: string | null;
  accession: string;
  /** The period the filing reports on. */
  period: string | null;
  /** 8-K item numbers with their names. */
  items: Array<{ item: string; name: string }>;
  url: string;
}

export interface EdgarCompany {
  cik: number;
  name: string;
  tickers: string[];
  exchanges: string[];
  sic: string | null;
  sic_description: string | null;
  state_of_incorporation: string | null;
  business_address: string | null;
  mailing_address: string | null;
  former_names: Array<{ name: string; from: string | null; to: string | null }>;
  lei: string | null;
  filer_category: string | null;
  filings: Filing[];
  source_url: string;
}

/** Form 8-K item names, from the form's own instructions. */
export const ITEMS: Record<string, string> = {
  "1.01": "Entry into a Material Definitive Agreement", "1.02": "Termination of a Material Definitive Agreement",
  "1.03": "Bankruptcy or Receivership", "1.04": "Mine Safety", "1.05": "Material Cybersecurity Incidents",
  "2.01": "Completion of Acquisition or Disposition of Assets", "2.02": "Results of Operations and Financial Condition",
  "2.03": "Creation of a Direct Financial Obligation", "2.04": "Triggering Events That Accelerate a Financial Obligation",
  "2.05": "Costs Associated with Exit or Disposal Activities", "2.06": "Material Impairments",
  "3.01": "Notice of Delisting or Failure to Satisfy a Listing Rule", "3.02": "Unregistered Sales of Equity Securities",
  "3.03": "Material Modification to Rights of Security Holders", "4.01": "Changes in Registrant's Certifying Accountant",
  "4.02": "Non-Reliance on Previously Issued Financial Statements", "5.01": "Changes in Control of Registrant",
  "5.02": "Departure or Appointment of Directors or Officers", "5.03": "Amendments to Articles of Incorporation or Bylaws",
  "5.07": "Submission of Matters to a Vote of Security Holders", "5.08": "Shareholder Director Nominations",
  "7.01": "Regulation FD Disclosure", "8.01": "Other Events", "9.01": "Financial Statements and Exhibits",
};

async function getJson(url: string): Promise<unknown | null> {
  const r = await fetch(url, { headers: { accept: "application/json", "user-agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

type TickerRow = { cik: number; ticker: string; title: string; tokens: string[] };
let tickers: Promise<TickerRow[]> | null = null;

/**
 * A ticker or a company name to its CIK. A ticker is taken as given; a name
 * must match a filer's title closely (0.92, legal forms ignored). `undefined`
 * is an outage, `null` is no such filer.
 */
export async function resolveCik(subject: string): Promise<{ cik: number; title: string } | null | undefined> {
  tickers ??= getJson("https://www.sec.gov/files/company_tickers.json").then((j) => {
    const rows = Object.values((j ?? {}) as Record<string, { cik_str?: number; ticker?: string; title?: string }>)
      .filter((r) => r.ticker && Number.isFinite(r.cik_str))
      .map((r) => ({ cik: Number(r.cik_str), ticker: String(r.ticker).toUpperCase(), title: String(r.title ?? ""), tokens: nameTokens(String(r.title ?? "")) }));
    if (rows.length < 1_000) throw new Error("ticker file unreadable");
    return rows;
  });
  let rows: TickerRow[];
  try {
    rows = await tickers;
  } catch {
    tickers = null;
    return undefined;
  }
  const s = subject.trim();
  if (/^[A-Z]{1,5}(?:[.-][A-Z])?$/.test(s)) {
    const t = rows.find((r) => r.ticker === s.replace(".", "-"));
    if (t) return { cik: t.cik, title: t.title };
  }
  const want = nameTokens(s);
  let best: { cik: number; title: string; score: number } | null = null;
  for (const r of rows) {
    const score = nameScore(want, r.tokens);
    if (score > (best?.score ?? 0)) best = { cik: r.cik, title: r.title, score };
  }
  return best && best.score >= 0.92 ? { cik: best.cik, title: best.title } : null;
}

const address = (a: Record<string, string | null> | undefined): string | null =>
  a ? [a.street1, a.street2, a.city, a.stateOrCountryDescription, a.zipCode].filter(Boolean).join(", ") || null : null;

/** A filer's identity and its recent filings, newest first. `undefined` is an outage. */
export async function submissions(cik: number): Promise<EdgarCompany | null | undefined> {
  const id = String(cik).padStart(10, "0");
  let j: Record<string, unknown> | null;
  try {
    j = (await getJson(`https://data.sec.gov/submissions/CIK${id}.json`)) as Record<string, unknown> | null;
  } catch {
    return undefined;
  }
  if (!j) return null;
  const r = ((j.filings as { recent?: Record<string, unknown[]> } | undefined)?.recent ?? {}) as Record<string, Array<string | null>>;
  const filings: Filing[] = (r.form ?? []).map((form, i) => {
    const accession = String(r.accessionNumber?.[i] ?? "");
    const doc = r.primaryDocument?.[i] ?? "";
    return {
      form: String(form),
      filed: String(r.filingDate?.[i] ?? ""),
      accepted: r.acceptanceDateTime?.[i] ? String(r.acceptanceDateTime[i]) : null,
      accession,
      period: r.reportDate?.[i] ? String(r.reportDate[i]) : null,
      items: String(r.items?.[i] ?? "").split(",").map((x) => x.trim()).filter(Boolean).map((item) => ({ item, name: ITEMS[item] ?? "Item" })),
      url: `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, "")}/${doc}`,
    };
  });
  const addresses = j.addresses as Record<string, Record<string, string | null>> | undefined;
  return {
    cik,
    name: String(j.name ?? ""),
    tickers: (j.tickers as string[] | undefined) ?? [],
    exchanges: ((j.exchanges as Array<string | null> | undefined) ?? []).filter((x): x is string => Boolean(x)),
    sic: (j.sic as string) || null,
    sic_description: (j.sicDescription as string) || null,
    state_of_incorporation: (j.stateOfIncorporationDescription as string) || (j.stateOfIncorporation as string) || null,
    business_address: address(addresses?.business),
    mailing_address: address(addresses?.mailing),
    former_names: ((j.formerNames as Array<{ name: string; from?: string; to?: string }> | undefined) ?? [])
      .map((f) => ({ name: f.name, from: f.from?.slice(0, 10) ?? null, to: f.to?.slice(0, 10) ?? null })),
    lei: (j.lei as string) || null,
    filer_category: (j.category as string) || null,
    filings,
    source_url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${id}`,
  };
}
