# Post-Quantum Readiness Report

Scanned **16** files in `C:\Users\Admin\projects\proofbyte`.

| Category | Count |
|---|---|
| Quantum-vulnerable findings | 18 |
| Legacy-weak findings (MD5/SHA-1) | 5 |
| Cryptographic material files | 1 |

## Findings by algorithm

### RSA ⚠️ quantum-vulnerable

**Migration:** Migrate to ML-KEM (FIPS 203) or hybrid scheme

- `packages/pqc-radar/test/fixtures/dotnet-api/CryptoService.cs:9` — `using var rsa = RSA.Create(2048);`
- `packages/pqc-radar/test/fixtures/go-service/main.go:7` — `"crypto/rsa"`
- `packages/pqc-radar/test/fixtures/go-service/main.go:12` — `if _, err := rsa.GenerateKey(rand.Reader, 2048); err != nil {`
- `packages/pqc-radar/test/fixtures/java-payments/PaymentSigner.java:9` — `KeyPairGenerator keyGen = KeyPairGenerator.getInstance("RSA");`
- `packages/pqc-radar/test/fixtures/node-service/server.js:3` — `const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {`
- `packages/pqc-radar/test/fixtures/python-legacy/app.py:7` — `return rsa.generate_private_key(public_exponent=65537, key_size=2048)`
- `packages/pqc-radar/test/fixtures/rust-svc/main.rs:6` — `let _rsa_key = RsaPrivateKey::new(&mut rng, 2048).expect("keygen");`

### ECC (ECDSA/ECDH) ⚠️ quantum-vulnerable

**Migration:** Migrate to ML-KEM (FIPS 203) or hybrid scheme; for signatures: Migrate to ML-DSA (FIPS 204) or SLH-DSA (FIPS 205)

- `packages/pqc-radar/test/fixtures/dotnet-api/CryptoService.cs:10` — `using var ecdsa = ECDsa.Create();`
- `packages/pqc-radar/test/fixtures/go-service/main.go:4` — `"crypto/ecdsa"`
- `packages/pqc-radar/test/fixtures/go-service/main.go:5` — `"crypto/elliptic"`
- `packages/pqc-radar/test/fixtures/go-service/main.go:15` — `if _, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader); err != nil {`
- `packages/pqc-radar/test/fixtures/node-service/server.js:7` — `const ecdh = crypto.createECDH('prime256v1');`
- `packages/pqc-radar/test/fixtures/rust-svc/main.rs:2` — `use p256::ecdsa::SigningKey;`
- `packages/pqc-radar/test/fixtures/rust-svc/main.rs:8` — `let _verifier: p256::ecdsa::VerifyingKey = _ec_key.verifying_key().to_owned();`
- `packages/pqc-radar/test/scan.test.ts:62` — `test('csharp fixture: RSA, ECDsa, MD5', () => {`

### MD5

**Migration:** Replace with SHA-256 or stronger (also a classical weakness)

- `packages/pqc-radar/test/fixtures/dotnet-api/CryptoService.cs:11` — `using var md5 = MD5.Create();`
- `packages/pqc-radar/test/fixtures/java-payments/PaymentSigner.java:12` — `MessageDigest digest = MessageDigest.getInstance("MD5");`
- `packages/pqc-radar/test/fixtures/python-legacy/app.py:11` — `return hashlib.md5(data).hexdigest()`

### SHA-1

**Migration:** Replace with SHA-256 or stronger (also a classical weakness)

- `packages/pqc-radar/test/fixtures/go-service/main.go:22` — `h := sha1.New()`
- `packages/pqc-radar/test/fixtures/node-service/server.js:10` — `return crypto.createHash('sha1').update(buf).digest('hex');`

### Legacy TLS protocol ⚠️ quantum-vulnerable

**Migration:** Require TLS 1.3; plan hybrid key exchange with ML-KEM-768

- `packages/pqc-radar/test/fixtures/infra/nginx.conf:5` — `ssl_protocols TLSv1.1 TLSv1.2;`

### TLS RSA/ECDHE cipher config ⚠️ quantum-vulnerable

**Migration:** Plan hybrid key exchange with ML-KEM-768 when platform support lands

- `packages/pqc-radar/test/fixtures/infra/nginx.conf:6` — `ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:AES256-SHA;`

### RSA (signature) ⚠️ quantum-vulnerable

**Migration:** Migrate to ML-DSA (FIPS 204) or SLH-DSA (FIPS 205)

- `packages/pqc-radar/test/fixtures/java-payments/PaymentSigner.java:11` — `Signature sig = Signature.getInstance("SHA1withRSA");`

## Cryptographic material files

Review key sizes and algorithms of these artifacts:

- `packages/pqc-radar/test/fixtures/certs/server.pem`

## Regulatory context

- **US EO 14412 / CNSA 2.0** — PQC required for new national-security acquisitions from 2027; CBOM named explicitly.
- **UK NCSC** — full cryptographic discovery and migration plan due by 2028.
- **EU** — member states start PQC transition from end of 2026.

This report and the accompanying CycloneDX CBOM are the discovery artifacts those mandates ask for.