/**
 * MAKOR — single source of truth for the brand asset.
 *
 * The authoritative Makor logo file lives at:
 *   web/public/brand/makor-logo.png   (168 x 180, RGBA)
 *
 * Every surface in the platform — sidebar, terminal homepage, command bar,
 * print masthead, exported PDF — renders THIS file. There is no SVG
 * reconstruction and no interpretation: the component is a thin wrapper
 * around the real raster asset that exposes only sizing and a dark/light
 * tone toggle.
 *
 *   tone="auto"  — renders the file as-is (institutional dark ink on the
 *                  native background). Use on paper / white surfaces:
 *                  the printed masthead and the exported document.
 *
 *   tone="light" — applies `filter: brightness(0) invert(1)` so the logo
 *                  becomes a clean white silhouette suitable for the
 *                  platform's dark navy surfaces (sidebar, terminal,
 *                  command bar). Geometry and typography are preserved
 *                  exactly — only the tonal mapping changes.
 *
 * `MakorWordmark` and `MakorMark` are kept as named aliases so existing
 * call sites compile unchanged; both resolve to `MakorLogo` with the same
 * underlying asset.
 */

import type { CSSProperties } from "react";

export const MAKOR_LOGO_SRC = "/brand/makor-logo.png";
export const MAKOR_LOGO_NATIVE_W = 168;
export const MAKOR_LOGO_NATIVE_H = 180;
export const MAKOR_LOGO_ASPECT = MAKOR_LOGO_NATIVE_W / MAKOR_LOGO_NATIVE_H;

export type MakorLogoTone = "auto" | "light";

interface MakorLogoProps {
  /** Display width in pixels. Height auto-derived from the native aspect. */
  width?: number;
  /** Display height in pixels. Width auto-derived if `width` is not set. */
  height?: number;
  /** Tonal mapping. "light" inverts to white silhouette for dark surfaces. */
  tone?: MakorLogoTone;
  /** Accessible name. Defaults to "Makor Securities". */
  alt?: string;
  className?: string;
  style?: CSSProperties;
}

export function MakorLogo({
  width,
  height,
  tone = "auto",
  alt = "Makor Securities",
  className,
  style,
}: MakorLogoProps) {
  const resolvedHeight = height ?? (width ? Math.round(width / MAKOR_LOGO_ASPECT) : 80);
  const resolvedWidth = width ?? Math.round(resolvedHeight * MAKOR_LOGO_ASPECT);

  return (
    <img
      src={MAKOR_LOGO_SRC}
      alt={alt}
      width={resolvedWidth}
      height={resolvedHeight}
      className={className}
      draggable={false}
      style={{
        display: "block",
        flex: "0 0 auto",
        objectFit: "contain",
        filter: tone === "light" ? "brightness(0) invert(1)" : undefined,
        ...style,
      }}
    />
  );
}

// =============================================================================
// Backward-compat aliases. All three resolve to the same real asset; the
// component itself is unchanged. Existing imports keep working.
// =============================================================================

export const MakorWordmark = MakorLogo;
export const MakorMark = MakorLogo;
export const MakorGlyph = MakorLogo;
