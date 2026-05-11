/**
 * Numeric / textual formatting helpers tailored for the terminal.
 * All numerics should be rendered with these so we keep `tabular-nums slashed-zero`
 * consistency across the platform.
 */

const HIGH_VALUE_SYMBOLS = new Set(["USDJPY", "USD_JPY", "EURJPY", "GBPJPY", "USDCNH", "USDMXN"]);

export function formatPrice(symbol: string, value: number): string {
  const key = symbol.replace(/[\s/]/g, "").toUpperCase();
  if (HIGH_VALUE_SYMBOLS.has(key) || Math.abs(value) >= 100) {
    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (Math.abs(value) >= 10) {
    return value.toFixed(3);
  }
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
  // backend stores FX pairs as "EURUSD"; render as "EUR/USD" for FX, leave others.
  const upper = raw.toUpperCase();
  if (/^[A-Z]{6}$/.test(upper) && !upper.endsWith("XX")) {
    return `${upper.slice(0, 3)}/${upper.slice(3)}`;
  }
  return upper.replace(/_/g, " ");
}

export function tickerArrow(v: number): "▲" | "▼" | "▬" {
  if (v > 0) return "▲";
  if (v < 0) return "▼";
  return "▬";
}

export function tickerClass(v: number): "data-pos" | "data-neg" | "data-neu" {
  if (v > 0) return "data-pos";
  if (v < 0) return "data-neg";
  return "data-neu";
}

export function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}
