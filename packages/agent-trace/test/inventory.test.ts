import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { scan } from "../src/inventory.ts";

function fixtureRepo(): string {
  const root = mkdtempSync(join(tmpdir(), "agent-trace-"));
  writeFileSync(join(root, ".mcp.json"), JSON.stringify({
    mcpServers: {
      billing: { command: "python", args: ["-m", "billing_server"] },
      crm: { url: "https://crm.internal/mcp" },
    },
  }), "utf8");
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src", "flow.py"), "from langgraph.graph import StateGraph\n", "utf8");
  mkdirSync(join(root, "node_modules"));
  writeFileSync(join(root, "node_modules", "ignored.py"), "import crewai\n", "utf8");
  return root;
}

test("находит серверы MCP и фреймворки, пропуская node_modules", () => {
  const inventory = scan(fixtureRepo());
  const names = inventory.agents.map((a) => a.name).sort();
  assert.deepEqual(names, ["billing", "crm", "langgraph"]);
  assert.equal(inventory.agents.filter((a) => a.kind === "mcp-server").length, 2);
});

test("транспорт определяется по конфигурации", () => {
  const inventory = scan(fixtureRepo());
  const byName = Object.fromEntries(inventory.agents.map((a) => [a.name, a]));
  assert.equal(byName.billing.transport, "stdio");
  assert.equal(byName.crm.transport, "http");
});

test("у каждой находки есть объяснение", () => {
  for (const agent of scan(fixtureRepo()).agents) {
    assert.ok(agent.why.length > 10, `нет объяснения у ${agent.name}`);
  }
});
