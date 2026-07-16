# Security Policy

## Reporting a vulnerability

Please report vulnerabilities privately via
[GitHub private vulnerability reporting](https://github.com/oleg-vdv/proofbyte/security/advisories/new).
Do not open public issues for security problems. We aim to acknowledge reports within 72 hours.

## Security posture of pqc-radar

pqc-radar is designed to be safe to run on sensitive codebases:

- **Fully offline.** The scanner makes **no network calls** — it only reads files under the
  path you pass to `scan` and writes only the output files you specify.
- **Zero runtime dependencies.** The published package depends on nothing but the Node.js
  standard library, minimizing supply-chain surface.
- **No file content leaves the machine.** Reports contain file paths, line numbers, and
  single-line snippets from your code; review them before sharing externally.
- **Symlinks are not followed** during directory walks; files larger than 1 MB and
  well-known dependency/build directories are skipped.
- **Read-only by design.** The scanner never modifies the code it analyzes.

## Scope notes

v0 detection is pattern-based. Absence of findings is **not** proof of absence of
quantum-vulnerable cryptography — treat reports as discovery artifacts, not certification.
