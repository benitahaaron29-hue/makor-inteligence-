/**
 * Pure helper shared by server (narrative service, generator) and client
 * (narrative hydrator). Kept in its own file with zero server-only
 * imports so the client bundle can import it without pulling in
 * `cacheGet`, `process.env`, or the LLM providers.
 *
 * Rejects empty / whitespace / "source data insufficient" (case-
 * insensitive, with tolerance for trailing punctuation and hyphenation).
 * The narrative prompt instructs the LLM to emit "source data
 * insufficient" when a section cannot be cited; this matcher catches
 * the literal plus common variants.
 */
export function isLLMFieldUsable(value: string | undefined | null): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  const norm = trimmed
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (
    norm === "source data insufficient" ||
    norm === "source data is insufficient" ||
    norm === "insufficient data" ||
    norm === "insufficient context" ||
    norm === "data unavailable" ||
    norm === "n a" || norm === "na"
  ) return false;
  return true;
}
