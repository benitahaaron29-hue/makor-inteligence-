/**
 * Deterministic sparkline series generator.
 *
 * Real time-series ingestion lands in Phase 2. For Phase 1 we derive a stable
 * mock series from a seed string (symbol|date) so the same row renders the
 * same shape across reloads and SSR boundaries, while still varying meaningfully
 * between symbols and days.
 */

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function syntheticSeries(seed: string, points = 16, drift = 0): number[] {
  const rng = mulberry32(hashCode(seed));
  const out: number[] = [];
  let v = 50;
  for (let i = 0; i < points; i++) {
    v += (rng() - 0.5) * 8 + drift;
    out.push(v);
  }
  return out;
}

export function syntheticTrendDirection(seed: string): -1 | 0 | 1 {
  const r = mulberry32(hashCode(seed))();
  if (r < 0.42) return -1;
  if (r > 0.58) return 1;
  return 0;
}

export function syntheticPct(seed: string, magnitude = 0.5): number {
  const rng = mulberry32(hashCode(seed));
  const v = (rng() - 0.5) * 2 * magnitude;
  return Math.round(v * 100) / 100;
}

export function syntheticBp(seed: string, magnitude = 5): number {
  const rng = mulberry32(hashCode(seed));
  const v = (rng() - 0.5) * 2 * magnitude;
  return Math.round(v * 10) / 10;
}
