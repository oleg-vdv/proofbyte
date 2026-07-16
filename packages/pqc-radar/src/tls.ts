import { connect } from 'node:tls';

export interface TlsAssessment {
  hybridPqcKeyExchange: boolean;
  quantumVulnerableKeyExchange: boolean;
  legacyProtocol: boolean;
  notes: string[];
}

export interface TlsEndpointResult {
  host: string;
  port: number;
  ok: boolean;
  error?: string;
  protocol?: string;
  cipher?: string;
  keyExchange?: { type?: string; name?: string; size?: number };
  certificate?: {
    subject?: string;
    issuer?: string;
    keyType?: string;
    keyBits?: number;
    curve?: string;
    validTo?: string;
  };
  assessment?: TlsAssessment;
}

/**
 * Pure classification of a negotiated TLS session — kept side-effect-free so
 * it can be tested without any network access.
 */
export function assessTls(
  protocol: string | undefined,
  kexName: string | undefined,
  certKeyType: string | undefined,
): TlsAssessment {
  const notes: string[] = [];
  const hybrid = /mlkem|ml-kem|kyber/i.test(kexName ?? '');
  const legacy = protocol !== undefined && /^(SSLv|TLSv1(\.[01])?$)/.test(protocol);

  if (hybrid) {
    notes.push(`Key exchange "${kexName}" is a hybrid post-quantum scheme — harvest-now-decrypt-later resistant.`);
  } else if (kexName) {
    notes.push(`Key exchange "${kexName}" is classical — traffic recorded today is decryptable by a future quantum computer.`);
  } else {
    notes.push(
      'Key exchange group not reported by the local TLS stack — possibly a post-quantum hybrid group this Node/OpenSSL build cannot name. Inconclusive, not a finding.',
    );
  }
  if (legacy) {
    notes.push(`Protocol ${protocol} predates TLS 1.2 hardening — upgrade to TLS 1.3.`);
  }
  if (certKeyType) {
    notes.push(
      `Certificate key is ${certKeyType} (classical). PQC certificates are not yet issued by public CAs — track your CA's ML-DSA roadmap.`,
    );
  }

  return {
    hybridPqcKeyExchange: hybrid,
    // Unknown group is inconclusive, not a confirmed vulnerability.
    quantumVulnerableKeyExchange: !hybrid && kexName !== undefined,
    legacyProtocol: legacy,
    notes,
  };
}

function firstString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Parse "host", "host:port" into parts (default port 443). */
export function parseEndpoint(spec: string): { host: string; port: number } {
  const idx = spec.lastIndexOf(':');
  if (idx > 0 && /^\d+$/.test(spec.slice(idx + 1))) {
    return { host: spec.slice(0, idx), port: Number(spec.slice(idx + 1)) };
  }
  return { host: spec, port: 443 };
}

/**
 * Handshake with one endpoint and report the negotiated cryptography.
 * Connects only to the host the caller names; certificate validation is
 * disabled on purpose — this is an audit probe, not a client.
 */
export function checkTlsEndpoint(
  host: string,
  port = 443,
  timeoutMs = 8000,
): Promise<TlsEndpointResult> {
  return new Promise((resolve) => {
    const done = (result: TlsEndpointResult): void => {
      socket.destroy();
      resolve(result);
    };

    const socket = connect({
      host,
      port,
      servername: host,
      rejectUnauthorized: false,
    });
    socket.setTimeout(timeoutMs, () => done({ host, port, ok: false, error: 'timeout' }));
    socket.on('error', (err) => done({ host, port, ok: false, error: err.message }));

    socket.on('secureConnect', () => {
      const protocol = socket.getProtocol() ?? undefined;
      const cipher = socket.getCipher()?.name;
      const eph = socket.getEphemeralKeyInfo() as
        | { type?: string; name?: string; size?: number }
        | null;
      const cert = socket.getPeerCertificate();

      let keyType: string | undefined;
      let keyBits: number | undefined;
      let curve: string | undefined;
      if (cert && Object.keys(cert).length > 0) {
        if (cert.asn1Curve || cert.nistCurve) {
          keyType = 'EC';
          curve = cert.nistCurve ?? cert.asn1Curve;
        } else if (cert.exponent) {
          keyType = 'RSA';
        }
        keyBits = cert.bits;
      }

      done({
        host,
        port,
        ok: true,
        protocol,
        cipher,
        keyExchange: eph ?? undefined,
        certificate:
          cert && Object.keys(cert).length > 0
            ? {
                subject: firstString(cert.subject?.CN),
                issuer: firstString(cert.issuer?.CN),
                keyType,
                keyBits,
                curve,
                validTo: cert.valid_to,
              }
            : undefined,
        assessment: assessTls(protocol, eph?.name, keyType),
      });
    });
  });
}

export function formatTlsResult(r: TlsEndpointResult): string {
  if (!r.ok) return `✖ ${r.host}:${r.port} — connection failed: ${r.error}`;
  const a = r.assessment;
  const badge = a?.hybridPqcKeyExchange
    ? '✔ PQC-hybrid'
    : a?.quantumVulnerableKeyExchange
      ? '⚠ quantum-vulnerable'
      : '? inconclusive';
  const lines = [
    `${badge}  ${r.host}:${r.port}`,
    `  protocol: ${r.protocol ?? '?'}   cipher: ${r.cipher ?? '?'}`,
    `  key exchange: ${r.keyExchange?.name ?? r.keyExchange?.type ?? 'not reported'}`,
  ];
  if (r.certificate) {
    const c = r.certificate;
    lines.push(
      `  certificate: ${c.keyType ?? '?'}${c.keyBits ? `-${c.keyBits}` : ''}${c.curve ? ` (${c.curve})` : ''}, CN=${c.subject ?? '?'}, expires ${c.validTo ?? '?'}`,
    );
  }
  for (const note of a?.notes ?? []) lines.push(`  · ${note}`);
  return lines.join('\n');
}
