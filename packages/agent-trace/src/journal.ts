/**
 * Проверка журнала действий с цепочкой SHA-256.
 *
 * Читает append-only JSONL, где каждая запись содержит хеш предыдущей.
 * Формат совместим с журналом AI-Gateway и платформы Kepil, но верификатор
 * намеренно независим: доказательство должно проверяться посторонним
 * инструментом, иначе оно ничего не стоит.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { canonical } from "./canonical.ts";
import type { VerifyResult } from "./types.ts";

export const GENESIS = "sha256:" + "0".repeat(64);

export function entryHash(record: Record<string, unknown>): string {
  const body: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) if (k !== "hash") body[k] = v;
  return "sha256:" + createHash("sha256").update(canonical(body), "utf8").digest("hex");
}

export function verifyEntries(records: Record<string, unknown>[]): VerifyResult {
  let prev = GENESIS;
  let expectedSeq = 0;
  let head: string | null = null;

  for (const record of records) {
    const seq = typeof record.seq === "number" ? record.seq : null;
    if (record.prev_hash !== prev) {
      return { ok: false, entries: records.length, head, problem: { seq, reason: "broken chain: prev_hash does not match the previous record" } };
    }
    if (seq !== expectedSeq) {
      return { ok: false, entries: records.length, head, problem: { seq, reason: `sequence broken: expected ${expectedSeq}` } };
    }
    if (entryHash(record) !== record.hash) {
      return { ok: false, entries: records.length, head, problem: { seq, reason: "record content changed after it was written" } };
    }
    prev = record.hash as string;
    head = prev;
    expectedSeq += 1;
  }

  return { ok: true, entries: records.length, head };
}

export function verifyFile(path: string): VerifyResult {
  const lines = readFileSync(path, "utf8").split("\n").filter((l) => l.trim());
  const records: Record<string, unknown>[] = [];
  for (const [i, line] of lines.entries()) {
    try {
      records.push(JSON.parse(line));
    } catch {
      return { ok: false, entries: lines.length, head: null, problem: { seq: i, reason: "line is not valid JSON" } };
    }
  }
  return verifyEntries(records);
}
