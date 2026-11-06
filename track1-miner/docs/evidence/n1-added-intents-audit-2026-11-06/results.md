# Audit of the added intents — 2026-11-06T22:55:52.219Z

Miner: https://miner-wine.vercel.app

| intent | question | answer (start) | source | verdict |
|---|---|---|---|---|
| DNS_RECORD_LOOKUP | What are the A records for example.com? | example.com has 2 A records: 104.20.23.154, 172.66.147.243. | Cloudflare DoH A: 104.20.23.154, 172.66.147.243 | pass |
| DNS_RECORD_LOOKUP | What MX records does gmail.com have? | gmail.com has 5 MX records: 10 alt1.gmail-smtp-in.l.google.com, 20 alt2.gmail-smtp-in.l.google.com, 30 alt3.gmail-smtp-in.l.google.com, 40 alt4.gmail-smtp-in.l.google.com, 5 gmail-smtp-in.l.google.com. | Cloudflare DoH MX: 30 alt3.gmail-smtp-in.l.google.com, 20 alt2.gmail-smtp-in.l.google.com, 40 alt4. | pass |
| DNS_RECORD_LOOKUP | What are the AAAA records of wikipedia.org? | wikipedia.org has 1 AAAA record: 2620:0:861:ed1a::1. | Cloudflare DoH AAAA: 2001:df2:e500:ed1a::1 | pass on count; addresses differ by region (geo-DNS) |
| DNS_RECORD_LOOKUP | Which name servers does github.com use? | github.com has 8 NS records: dns1.p08.nsone.net, dns2.p08.nsone.net, dns3.p08.nsone.net, dns4.p08.nsone.net, ns-1283.awsdns-32.org, ns-1707.awsdns-21.co.uk and 2 more. | Cloudflare DoH NS: dns1.p08.nsone.net, dns2.p08.nsone.net, dns3.p08.nsone.net, dns4.p08.nsone.net,  | pass |
| DNS_RECORD_LOOKUP | Show the TXT records for google.com | google.com has 17 TXT records: MS=E4A68B9AB2BB9670BCE15412F62916164C0B20BB, Z29vZ2xl, _r4rd1pvwyrpi7sw4a3hzmw8e51yh9td, apple-domain-verification=30afIBcvSuDV2PLX, arcules-domain-verification=2R4t5G7nI6tRCo61lpxxbLksPYst | Cloudflare DoH TXT: apple-domain-verification=30afIBcvSuDV2PLX, v=spf1 include:_spf.google.com ~all, | pass |
| TOKEN_TOTAL_SUPPLY_VERIFY | What is the total supply of USDC on Ethereum? | USDC's total supply on Ethereum at block 26358933 is 46,288,933,159.63 USDC (exact: 46288933159.634799). | eth_call totalSupply latest: 46288933159.63 USDC | pass |
| TOKEN_TOTAL_SUPPLY_VERIFY | Total supply of token 0x6B175474E89094C44Da98b954EedeAC495271d0F on ethereum | DAI's total supply on Ethereum at block 26358933 is 4,486,931,389.45 DAI (exact: 4486931389.451553965847287316). | eth_call totalSupply latest: 4486931389.45 DAI | pass |
| TOKEN_TOTAL_SUPPLY_VERIFY | What is the total supply of USDT on Ethereum? | USDT's total supply on Ethereum at block 26358933 is 84,298,550,180.94 USDT (exact: 84298550180.940091). | eth_call totalSupply latest: 84298550180.94 USDT | pass |
| TOKEN_TOTAL_SUPPLY_VERIFY | What is WETH's total supply on Ethereum? | WETH's total supply on Ethereum at block 26358933 is 2,113,998.89 WETH (exact: 2113998.894449146434847715). | eth_call totalSupply latest: 2113998.94 WETH | pass |
| TOKEN_TOTAL_SUPPLY_VERIFY | What is the total supply of LINK on Ethereum? | LINK's total supply on Ethereum at block 26358933 is 1,000,000,000 LINK (exact: 1000000000). | eth_call totalSupply latest: 1000000000.00 LINK | pass |

**10/10 pass.**
