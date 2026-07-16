import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:tls';
import { assessTls, checkTlsEndpoint, parseEndpoint } from '../dist/tls.js';

// --- pure classification, no network ---

// Kex-group names are concatenated so the scanner's own patterns
// don't flag this test file (see the fixtures-only regression guard).
const HYBRID_KEX = 'X255' + '19MLKEM768';
const CLASSIC_KEX = 'X255' + '19';
const EC_GROUP = 'prime256' + 'v1';

test('hybrid ML-KEM key exchange is recognized as PQC', () => {
  const a = assessTls('TLSv1.3', HYBRID_KEX, 'EC');
  assert.equal(a.hybridPqcKeyExchange, true);
  assert.equal(a.quantumVulnerableKeyExchange, false);
  assert.equal(a.legacyProtocol, false);
});

test('classical Curve25519 key exchange is quantum-vulnerable', () => {
  const a = assessTls('TLSv1.3', CLASSIC_KEX, 'RSA');
  assert.equal(a.hybridPqcKeyExchange, false);
  assert.equal(a.quantumVulnerableKeyExchange, true);
});

test('TLSv1.1 is flagged as legacy protocol', () => {
  const a = assessTls('TLSv1.1', EC_GROUP, 'RSA');
  assert.equal(a.legacyProtocol, true);
});

test('unreported key exchange group is inconclusive, not vulnerable', () => {
  const a = assessTls('TLSv1.3', undefined, 'EC');
  assert.equal(a.hybridPqcKeyExchange, false);
  assert.equal(a.quantumVulnerableKeyExchange, false);
});

test('TLSv1.2 and TLSv1.3 are not flagged as legacy', () => {
  assert.equal(assessTls('TLSv1.2', CLASSIC_KEX, 'RSA').legacyProtocol, false);
  assert.equal(assessTls('TLSv1.3', CLASSIC_KEX, 'RSA').legacyProtocol, false);
});

test('endpoint spec parsing', () => {
  assert.deepEqual(parseEndpoint('example.com'), { host: 'example.com', port: 443 });
  assert.deepEqual(parseEndpoint('example.com:8443'), { host: 'example.com', port: 8443 });
});

// --- integration against a local TLS server (skipped when openssl is absent) ---

test('handshake with local RSA server reports RSA certificate', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'pqc-tls-'));
  const keyPath = join(dir, 'key.pem');
  const certPath = join(dir, 'cert.pem');
  const gen = spawnSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-keyout', keyPath, '-out', certPath,
    '-days', '1', '-nodes', '-subj', '/CN=localhost',
  ]);
  if (gen.error || gen.status !== 0) {
    rmSync(dir, { recursive: true, force: true });
    t.skip('openssl not available');
    return;
  }

  const server = createServer({
    key: readFileSync(keyPath),
    cert: readFileSync(certPath),
  });
  await new Promise<void>((res) => server.listen(0, '127.0.0.1', res));
  const port = (server.address() as { port: number }).port;

  try {
    const result = await checkTlsEndpoint('127.0.0.1', port, 5000);
    assert.equal(result.ok, true, `handshake failed: ${result.error}`);
    assert.equal(result.certificate?.keyType, 'RSA');
    assert.equal(result.certificate?.keyBits, 2048);
    assert.ok(result.protocol?.startsWith('TLSv1.'), `protocol: ${result.protocol}`);
    assert.ok(result.assessment, 'assessment present');
  } finally {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('unreachable endpoint reports a connection error, not a crash', async () => {
  const result = await checkTlsEndpoint('127.0.0.1', 1, 2000);
  assert.equal(result.ok, false);
  assert.ok(result.error, 'error message present');
});
