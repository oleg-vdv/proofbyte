import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { scan } from '../dist/scanner.js';
import { buildCbom } from '../dist/cbom.js';
import { buildReport } from '../dist/report.js';
import { buildSarif } from '../dist/sarif.js';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

function algorithmsIn(files: string[]): Map<string, Set<string>> {
  const result = scan(FIXTURES);
  const map = new Map<string, Set<string>>();
  for (const f of result.findings) {
    if (!files.some((name) => f.file.includes(name))) continue;
    const set = map.get(f.file) ?? new Set();
    set.add(f.pattern.id);
    map.set(f.file, set);
  }
  return map;
}

test('java fixture: RSA keygen, RSA signature, MD5', () => {
  const byFile = algorithmsIn(['PaymentSigner.java']);
  const ids = [...byFile.values()][0];
  assert.ok(ids?.has('rsa-keygen'), 'expected rsa-keygen');
  assert.ok(ids?.has('rsa-signature'), 'expected rsa-signature');
  assert.ok(ids?.has('md5'), 'expected md5');
});

test('python fixture: RSA keygen, MD5', () => {
  const byFile = algorithmsIn(['app.py']);
  const ids = [...byFile.values()][0];
  assert.ok(ids?.has('rsa-keygen'), 'expected rsa-keygen');
  assert.ok(ids?.has('md5'), 'expected md5');
});

test('node fixture: RSA keygen, ECDH, SHA-1', () => {
  const byFile = algorithmsIn(['server.js']);
  const ids = [...byFile.values()][0];
  assert.ok(ids?.has('rsa-keygen'), 'expected rsa-keygen');
  assert.ok(ids?.has('ec-keygen'), 'expected ec-keygen');
  assert.ok(ids?.has('sha1'), 'expected sha1');
});

test('nginx fixture: legacy TLS protocol and RSA ciphers', () => {
  const byFile = algorithmsIn(['nginx.conf']);
  const ids = [...byFile.values()][0];
  assert.ok(ids?.has('tls-legacy-protocol'), 'expected tls-legacy-protocol');
  assert.ok(ids?.has('tls-rsa-ciphers'), 'expected tls-rsa-ciphers');
});

test('go fixture: RSA, ECDSA/elliptic, SHA-1', () => {
  const byFile = algorithmsIn(['main.go']);
  const ids = [...byFile.values()][0];
  assert.ok(ids?.has('rsa-keygen'), 'expected rsa-keygen');
  assert.ok(ids?.has('ec-keygen'), 'expected ec-keygen');
  assert.ok(ids?.has('sha1'), 'expected sha1');
});

test('csharp fixture: RSA, ECDSA, MD5', () => {
  const byFile = algorithmsIn(['CryptoService.cs']);
  const ids = [...byFile.values()][0];
  assert.ok(ids?.has('rsa-keygen'), 'expected rsa-keygen');
  assert.ok(ids?.has('ec-keygen'), 'expected ec-keygen');
  assert.ok(ids?.has('md5'), 'expected md5');
});

test('rust fixture: RSA and p256', () => {
  const byFile = algorithmsIn(['main.rs']);
  const ids = [...byFile.values()][0];
  assert.ok(ids?.has('rsa-keygen'), 'expected rsa-keygen');
  assert.ok(ids?.has('ec-keygen'), 'expected ec-keygen');
});

test('pem fixture is reported as crypto material', () => {
  const result = scan(FIXTURES);
  assert.ok(
    result.materials.some((m) => m.file.endsWith('server.pem')),
    'expected server.pem in materials',
  );
});

test('SARIF log has valid shape with rules and located results', () => {
  const sarif = buildSarif(scan(FIXTURES)) as {
    version: string;
    runs: Array<{
      tool: { driver: { name: string; rules: Array<{ id: string }> } };
      results: Array<{
        ruleId: string;
        level: string;
        locations: Array<{ physicalLocation: { region: { startLine: number } } }>;
      }>;
    }>;
  };
  assert.equal(sarif.version, '2.1.0');
  const run = sarif.runs[0];
  assert.equal(run.tool.driver.name, 'pqc-radar');
  assert.ok(run.results.length > 0, 'expected results');
  const ruleIds = new Set(run.tool.driver.rules.map((r) => r.id));
  for (const r of run.results) {
    assert.ok(ruleIds.has(r.ruleId), `result ruleId ${r.ruleId} must exist in rules`);
    assert.ok(r.locations[0].physicalLocation.region.startLine >= 1);
  }
});

test('CBOM is valid CycloneDX 1.6 shape with evidence occurrences', () => {
  const result = scan(FIXTURES);
  const cbom = buildCbom(result) as {
    bomFormat: string;
    specVersion: string;
    components: Array<{
      type: string;
      cryptoProperties: { assetType: string };
      evidence: { occurrences: Array<{ location: string }> };
    }>;
  };
  assert.equal(cbom.bomFormat, 'CycloneDX');
  assert.equal(cbom.specVersion, '1.6');
  assert.ok(cbom.components.length >= 4, 'expected at least 4 crypto assets');
  for (const component of cbom.components) {
    assert.equal(component.type, 'cryptographic-asset');
    assert.ok(component.cryptoProperties.assetType);
    assert.ok(component.evidence.occurrences.length > 0);
  }
});

test('report mentions migration targets and regulatory context', () => {
  const report = buildReport(scan(FIXTURES));
  assert.match(report, /ML-KEM/);
  assert.match(report, /quantum-vulnerable/i);
  assert.match(report, /EO 14412/);
});

test('scan of an empty-ish dir returns no findings', () => {
  const result = scan(dirname(fileURLToPath(import.meta.url)) + '/../src');
  // src contains pattern definitions as regex literals, not usage — the
  // regexes must not match their own source. Guard against self-triggering.
  const selfHits = result.findings.filter((f) => f.file.includes('patterns.ts'));
  assert.equal(selfHits.length, 0, `patterns must not match their own definitions: ${JSON.stringify(selfHits.map((f) => f.pattern.id))}`);
});

test('scanning our own package flags only fixtures, never src or tests', () => {
  const result = scan(dirname(fileURLToPath(import.meta.url)) + '/..');
  const nonFixtureHits = result.findings.filter((f) => !f.file.includes('fixtures'));
  assert.equal(
    nonFixtureHits.length,
    0,
    `only fixtures may contain findings: ${JSON.stringify(nonFixtureHits.map((f) => `${f.file}:${f.line} ${f.pattern.id}`))}`,
  );
});
