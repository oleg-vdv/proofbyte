/**
 * Сборка пакета доказательств.
 *
 * Пакет отвечает на один вопрос: что из требований к трассируемости
 * подтверждено артефактами, а что нет. Ничего не «проходит» автоматически —
 * там, где данных нет, статус так и записывается.
 */

import type { EvidenceClaim, EvidencePack, Inventory, VerifyResult } from "./types.ts";

export const VERSION = "0.1.0";

export function buildClaims(inventory: Inventory | null, log: VerifyResult | null): EvidenceClaim[] {
  const claims: EvidenceClaim[] = [];

  claims.push({
    requirement: "Inventory: the organisation keeps a register of its agents",
    source: "Закон РК № 230-VIII ст. 17 п. 1–2 (класс риска назначает собственник); практика AI-инвентаризации",
    status: inventory ? (inventory.agents.length ? "supported" : "partial") : "not-covered",
    note: inventory
      ? inventory.agents.length
        ? `${inventory.agents.length} declarations across ${inventory.filesScanned} files`
        : "no declarations found; absence of findings is not proof of absence"
      : "no inventory provided",
  });

  claims.push({
    requirement: "Automatic recording of events over the system's period of operation",
    source: "EU AI Act Art. 12; Закон РК № 230-VIII ст. 8 п. 1 (постоянный контроль)",
    status: log ? (log.ok ? "supported" : "not-covered") : "not-covered",
    note: log
      ? log.ok
        ? `${log.entries} records verified, chain intact`
        : `chain broken: ${log.problem?.reason ?? "unknown"} (record ${log.problem?.seq ?? "?"})`
      : "no journal provided",
  });

  claims.push({
    requirement: "Log immutability is confirmed by an independent check",
    source: "Закон РК № 230-VIII ст. 15 п. 2 подп. 2 (защита от несанкционированного доступа); внешняя верификация цепочки хешей",
    status: log?.ok ? "supported" : "not-covered",
    note: log?.head ? `chain head: ${log.head}` : "chain head unavailable",
  });

  claims.push({
    requirement: "Legal weight: the chain head is signed",
    source: "organisation signature; outside the scope of this tool",
    status: "not-covered",
    note: "verify separately that the chain head is signed and the signature is kept",
  });

  return claims;
}

export function buildPack(inventory: Inventory | null, log: VerifyResult | null): EvidencePack {
  return {
    generatedAt: new Date().toISOString(),
    tool: { name: "proofbyte-agent-trace", version: VERSION },
    inventory,
    log,
    claims: buildClaims(inventory, log),
  };
}
