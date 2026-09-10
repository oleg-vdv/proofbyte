/**
 * Каноническая форма JSON для хеширования.
 *
 * Совместима с реализацией на Python: ключи отсортированы, пробелов нет,
 * юникод не экранируется, числа сериализуются по правилам ECMAScript
 * (подмножество RFC 8785). Целые float на стороне Python приводятся к int,
 * поэтому 0.0 и 0 дают одинаковую строку в обеих реализациях.
 */
export function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const parts = keys.map((k) => JSON.stringify(k) + ":" + canonical(obj[k]));
  return "{" + parts.join(",") + "}";
}
