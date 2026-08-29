# Submission update semantics — 2026-08-28

## Verified distinction

Editing a public GitHub repository does not mutate an existing Telegraph registration.

- Hackathon-site narrative or intent-description text can be edited independently when the site
  exposes that field.
- Track 1 application/backend code can be redeployed without changing the miner registration as
  long as the registered YAML bytes, endpoint contract, public URL, fee address, price and
  supported intent list stay unchanged.
- Any `miner.yaml` change requires publishing the new YAML, recomputing its SHA-256, and calling
  `updateMiner`. That operation creates a new `registrationId` and `intentId`.
- Track 2 source can keep evolving on GitHub, but an on-chain scorer remains bound to the exact
  hosted WASM bytes and Keccak-256 hash. Improved WASM bytes require a fresh `registerWasm` call;
  the old scorer does not need to be deregistered first.

## Release rule

Before a Track 2 registration, freeze one compiled WASM, publish it at a stable URL, download it
back, and verify that its Keccak-256 matches the value shown by the Telegraph registration UI.
Later source commits are safe, but they are not live until their compiled WASM is separately
registered and passes evaluation.

## Sources checked

- https://docs.telegraphprotocol.com/docs/miners/miner-registration (updated 2026-08-20)
- https://docs.telegraphprotocol.com/docs/scoring/build-a-scoring-module (updated 2026-08-18)
- https://hackathon.telegraphprotocol.com/rules (checked 2026-08-28)
