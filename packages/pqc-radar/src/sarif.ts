import { PATTERNS } from './patterns.ts';
import type { ScanResult } from './scanner.ts';

const TOOL_VERSION = '0.1.0';

/**
 * Build a SARIF 2.1.0 log so findings can surface in GitHub code scanning
 * (or any SARIF-aware tool). Quantum-vulnerable findings are level "warning"
 * with a security-severity property; legacy hashes are "note".
 */
export function buildSarif(result: ScanResult): object {
  const rules = PATTERNS.map((p) => ({
    id: p.id,
    name: p.algorithm,
    shortDescription: { text: `${p.algorithm} detected` },
    fullDescription: {
      text: p.quantumVulnerable
        ? `${p.algorithm} is quantum-vulnerable and must be migrated before PQC compliance deadlines (US CNSA 2.0 2027, UK NCSC 2028).`
        : `${p.algorithm} is a legacy-weak primitive (classical weakness).`,
    },
    help: { text: p.recommendation },
    properties: {
      'security-severity': p.quantumVulnerable ? '6.5' : '4.0',
      tags: ['security', 'cryptography', ...(p.quantumVulnerable ? ['post-quantum'] : [])],
    },
  }));

  const results = result.findings.map((f) => ({
    ruleId: f.pattern.id,
    level: f.pattern.quantumVulnerable ? 'warning' : 'note',
    message: {
      text: `${f.pattern.algorithm} usage detected. ${f.pattern.recommendation}.`,
    },
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: f.file },
          region: { startLine: f.line },
        },
      },
    ],
  }));

  return {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'pqc-radar',
            organization: 'ProofByte',
            informationUri: 'https://github.com/oleg-vdv/proofbyte',
            version: TOOL_VERSION,
            rules,
          },
        },
        results,
      },
    ],
  };
}
