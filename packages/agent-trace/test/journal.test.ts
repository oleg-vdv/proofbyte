import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { verifyFile, entryHash } from "../src/journal.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => join(here, "fixtures", name);

test("журнал, созданный Kepil на Python, проверяется на JavaScript", () => {
  const result = verifyFile(fixture("journal-valid.jsonl"));
  assert.equal(result.ok, true, result.problem?.reason);
  assert.equal(result.entries, 3);
  assert.match(result.head ?? "", /^sha256:[0-9a-f]{64}$/);
});

test("подделанная запись обнаруживается", () => {
  const result = verifyFile(fixture("journal-tampered.jsonl"));
  assert.equal(result.ok, false);
  assert.equal(result.problem?.seq, 1);
  assert.match(result.problem?.reason ?? "", /content changed/);
});

test("хеш не зависит от порядка ключей", () => {
  const a = { seq: 0, agent_id: "x", decision: "allow" };
  const b = { decision: "allow", agent_id: "x", seq: 0 };
  assert.equal(entryHash(a), entryHash(b));
});

test("целые и дробные числа канонизируются одинаково с Python", () => {
  assert.equal(entryHash({ cost_kzt: 0 }), entryHash({ cost_kzt: 0.0 }));
  assert.notEqual(entryHash({ cost_kzt: 0 }), entryHash({ cost_kzt: 41.2 }));
});

test("журнал живого прогона Kepil с малыми дробными числами проверяется", () => {
  // Стоимость шага 0.00005 ₸: Python раньше писал 5e-05, и хеш не сходился.
  const result = verifyFile(fixture("journal-live-agent.jsonl"));
  assert.equal(result.ok, true, result.problem?.reason);
  assert.equal(result.entries, 8);
  assert.equal(result.format, "kepil");
});

test("журнал AI-Gateway проверяется в его собственном формате", () => {
  const result = verifyFile(fixture("gateway-valid.jsonl"));
  assert.equal(result.ok, true, result.problem?.reason);
  assert.equal(result.entries, 3);
  assert.equal(result.format, "ai-gateway");
});

test("подделка в журнале AI-Gateway обнаруживается", () => {
  const result = verifyFile(fixture("gateway-tampered.jsonl"));
  assert.equal(result.ok, false);
  assert.equal(result.problem?.seq, 1);
  assert.match(result.problem?.reason ?? "", /content changed/);
});

const LIVE_HEAD = "sha256:f8fe52c8bd5e04ecf2279268edeafe6266f7a9905b44bdada4c57c2d5bd13079";

test("пересобранный журнал проходит цепочку, но не проходит проверку по зафиксированному корню", () => {
  assert.equal(verifyFile(fixture("journal-live-rebuilt.jsonl")).ok, true);
  const result = verifyFile(fixture("journal-live-rebuilt.jsonl"), [LIVE_HEAD]);
  assert.equal(result.ok, false);
  assert.match(result.problem?.reason ?? "", /rebuilt or truncated/);
});

test("обрезанный хвост ловится по зафиксированному корню", () => {
  assert.equal(verifyFile(fixture("journal-live-truncated.jsonl"), [LIVE_HEAD]).ok, false);
});

test("исходный журнал проходит проверку по своему корню", () => {
  const result = verifyFile(fixture("journal-live-agent.jsonl"), [LIVE_HEAD]);
  assert.equal(result.ok, true, result.problem?.reason);
  assert.deepEqual(result.anchors, { confirmed: 1, unanchoredTail: 0 });
});

test("BOM в начале файла не считается подделкой", () => {
  assert.equal(verifyFile(fixture("journal-live-bom.jsonl")).ok, true);
});

test("пустой журнал не засчитывается как подтверждённый", () => {
  const result = verifyFile(fixture("journal-empty.jsonl"));
  assert.equal(result.ok, false);
  assert.match(result.problem?.reason ?? "", /empty/);
});
