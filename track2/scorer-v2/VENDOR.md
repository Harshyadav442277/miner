# Vendored baseline

`src/`, `build.rs`, `Cargo.toml`, `Cargo.lock`, `vocab.txt` and
`weights/minilm_l6_v2_q8.bin` originate from the organizers' official baseline:

- repository: https://github.com/telegraphprotocol/telegraph-wasm-baseline
- commit: `dfa0cf7fda72789267811ba2190f61a8eaacedf6`
- licence: MIT (retained verbatim in `LICENSE`)

Restore the untracked large files with:

```bash
bash track2/vendor-baseline.sh
```

Our changes are confined to `src/lib.rs` (the composite and the new terms) and
`src/verdict.rs`. `embed.rs`, `tokenizer.rs`, `math.rs`, `bm25.rs` and
`allocator.rs` are upstream and unmodified, so the MiniLM inference path is the
organizers' own code.

## Why the baseline is the core

The live champion binaries are this same architecture. `cv_mini_reg626`,
`ipgeo_reg630` and `wf_mini_reg636` — champions of three different intents —
differ from one another in **24 bytes**: the embedded intent-name string plus
two f32 constants. `tn_t70_reg850`, the TEXT_AUTHENTICITY_CHECK champion, is
23,987,851 bytes with a 23,956,199-byte data section, i.e. the same MiniLM
weight blob. A ~24 MB module is therefore accepted on-chain.
