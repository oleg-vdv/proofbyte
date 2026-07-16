import type { Finding, ScanResult } from './scanner.ts';

export function buildReport(result: ScanResult): string {
  const vulnerable = result.findings.filter((f) => f.pattern.quantumVulnerable);
  const legacy = result.findings.filter((f) => !f.pattern.quantumVulnerable);

  const lines: string[] = [
    '# Post-Quantum Readiness Report',
    '',
    `Scanned **${result.scannedFiles}** files in \`${result.root}\`.`,
    '',
    `| Category | Count |`,
    `|---|---|`,
    `| Quantum-vulnerable findings | ${vulnerable.length} |`,
    `| Legacy-weak findings (MD5/SHA-1) | ${legacy.length} |`,
    `| Cryptographic material files | ${result.materials.length} |`,
    '',
  ];

  if (result.findings.length === 0 && result.materials.length === 0) {
    lines.push('No cryptographic assets detected by the v0 pattern engine.');
    lines.push('');
    lines.push(
      '> Note: absence of findings is not proof of absence — run the deep engine (planned) before signing off.',
    );
    return lines.join('\n');
  }

  const grouped = new Map<string, Finding[]>();
  for (const f of result.findings) {
    const bucket = grouped.get(f.pattern.algorithm) ?? [];
    bucket.push(f);
    grouped.set(f.pattern.algorithm, bucket);
  }

  lines.push('## Findings by algorithm', '');
  for (const [algorithm, findings] of grouped) {
    const p = findings[0].pattern;
    lines.push(`### ${algorithm}${p.quantumVulnerable ? ' ⚠️ quantum-vulnerable' : ''}`);
    lines.push('');
    lines.push(`**Migration:** ${p.recommendation}`);
    lines.push('');
    for (const f of findings) {
      lines.push(`- \`${f.file}:${f.line}\` — \`${f.snippet}\``);
    }
    lines.push('');
  }

  if (result.materials.length > 0) {
    lines.push('## Cryptographic material files', '');
    lines.push('Review key sizes and algorithms of these artifacts:');
    lines.push('');
    for (const m of result.materials) {
      lines.push(`- \`${m.file}\``);
    }
    lines.push('');
  }

  lines.push('## Regulatory context', '');
  lines.push(
    '- **US EO 14412 / CNSA 2.0** — PQC required for new national-security acquisitions from 2027; CBOM named explicitly.',
    '- **UK NCSC** — full cryptographic discovery and migration plan due by 2028.',
    '- **EU** — member states start PQC transition from end of 2026.',
    '',
    'This report and the accompanying CycloneDX CBOM are the discovery artifacts those mandates ask for.',
  );

  return lines.join('\n');
}
