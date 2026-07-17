# Benchmark: pqc-radar vs PQCA CBOMkit

Both tools ran in the same [GitHub Actions workflow](../.github/workflows/benchmark.yml)
(run [29545582009](https://github.com/oleg-vdv/proofbyte/actions/runs/29545582009),
2026-07-17) against identical checkouts. CBOMkit numbers are taken from its per-module
CBOM files; pqc-radar numbers from its consolidated CBOM. "Assets" = CycloneDX
`cryptographic-asset` components; "occurrences" = `evidence.occurrences` entries.

## Results

| Target | Tool | Crypto assets | Occurrences | Scan time |
|---|---|---|---|---|
| **fixtures** (planted crypto in 7 languages) | pqc-radar | 8 | 23 | 0.05 s |
| | CBOMkit (java+python modules) | 7 | 7 | n/a¹ |
| **jpadilla/pyjwt** (Python) | pqc-radar | 9 | 49 | 0.07 s |
| | CBOMkit | 5 | 8 | n/a¹ |
| **jwtk/jjwt** (Java) | pqc-radar | 41² | 71 | 0.12 s |
| | CBOMkit (5 modules) | 14 | 15 | n/a¹ |

¹ CBOMkit-action doesn't report per-scan timing; the whole 3-scan job (including its
container startup) completed in under a minute — fine for CI, not for interactive use.
² Includes 31 certificate/key files in jjwt's test resources reported as
crypto-material assets.

## Honest reading — the tools are complementary

**Where CBOMkit is stronger.** Its AST engine understands Java (JCA, BouncyCastle) and
Python (pyca/cryptography) semantically: it reports key sizes (`RSA-2048`), resolves
composite schemes (`SHA1withRSA`), inventories **symmetric** crypto (HMAC-SHA256,
AES-128) and models key objects. On its two languages it produces a richer, more
precise inventory per finding.

**Where pqc-radar is stronger.** Breadth and zero friction:

- On the polyglot fixtures, CBOMkit sees only the Java + Python corner — it has no
  detection for the planted Go, C#, Rust, JavaScript, nginx-TLS findings, and misses
  Python's `hashlib.md5` (stdlib, not pyca). pqc-radar flags all of them.
- Every occurrence carries `file:line` evidence; CBOMkit reports one occurrence per
  asset.
- Certificates/keys in the tree are inventoried in the same pass (CBOMkit delegates
  that to a separate tool, theia).
- Setup is `npx @proofbyte/pqc-radar scan .` — no Java build, no module resolution,
  0.05–0.12 s per repo.

**Bottom line.** CBOMkit is a microscope for Java/Python; pqc-radar is a radar for the
whole estate. For an org-wide discovery pass (what the EO 14412 / NCSC mandates ask
for first), start broad; for deep Java/Python module analysis, add CBOMkit — its
engine integration is on our roadmap so you eventually get both from one command.

## Reproduce

Trigger the [Benchmark workflow](../.github/workflows/benchmark.yml) via
workflow_dispatch; the `benchmark` artifact contains both tools' raw CBOMs.
