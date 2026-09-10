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
  assert.match(result.problem?.reason ?? "", /изменено/);
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
