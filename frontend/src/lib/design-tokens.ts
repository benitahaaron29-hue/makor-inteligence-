/**
 * Makor Intelligence Platform — Typed Design Tokens (v0.2)
 *
 * Mirrors the canonical CSS custom properties in src/styles/tokens.css.
 * Use these when a styling decision must happen in TypeScript (e.g. passing a
 * color into a chart library). For general CSS prefer the `var(--token)` form
 * or the Tailwind utility so the theme stays editable from one source.
 */

// =========================================================== COLORS

export const surface = {
  base:     "#08111F",
  panel:    "#0D1828",
  sunken:   "#060D18",
  raised:   "#142136",
  overlay:  "#1B2C46",
  hover:    "#213352",
  active:   "#28406A",
  inset:    "#0A1422",
  research: "#0B1626",
} as const;

export const border = {
  subtle:  "#182438",
  default: "#233452",
  strong:  "#2E4470",
  focus:   "#3970E8",
  accent:  "#1F56D1",
} as const;

export const text = {
  primary:   "#E8EEF7",
  secondary: "#A4B0C3",
  tertiary:  "#74819A",
  disabled:  "#44516A",
  inverse:   "#0D1828",
  data:      "#F2F5FA",
  eyebrow:   "#8A98B0",
  editorial: "#ECE9E0",
  accent:    "#5E8FFB",
} as const;

export const makor = {
  50:  "#EBF2FF",
  100: "#C7DAFF",
  200: "#93B5FF",
  300: "#5E8FFB",
  400: "#3970E8",
  500: "#1F56D1",
  600: "#1545AE",
  700: "#0E3686",
  800: "#0A2A6A",
  900: "#06204F",
  950: "#03132F",
} as const;

export const brass = {
  base: "#B89968",
  soft: "#2A2218",
} as const;

export const semantic = {
  bid:         "#1AAE6F",
  bidSoft:     "#0F3526",
  offer:       "#E5484D",
  offerSoft:   "#3A1A22",
  neutral:     "#A4B0C3",
  warning:     "#E89A3C",
  warningSoft: "#382712",
  info:        "#4A9EFF",
  alert:       "#FF6A3D",
} as const;

export const risk = {
  on:      "#1AAE6F",
  off:     "#E5484D",
  mixed:   "#E89A3C",
  neutral: "#A4B0C3",
} as const;

// =========================================================== TYPOGRAPHY

export const fontFamily = {
  sans:    `"Inter Variable", "Inter", ui-sans-serif, system-ui, sans-serif`,
  mono:    `"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace`,
  display: `"Inter Variable", "Inter", ui-sans-serif, system-ui, sans-serif`,
  serif:   `"Source Serif 4 Variable", "Source Serif Pro", "Charter", "Georgia", "Times New Roman", serif`,
} as const;

export type TypeStyle = {
  fontSize: string;
  lineHeight: string;
  fontWeight: number;
  letterSpacing: string;
  fontFamily?: string;
};

/** UI scale — sans / mono only. Numerics must use mono + tabular-nums. */
export const typography = {
  display: { fontSize: "32px", lineHeight: "40px", fontWeight: 600, letterSpacing: "-0.02em"  },
  h1:      { fontSize: "24px", lineHeight: "32px", fontWeight: 600, letterSpacing: "-0.015em" },
  h2:      { fontSize: "20px", lineHeight: "28px", fontWeight: 600, letterSpacing: "-0.01em"  },
  h3:      { fontSize: "16px", lineHeight: "22px", fontWeight: 600, letterSpacing: "-0.005em" },
  h4:      { fontSize: "14px", lineHeight: "20px", fontWeight: 600, letterSpacing: "0"        },
  body:    { fontSize: "13px", lineHeight: "20px", fontWeight: 400, letterSpacing: "0"        },
  bodySm:  { fontSize: "12px", lineHeight: "18px", fontWeight: 400, letterSpacing: "0"        },
  caption: { fontSize: "11px", lineHeight: "16px", fontWeight: 400, letterSpacing: "0.01em"   },
  eyebrow: { fontSize: "10px", lineHeight: "14px", fontWeight: 600, letterSpacing: "0.10em"   },
  dataLg:  { fontSize: "14px", lineHeight: "20px", fontWeight: 500, letterSpacing: "0"        },
  data:    { fontSize: "12px", lineHeight: "18px", fontWeight: 500, letterSpacing: "0"        },
  dataSm:  { fontSize: "11px", lineHeight: "16px", fontWeight: 500, letterSpacing: "0"        },
} as const satisfies Record<string, TypeStyle>;

