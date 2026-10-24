/**
 * Every upstream this miner calls, with what its terms allow a paid miner to do.
 *
 * A miner answer is resold data: an app pays per answer. So the question asked
 * of each source is whether its terms let us pass its data to a paying third
 * party. Each verdict cites the page it was read from and the day it was read;
 * `unread` means exactly that, never "probably fine".
 *
 *   licensed     the terms grant it, with no condition we fail
 *   conditional  the terms grant it on a condition (attribution, a notice, a
 *                signed agreement); `met` says whether our answers meet it
 *   unclear      the terms were read and neither grant nor forbid it clearly
 *   barred       the terms forbid it (non-commercial, no redistribution)
 *   unread       not read yet
 *
 * `test/sources.test.ts` fails when a URL host in src/ has no entry here, when
 * an entry's host no longer appears in src/, or when ENDPOINT_SOURCES differs
 * from what the import graph shows each endpoint can reach. It sees only URLs
 * written out in full ("https://host..."): a URL assembled from a host list,
 * such as websearch.ts's documentation allowlist, is invisible to it.
 */

export type LicenceStatus = "licensed" | "conditional" | "unclear" | "barred" | "unread";

export interface Source {
  id: string;
  name: string;
  hosts: string[];
  status: LicenceStatus;
  licence: string;
  terms: string;
  read: string | null;
  basis: string;
  /** `notice`, when set, is carried in every answer from an endpoint that can reach the source. */
  condition?: { text: string; met: "yes" | "no" | "partly" | "unchecked"; notice?: string };
}

const R = "2026-10-24";

