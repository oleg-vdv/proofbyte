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

/**
 * Журнал AI-Gateway (gateway/core/audit.py) — более ранний формат: без seq,
 * хеши без префикса, hash = sha256(prev_hash + json.dumps(запись без hash,
 * sort_keys=True, ensure_ascii=False)). Разделители у json.dumps по умолчанию
 * ", " и ": ", а числа записаны так, как их пишет Python, поэтому они берутся
 * из исходного текста строки без пересчёта: 1.0 и 1 для Python — разные строки.
 */
const GATEWAY_GENESIS = "0".repeat(64);

class RawNumber {
  readonly text: string;
  constructor(text: string) {
    this.text = text;
  }
}

function parseRaw(line: string): Record<string, unknown> {
  // Третий аргумент reviver (исходный текст значения) есть в Node 22+.
  return JSON.parse(line, (_k, v, ctx?: { source?: string }) =>
    typeof v === "number" && ctx?.source !== undefined ? new RawNumber(ctx.source) : v);
}

function pythonJson(value: unknown): string {
  if (value instanceof RawNumber) return value.text;
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(pythonJson).join(", ") + "]";
  const obj = value as Record<string, unknown>;
  return "{" + Object.keys(obj).sort().map((k) => JSON.stringify(k) + ": " + pythonJson(obj[k])).join(", ") + "}";
}

export function isGatewayFormat(record: Record<string, unknown>): boolean {
  return !("seq" in record) && typeof record.prev_hash === "string" && /^[0-9a-f]{64}$/.test(record.prev_hash);
}

export function verifyGatewayLines(lines: string[]): VerifyResult {
  let prev = GATEWAY_GENESIS;
  let head: string | null = null;
  for (const [i, line] of lines.entries()) {
    let record: Record<string, unknown>;
    try {
      record = parseRaw(line);
    } catch {
      return { ok: false, entries: lines.length, head, format: "ai-gateway", problem: { seq: i, reason: "line is not valid JSON" } };
    }
    if (record.prev_hash !== prev) {
      return { ok: false, entries: lines.length, head, format: "ai-gateway", problem: { seq: i, reason: "broken chain: prev_hash does not match the previous record" } };
    }
    const body: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(record)) if (k !== "hash") body[k] = v;
    const expected = createHash("sha256").update(prev + pythonJson(body), "utf8").digest("hex");
    if (expected !== record.hash) {
      return { ok: false, entries: lines.length, head, format: "ai-gateway", problem: { seq: i, reason: "record content changed after it was written" } };
    }
    prev = record.hash as string;
    head = prev;
  }
  return { ok: true, entries: lines.length, head, format: "ai-gateway" };
}

/**
 * Цепочка сама по себе ловит правку, удаление и вставку записи, но не обрезку
 * хвоста и не пересборку всего журнала заново: владелец журнала может
 * пересчитать все хеши. Это ловится только корнем цепочки, зафиксированным
 * раньше и вне журнала (подпись ЭЦП, письмо аудитору, якорь kepil). Каждый
 * такой корень должен встретиться среди записей.
 */
function checkAnchors(result: VerifyResult, hashes: string[], anchors: string[]): VerifyResult {
  if (!result.ok || !anchors.length) return result;
  const position = new Map(hashes.map((h, i) => [h, i]));
  let last = -1;
  for (const anchor of anchors) {
    const at = position.get(anchor);
    if (at === undefined) {
      return { ...result, ok: false, problem: { seq: null, reason: `anchored head ${anchor} not found: the journal was rebuilt or truncated` } };
    }
    last = Math.max(last, at);
  }
  return { ...result, anchors: { confirmed: anchors.length, unanchoredTail: hashes.length - 1 - last } };
}

export function verifyFile(path: string, anchors: string[] = []): VerifyResult {
  // Блокнот и часть редакторов Windows дописывают BOM в начало файла.
  const text = readFileSync(path, "utf8").replace(/^﻿/, "");
  const lines = text.split("\n").filter((l) => l.trim());
  if (!lines.length) {
    return { ok: false, entries: 0, head: null, problem: { seq: null, reason: "journal is empty: nothing to verify" } };
  }
  const records: Record<string, unknown>[] = [];
  for (const [i, line] of lines.entries()) {
    try {
      records.push(JSON.parse(line));
    } catch {
      return { ok: false, entries: lines.length, head: null, problem: { seq: i, reason: "line is not valid JSON" } };
    }
  }
  const hashes = records.map((r) => String(r.hash));
  if (isGatewayFormat(records[0]!)) return checkAnchors(verifyGatewayLines(lines), hashes, anchors);
  return checkAnchors({ ...verifyEntries(records), format: "kepil" }, hashes, anchors);
}
