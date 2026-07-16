# ProofByte

> Vanta proves your processes. **ProofByte proves your bytes.**

ProofByte is a technical-evidence engine for the 2027–2028 regulatory wave: it scans your
actual code, containers and runtime, and produces **machine-verifiable, auditor-ready
artifacts** — not questionnaires.

## Packs

| Pack | Status | Regulatory driver |
|---|---|---|
| **pqc-radar** — cryptographic inventory (CBOM) + post-quantum migration plan | 🚧 v0 | US EO 14412, CNSA 2.0 (2027), UK NCSC (2028), EU PQC transition (from 2026) |
| **agent-trace** — AI-agent inventory & traceability evidence via MCP gateway | 📋 planned | EU AI Act Art. 12 (high-risk deadline 2027-12-02) |

## Quick start

```bash
npx @proofbyte/pqc-radar scan ./my-repo --cbom cbom.json --report report.md --sarif findings.sarif
```

`pqc-radar` walks your repository, detects quantum-vulnerable cryptography
(RSA, ECC/ECDSA/ECDH, DH, DSA, Curve25519, legacy hashes, weak TLS configs) and emits:

- **`cbom.json`** — a [CycloneDX 1.6](https://cyclonedx.org/capabilities/cbom/) Cryptographic
  Bill of Materials, the artifact regulators and auditors ask for;
- **`report.md`** — a human-readable findings report with a prioritized migration plan
  (ML-KEM / FIPS 203, ML-DSA / FIPS 204, hybrid TLS);
- **`findings.sarif`** — a SARIF 2.1.0 log for GitHub code scanning or any SARIF viewer.

Fast: a 117-file crypto-heavy repository ([node-forge](https://github.com/digitalbazaar/forge))
scans in ~0.7 s.

**Language coverage (v0):** Java/Kotlin/Scala, Python, JavaScript/TypeScript, Go, C#, Rust,
Ruby, PHP, C/C++, plus nginx/Apache TLS configs and certificate/keystore file discovery.

### CI gate

```yaml
- run: npx @proofbyte/pqc-radar scan . --sarif findings.sarif --fail-on-findings
- uses: github/codeql-action/upload-sarif@v3
  if: always()
  with:
    sarif_file: findings.sarif
```

## Security

The scanner is **fully offline** (no network calls), has **zero runtime dependencies**,
never modifies scanned code, skips symlinks, and only writes the output files you name.
See [SECURITY.md](SECURITY.md).

## Status & roadmap

v0 uses fast line-pattern detection. Absence of findings is not proof of absence.
Planned: [PQCA CBOMkit](https://pqca.org/projects/cbomkit/) engine integration for deep AST
analysis, container/TLS endpoint collectors, signed artifacts.

## Development

```bash
npm install
npm run build
npm test
```

Golden-fixture tests live in `packages/pqc-radar/test/fixtures` — small repos with
deliberately planted crypto; every scanner change is verified against them. CI also
dogfoods: the repo scans itself on every push.

## License

MIT