export const SOURCES: Source[] = [
  // Weather and places
  { id: "metno", name: "MET Norway", hosts: ["api.met.no"], status: "conditional", licence: "CC BY 4.0 / NLOD 2.0", terms: "https://api.met.no/doc/License", read: "2026-10-18", basis: "Open licence; attribution required (GAPS G189).", condition: { text: "Credit MET Norway", met: "yes" } },
  { id: "nominatim", name: "OpenStreetMap Nominatim", hosts: ["nominatim.openstreetmap.org"], status: "conditional", licence: "ODbL 1.0", terms: "https://operations.osmfoundation.org/policies/nominatim/", read: "2026-10-20", basis: "ODbL data; usage policy of one request per second (G196, G198).", condition: { text: "Visible ODbL credit; at most 1 request per second", met: "partly" } },
  { id: "nws", name: "US National Weather Service", hosts: ["api.weather.gov"], status: "licensed", licence: "Public domain (US Government)", terms: "https://www.weather.gov/disclaimer", read: R, basis: "Public domain, usable for any lawful purpose; no implied NWS endorsement." },
  // IP geolocation
  { id: "ip-api", name: "ip-api.com", hosts: ["ip-api.com"], status: "barred", licence: "Proprietary", terms: "https://members.ip-api.com/", read: "2026-10-23", basis: "The free endpoint does not allow commercial usage." },
  { id: "ipwhois", name: "ipwho.is", hosts: ["ipwho.is"], status: "barred", licence: "Proprietary", terms: "https://ipwhois.io/terms", read: "2026-10-23", basis: "Personal or internal business use; no reselling or redistribution without written permission." },
  { id: "ipinfo", name: "IPinfo", hosts: ["ipinfo.io"], status: "barred", licence: "Proprietary", terms: "https://ipinfo.io/terms-of-service", read: R, basis: "Selling or reselling the content is prohibited without IPinfo's written consent." },
  // Currencies and crypto
  { id: "ecb", name: "European Central Bank", hosts: ["www.ecb.europa.eu", "data-api.ecb.europa.eu", "data.ecb.europa.eu"], status: "conditional", licence: "ECB reuse terms", terms: "https://www.ecb.europa.eu/services/disclaimer/html/index.en.html", read: R, basis: "Free use if the ECB is cited, buyers are told the data is free from the ECB, and modifications are stated.", condition: { text: "Cite the ECB, say the data is free from ecb.europa.eu, and state computed cross rates", met: "yes", notice: "European Central Bank data are available free of charge at https://www.ecb.europa.eu." } },
  { id: "frankfurter", name: "Frankfurter", hosts: ["api.frankfurter.dev"], status: "licensed", licence: "Free for commercial use (blended rates)", terms: "https://frankfurter.dev/", read: R, basis: "FAQ: blended rates are Frankfurter's own calculation and free to use commercially." },
  { id: "bitstamp", name: "Bitstamp", hosts: ["www.bitstamp.net"], status: "conditional", licence: "Commercial Data License Agreement", terms: "https://www.bitstamp.net/api/", read: R, basis: "Allows commercial redistribution under a signed Data License Agreement.", condition: { text: "Sign Bitstamp's commercial Data License Agreement", met: "no" } },
  { id: "coingecko", name: "CoinGecko / GeckoTerminal", hosts: ["api.coingecko.com", "api.geckoterminal.com"], status: "barred", licence: "CoinGecko API Terms", terms: "https://www.coingecko.com/en/api_terms", read: "2026-10-23", basis: "No re-distributing or syndicating API data without a signed agreement; redistribution is Enterprise-only." },
  { id: "yahoo", name: "Yahoo Finance", hosts: ["query1.finance.yahoo.com"], status: "barred", licence: "Yahoo Terms", terms: "https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html", read: "2026-10-23", basis: "No automated data collection without permission; no income from Yahoo APIs without written permission." },
  { id: "nasdaq", name: "Nasdaq (api.nasdaq.com)", hosts: ["api.nasdaq.com"], status: "unread", licence: "Unknown", terms: "https://www.nasdaq.com/", read: null, basis: "Undocumented endpoint; the terms page URL tried returned 404." },
  // Macroeconomics
  { id: "worldbank", name: "World Bank", hosts: ["api.worldbank.org", "data.worldbank.org"], status: "conditional", licence: "CC BY 4.0", terms: "https://datacatalog.worldbank.org/public-licenses", read: R, basis: "Datasets under CC BY 4.0, including commercial use.", condition: { text: "Credit the World Bank", met: "yes" } },
  { id: "bls", name: "US Bureau of Labor Statistics", hosts: ["api.bls.gov", "data.bls.gov"], status: "licensed", licence: "Public domain (US Government)", terms: "https://www.bls.gov/opub/copyright-information.htm", read: R, basis: "Public domain; citing BLS is requested." },
  { id: "eurostat", name: "Eurostat", hosts: ["ec.europa.eu"], status: "unread", licence: "Unknown", terms: "https://ec.europa.eu/eurostat/", read: null, basis: "The copyright page URL tried returned 404." },
  { id: "nyfed", name: "Federal Reserve Bank of New York", hosts: ["markets.newyorkfed.org", "www.newyorkfed.org"], status: "unread", licence: "Unknown", terms: "https://www.newyorkfed.org/", read: null, basis: "The terms-of-use URL tried returned 404." },
  // Chains
  { id: "publicnode", name: "PublicNode (Allnodes)", hosts: ["ethereum-rpc.publicnode.com", "base-rpc.publicnode.com", "arbitrum-one-rpc.publicnode.com", "optimism-rpc.publicnode.com", "polygon-bor-rpc.publicnode.com", "bsc-rpc.publicnode.com", "avalanche-c-chain-rpc.publicnode.com"], status: "unclear", licence: "PublicNode Terms", terms: "https://www.publicnode.com/terms", read: "2026-10-23", basis: "Grants use of the service; bars redistributing Service Content. On-chain data itself is public." },
  { id: "chain-rpcs", name: "Chains' own public RPCs", hosts: ["mainnet.base.org", "mainnet.optimism.io", "arb1.arbitrum.io", "bsc-dataseed.bnbchain.org", "bsc-dataseed-public.bnbchain.org", "api.avax.network"], status: "unclear", licence: "None stated", terms: "https://docs.arbitrum.io/build-decentralized-apps/reference/node-providers", read: R, basis: "Docs state rate limits and no guarantees; no licence terms for relaying results." },
  { id: "drpc", name: "dRPC", hosts: ["eth.drpc.org", "polygon.drpc.org"], status: "unread", licence: "Unknown", terms: "https://drpc.org/", read: null, basis: "Terms URLs tried returned 404." },
  { id: "merkle", name: "Merkle", hosts: ["eth.merkle.io"], status: "unread", licence: "Unknown", terms: "https://merkle.io/", read: null, basis: "Terms URLs tried returned 404." },
  { id: "1rpc", name: "1RPC (Automata)", hosts: ["1rpc.io"], status: "unread", licence: "Unknown", terms: "https://www.1rpc.io/", read: null, basis: "Terms URLs tried returned 404." },
  { id: "flashbots", name: "Flashbots Protect RPC", hosts: ["rpc.flashbots.net"], status: "unclear", licence: "Flashbots Terms", terms: "https://docs.flashbots.net/policies/terms-of-service", read: R, basis: "No clause on relaying results to paying third parties was found." },
  { id: "routescan", name: "Routescan", hosts: ["api.routescan.io"], status: "unread", licence: "Unknown", terms: "https://routescan.io/", read: null, basis: "The terms page did not load outside a browser." },
  { id: "layerzero", name: "LayerZero Scan", hosts: ["scan.layerzero-api.com"], status: "unread", licence: "Unknown", terms: "https://layerzeroscan.com/", read: null, basis: "The scan site's terms returned HTTP 429." },
  { id: "4byte", name: "4byte.directory", hosts: ["www.4byte.directory"], status: "licensed", licence: "Free to use without restriction", terms: "https://www.4byte.directory/docs/", read: R, basis: "The API is provided free to use by anyone without restriction." },
  { id: "openchain", name: "OpenChain signatures", hosts: ["api.openchain.xyz"], status: "unread", licence: "Unknown", terms: "https://openchain.xyz/", read: null, basis: "The site did not render its terms outside a browser." },
  { id: "ensideas", name: "ENS Ideas API", hosts: ["api.ensideas.com"], status: "unread", licence: "Unknown", terms: "https://api.ensideas.com/", read: null, basis: "No terms page found." },
  // Security
  { id: "nvd", name: "NIST NVD", hosts: ["services.nvd.nist.gov", "nvd.nist.gov"], status: "conditional", licence: "NVD API terms", terms: "https://nvd.nist.gov/developers/terms-of-use", read: R, basis: "Use permitted; a prominent notice is asked of services using the API.", condition: { text: "Show the NVD's requested notice", met: "yes", notice: "This product uses the NVD API but is not endorsed or certified by the NVD." } },
  { id: "cve", name: "CVE Program (MITRE)", hosts: ["cveawg.mitre.org"], status: "conditional", licence: "CVE Terms of Use", terms: "https://www.cve.org/Legal/TermsOfUse", read: R, basis: "Perpetual, royalty-free licence to reproduce and distribute CVE.", condition: { text: "Reproduce MITRE's copyright designation and the licence; answers carry the designation and link the licence rather than reproduce it", met: "partly", notice: "CVE content is copyright 1999-2026 The MITRE Corporation, used under the CVE Terms of Use: https://www.cve.org/Legal/TermsOfUse" } },
  { id: "urlhaus", name: "URLhaus (abuse.ch)", hosts: ["urlhaus.abuse.ch"], status: "unclear", licence: "abuse.ch Terms", terms: "https://abuse.ch/terms-of-use/", read: R, basis: "Commercial or for-profit use may require a paid Spamhaus subscription." },
  { id: "dns-resolvers", name: "Public DNS resolvers (Cloudflare, Google, Quad9)", hosts: ["cloudflare-dns.com", "security.cloudflare-dns.com", "dns.google", "dns.quad9.net", "dns10.quad9.net"], status: "unclear", licence: "Service terms", terms: "https://developers.google.com/speed/public-dns/terms", read: R, basis: "Resolver service terms; no clause on relaying DNS answers was found." },
  { id: "ofac-list", name: "OFAC addresses list (0xB10C, GitHub)", hosts: ["raw.githubusercontent.com"], status: "licensed", licence: "MIT; data from OFAC (US Government)", terms: "https://github.com/0xB10C/ofac-sanctioned-digital-currency-addresses", read: R, basis: "MIT-licensed extract of OFAC's SDN list (GitHub API licence field)." },
  // Sanctions and registries
  { id: "ofac", name: "US Treasury OFAC", hosts: ["sanctionslistservice.ofac.treas.gov", "sanctionssearch.ofac.treas.gov"], status: "licensed", licence: "Public domain (US Government work, 17 U.S.C. 105)", terms: "https://ofac.treasury.gov/", read: R, basis: "A US federal work has no copyright; no OFAC terms page was found to say otherwise." },
  { id: "un-sanctions", name: "UN Security Council Consolidated List", hosts: ["scsanctions.un.org"], status: "unclear", licence: "UN site terms", terms: "https://www.un.org/en/about-us/terms-of-use", read: R, basis: "UN site terms allow personal use without resale; no list-specific terms were found." },
  { id: "gleif", name: "GLEIF", hosts: ["api.gleif.org", "search.gleif.org"], status: "licensed", licence: "CC0 1.0", terms: "https://www.gleif.org/en/meta/lei-data-terms-of-use", read: R, basis: "LEI data are provided under CC0." },
  { id: "sec", name: "US SEC EDGAR", hosts: ["www.sec.gov", "data.sec.gov"], status: "conditional", licence: "Public domain (US Government); fair-access policy", terms: "https://www.sec.gov/about/developer-resources", read: R, basis: "Fair access: at most 10 requests per second; unclassified bots are blocked.", condition: { text: "At most 10 requests per second, from a declared user agent", met: "unchecked" } },
  // Research and reference
  { id: "openalex", name: "OpenAlex", hosts: ["api.openalex.org"], status: "licensed", licence: "CC0", terms: "https://help.openalex.org/access/pricing/", read: R, basis: "Data released under CC0. Keyless calls share $0.10 a day per IP." },
  { id: "wikipedia", name: "Wikipedia", hosts: ["en.wikipedia.org"], status: "conditional", licence: "CC BY-SA 4.0", terms: "https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_API_Usage_Guidelines", read: R, basis: "Text is CC BY-SA; API access may not be sublicensed.", condition: { text: "Attribute by title and link, and name CC BY-SA", met: "partly" } },
  { id: "wikidata", name: "Wikidata", hosts: ["www.wikidata.org"], status: "licensed", licence: "CC0 1.0", terms: "https://www.wikidata.org/wiki/Wikidata:Licensing", read: R, basis: "Main-namespace data is released under CC0." },
  { id: "doaj", name: "DOAJ", hosts: ["doaj.org"], status: "licensed", licence: "CC0 (metadata)", terms: "https://doaj.org/terms/", read: R, basis: "Journal and article metadata are available under a CC0 waiver." },
  { id: "ncbi", name: "NCBI E-utilities", hosts: ["eutils.ncbi.nlm.nih.gov"], status: "licensed", licence: "Public domain (US Government)", terms: "https://www.ncbi.nlm.nih.gov/home/about/policies/", read: R, basis: "US Government information on NLM pages may be freely distributed and copied." },
  { id: "ebi", name: "EMBL-EBI / Europe PMC", hosts: ["www.ebi.ac.uk"], status: "conditional", licence: "EMBL-EBI Terms of Use", terms: "https://www.ebi.ac.uk/about/terms-of-use/", read: R, basis: "Use permitted; attribution is expected as each resource indicates.", condition: { text: "Attribute Europe PMC", met: "yes" } },
  { id: "clinicaltrials", name: "ClinicalTrials.gov", hosts: ["clinicaltrials.gov"], status: "unclear", licence: "US public domain; international copyright", terms: "https://clinicaltrials.gov/about-site/terms-conditions", read: R, basis: "The data carry international copyright outside the US; some entries carry third-party copyright." },
  { id: "endoflife", name: "endoflife.date", hosts: ["endoflife.date"], status: "licensed", licence: "MIT", terms: "https://github.com/endoflife-date/endoflife.date/blob/master/LICENSE", read: R, basis: "MIT licence on the project's data repository." },
  { id: "datamuse", name: "Datamuse", hosts: ["api.datamuse.com"], status: "licensed", licence: "Free use to 100,000 requests a day", terms: "https://www.datamuse.com/api/", read: R, basis: "Usable without restriction and without a key up to 100,000 requests a day, until 1 January 2027." },
  // Search, news and models
  { id: "google-news", name: "Google News RSS", hosts: ["news.google.com"], status: "barred", licence: "Google Terms", terms: "https://policies.google.com/terms", read: "2026-10-14", basis: "Non-commercial feed (GAPS G189)." },
  { id: "groq", name: "Groq", hosts: ["api.groq.com"], status: "unclear", licence: "Groq Services Agreement", terms: "https://console.groq.com/docs/legal/services-agreement", read: "2026-10-18", basis: "Allows a Customer Application; forbids reselling the Cloud Services (GAPS G197)." },
  { id: "tavily", name: "Tavily", hosts: ["api.tavily.com"], status: "licensed", licence: "Tavily Terms (paid key)", terms: "https://www.tavily.com/terms", read: R, basis: "Contemplates Customer Applications serving third-party end users. No key is set in production." },
  { id: "tech-docs", name: "Technical documentation sites (Python, Node.js and others)", hosts: ["docs.python.org", "nodejs.org"], status: "unread", licence: "Per site", terms: "https://docs.python.org/3/license.html", read: null, basis: "websearch.ts quotes pages from an allowlist of doc hosts; each site's licence is unread." },
  { id: "polymarket", name: "Polymarket", hosts: ["gamma-api.polymarket.com"], status: "unread", licence: "Unknown", terms: "https://polymarket.com/tos", read: null, basis: "Unreachable from the network this was checked on." },
  { id: "manifold", name: "Manifold Markets", hosts: ["api.manifold.markets"], status: "barred", licence: "Manifold Terms", terms: "https://docs.manifold.markets/api", read: R, basis: "API: academic, personal and non-commercial use; commercial use needs a data licence." },
];

