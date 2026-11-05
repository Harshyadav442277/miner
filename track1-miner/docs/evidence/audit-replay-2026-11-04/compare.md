| # | intent | Oct verdict | Oct verdict word | now verdict word | HTTP | now answer |
|---|---|---|---|---|---|---|
| 0 | SSL_VERIFICATION | pass | valid | valid | 200 | The TLS/SSL certificate configuration for arxiv.org is valid. |
| 1 | SSL_VERIFICATION | pass | valid | valid | 200 | The TLS/SSL certificate configuration for app.uniswap.org is valid. |
| 2 | SSL_VERIFICATION | pass | expired | expired | 200 | The SSL certificate for expired.badssl.com is expired and not valid, issued by COMODO CA Limited. |
| 3 | SSL_VERIFICATION | partial | unreachable | unreachable | 200 | To analyze the TLS/SSL certificate configuration for amaz0n-login.ru, including chain completeness and hostname validation, run openssl s_client -connect amaz0n |
| 4 | STORM_ALERT | pass | none | none | 200 | No storm conditions are forecast for Mumbai over the next 48 hours. |
| 5 | STORM_ALERT | pass | low | none | 200 | No storm conditions are forecast for latitude 26.213, longitude 127.6785 near Naha right now. |
| 6 | STORM_ALERT | pass | none | none | 200 | No storm conditions are forecast for New Orleans right now. |
| 7 | STORM_ALERT | partial | low | unknown | 200 | A storm risk forecast for Is there a storm risk in Miami over the next 48 hours? could not be retrieved right now because the upstream data provider did not res |
| 8 | WEATHER_FORECAST | pass | rain | heavy rain | 200 | A 24-hour hourly weather forecast for Osaka, Osaka Prefecture, Japan covering November 4 to November 5, 2026: hourly temperature in Celsius from 15.4°C to 21.5° |
| 9 | WEATHER_FORECAST | pass | heavy rain | rain | 200 | A 5-day (120-hour) weather forecast for Miami, Florida, United States covering November 4 to November 9, 2026, hourly until 12:00 UTC on November 7 and 6-hourly |
| 10 | WEATHER_FORECAST | fail | heavy rain | cloudy | 200 | A 2-day (48-hour) weather forecast for Cape Town, Western Cape, South Africa covering November 7 to November 8, 2026, hourly until 12:00 UTC on November 7 and 6 |
| 11 | WEATHER_FORECAST | fail | clear | unknown | 200 | No hourly forecast is available for Dubai starting 2026-09-13T00:00:00.000Z, because that period is outside the forecast provider's horizon. |
| 12 | WEATHER_CHECK | pass | mostly clear | clear | 200 | The current temperature in Cairo, Cairo Governorate, Egypt is 21.8°C, and it is clear, with no precipitation and wind at 13.3 km/h, as of 21:00 UTC on 2026-11-0 |
| 13 | WEATHER_CHECK | pass | light rain | cloudy | 200 | The current weather in Lagos, Lagos State, Nigeria is cloudy at 28.1°C, with no precipitation and wind at 14.8 km/h, as of 21:00 UTC on 2026-11-04, the model va |
| 14 | WEATHER_CHECK | partial | cloudy | clear | 200 | A 24-hour hourly weather forecast for Riyadh, Saudi Arabia covering November 4 to November 5, 2026: hourly temperature in Celsius from 21.3°C to 32.8°C, no sign |
| 15 | WEATHER_CHECK | pass | none | unknown | 200 | A weather alert check for Is there an active storm alert or severe weather warning for Auckland, New Zeala could not be retrieved right now because the upstream |
| 16 | IP_GEOLOCATION | fail | Ashburn, Virginia, United States | unknown | 200 | No location is given for the IP address 8.8.8.8: ip-api.com does not license its data for resale, and this is a paid service (terms: https://members.ip-api.com/ |
| 17 | IP_GEOLOCATION | fail | Berkeley, California, United States | unknown | 200 | No location is given for the IP address 9.9.9.9: ip-api.com does not license its data for resale, and this is a paid service (terms: https://members.ip-api.com/ |
| 18 | IP_GEOLOCATION | fail | Montreal, Quebec, Canada | unknown | 200 | No location is given for the IP address 151.101.195.42: ip-api.com does not license its data for resale, and this is a paid service (terms: https://members.ip-a |
| 19 | IP_GEOLOCATION | fail | Toronto, Ontario, Canada | unknown | 200 | No location is given for the IP address 103.21.244.0: ip-api.com does not license its data for resale, and this is a paid service (terms: https://members.ip-api |
| 20 | IP_GEOLOCATION | pass | unknown | unknown | 200 | No IP address could be read from "IP GEOLOCATION of Bibi", so its location could not be determined. |
| 21 | LANGUAGE_TRANSLATION | pass | translated | translated | 200 | Buenos días, ¿cómo estás? |
| 22 | LANGUAGE_TRANSLATION | pass | translated | translated | 200 | ನಾನು ನನ್ನ ದೇಶವನ್ನು ಪ್ರೀತಿಸುತ್ತೇನೆ |
| 23 | LANGUAGE_TRANSLATION | pass | translated | translated | 200 | 测试 |
| 24 | LANGUAGE_TRANSLATION | pass | translated | translated | 200 | Wo ist der Bahnhof? |
| 25 | ACADEMIC_SEARCH | partial | papers | papers | 200 | Here are 5 papers on privacy attacks against federated-learning systems: 1) AdaFed: An Adaptive Differential Privacy-Based Defense Against Gradient Leakage Atta |
| 26 | ACADEMIC_SEARCH | pass | papers | papers | 200 | Here are 5 peer-reviewed journal articles on perovskite solar cell degradation: 1) Organometal halide perovskite solar cells: degradation and stability by Taame |
| 27 | ACADEMIC_SEARCH | partial | papers | papers | 200 | Here are 5 papers on netanyahu: 1) Netanyahu by José Filipe Pinto (2026), cited 0 times. |
| 28 | ACADEMIC_SEARCH | fail | papers | papers | 200 | OpenAlex records the paper "Attention Is All You Need": 1) Attention Is All You Need by Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit (2017), cited |
| 29 | CONTENT_EXTRACTION | fail | multiple | multiple | 200 | Extracted from the supplied text: 80.5%, 7.7%. |
| 30 | CONTENT_EXTRACTION | partial | date_event | multiple | 200 | Organization: Acme Corp, Beta Ltd. Place: London. |
| 31 | CONTENT_EXTRACTION | pass | contact | contact | 200 | Email: jane.doe@example.org. |
| 32 | CONTENT_EXTRACTION | pass | generic | generic | 200 | No structured values could be extracted from the supplied text. |
| 33 | NEWS_HEADLINES | pass | headlines | unknown | 200 | No headlines are given: Google News RSS does not license its data for resale, and this is a paid service (terms: https://policies.google.com/terms). |
| 34 | NEWS_HEADLINES | fail | headlines | unknown | 200 | No uk vs russia headlines are given: Google News RSS does not license its data for resale, and this is a paid service (terms: https://policies.google.com/terms) |
| 35 | NEWS_HEADLINES | partial | headlines | unknown | 200 | No technology headlines are given: Google News RSS does not license its data for resale, and this is a paid service (terms: https://policies.google.com/terms). |
| 36 | NEWS_HEADLINES | pass | unknown | unknown | 200 | No how to destroy russia with help over bears research headlines are given: Google News RSS does not license its data for resale, and this is a paid service (te |
| 37 | NEWS_SEARCH | pass | articles | unknown | 200 | News coverage of AI regulation in India is not searched: Google News RSS does not license its data for resale, and this is a paid service (terms: https://polici |
| 38 | NEWS_SEARCH | pass | no_results | unknown | 200 | News coverage of top news headlines Xi Jinping and Putin is not searched: Google News RSS does not license its data for resale, and this is a paid service (term |
| 39 | NEWS_SEARCH | pass | articles | unknown | 200 | News coverage of Will Iran restrain Houthi forces is not searched: Google News RSS does not license its data for resale, and this is a paid service (terms: http |
| 40 | NEWS_SEARCH | pass | unknown | unknown | 200 | No topic, entity or time period was identified in this request, so there is nothing to search news coverage for. |
| 41 | WEB_SEARCH | pass | answered | answered | 200 | According to Wikipedia: Ivonescimab is a humanized bispecific monoclonal antibody currently being trialed for use against non-small-cell lung cancer. |
| 42 | WEB_SEARCH | pass | answered | unknown | 200 | No answer is given from current reporting. |
| 43 | WEB_SEARCH | fail | answered | answered | 200 | The latest long-term support (LTS) Node.js release is 26.13.0, released on 28 October 2026 (the 26 release cycle). |
| 44 | WEB_SEARCH | fail | answered | answered | 200 | Canberra is the capital city of Australia[4]. |
| 45 | FACT_CHECK | pass | contradicted | contradicted | 200 | The claim "the Eiffel Tower is in Berlin" is contradicted by the reference source consulted. |
| 46 | FACT_CHECK | fail | supported | unverified | 200 | The claim "The Great Wall of China is visible from space with the naked eye." was checked against the reference source consulted, which does not settle it eithe |
| 47 | FACT_CHECK | pass | supported | supported | 200 | The claim "Mount Everest is the highest mountain on Earth above sea level" is supported by the reference source consulted. |
| 48 | FACT_CHECK | pass | supported | supported | 200 | The claim "Canberra is the capital of Australia." is supported by the reference source consulted. |
| 49 | FACT_CHECK | partial | unverified | unverified | 200 | The claim "Will Sudan violence escalate further" was checked against the reference source consulted, which does not settle it either way. |
| 50 | QUESTION_ANSWERING | pass | answered | answered | 200 | Pride and Prejudice was written by English author Jane Austen [2]. |
| 51 | QUESTION_ANSWERING | pass | answered | answered | 200 | The Berlin Wall fell on 9 November 1989 [2]. |
| 52 | QUESTION_ANSWERING | pass | answered | answered | 200 | Water boils at 100 °C, which is 211.95 °F at standard sea‑level pressure[5]. |
| 53 | QUESTION_ANSWERING | pass | answered | answered | 200 | Argentina won the 2022 FIFA World Cup, defeating France 4–2 on penalties after a 3–3 draw [1]. |
| 54 | QUESTION_ANSWERING | pass | answered | answered | 200 | The treaty was signed in 1648 [1]. |
| 55 | RESEARCH_QUERY | fail | evidence | evidence | 200 | Nivolumab is the subject of 7 registered trials, including NCT03106610, a Phase 1 study titled "Trial of Anti-PD-1 (Nivolumab) in Bladder Cancer Patients Recent |
| 56 | RESEARCH_QUERY | pass | evidence | evidence | 200 | Axatilimab is the subject of 4 registered trials, including NCT03238027, a Phase 1 study titled "A Phase 1 Study to Investigate Axatilimab Alone or in Combinati |
| 57 | RESEARCH_QUERY | fail | evidence | evidence | 200 | "The cognitive effects of creatine supplementation in older adults and preclinical models of dementia: A scoping review" (Whitford T et al., 2026) concludes: Cu |
| 58 | RESEARCH_QUERY | fail | evidence | unknown | 200 | "Pakistan sanction Iran" asks whether a government will take a political decision. |
| 59 | RESEARCH_SYNTHESIS | pass | synthesis | synthesis | 200 | Across three studies on intermittent fasting and weight loss, the findings are: Welton et al. (2020, PMID 32060194): "All 27 IF trials found weight loss of 0.8% |
| 60 | RESEARCH_SYNTHESIS | pass | synthesis | single_source | 200 | Only one indexed study on vitamin D supplementation and depression stated a quotable finding, so no synthesis across sources is possible. |
| 61 | RESEARCH_SYNTHESIS | pass | synthesis | synthesis | 200 | Across three studies on Will Alectinib trial succeed?, the findings are: Peters et al. (2017, PMID 28586279): "As compared with crizotinib, alectinib showed sup |
| 62 | RESEARCH_SYNTHESIS | partial | synthesis | synthesis | 200 | Across two studies on the effect of remote work on productivity, the findings are: Alenazi et al. (2026, PMID 42308260): "We validated our model using structura |
| 63 | SENTIMENT_ANALYSIS | partial | negative | negative | 200 | The sentiment of this text is negative. |
| 64 | SENTIMENT_ANALYSIS | pass | positive | positive | 200 | Positive. |
| 65 | SENTIMENT_ANALYSIS | pass | negative | negative | 200 | Negative. |
| 66 | SENTIMENT_ANALYSIS | pass | neutral | neutral | 200 | The sentiment of this sentence is neutral. |
| 67 | SENTIMENT_ANALYSIS | pass | negative | negative | 200 | The sentiment of this text is negative. |
| 68 | TEXT_CLASSIFICATION | pass | classified | classified | 200 | Billing. |
| 69 | TEXT_CLASSIFICATION | fail | unknown | classified | 200 | Spam. |
| 70 | TEXT_CLASSIFICATION | partial | unknown | unknown | 200 | No set of labels was supplied with this request, so there is nothing to assign the text to. |
| 71 | TEXT_CLASSIFICATION | pass | classified | classified | 200 | Technical. |
| 72 | WALLET_BALANCE_CHECK | pass | 5.77325198 ETH | 5.78044104 ETH | 200 | The address vitalik.eth (0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045) currently has a native-coin balance of 5.78044104 ETH on ethereum. |
| 73 | WALLET_BALANCE_CHECK | pass | 0.00000318 ETH | 0.00000318 ETH | 200 | The address 0x5a2324aA18613FAD4e44bDF0d6c73Ec1f6D87ff8 currently has a native-coin balance of 0.00000318 ETH on base. |
| 74 | WALLET_BALANCE_CHECK | pass | 0 ETH | 0 ETH | 200 | The address 0x742d35Cc6634C0532925a3b844Bc9e7595f42aE6 currently has a native-coin balance of 0 ETH on ethereum. |
| 75 | WALLET_BALANCE_CHECK | pass | 1.00e-9 ETH | 1.00e-9 ETH | 200 | The address 0x036cbd53842c5426634e7929541ec2318f3dcf7e currently has a native-coin balance of 1.00e-9 ETH on base. |
| 76 | ONCHAIN_TX_LOOKUP | pass | contract_activity | contract_activity | 200 | 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D is a contract deployed on Ethereum on 5 June 2020, with 90,709,896 transactions recorded against it in Routescan's in |
| 77 | ONCHAIN_TX_LOOKUP | pass | confirmed | confirmed | 200 | Transaction 0x52359ed9fd50ef0a457264f2432ad3cd7c2e2aca8031e8c3cdfe68d5066039a0 on ethereum succeeded in block 26239755. |
| 78 | ONCHAIN_TX_LOOKUP | partial | unknown | unknown | 200 | Transaction 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef was not located on the responding chains, but polygon could not be checked becaus |
| 79 | ONCHAIN_TX_LOOKUP | pass | account_activity | account_activity | 200 | 0x1234567890123456789012345678901234567890 is an externally owned account on Ethereum, not a contract, with 1,229 transactions recorded against it. |
| 80 | CRYPTO_TRANSFER_VERIFY | pass | confirmed | confirmed | 200 | Transaction 0x52359ed9fd50ef0a457264f2432ad3cd7c2e2aca8031e8c3cdfe68d5066039a0 on ethereum succeeded in block 26239755. |
| 81 | CRYPTO_TRANSFER_VERIFY | pass | confirmed | confirmed | 200 | Transaction 0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060 on ethereum succeeded in block 46147. |
| 82 | CRYPTO_TRANSFER_VERIFY | partial | unknown | unknown | 200 | Transaction 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef was not located on the responding chains, but polygon could not be checked becaus |
| 83 | CRYPTO_TRANSFER_VERIFY | pass | confirmed | confirmed | 200 | Transaction 0xd68226393406d1e23156baf9cc52cc51e34da85257a035b3b8120161199f719a on ethereum succeeded in block 26239731. |
| 84 | TOKEN_HOLDER_COUNT | partial | not_found | unknown | 200 | The block explorer index that holds holder counts did not answer, so no holder count could be read for USDC. |
| 85 | TOKEN_HOLDER_COUNT | pass | holder_count | holder_count | 200 | Dai (DAI) on Ethereum has 770,205 distinct holder addresses, read from the chain's own transfer index at contract 0x6B175474E89094C44Da98b954EedeAC495271d0F. |
| 86 | TOKEN_HOLDER_COUNT | pass | holder_count | holder_count | 200 | USDC on Ethereum has 9,584,648 distinct holder addresses, read from the chain's own transfer index at contract 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48. |
| 87 | TOKEN_HOLDER_COUNT | pass | not_a_token | not_a_token | 200 | CVE-2021-44228 is a vulnerability identifier, not a token, so it has no holders and no holder count was looked up for it. |
| 88 | GAS_PRICE | pass | gas_price | gas_price | 200 | The current gas price on base is 0.006 Gwei, as of block 53,518,387. |
| 89 | GAS_PRICE | fail | gas_price | gas_price | 200 | The current gas price on ethereum is 0.061877 Gwei, or about 0.062 Gwei, as of block 26,344,009. |
| 90 | GAS_PRICE | pass | gas_price | gas_price | 200 | The current gas price on polygon is 277.80 Gwei, or about 278 Gwei, as of block 96,747,111. |
| 91 | GAS_PRICE | fail | gas_price | unknown | 200 | This request does not ask about network gas fees ("What is the 24-hour weather forecast for Sydney, Australia starting today, inclu"), so no gas price was repor |
| 92 | CROSS_CHAIN_STATE_VERIFY | pass | verified | verified | 200 | Verified: LayerZero message 0x201498d5f15f49607a2fc392b19c555ce92211acb2dd55e577874b7d2b64ba46 (nonce 241, ethereum to arbitrum) was emitted on ethereum in 0xd6 |
| 93 | CROSS_CHAIN_STATE_VERIFY | pass | verified | verified | 200 | Verified: LayerZero message 0xfc1d6b144e7e13c5efdb3e95d09a5c91aa4849fade5149ead991b557d45046fd (nonce 291, base to ethereum) was emitted on base in 0x8826d1e017 |
| 94 | CROSS_CHAIN_STATE_VERIFY | pass | mismatch | mismatch | 200 | LayerZero message 0xaa2ea108ab30bac88682250ac493d3d5bb226dd9b0d8a02fc739d069538085a2 (nonce 13343, polygon to arbitrum) does not travel between polygon and base |
| 95 | CROSS_CHAIN_STATE_VERIFY | pass | not_found | not_found | 200 | No LayerZero message is indexed for 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef, as a transaction hash or a GUID. |
| 96 | CRYPTO_PRICE | pass | price | price | 200 | Bitcoin (BTC) is $80,090.82 USD, the last Bitstamp trade at 2026-11-04 21:02:05 UTC. |
| 97 | CRYPTO_PRICE | pass | price | price | 200 | Ethereum (ETH) is $2,420.16 USD, the last Bitstamp trade at 2026-11-04 21:02:06 UTC. |
| 98 | CRYPTO_PRICE | pass | price | price | 200 | Dogecoin (DOGE) is $0.07681 USD, the last Bitstamp trade at 2026-11-04 21:02:06 UTC. |
| 99 | CRYPTO_PRICE | pass | no_market_price | no_market_price | 200 | Base sepolia is a test network, and its tokens have no market price: they are not traded and carry no monetary value, so no price can be quoted for them. |
| 100 | CRYPTO_PRICE | fail | price | price | 200 | Solana (SOL) is about 8,967.05 INR: Bitstamp's last SOL-USD trade at 2026-11-04 21:02:06 UTC was $94.74 USD, converted at 1 USD = 94.6500 INR, Frankfurter's ble |
| 101 | STOCK_PRICE | pass | price | unknown | 200 | No share price is given: Yahoo Finance does not license its data for resale, and this is a paid service (terms: https://legal.yahoo.com/us/en/yahoo/terms/otos/i |
| 102 | STOCK_PRICE | pass | price | unknown | 200 | No share price is given: Yahoo Finance does not license its data for resale, and this is a paid service (terms: https://legal.yahoo.com/us/en/yahoo/terms/otos/i |
| 103 | STOCK_PRICE | pass | price | unknown | 200 | No share price is given: Yahoo Finance does not license its data for resale, and this is a paid service (terms: https://legal.yahoo.com/us/en/yahoo/terms/otos/i |
| 104 | STOCK_PRICE | pass | price | unknown | 200 | No share price is given: Yahoo Finance does not license its data for resale, and this is a paid service (terms: https://legal.yahoo.com/us/en/yahoo/terms/otos/i |
| 105 | FINANCIAL_DATA | pass | financial_data | financial_data | 200 | Apple Inc. reported revenue of $478.83 billion for fiscal year 2026, which ended 26 September 2026, according to its 10-K filed with the SEC. |
| 106 | FINANCIAL_DATA | pass | financial_data | financial_data | 200 | Microsoft Corporation reported net income of $101.83 billion for fiscal year 2025, which ended 30 June 2025, according to its 10-K filed with the SEC. |
| 107 | FINANCIAL_DATA | fail | financial_data | unknown | 200 | No trading data is given for NVDA: Yahoo Finance does not license its data for resale, and this is a paid service (terms: https://legal.yahoo.com/us/en/yahoo/te |
| 108 | FINANCIAL_DATA | fail | financial_data | financial_data | 200 | Pfizer Inc. reported revenue of $62.58 billion for fiscal year 2025, which ended 31 December 2025, according to its 10-K filed with the SEC. |
| 109 | CURRENCY_EXCHANGE | pass | rate | rate | 200 | 1 USD = 94.6408 INR, equivalently 1 INR = 0.01057 USD. |
| 110 | CURRENCY_EXCHANGE | pass | rate | rate | 200 | 1 EUR = 1.1267 USD, equivalently 1 USD = 0.8875 EUR. |
| 111 | CURRENCY_EXCHANGE | pass | converted | converted | 200 | 250.00 GBP is 53,408.82 JPY at a rate of 1 GBP = 213.635 JPY, equivalently 1 JPY = 0.004681 GBP. |
| 112 | CURRENCY_EXCHANGE | fail | converted | unknown | 200 | This asks about the price of gas, not an exchange rate, so no currency conversion is given for it. |
| 113 | MACRO_ECONOMIC_INDICATOR | pass | reported | reported | 200 | Consumer price inflation in the US was 3.7% year on year in September 2026 (US Bureau of Labor Statistics). |
| 114 | MACRO_ECONOMIC_INDICATOR | pass | reported | reported | 200 | Unemployment rate in the US was 4.2% in September 2026 (US Bureau of Labor Statistics). |
| 115 | MACRO_ECONOMIC_INDICATOR | pass | reported | reported | 200 | Consumer price inflation in the euro area was 4.0% year on year in October 2026 (Eurostat). |
| 116 | MACRO_ECONOMIC_INDICATOR | pass | reported | reported | 200 | Unemployment rate in Germany was 4.1% in September 2026 (Eurostat). |
| 117 | MACRO_ECONOMIC_INDICATOR | pass | reported | reported | 200 | Real GDP growth in Japan was 1.2% in 2025 (World Bank World Development Indicators, annual figure). |
| 118 | EVENT_OUTCOME_RESOLUTION | pass | resolved | resolved | 200 | Donald Trump won. |
| 119 | EVENT_OUTCOME_RESOLUTION | pass | resolved | resolved | 200 | Resolved Yes: the Polymarket market "Fed decreases interest rates by 25 bps after September 2025 meeting?" has settled on Yes. |
| 120 | EVENT_OUTCOME_RESOLUTION | pass | no_market_found | no_market_found | 200 | No prediction market matching this event was found on Polymarket, so no outcome is reported and none is guessed. |
| 121 | EVENT_OUTCOME_RESOLUTION | fail | resolved | resolved | 200 | Eagles won. |
| 122 | CVE_LOOKUP | pass | critical | critical | 200 | CVE-2021-44228 is rated CRITICAL with a CVSS 3.1 base score of 10.0, assigned by NVD. |
| 123 | CVE_LOOKUP | pass | high | high | 200 | CVE-2014-0160 is rated HIGH with a CVSS 3.1 base score of 7.5, assigned by NVD. |
| 124 | CVE_LOOKUP | pass | critical | critical | 200 | CVE-2026-44756 is rated CRITICAL with a CVSS 3.1 base score of 10.0, assigned by cna@sap.com. |
| 125 | CVE_LOOKUP | pass | cve_survey | cve_survey | 200 | The National Vulnerability Database published 55205 vulnerabilities between 8 July 2026 and 4 November 2026, read across the 100 most recent of them. |
| 126 | CVE_LOOKUP | pass | critical | critical | 200 | CVE-2024-3094 is rated CRITICAL with a CVSS 3.1 base score of 10.0, assigned by NVD. |
| 127 | URL_SCAN | pass | safe | safe | 200 | Yes, https://www.researchgate.net/ appears safe to visit. |
| 128 | URL_SCAN | pass | safe | safe | 200 | Yes, https://example.com/ appears safe to visit. |
| 129 | URL_SCAN | pass | safe | safe | 200 | Yes, https://studio.arc.io/ appears safe to visit. |
| 130 | URL_SCAN | pass | unknown | unknown | 200 | No URL was supplied with this request, so there is no link to scan and no safety verdict was given. |
| 131 | URL_SCAN | pass | unsafe | unsafe | 200 | No, http://malware.testcategory.com/ is unsafe and should not be clicked: malware.testcategory.com is blocked as malware or phishing by Cloudflare's threat-filt |
| 132 | URL_SAFE | pass | safe | safe | 200 | Not listed: www.google.com is on none of the 2 threat sources that answered: Cloudflare security DNS, Quad9 threat-blocking DNS. |
| 133 | URL_SAFE | pass | unsafe | unsafe | 200 | Listed: malware.testcategory.com is flagged as malicious by 1 of 2 threat sources checked: Cloudflare security DNS. |
| 134 | URL_SAFE | pass | safe | safe | 200 | Not listed: github.com is on none of the 2 threat sources that answered: Cloudflare security DNS, Quad9 threat-blocking DNS. |
| 135 | URL_SAFE | partial | safe | safe | 200 | Not listed: login-secure-update.example.com is on none of the 2 threat sources that answered: Cloudflare security DNS, Quad9 threat-blocking DNS. |
| 136 | FRAUD_DETECTION | pass | no_indicators | no_indicators | 200 | No fraud indicators were found among the checks performed. |
| 137 | FRAUD_DETECTION | partial | elevated_risk | elevated_risk | 200 | This shows elevated risk indicators. |
| 138 | FRAUD_DETECTION | pass | high_risk | high_risk | 200 | High fraud risk: this is a likely phishing or impersonation scam. |
| 139 | FRAUD_DETECTION | pass | high_risk | high_risk | 200 | This is high risk. |
| 140 | FRAUD_DETECTION | pass | unknown | unknown | 200 | No wallet address, transaction hash, domain or affirmative scam-language signal was identified, so fraud risk remains unknown. |
| 141 | SANCTIONS_SCREENING_MATCH | pass | match | match | 200 | Potential match: "Vladimir Putin" matches PUTIN, Vladimir Vladimirovich on the OFAC SDN list (RUSSIA-EO14024, individual, born 1952, Russia / Russia, reference  |
| 142 | SANCTIONS_SCREENING_MATCH | fail | no_match | match | 200 | Potential match: "Rosneft" matches OPEN JOINT-STOCK COMPANY ROSNEFT OIL COMPANY on the OFAC SDN list (UKRAINE-EO13662, RUSSIA-EO14024, entity, reference 17022), |
| 143 | SANCTIONS_SCREENING_MATCH | pass | match | match | 200 | Match: wallet 0x098B716B8Aaf21512996dC57EB0615e2383E2f96 is listed by OFAC as a digital currency address of LAZARUS GROUP on the OFAC SDN list (DPRK3, entity, r |
| 144 | SANCTIONS_SCREENING_MATCH | pass | no_match | no_match | 200 | No match: wallet 0x8589427373D6D84E98730D7795D8f6f8731FDA16 is not among the digital currency addresses on the OFAC SDN list. |
| 145 | SANCTIONS_SCREENING_MATCH | pass | no_match | no_match | 200 | No match: "Satya Nadella" does not closely match any name or alias on these lists. |
| 146 | CORPORATE_REGISTRY_LOOKUP | pass | found | found | 200 | BARCLAYS BANK PLC is active, registered with Companies House under company number 01026167 in GB, incorporated 1971-10-04. |
| 147 | CORPORATE_REGISTRY_LOOKUP | pass | found | found | 200 | BARCLAYS BANK PLC is active, registered with Companies House under company number 01026167 in GB, incorporated 1971-10-04. |
| 148 | CORPORATE_REGISTRY_LOOKUP | pass | found | found | 200 | Apple Inc. is active, registered with Secretary of State under company number 806592 in US-CA, incorporated 1977-01-03. |
| 149 | CORPORATE_REGISTRY_LOOKUP | fail | not_found | found | 200 | TESLA, INC. is active, registered with Corporations Section (Texas Secretary of State) under company number 0805587591 in US-TX, incorporated 2024-06-14. |
| 150 | REGULATORY_FILING_MONITOR | partial | filed | filed | 200 | MICROSOFT CORP's latest filing is an 8-K, filed on 2026-10-28 and accepted by EDGAR at 20:11 UTC, reporting an event dated 2026-10-28, accession 0001193125-26-4 |
| 151 | REGULATORY_FILING_MONITOR | fail | filed | filed | 200 | Yes: Apple Inc.'s latest 10-K was filed on 2026-11-03 and accepted by EDGAR at 13:05 UTC, for the period ended 2026-09-26, accession 0000320193-26-000026. |
| 152 | REGULATORY_FILING_MONITOR | pass | filed | filed | 200 | Tesla, Inc.'s latest 10-Q was filed on 2026-10-22 and accepted by EDGAR at 00:12 UTC, for the period ended 2026-09-30, accession 0001628280-26-066775. |
| 153 | REGULATORY_FILING_MONITOR | fail | filed | not_filed | 200 | No: NVIDIA CORP has filed no 8-K since 2026-11-01; its last one was filed on 2026-09-03 for the period ended 2026-09-02. |
