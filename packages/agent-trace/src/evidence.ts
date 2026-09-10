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
    requirement: "Учёт систем: организация ведёт инвентарь агентов",
    source: "EU AI Act Art. 12 (record-keeping); практика AI-инвентаризации",
    status: inventory ? (inventory.agents.length ? "supported" : "partial") : "not-covered",
    note: inventory
      ? inventory.agents.length
        ? `обнаружено объявлений: ${inventory.agents.length} в ${inventory.filesScanned} файлах`
        : "объявлений не найдено; отсутствие находок не является доказательством отсутствия"
      : "инвентарь не предоставлен",
  });

  claims.push({
    requirement: "Автоматическая регистрация событий за период работы системы",
    source: "EU AI Act Art. 12; Закон РК № 230-VIII ст. 15 п. 2",
    status: log ? (log.ok ? "supported" : "not-covered") : "not-covered",
    note: log
      ? log.ok
        ? `проверено записей: ${log.entries}, цепочка целостна`
        : `цепочка нарушена: ${log.problem?.reason ?? "неизвестно"} (запись ${log.problem?.seq ?? "?"})`
      : "журнал не предоставлен",
  });

  claims.push({
    requirement: "Неизменяемость журнала подтверждается независимой проверкой",
    source: "внешняя верификация цепочки хешей",
    status: log?.ok ? "supported" : "not-covered",
    note: log?.head ? `корень цепочки: ${log.head}` : "корень цепочки недоступен",
  });

  claims.push({
    requirement: "Юридическая значимость: корень цепочки подписан",
    source: "подпись ЭЦП организации; вне зоны ответственности этого инструмента",
    status: "not-covered",
    note: "проверьте отдельно, что корень цепочки подписан и подпись сохранена",
  });

  return claims;
}

export function buildPack(inventory: Inventory | null, log: VerifyResult | null): EvidencePack {
  return {
    generatedAt: new Date().toISOString(),
    tool: { name: "@proofbyte/agent-trace", version: VERSION },
    inventory,
    log,
    claims: buildClaims(inventory, log),
  };
}