/** Hosts that appear in src/ as examples, fixtures or links, never fetched. */
export const NOT_UPSTREAM = ["miner-wine.vercel.app", "example.com", "x.example", "2fexample.com"];

const ORDER: LicenceStatus[] = ["licensed", "conditional", "unclear", "unread", "barred"];

/** The weakest status among `ids`: one barred upstream makes the endpoint barred. */
export function weakest(ids: string[]): LicenceStatus {
  let worst = 0;
  for (const id of ids) {
    const s = SOURCES.find((x) => x.id === id);
    const rank = s ? ORDER.indexOf(s.status === "conditional" && s.condition?.met === "yes" ? "licensed" : s.status) : ORDER.indexOf("unread");
    worst = Math.max(worst, rank);
  }
  return ORDER[worst]!;
}

/**
 * The sources each declared endpoint's code can reach, from its module's import graph and
 * checked by test/sources.test.ts. It over-counts (a shared helper brings its
 * module's sources along), so an endpoint can look less licensed than it is, never more.
 */
export const ENDPOINT_SOURCES: Record<string, string[]> = {
  "/ssl-check": [],
  "/storm-alert": ["metno", "nominatim"],
  "/weather-forecast": ["metno", "nominatim", "nws"],
  "/ip-geolocate": ["ip-api", "ipinfo", "ipwhois"],
  "/translate": ["groq"],
  "/papers": ["doaj", "openalex"],
  "/extract": [],
  "/headlines": ["google-news"],
  "/wallet-balance": ["1rpc", "chain-rpcs", "drpc", "ensideas", "flashbots", "merkle", "publicnode"],
  "/fact-check": ["tavily", "wikipedia"],
  "/tx-lookup": ["4byte", "chain-rpcs", "dns-resolvers", "doaj", "drpc", "merkle", "ofac-list", "openalex", "openchain", "publicnode", "routescan"],
  "/transfer-verify": ["4byte", "chain-rpcs", "dns-resolvers", "doaj", "drpc", "merkle", "ofac-list", "openalex", "openchain", "publicnode", "routescan"],
  "/cve": ["cve", "nvd"],
  "/news-search": ["google-news"],
  "/convert": ["ecb", "frankfurter"],
  "/gas-price": ["chain-rpcs", "drpc", "merkle", "publicnode"],
  "/financial": ["bitstamp", "coingecko", "ecb", "frankfurter", "sec", "yahoo"],
  "/fraud-check": ["4byte", "chain-rpcs", "dns-resolvers", "doaj", "drpc", "merkle", "ofac-list", "openalex", "openchain", "publicnode"],
  "/token-holders": ["coingecko"],
  "/research": ["clinicaltrials", "ebi", "wikipedia"],
  "/crypto-price": ["bitstamp", "ecb", "frankfurter"],
  "/stock-price": ["bitstamp", "coingecko", "ecb", "frankfurter", "nasdaq", "sec", "yahoo"],
  "/cross-chain": ["4byte", "chain-rpcs", "drpc", "layerzero", "merkle", "openchain", "publicnode"],
  "/event-outcome": ["manifold", "polymarket"],
  "/url-scan": ["dns-resolvers", "urlhaus"],
  "/web-search": ["clinicaltrials", "ebi", "endoflife", "google-news", "groq", "tech-docs", "wikidata", "wikipedia"],
  "/sentiment": ["groq"],
  "/classify": ["datamuse", "groq"],
  "/research-synthesis": ["clinicaltrials", "doaj", "ebi", "ncbi", "openalex", "wikipedia"],
  "/sanctions-screen": ["ofac", "un-sanctions"],
  "/company-registry": ["gleif", "ofac", "sec", "un-sanctions"],
  "/sec-filings": ["ofac", "sec", "un-sanctions"],
  "/macro": ["bls", "ecb", "eurostat", "nyfed", "worldbank"],
  "/url-reputation": ["dns-resolvers", "urlhaus"],
  "/answer": ["groq", "wikipedia"],
};

