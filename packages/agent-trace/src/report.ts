/** Человекочитаемый отчёт по пакету доказательств. */

import type { EvidencePack } from "./types.ts";

const STATUS_LABEL: Record<string, string> = {
  supported: "supported",
  partial: "partial",
  "not-covered": "not covered",
};

export function renderMarkdown(pack: EvidencePack): string {
  const lines: string[] = [];
  lines.push("# Agent trace — evidence pack", "");
  lines.push(`Generated: ${pack.generatedAt}`);
  lines.push(`Tool: ${pack.tool.name} ${pack.tool.version}`, "");

  lines.push("## Requirements", "");
  lines.push("| Requirement | Status | Note |");
  lines.push("|---|---|---|");
  for (const c of pack.claims) {
    lines.push(`| ${c.requirement} | ${STATUS_LABEL[c.status] ?? c.status} | ${c.note} |`);
  }
  lines.push("");

  if (pack.log) {
    lines.push("## Action journal", "");
    lines.push(`- records verified: ${pack.log.entries}`);
    lines.push(`- integrity: ${pack.log.ok ? "confirmed" : "broken"}`);
    if (pack.log.head) lines.push(`- chain head: \`${pack.log.head}\``);
    if (pack.log.problem) {
      lines.push(`- break at record ${pack.log.problem.seq}: ${pack.log.problem.reason}`);
    }
    lines.push("");
  }

  if (pack.inventory) {
    lines.push("## Agent inventory", "");
    lines.push(`Files scanned: ${pack.inventory.filesScanned}`, "");
    if (!pack.inventory.agents.length) {
      lines.push("No declarations found. Absence of findings is not proof that no agents exist.", "");
    } else {
      lines.push("| Name | Kind | File | Why it is listed |");
      lines.push("|---|---|---|---|");
      for (const a of pack.inventory.agents) {
        lines.push(`| ${a.name} | ${a.kind} | \`${a.source}\` | ${a.why} |`);
      }
      lines.push("");
    }
  }

  lines.push("---", "");
  lines.push("This tool verifies artefacts, not full legal compliance: ");
  lines.push("a supported status means the evidence exists and is intact.");
  return lines.join("\n") + "\n";
}
