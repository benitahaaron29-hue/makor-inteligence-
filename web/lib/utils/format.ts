/**
 * Numeric & textual formatting helpers tuned for the terminal.
 * Always render numerics through these for tabular-nums consistency.
 */

const HIGH_VALUE_SYMBOLS = new Set([
  "USDJPY", "USD_JPY", "EURJPY", "GBPJPY", "USDCNH", "USDMXN", "USDZAR", "USDTRY",
]);

export function formatPrice(symbol: string, value: number): string {
  const key = symbol.replace(/[\s/]/g, "").toUpperCase();
  if (HIGH_VALUE_SYMBOLS.has(key) || Math.abs(value) >= 100) {
    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (Math.abs(value) >= 10) return value.toFixed(3);
  return value.toFixed(4);
}

export function formatBp(v: number, digits = 1): string {
  const sign = v > 0 ? "+" : v < 0 ? "−" : "±";
  return `${sign}${Math.abs(v).toFixed(digits)} bp`;
}

export function formatPct(v: number, digits = 2): string {
  const sign = v > 0 ? "+" : v < 0 ? "−" : "±";
  return `${sign}${Math.abs(v).toFixed(digits)}%`;
}

export function formatInt(v: number): string {
  return v.toLocaleString("en-US");
}

export function formatLargeNumber(v: number): string {
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function formatSymbol(raw: string): string {
  const upper = raw.toUpperCase();
  if (/^[A-Z]{6}$/.test(upper)) {
    return `${upper.slice(0, 3)}/${upper.slice(3)}`;
  }
  return upper.replace(/_/g, " ");
}

export function tickerArrow(v: number): "▲" | "▼" | "▬" {
  if (v > 0) return "▲";
  if (v < 0) return "▼";
  return "▬";
}

export function directionFromValue(v: number): "pos" | "neg" | "neu" {
  if (v > 0) return "pos";
  if (v < 0) return "neg";
  return "neu";
}

export function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}
