#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildCbom } from './cbom.ts';
import { buildReport } from './report.ts';
import { scan } from './scanner.ts';

const USAGE = `pqc-radar — cryptographic inventory & post-quantum migration report

Usage:
  pqc-radar scan <path> [--cbom <file>] [--report <file>] [--fail-on-findings]

Options:
  --cbom <file>        Write CycloneDX 1.6 CBOM JSON to <file>
  --report <file>      Write human-readable Markdown report to <file>
  --fail-on-findings   Exit with code 1 if quantum-vulnerable crypto is found (CI gate)
`;

function main(argv: string[]): number {
  const [command, ...rest] = argv;
  if (command !== 'scan' || rest.length === 0 || rest[0].startsWith('--')) {
    process.stdout.write(USAGE);
    return command === undefined || command === '--help' ? 0 : 2;
  }

  const target = resolve(rest[0]);
  let cbomPath: string | undefined;
  let reportPath: string | undefined;
  let failOnFindings = false;

  for (let i = 1; i < rest.length; i++) {
    switch (rest[i]) {
      case '--cbom':
        cbomPath = rest[++i];
        break;
      case '--report':
        reportPath = rest[++i];
        break;
      case '--fail-on-findings':
        failOnFindings = true;
        break;
      default:
        process.stderr.write(`Unknown option: ${rest[i]}\n${USAGE}`);
        return 2;
    }
  }

  const result = scan(target);
  const vulnerable = result.findings.filter((f) => f.pattern.quantumVulnerable);

  console.log(
    `pqc-radar: scanned ${result.scannedFiles} files — ` +
      `${vulnerable.length} quantum-vulnerable, ` +
      `${result.findings.length - vulnerable.length} legacy-weak, ` +
      `${result.materials.length} crypto-material files`,
  );

  if (cbomPath) {
    writeFileSync(cbomPath, JSON.stringify(buildCbom(result), null, 2));
    console.log(`CBOM written to ${cbomPath}`);
  }
  if (reportPath) {
    writeFileSync(reportPath, buildReport(result));
    console.log(`Report written to ${reportPath}`);
  }
  if (!cbomPath && !reportPath) {
    process.stdout.write(buildReport(result) + '\n');
  }

  return failOnFindings && vulnerable.length > 0 ? 1 : 0;
}

process.exit(main(process.argv.slice(2)));