/** Editorial scale — set with fontFamily.serif. Used in briefing detail / research notes. */
export const editorialTypography = {
  display: { fontFamily: fontFamily.serif, fontSize: "40px", lineHeight: "48px", fontWeight: 600, letterSpacing: "-0.018em" },
  h1:      { fontFamily: fontFamily.serif, fontSize: "30px", lineHeight: "38px", fontWeight: 600, letterSpacing: "-0.012em" },
  h2:      { fontFamily: fontFamily.serif, fontSize: "22px", lineHeight: "30px", fontWeight: 600, letterSpacing: "-0.005em" },
  dek:     { fontFamily: fontFamily.serif, fontSize: "17px", lineHeight: "26px", fontWeight: 400, letterSpacing: "-0.003em" },
  body:    { fontFamily: fontFamily.serif, fontSize: "15px", lineHeight: "24px", fontWeight: 400, letterSpacing: "0"        },
  quote:   { fontFamily: fontFamily.serif, fontSize: "18px", lineHeight: "28px", fontWeight: 500, letterSpacing: "-0.005em" },
} as const satisfies Record<string, TypeStyle>;

// =========================================================== LAYOUT

export const spacing = {
  0: 0, px: 1, 1: 4, 1.5: 6, 2: 8, 3: 12, 4: 16,
  5: 20, 6: 24, 7: 28, 8: 32, 10: 40, 12: 48, 14: 56, 16: 64, 20: 80,
} as const;

export const radius = {
  none: 0,
  xs:   1,
  sm:   2,
  md:   3,
  lg:   4,
  pill: 999,
} as const;

export const layout = {
  sidebarWidth:        248,
  sidebarWidthCompact: 208,
  headerHeight:        56,
  statusHeight:        28,
  minWidth:            1280,
  wideBreakpoint:      1600,
  panelGap:            16,
  pageGutter:          20,
  researchMaxWidth:    760,
  panelHeaderHeight:        44,
  panelHeaderHeightPremium: 52,
  panelPadDefault:     16,
  panelPadPremium:     20,
  panelPadEditorial:   28,
} as const;

export const motion = {
  instant: 0,
  fast:    80,
  medium:  160,
  tick:    400,
} as const;

export const zIndex = {
  base:     0,
  sticky:   10,
  sidebar:  20,
  header:   30,
  dropdown: 40,
  overlay:  50,
  modal:    60,
  toast:    70,
} as const;

// =========================================================== CHARTS

/**
 * Canonical chart palette. Pass these explicitly to chart libraries — never
 * let Recharts / Chart.js / Highcharts apply their defaults. The series
 * palette is intentionally monochrome: charts read like Reuters / FT, not
 * like a Tableau dashboard.
 */
export const chartPalette = {
  primary:    makor[400],
  secondary:  text.secondary,
  tertiary:   text.tertiary,
  positive:   semantic.bid,
  negative:   semantic.offer,
  neutral:    semantic.neutral,
  warning:    semantic.warning,

  gridline:   border.subtle,
  gridlineDash: "2 4",
  axis:       border.strong,
  axisLabel:  text.tertiary,
  crosshair:  text.tertiary,

  tooltipBg:     surface.overlay,
  tooltipBorder: border.strong,

  /** Monochrome multi-series palette — for stacked bars / multi-line charts.
      Steps along the Makor scale; never rainbow. */
  series: [
    makor[400],
    makor[200],
    makor[600],
    text.secondary,
    semantic.warning,
    semantic.bid,
  ],
} as const;

// =========================================================== DEFAULT EXPORT

export const tokens = {
  surface,
  border,
  text,
  makor,
  brass,
  semantic,
  risk,
  fontFamily,
  typography,
  editorialTypography,
  spacing,
  radius,
  layout,
  motion,
  zIndex,
  chartPalette,
} as const;

export type DesignTokens = typeof tokens;
export default tokens;
