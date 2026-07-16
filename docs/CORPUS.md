# Real-world corpus results

pqc-radar run against unmodified checkouts of well-known open-source projects.
Regenerated with `bash scripts/corpus.sh`. Numbers change as upstreams evolve;
high finding counts in crypto libraries are expected — implementing RSA is their job.

| Repository | Files scanned | Quantum-vulnerable | Legacy-weak | Crypto material | Time (s) |
|---|---|---|---|---|---|
| [digitalbazaar/forge](https://github.com/digitalbazaar/forge) | 117 | 92 | 95 | 2 | 0.84 |
| [auth0/node-jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) | 52 | 30 | 0 | 17 | 0.49 |
| [golang-jwt/jwt](https://github.com/golang-jwt/jwt) | 54 | 40 | 0 | 10 | 0.55 |
| [pyca/cryptography](https://github.com/pyca/cryptography) | 383 | 563 | 2 | 1252 | 1.33 |
| [hashicorp/vault](https://github.com/hashicorp/vault) | 4827 | 615 | 2 | 43 | 9.36 |

_Generated: 2026-07-16 · pqc-radar 0.2.0_
