# pqc-radar

> Cryptographic inventory (CycloneDX CBOM) + post-quantum migration report for your codebase.
> Part of [ProofByte](https://github.com/oleg-vdv/proofbyte): *Vanta proves your processes — we prove your bytes.*

Regulators now ask for a **Cryptographic Bill of Materials**: US EO 14412 / CNSA 2.0
(2027), UK NCSC discovery + migration plan (2028), EU PQC transition (from 2026).
`pqc-radar` produces that artifact from your actual code in seconds.

## Usage

```bash
npx @proofbyte/pqc-radar scan ./my-repo --cbom cbom.json --report report.md --sarif findings.sarif
```

Detects quantum-vulnerable cryptography — RSA, ECC/ECDSA/ECDH, DH, DSA, Curve25519,
legacy MD5/SHA-1, weak TLS configs — across Java/Kotlin/Scala, Python, JavaScript/TypeScript,
Go, C#, Rust, Ruby, PHP, C/C++, nginx/Apache configs, and flags certificate/keystore files.

Outputs:

| Flag | Artifact |
|---|---|
| `--cbom <file>` | [CycloneDX 1.6 CBOM](https://cyclonedx.org/capabilities/cbom/) JSON — the auditor-facing inventory |
| `--report <file>` | Markdown findings report with ML-KEM / ML-DSA migration recommendations |
| `--sarif <file>` | SARIF 2.1.0 log for GitHub code scanning |
| `--fail-on-findings` | Exit 1 when quantum-vulnerable crypto is found (CI gate) |

## CI gate example

```yaml
- run: npx @proofbyte/pqc-radar scan . --sarif findings.sarif --fail-on-findings
- uses: github/codeql-action/upload-sarif@v3
  if: always()
  with:
    sarif_file: findings.sarif
```

## Security posture

Fully offline (zero network calls), zero runtime dependencies, read-only,
symlinks not followed. See [SECURITY.md](https://github.com/oleg-vdv/proofbyte/blob/main/SECURITY.md).

## Caveats

v0 detection is pattern-based: fast and broad, but absence of findings is **not** proof of
absence. A deep AST engine (PQCA CBOMkit integration) is on the roadmap.

## License

MIT
