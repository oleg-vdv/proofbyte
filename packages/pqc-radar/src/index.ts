#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildCbom } from './cbom.ts';
import { buildReport } from './report.ts';
import { buildSarif } from './sarif.ts';
import { scan } from './scanner.ts';
import { checkTlsEndpoint, formatTlsResult, parseEndpoint } from './tls.ts';

const USAGE = `pqc-radar — cryptographic inventory & post-quantum migration report

Usage:
  pqc-radar scan <path> [--cbom <file>] [--report <file>] [--sarif <file>] [--fail-on-findings]
  pqc-radar scan-tls <host[:port]> [more hosts...] [--json <file>] [--fail-on-findings]

scan options:
  --cbom <file>        Write CycloneDX 1.6 CBOM JSON to <file>
  --report <file>      Write human-readable Markdown report to <file>
  --sarif <file>       Write SARIF 2.1.0 log to <file> (GitHub code scanning)
  --fail-on-findings   Exit with code 1 if quantum-vulnerable crypto is found (CI gate)

scan-tls options:
  --json <file>        Write raw endpoint results as JSON to <file>
  --fail-on-findings   Exit with code 1 if any endpoint lacks hybrid PQC key
                       exchange or uses a legacy protocol (CI gate)

scan-tls connects only to the endpoints you name and performs one TLS
handshake per host to record the negotiated cryptography. It sends no data.
`;

async function runScanTls(rest: string[]): Promise<number> {
  const hosts: Array<{ host: string; port: number }> = [];
  let jsonPath: string | undefined;
  let failOnFindings = false;

  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--json') jsonPath = rest[++i];
    else if (rest[i] === '--fail-on-findings') failOnFindings = true;
    else if (rest[i].startsWith('--')) {
      process.stderr.write(`Unknown option: ${rest[i]}\n${USAGE}`);
      return 2;
    } else hosts.push(parseEndpoint(rest[i]));
  }
  if (hosts.length === 0) {
    process.stdout.write(USAGE);
    return 2;
  }

  const results = await Promise.all(hosts.map((h) => checkTlsEndpoint(h.host, h.port)));
  for (const r of results) console.log(formatTlsResult(r) + '\n');

  if (jsonPath) {
    writeFileSync(jsonPath, JSON.stringify(results, null, 2));
    console.log(`JSON written to ${jsonPath}`);
  }

  const bad = results.filter(
    (r) => !r.ok || !r.assessment?.hybridPqcKeyExchange || r.assessment.legacyProtocol,
  );
  return failOnFindings && bad.length > 0 ? 1 : 0;
}

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  if (command === 'scan-tls') return runScanTls(rest);
  if (command !== 'scan' || rest.length === 0 || rest[0].startsWith('--')) {
    process.stdout.write(USAGE);
    return command === undefined || command === '--help' ? 0 : 2;
  }

  const target = resolve(rest[0]);
  let cbomPath: string | undefined;
  let reportPath: string | undefined;
  let sarifPath: string | undefined;
  let failOnFindings = false;

  for (let i = 1; i < rest.length; i++) {
    switch (rest[i]) {
      case '--cbom':
        cbomPath = rest[++i];
        break;
      case '--report':
        reportPath = rest[++i];
        break;
      case '--sarif':
        sarifPath = rest[++i];
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
  if (sarifPath) {
    writeFileSync(sarifPath, JSON.stringify(buildSarif(result), null, 2));
    console.log(`SARIF written to ${sarifPath}`);
  }
  if (!cbomPath && !reportPath && !sarifPath) {
    process.stdout.write(buildReport(result) + '\n');
  }

  return failOnFindings && vulnerable.length > 0 ? 1 : 0;
}

main(process.argv.slice(2)).then((code) => process.exit(code));
