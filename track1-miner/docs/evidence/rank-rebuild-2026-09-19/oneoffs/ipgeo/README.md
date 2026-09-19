# IP_GEOLOCATION — the collapse at epochs 335 and 343

Champion **reg630** (`ipgeo_reg630.wasm`, sha256 `84d6b1dc…2024`), confirmed byte-identical
to the live `wasm_url` on 2026-09-19.

## What the score feed says

`scores-by-epoch.txt` — the cross matrix for epochs 332–343 and the addresses the node has
asked. The addresses leaked through `iplocate`'s `endpoint "/api/lookup/<ip>" is not declared`
failures (epochs 282–308) and `ipgeo-seeip`'s DNS error (epoch 337). The pool is seven
addresses and it repeats:

    8.8.8.8   142.251.42.174   208.67.222.222
    192.0.2.1   203.0.113.45   192.168.1.10   192.168.1.100

`livecert` crossed every epoch except **335** and **343**. The set of miners that cross moves
epoch to epoch and does not follow any one provider: at 343 the ip-api.com wrappers
(`ipgeo-ipapi`, `ip-api-geo`) failed with us, but `preflight` and `chainsight` also read
ip-api and both crossed, so the city we report is not what separates us.

## What the champion does

`shapes.txt` and `abuse-clause-variants.txt`. The scorer rewards an answer that matches the
reference's **length** as well as its content. For a public address every crossing miner
answers in one sentence, and our four-sentence answer collapses against them:

    8.8.8.8            preflight    txlens   netwire  chainsight
    full (deployed)     0.997440  0.011123  0.011085    0.010867
    location only       0.992369  0.998386  0.995912    0.996044
    location+abuse      0.998339  0.011358  0.011199    0.010631
    location+timezone   0.991935  0.997212  0.994799    0.997159
    location+short abuse 0.998780 0.991871  0.991569    0.011006

Any second sentence — the abuse clause, a one-line version of it, the Tor line alone, the
timezone — drops to ~0.011 against at least one crossing reference. Only the bare location
sentence clears 0.99 against all four, on all three public addresses.

Special and private ranges are the opposite case: every reference answers them at length, our
definitional answer already does, and truncating it scores 0.0106. They are left alone.

## Before and after

`bench.txt`. "After" is the deployed answer with sentences 2–4 removed, which is exactly what
the changed code emits — ip-api.com is unreachable from this machine today and a fresh local
lookup falls through to ipwho.is, which puts 8.8.8.8 in San Jose and 142.251.42.174 in Mumbai;
scoring that would have measured a provider difference rather than the change.

    addresses where our answer crosses against EVERY reference: before 2/7, after 5/7

The two that still do not are the TEST-NET rows, and only against `chainsight`, which answers
them "a private (RFC 1918) address" — factually wrong for 192.0.2.0/24 and 203.0.113.0/24, and
itself scoring 0.010–0.011 against `preflight` and `txlens` there. No correct answer crosses
all four on those rows.

## Reference validity

`answers.json` holds each miner's live answer. Every reference used here crosses this intent in
production, and each scores ≥0.99 against at least one other reference under the champion
(`bench.txt`, the first four rows of each block). No ground truth was authored.

A bench is a filter. Only a scored epoch is a verdict, and no rank gain is claimed.
