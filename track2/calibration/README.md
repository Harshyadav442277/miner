# LANGUAGE_TRANSLATION calibration candidate

This builds from the active MIT-licensed registration 1745 binary and changes only its final
strictly increasing calibration blend. Registration 1765 tested `0.9`: its predicted margin was
exact, but f32 compression near the endpoints reduced hidden-fixture ordering to 12/15. That
artifact is historical and must not be registered again. The repair uses `0.61`, the smallest
useful step above the active champion's `0.60`.

```powershell
node build-language-stretch.mjs --base path/to/reg1745.wasm --out dist/language_translation_a061.wasm --alpha 0.61
wasm-tools validate dist/language_translation_a061.wasm
node verify-language-stretch.mjs --alpha03 path/to/reg1744.wasm --alpha06 path/to/reg1745.wasm --candidate dist/language_translation_a061.wasm --alpha 0.61
```

Pinned base:

- URL: `https://raw.githubusercontent.com/zkasuran/telegraph-salience-scorer/52c65788253791004e5633af9c2d8098d180d435/dist/fork/lts_e6.wasm`
- bytes: `5114`
- SHA-256: `9407b62d1980c8a2e9cc7622da33485d02c390007695d02ab138e64b916ced9e`
- Keccak-256 / registration hash: `106360773c2c6646bfd7a4fdca579989d01a00716ac37c8337de611f24d63237`

Registrations 1744 (`alpha=0.3`, margin `0.7570904`) and 1745 (`alpha=0.6`, margin
`0.75895786`) make the calibration response affine and predict `alpha=0.61` at `0.75902011`
on the same fixtures. A fresh registration is the only live confirmation.

Rejected registration 1765 (`alpha=0.9`):

- bytes: `5114`
- SHA-256: `a300ea0299840a49008ab8a2c97990f6d4ada0c9e3102f868e3add7e78f7aaac`
- Keccak-256 / registration hash: `0cba527d1ef783e6c9341a775299dd6d289a3b39159f7407e8cf4ff19957f026`

Repaired candidate (`alpha=0.61`):

- bytes: `5114`
- SHA-256: `8ccd601063ef3b3090487646b9b1d427a85fd38ec8bde5813f18c2610ad619fd`
- Keccak-256 / registration hash: `37fa2368c4d1b5ba5820ef73889fa3ab18581e6cc4458f6919cf963eb05340d7`

The multi-intent contrast candidates are documented in [`PORTFOLIO.md`](PORTFOLIO.md).

Upstream copyright and permission are in [`UPSTREAM_LICENSE`](UPSTREAM_LICENSE).
