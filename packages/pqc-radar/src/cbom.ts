import { randomUUID } from 'node:crypto';
import type { ScanResult } from './scanner.ts';

const TOOL_VERSION = '0.1.0';

/**
 * Build a CycloneDX 1.6 CBOM: one cryptographic-asset component per detected
 * algorithm, with evidence.occurrences pointing at every file/line it was seen.
 */
export function buildCbom(result: ScanResult): object {
  const byAlgorithm = new Map<string, typeof result.findings>();
  for (const finding of result.findings) {
    const key = finding.pattern.algorithm;
    const bucket = byAlgorithm.get(key) ?? [];
    bucket.push(finding);
    byAlgorithm.set(key, bucket);
  }

  const components = [...byAlgorithm.entries()].map(([algorithm, findings]) => ({
    type: 'cryptographic-asset',
    'bom-ref': `crypto/${findings[0].pattern.id}`,
    name: algorithm,
    cryptoProperties: {
      assetType: 'algorithm',
      algorithmProperties: {
        primitive: findings[0].pattern.primitive,
        executionEnvironment: 'software-plain-ram',
        nistQuantumSecurityLevel: 0,
        quantumVulnerable: findings[0].pattern.quantumVulnerable,
      },
    },
    evidence: {
      occurrences: findings.map((f) => ({
        location: f.file,
        line: f.line,
      })),
    },
  }));

  for (const material of result.materials) {
    components.push({
      type: 'cryptographic-asset',
      'bom-ref': `material/${material.file}`,
      name: material.file,
      cryptoProperties: {
        assetType: 'related-crypto-material',
      },
      evidence: { occurrences: [{ location: material.file }] },
    } as (typeof components)[number]);
  }

  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.6',
    serialNumber: `urn:uuid:${randomUUID()}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: {
        components: [
          {
            type: 'application',
            manufacturer: { name: 'ProofByte' },
            name: 'pqc-radar',
            version: TOOL_VERSION,
          },
        ],
      },
    },
    components,
  };
}
