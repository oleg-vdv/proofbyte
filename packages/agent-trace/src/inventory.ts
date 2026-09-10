/**
 * Инвентаризация агентов в репозитории.
 *
 * v0 — обнаружение по объявлениям: конфигурации MCP, импорты агентских
 * фреймворков, файлы workflow. Отсутствие находок не является доказательством
 * отсутствия агентов; это инвентарь заявленного, а не наблюдение за рантаймом.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, basename, extname } from "node:path";

import type { AgentRecord, Inventory } from "./types.ts";

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".venv", "venv", "__pycache__",
  ".next", "coverage", ".pytest_cache", ".ruff_cache",
]);

const MCP_CONFIG_NAMES = new Set([
  ".mcp.json", "mcp.json", "claude_desktop_config.json", "mcp_servers.json",
]);

const FRAMEWORK_MARKERS: Array<{ pattern: RegExp; name: string; why: string }> = [
  { pattern: /from\s+langgraph|import\s+langgraph/, name: "langgraph", why: "граф агентов LangGraph" },
  { pattern: /from\s+crewai|import\s+crewai/, name: "crewai", why: "мультиагентный фреймворк CrewAI" },
  { pattern: /autogen_agentchat|from\s+autogen/, name: "autogen", why: "AutoGen: агенты с обменом сообщениями" },
  { pattern: /openai[-_]agents|from\s+agents\s+import/, name: "openai-agents", why: "OpenAI Agents SDK" },
  { pattern: /@anthropic-ai\/claude-agent-sdk|claude_agent_sdk/, name: "claude-agent-sdk", why: "Claude Agent SDK" },
  { pattern: /@modelcontextprotocol\/sdk|mcp\.server|FastMCP/, name: "mcp-sdk", why: "сервер или клиент MCP" },
  { pattern: /smolagents|llama_index\.core\.agent/, name: "other-agent-framework", why: "агентский фреймворк" },
];

const CODE_EXT = new Set([".py", ".ts", ".tsx", ".js", ".mjs", ".jsx", ".go", ".rb", ".java", ".cs"]);
const MAX_BYTES = 512 * 1024;

function* walk(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isSymbolicLink?.()) continue;
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) yield* walk(full);
    } else if (st.size <= MAX_BYTES) {
      yield full;
    }
  }
}

function fromMcpConfig(file: string, root: string, text: string): AgentRecord[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  const servers = (parsed as { mcpServers?: Record<string, unknown> })?.mcpServers;
  if (!servers || typeof servers !== "object") return [];

  return Object.entries(servers).map(([name, cfg]) => {
    const c = (cfg ?? {}) as Record<string, unknown>;
    const transport = typeof c.url === "string" ? "http" : typeof c.command === "string" ? "stdio" : undefined;
    const tools: string[] = [];
    if (typeof c.command === "string") tools.push(String(c.command));
    if (Array.isArray(c.args)) tools.push(...c.args.map(String));
    return {
      id: `mcp:${name}`,
      kind: "mcp-server" as const,
      source: relative(root, file) || basename(file),
      name,
      transport,
      tools: tools.length ? tools : undefined,
      why: "объявлен как сервер MCP: даёт агенту доступ к инструментам и данным",
    };
  });
}

function fromCode(file: string, root: string, text: string): AgentRecord[] {
  const found: AgentRecord[] = [];
  for (const marker of FRAMEWORK_MARKERS) {
    if (marker.pattern.test(text)) {
      found.push({
        id: `framework:${marker.name}:${relative(root, file)}`,
        kind: "framework",
        source: relative(root, file),
        name: marker.name,
        why: marker.why,
      });
    }
  }
  return found;
}

function fromWorkflow(file: string, root: string, text: string): AgentRecord[] {
  if (!/"nodes"\s*:/.test(text) || !/n8n|langflow|flowise/i.test(text)) return [];
  return [{
    id: `workflow:${relative(root, file)}`,
    kind: "workflow",
    source: relative(root, file),
    name: basename(file),
    why: "файл автоматизации: узлы выполняются без участия человека",
  }];
}

export function scan(root: string): Inventory {
  const agents: AgentRecord[] = [];
  let filesScanned = 0;

  for (const file of walk(root)) {
    const name = basename(file);
    const ext = extname(file);
    const isJson = ext === ".json";
    if (!isJson && !CODE_EXT.has(ext)) continue;

    let text: string;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    filesScanned += 1;

    if (MCP_CONFIG_NAMES.has(name) || (isJson && /"mcpServers"/.test(text))) {
      agents.push(...fromMcpConfig(file, root, text));
    }
    if (isJson) {
      agents.push(...fromWorkflow(file, root, text));
    } else {
      agents.push(...fromCode(file, root, text));
    }
  }

  const unique = new Map(agents.map((a) => [a.id, a]));
  return {
    scannedAt: new Date().toISOString(),
    root,
    filesScanned,
    agents: [...unique.values()],
  };
}
