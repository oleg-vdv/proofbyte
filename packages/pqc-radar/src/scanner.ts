import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import {
  CRYPTO_MATERIAL_EXTENSIONS,
  PATTERNS,
  SCAN_EXTENSIONS,
  type CryptoPattern,
} from './patterns.ts';

export interface Finding {
  pattern: CryptoPattern;
  file: string;
  line: number;
  snippet: string;
}

export interface CryptoMaterialFile {
  file: string;
}

export interface ScanResult {
  root: string;
  scannedFiles: number;
  findings: Finding[];
  materials: CryptoMaterialFile[];
}

const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', 'target', 'vendor',
  '.venv', 'venv', '__pycache__', '.idea', '.vscode',
]);

const MAX_FILE_BYTES = 1_000_000;

export function scan(root: string): ScanResult {
  const findings: Finding[] = [];
  const materials: CryptoMaterialFile[] = [];
  let scannedFiles = 0;

  const walk = (dir: string): void => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // unreadable directory — skip rather than abort the scan
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) walk(full);
        continue;
      }
      if (!entry.isFile()) continue;

      const ext = extname(entry.name).toLowerCase();
      const rel = relative(root, full).replaceAll('\\', '/');

      if (CRYPTO_MATERIAL_EXTENSIONS.has(ext)) {
        materials.push({ file: rel });
        continue;
      }
      if (!SCAN_EXTENSIONS.has(ext)) continue;

      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      if (stat.size > MAX_FILE_BYTES) continue;

      let text: string;
      try {
        text = readFileSync(full, 'utf8');
      } catch {
        continue;
      }
      scannedFiles++;

      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        for (const pattern of PATTERNS) {
          if (pattern.regex.test(lines[i])) {
            findings.push({
              pattern,
              file: rel,
              line: i + 1,
              snippet: lines[i].trim().slice(0, 160),
            });
          }
        }
      }
    }
  };

  walk(root);
  return { root, scannedFiles, findings, materials };
}