/**
 * The `licensing` field added to every answer: the endpoint's weakest upstream
 * status and each upstream's own, with the full ledger at /sources. It covers
 * the upstreams the endpoint can reach, not only those this answer used.
 */
export function licensingFor(path: string): {
  endpoint_status: LicenceStatus; upstreams: Array<{ source: string; status: LicenceStatus }>; notices?: string[]; ledger: string;
} | null {
  const ids = ENDPOINT_SOURCES[path];
  if (!ids) return null;
  const used = ids.map((id) => SOURCES.find((x) => x.id === id)!);
  const notices = used.flatMap((s) => (s.condition?.notice ? [s.condition.notice] : []));
  return {
    endpoint_status: ids.length ? weakest(ids) : "licensed",
    upstreams: used.map((s) => ({ source: s.name, status: s.status })),
    ...(notices.length ? { notices } : {}),
    ledger: "/sources",
  };
}

/** The /sources ledger: every source, and every endpoint with its weakest status. */
export function ledger(): unknown {
  return {
    about: "What each upstream's terms allow a paid miner to do with its data, with the page each verdict was read from.",
    statuses: {
      licensed: "the terms grant it, with no condition we fail",
      conditional: "granted on a condition; `condition.met` says whether our answers meet it",
      unclear: "the terms were read and neither clearly grant nor forbid it",
      barred: "the terms forbid it",
      unread: "not read yet",
    },
    sources: SOURCES,
    endpoints: Object.fromEntries(Object.entries(ENDPOINT_SOURCES).map(([p, ids]) => [p, { status: ids.length ? weakest(ids) : "licensed", sources: ids }])),
  };
}
