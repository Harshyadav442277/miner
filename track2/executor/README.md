---
title: LiveCert evaluator executor
sdk: docker
app_port: 7860
pinned: false
---

# LiveCert evaluator executor (Telegraph Season II)

The runnable URL for our Evaluator adapters. A validator posts a batch of token lists to
`https://<space>.hf.space/<FAMILY>`, and gets back one score per item plus the identity hashes.
The scores are computed by the Telegraph kit's reference `adapterexec` (`telegraph-wasm-baseline`
`1ed063e`), on the Foundation Model release validators run, so they are the same bits.

- `Dockerfile` builds `adapterexec`, downloads the foundation and each package in `adapters.txt`, and checks every
  file's sha256.
- `start.sh` starts two workers per adapter and the fan-out (`fanout_exec.py`), which splits a batch across them.
- `GET /` lists the families served. The batch log keeps sizes, timings and identity hashes only.

Source and history: `track2/executor/` in https://github.com/Harshyadav442277/miner. The Space is assembled from
there by `make_space.sh`; edit it there, not here.

## Check it

```bash
python check_executor.py --url https://<space>.hf.space/<FAMILY> --keccak <package keccak> \
    --foundation foundation/foundation.json
```
