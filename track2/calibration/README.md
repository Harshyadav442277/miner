# LANGUAGE_TRANSLATION calibration candidate

This builds from the active MIT-licensed registration 1745 binary and changes only its final
strictly increasing calibration blend from `0.6` to `0.9`. Ordering, ties, exact-match score,
ABI, memory use, and runtime are preserved; separation increases on the same fixture distribution.

```powershell
node build-language-stretch.mjs --base path/to/reg1745.wasm --out dist/language_translation_a09.wasm
wasm-tools validate dist/language_translation_a09.wasm
node verify-language-stretch.mjs --alpha03 path/to/reg1744.wasm --alpha06 path/to/reg1745.wasm --candidate dist/language_translation_a09.wasm
```

Pinned base:

- URL: `https://raw.githubusercontent.com/zkasuran/telegraph-salience-scorer/52c65788253791004e5633af9c2d8098d180d435/dist/fork/lts_e6.wasm`
- bytes: `5114`
- SHA-256: `9407b62d1980c8a2e9cc7622da33485d02c390007695d02ab138e64b916ced9e`
- Keccak-256 / registration hash: `106360773c2c6646bfd7a4fdca579989d01a00716ac37c8337de611f24d63237`

Registrations 1744 (`alpha=0.3`, margin `0.7570904`) and 1745 (`alpha=0.6`, margin
`0.75895786`) make the calibration response affine and predict `alpha=0.9` at `0.76082532`
on the same fixtures. A fresh registration is the only live confirmation.

Built candidate:

- bytes: `5114`
- SHA-256: `a300ea0299840a49008ab8a2c97990f6d4ada0c9e3102f868e3add7e78f7aaac`
- Keccak-256 / registration hash: `0cba527d1ef783e6c9341a775299dd6d289a3b39159f7407e8cf4ff19957f026`

Upstream copyright and permission are in [`UPSTREAM_LICENSE`](UPSTREAM_LICENSE).
