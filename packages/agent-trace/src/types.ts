/** Общие типы пакета. */

/** Один обнаруженный агент или объявление агентской функциональности. */
export interface AgentRecord {
  /** Стабильный идентификатор в пределах отчёта. */
  id: string;
  /** Как обнаружен: конфигурация MCP, фреймворк в коде, workflow-файл. */
  kind: "mcp-server" | "framework" | "workflow" | "declared";
  /** Файл, в котором найдено объявление. */
  source: string;
  /** Имя из конфигурации или фреймворка. */
  name: string;
  /** Транспорт или способ запуска, если он объявлен. */
  transport?: string;
  /** Инструменты и команды, до которых агент может дотянуться. */
  tools?: string[];
  /** Короткое человеческое объяснение, почему это попало в инвентарь. */
  why: string;
}

export interface Inventory {
  scannedAt: string;
  root: string;
  filesScanned: number;
  agents: AgentRecord[];
}

export interface VerifyResult {
  ok: boolean;
  entries: number;
  /** Хеш последней записи — то, что подписывается ЭЦП и публикуется. */
  head: string | null;
  /** Формат журнала: kepil (seq, sha256:-префикс) или более ранний AI-Gateway. */
  format?: "kepil" | "ai-gateway";
  /** Корни, зафиксированные вне журнала и найденные в нём; хвост после последнего не защищён от обрезки. */
  anchors?: { confirmed: number; unanchoredTail: number };
  /** Первая обнаруженная поломка, если она есть. */
  problem?: { seq: number | null; reason: string };
}

export interface EvidencePack {
  generatedAt: string;
  tool: { name: string; version: string };
  inventory: Inventory | null;
  log: VerifyResult | null;
  /** Соответствие требованиям: что подтверждено, а что нет. */
  claims: EvidenceClaim[];
}

export interface EvidenceClaim {
  requirement: string;
  source: string;
  status: "supported" | "partial" | "not-covered";
  note: string;
}
