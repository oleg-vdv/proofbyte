/** Человекочитаемый отчёт по пакету доказательств. */

import type { EvidencePack } from "./types.ts";

const STATUS_LABEL: Record<string, string> = {
  supported: "подтверждено",
  partial: "частично",
  "not-covered": "не покрыто",
};

export function renderMarkdown(pack: EvidencePack): string {
  const lines: string[] = [];
  lines.push("# Agent trace — пакет доказательств", "");
  lines.push(`Сформирован: ${pack.generatedAt}`);
  lines.push(`Инструмент: ${pack.tool.name} ${pack.tool.version}`, "");

  lines.push("## Требования", "");
  lines.push("| Требование | Статус | Комментарий |");
  lines.push("|---|---|---|");
  for (const c of pack.claims) {
    lines.push(`| ${c.requirement} | ${STATUS_LABEL[c.status] ?? c.status} | ${c.note} |`);
  }
  lines.push("");

  if (pack.log) {
    lines.push("## Журнал действий", "");
    lines.push(`- записей проверено: ${pack.log.entries}`);
    lines.push(`- целостность: ${pack.log.ok ? "подтверждена" : "нарушена"}`);
    if (pack.log.head) lines.push(`- корень цепочки: \`${pack.log.head}\``);
    if (pack.log.problem) {
      lines.push(`- поломка на записи ${pack.log.problem.seq}: ${pack.log.problem.reason}`);
    }
    lines.push("");
  }

  if (pack.inventory) {
    lines.push("## Инвентарь агентов", "");
    lines.push(`Просканировано файлов: ${pack.inventory.filesScanned}`, "");
    if (!pack.inventory.agents.length) {
      lines.push("Объявлений не найдено. Отсутствие находок не является доказательством отсутствия агентов.", "");
    } else {
      lines.push("| Имя | Тип | Файл | Почему в инвентаре |");
      lines.push("|---|---|---|---|");
      for (const a of pack.inventory.agents) {
        lines.push(`| ${a.name} | ${a.kind} | \`${a.source}\` | ${a.why} |`);
      }
      lines.push("");
    }
  }

  lines.push("---", "");
  lines.push("Инструмент проверяет артефакты, а не соответствие закону целиком: ");
  lines.push("статус «подтверждено» означает, что доказательство есть и оно целостно.");
  return lines.join("\n") + "\n";
}
