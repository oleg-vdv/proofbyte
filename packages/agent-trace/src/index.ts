#!/usr/bin/env node
/**
 * agent-trace — инвентарь агентов и проверка журнала их действий.
 *
 *   agent-trace scan <dir> [--out agents.json] [--report report.md]
 *   agent-trace verify <journal.jsonl>
 *   agent-trace evidence [--inventory agents.json] [--journal j.jsonl]
 *                        [--out evidence.json] [--report evidence.md]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildPack, VERSION } from "./evidence.ts";
import { scan } from "./inventory.ts";
import { verifyFile } from "./journal.ts";
import { renderMarkdown } from "./report.ts";
import type { Inventory, VerifyResult } from "./types.ts";

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

function usage(): never {
  process.stdout.write(
    `agent-trace ${VERSION}\n\n` +
    "  agent-trace scan <dir> [--out agents.json] [--report report.md]\n" +
    "  agent-trace verify <journal.jsonl>\n" +
    "  agent-trace evidence [--inventory agents.json] [--journal journal.jsonl]\n" +
    "                       [--out evidence.json] [--report evidence.md]\n",
  );
  process.exit(1);
}

function main(argv: string[]): void {
  const [command, ...args] = argv;
  if (!command || command === "--help" || command === "-h") usage();

  if (command === "scan") {
    const dir = args[0] && !args[0].startsWith("--") ? args[0] : ".";
    const inventory = scan(resolve(dir));
    const out = flag(args, "out");
    if (out) writeFileSync(out, JSON.stringify(inventory, null, 2), "utf8");
    const report = flag(args, "report");
    if (report) writeFileSync(report, renderMarkdown(buildPack(inventory, null)), "utf8");
    process.stdout.write(
      `Просканировано файлов: ${inventory.filesScanned}\n` +
      `Обнаружено объявлений агентов: ${inventory.agents.length}\n`,
    );
    for (const a of inventory.agents) {
      process.stdout.write(`  · ${a.name} [${a.kind}] — ${a.source}\n`);
    }
    return;
  }

  if (command === "verify") {
    const path = args[0];
    if (!path) usage();
    const result = verifyFile(path);
    if (result.ok) {
      process.stdout.write(
        `Целостность подтверждена. Записей: ${result.entries}\nКорень цепочки: ${result.head}\n`,
      );
      return;
    }
    process.stdout.write(
      `Целостность НАРУШЕНА. Запись ${result.problem?.seq}: ${result.problem?.reason}\n`,
    );
    process.exit(2);
  }

  if (command === "evidence") {
    const invPath = flag(args, "inventory");
    const logPath = flag(args, "journal");
    const inventory: Inventory | null = invPath
      ? (JSON.parse(readFileSync(invPath, "utf8")) as Inventory)
      : null;
    const log: VerifyResult | null = logPath ? verifyFile(logPath) : null;
    const pack = buildPack(inventory, log);
    writeFileSync(flag(args, "out") ?? "evidence.json", JSON.stringify(pack, null, 2), "utf8");
    const report = flag(args, "report");
    if (report) writeFileSync(report, renderMarkdown(pack), "utf8");
    const covered = pack.claims.filter((c) => c.status === "supported").length;
    process.stdout.write(`Требований подтверждено: ${covered} из ${pack.claims.length}\n`);
    return;
  }

  usage();
}

main(process.argv.slice(2));
