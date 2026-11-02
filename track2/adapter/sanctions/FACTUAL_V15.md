# Factual representations with matching 512-token training

V13 full-reference training scored 27/62 in the actual node. V14 used unchanged
v3 tensors at 512 and scored 33/62, versus its 46/62 length baseline. Both fail.
V13's HF float32 synthetic breakdown is 233/400 listed and 392/400 absent; v3 on
the same diagnostic is 160/400 listed and 298/400 absent. These are synthetic
format-specific diagnostics, not actual-node claims. Extra names/context alone
did not improve external-answer ranking in those runs.

Frozen next recipe: v3 parent, one epoch, lr 0.00001, rank8/alpha32, max512,
batch2/accum8, stock loss/optimizer/checkpoint selection. New data repeats each
source fact across four independently rendered formats, with independent source
metadata placement and appropriate scope qualifications. This tests representation
coverage and context-matched training together; causal attribution is limited.

Select 600 v10 training queries (300 listed/300 exact absent), emit four cyclic
cross-format comparisons per query, and retain its 600 binding pairs. Each
validation/test split uses 100 of its own queries, four formats each, plus 100
binding pairs. Rejected bodies stay unique. Preserve source entity/query splits,
all external-query exclusions and whole binding blocks. Positive inherited v3
knowledge overlaps measured entities as already disclosed. No unseen-entity claim.

Metadata includes computed snapshot counts, official source URLs, file hashes and
exact-lookup limitations. It contains no provider id, distinctive provider bundle,
fabricated candidate, invented confidence or copied external answer. Every factual
render must fit completely within 512 pinned tokens. Keep both verdict positions,
length references, counts and exact input bytes in the manifest. Independently
audit chosen decisions and match records against the source.

Capture class diagnostics during ordinary kit evaluation; preserve its original
loss, forward results and checkpoint criterion. Each synthetic factual membership
class must reach 65% before export. The full unchanged old62 real-answer score must
exceed 46/62 at512; all old20, binding40 and bank20 relevance controls must retain
their previously perfect scores before reserved external scoring. No hidden/public
pool rows are read. The reserved69 bodies remain unused until these fixed gates.

Select only on synthetic validation loss. A genuine one-sided result still cannot
establish broad factual validity or registration readiness. Preserve every failure
and the original v3/v13/v14 packages. No wallet, pool upload or submission action.
