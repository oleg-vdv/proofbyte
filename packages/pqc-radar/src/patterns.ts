// Detection rules for quantum-vulnerable (and legacy-weak) cryptography.
// v0 is line-based pattern matching; a CBOMkit AST engine is planned to replace it.

export type Primitive =
  | 'public-key-encryption'
  | 'signature'
  | 'key-agreement'
  | 'hash'
  | 'protocol';

export interface CryptoPattern {
  id: string;
  algorithm: string;
  primitive: Primitive;
  regex: RegExp;
  /** Broken by Shor/Grover at scale — must migrate before PQC deadlines. */
  quantumVulnerable: boolean;
  recommendation: string;
}

const PQC_KEM = 'Migrate to ML-KEM (FIPS 203) or hybrid scheme';
const PQC_SIG = 'Migrate to ML-DSA (FIPS 204) or SLH-DSA (FIPS 205)';
const HASH_UP = 'Replace with SHA-256 or stronger (also a classical weakness)';

export const PATTERNS: CryptoPattern[] = [
  {
    id: 'rsa-keygen',
    algorithm: 'RSA',
    primitive: 'public-key-encryption',
    regex:
      /KeyPairGenerator\.getInstance\(\s*"RSA|generateKeyPair(?:Sync)?\(\s*['"]rsa|Crypto\.PublicKey\.RSA|hazmat[\w.]*\basymmetric\b[\w.]*\brsa\b|\brsa\.generate_private_key|RSA_generate_ke[y]|rsa\.GenerateKey|"crypto\/rsa"|RsaPrivateKe[y]::|RSACryptoServiceProvide[r]|RSA\.Create\(|Cipher\.getInstance\(\s*"RSA/,
    quantumVulnerable: true,
    recommendation: PQC_KEM,
  },
  {
    id: 'rsa-signature',
    algorithm: 'RSA (signature)',
    primitive: 'signature',
    regex: /Signature\.getInstance\(\s*"[^"]*withRSA|['"]RSA-(?:PSS|SHA\d+)|rsa-ps[s]/i,
    quantumVulnerable: true,
    recommendation: PQC_SIG,
  },
  {
    id: 'ec-keygen',
    algorithm: 'ECC (ECDSA/ECDH)',
    primitive: 'key-agreement',
    regex:
      /createECDH\(|KeyPairGenerator\.getInstance\(\s*"EC"|generateKeyPair(?:Sync)?\(\s*['"]ec['"]|\becdsa\.GenerateKey|\bECDsa\b|\bsecp(?:256|384|521)[kr]1\b|\bprime256v1\b|hazmat[\w.]*\bec\b.*generate_private_key|ec\.generate_private_key|"crypto\/ecdsa"|"crypto\/elliptic"|elliptic\.P(?:224|256|384|521)\(|\b[pk]256::/,
    quantumVulnerable: true,
    recommendation: `${PQC_KEM}; for signatures: ${PQC_SIG}`,
  },
  {
    id: 'curve25519',
    algorithm: 'Curve25519 family',
    primitive: 'signature',
    regex: /\b(?:ed|x)25519\b/i,
    quantumVulnerable: true,
    recommendation: PQC_SIG,
  },
  {
    id: 'dh',
    algorithm: 'Diffie-Hellman',
    primitive: 'key-agreement',
    regex: /createDiffieHellman\(|DHParameterSpe[c]|DH_generat[e]|\bdh\.generate_private_key/,
    quantumVulnerable: true,
    recommendation: PQC_KEM,
  },
  {
    id: 'dsa',
    algorithm: 'DSA',
    primitive: 'signature',
    regex: /KeyPairGenerator\.getInstance\(\s*"DSA"|\bdsa\.generate_private_key|\bDSACryptoServiceProvide[r]\b|"crypto\/dsa"/,
    quantumVulnerable: true,
    recommendation: PQC_SIG,
  },
  {
    id: 'md5',
    algorithm: 'MD5',
    primitive: 'hash',
    regex: /createHash\(\s*['"]md5|hashlib\.md5|MessageDigest\.getInstance\(\s*"MD5|\bmd5\.New\(|MD5CryptoServiceProvide[r]|MD5\.Create\(/i,
    quantumVulnerable: false,
    recommendation: HASH_UP,
  },
  {
    id: 'sha1',
    algorithm: 'SHA-1',
    primitive: 'hash',
    regex: /createHash\(\s*['"]sha1|hashlib\.sha1|MessageDigest\.getInstance\(\s*"SHA-?1|\bsha1\.New\(|SHA1CryptoServiceProvide[r]|SHA1\.Create\(/i,
    quantumVulnerable: false,
    recommendation: HASH_UP,
  },
  {
    id: 'tls-legacy-protocol',
    algorithm: 'Legacy TLS protocol',
    primitive: 'protocol',
    regex: /ssl_protocols\s+[^;]*TLSv1(?:\.[01])?\b|SSLv[3]|SSLProtocol\s+[^#\n]*TLSv1(?:\.[01])?\b/,
    quantumVulnerable: true,
    recommendation: 'Require TLS 1.3; plan hybrid key exchange with ML-KEM-768',
  },
  {
    id: 'tls-rsa-ciphers',
    algorithm: 'TLS RSA/ECDHE cipher config',
    primitive: 'protocol',
    regex: /ssl_ciphers\s+[^;]*(?:RSA|ECDHE)[^;]*;/,
    quantumVulnerable: true,
    recommendation: 'Plan hybrid key exchange with ML-KEM-768 when platform support lands',
  },
];

/** File extensions worth scanning with the pattern engine. */
export const SCAN_EXTENSIONS = new Set([
  '.java', '.kt', '.scala',
  '.py',
  '.js', '.mjs', '.cjs', '.ts', '.mts', '.cts',
  '.go',
  '.cs',
  '.rb', '.php',
  '.c', '.cc', '.cpp', '.h', '.hpp', '.rs',
  '.conf', '.cnf', '.config', '.yaml', '.yml', '.toml', '.tf',
]);

/** Files that are cryptographic material themselves. */
export const CRYPTO_MATERIAL_EXTENSIONS = new Set([
  '.pem', '.crt', '.cer', '.der', '.p12', '.pfx', '.jks', '.key',
]);
