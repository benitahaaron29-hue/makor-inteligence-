/**
 * Makor Intelligence Platform — Tailwind theme (v0.2)
 *
 * Bound to CSS design tokens in `src/styles/tokens.css`. The theme is a typed
 * projection of those tokens so authors can use familiar Tailwind class names
 * (e.g. `bg-surface-panel`, `text-makor-400`, `font-serif`).
 *
 * Rules:
 *  - Do not introduce new colors here — add them to tokens.css first, then
 *    reference them via `var(--token)`.
 *  - Radii top out at 4px (`lg`). No `xl`, no `2xl`. `pill` is for status only.
 *  - No DEFAULT shadow. Shadows are reserved for overlays (popovers, modals).
 */

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx,js,jsx,html}",
    "./public/**/*.html",
    "./preview.html",
    "./wireframes/**/*.html",
  ],
  darkMode: "class",
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      inherit: "inherit",

      surface: {
        base:     "var(--surface-base)",
        panel:    "var(--surface-panel)",
        sunken:   "var(--surface-sunken)",
        raised:   "var(--surface-raised)",
        overlay:  "var(--surface-overlay)",
        hover:    "var(--surface-hover)",
        active:   "var(--surface-active)",
        inset:    "var(--surface-inset)",
        research: "var(--surface-research)",
      },

      border: {
        subtle:  "var(--border-subtle)",
        DEFAULT: "var(--border-default)",
        strong:  "var(--border-strong)",
        focus:   "var(--border-focus)",
        accent:  "var(--border-accent)",
      },

      text: {
        primary:   "var(--text-primary)",
        secondary: "var(--text-secondary)",
        tertiary:  "var(--text-tertiary)",
        disabled:  "var(--text-disabled)",
        inverse:   "var(--text-inverse)",
        data:      "var(--text-data)",
        eyebrow:   "var(--text-eyebrow)",
        editorial: "var(--text-editorial)",
        accent:    "var(--text-accent)",
      },

      makor: {
        50:  "var(--makor-50)",
        100: "var(--makor-100)",
        200: "var(--makor-200)",
        300: "var(--makor-300)",
        400: "var(--makor-400)",
        500: "var(--makor-500)",
        600: "var(--makor-600)",
        700: "var(--makor-700)",
        800: "var(--makor-800)",
        900: "var(--makor-900)",
        950: "var(--makor-950)",
      },

      brass: {
        DEFAULT: "var(--accent-brass)",
        soft:    "var(--accent-brass-soft)",
      },

      bid:            "var(--bid)",
      "bid-soft":     "var(--bid-soft)",
      offer:          "var(--offer)",
      "offer-soft":   "var(--offer-soft)",
      neutral:        "var(--neutral)",
      warning:        "var(--warning)",
      "warning-soft": "var(--warning-soft)",
      info:           "var(--info)",
      alert:          "var(--alert)",

      "risk-on":      "var(--risk-on)",
      "risk-off":     "var(--risk-off)",
      "risk-mixed":   "var(--risk-mixed)",
      "risk-neutral": "var(--risk-neutral)",
    },

    fontFamily: {
      sans:    ["Inter Variable", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      mono:    ["JetBrains Mono Variable", "JetBrains Mono", "ui-monospace", "SF Mono", "Cascadia Mono", "Menlo", "Consolas", "monospace"],
      display: ["Inter Variable", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      serif:   ["Source Serif 4 Variable", "Source Serif Pro", "Charter", "Georgia", "Times New Roman", "serif"],
    },

    fontSize: {
      // UI scale
      eyebrow:    ["10px", { lineHeight: "14px", letterSpacing: "0.10em",  fontWeight: "600" }],
      caption:    ["11px", { lineHeight: "16px", letterSpacing: "0.01em",  fontWeight: "400" }],
      "data-sm":  ["11px", { lineHeight: "16px", letterSpacing: "0",       fontWeight: "500" }],
      "body-sm":  ["12px", { lineHeight: "18px", letterSpacing: "0",       fontWeight: "400" }],
      data:       ["12px", { lineHeight: "18px", letterSpacing: "0",       fontWeight: "500" }],
      body:       ["13px", { lineHeight: "20px", letterSpacing: "0",       fontWeight: "400" }],
      h4:         ["14px", { lineHeight: "20px", letterSpacing: "0",       fontWeight: "600" }],
      "data-lg":  ["14px", { lineHeight: "20px", letterSpacing: "0",       fontWeight: "500" }],
      h3:         ["16px", { lineHeight: "22px", letterSpacing: "-0.005em",fontWeight: "600" }],
      h2:         ["20px", { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "600" }],
      h1:         ["24px", { lineHeight: "32px", letterSpacing: "-0.015em",fontWeight: "600" }],
      display:    ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "600" }],

      // Editorial scale (set with font-serif)
      "edit-display": ["40px", { lineHeight: "48px", letterSpacing: "-0.018em", fontWeight: "600" }],
      "edit-h1":      ["30px", { lineHeight: "38px", letterSpacing: "-0.012em", fontWeight: "600" }],
      "edit-h2":      ["22px", { lineHeight: "30px", letterSpacing: "-0.005em", fontWeight: "600" }],
      "edit-dek":     ["17px", { lineHeight: "26px", letterSpacing: "-0.003em", fontWeight: "400" }],
      "edit-body":    ["15px", { lineHeight: "24px", letterSpacing: "0",        fontWeight: "400" }],
      "edit-quote":   ["18px", { lineHeight: "28px", letterSpacing: "-0.005em", fontWeight: "500" }],
    },

    spacing: {
      0:    "0",
      px:   "1px",
      0.5:  "2px",
      1:    "4px",
      1.5:  "6px",
      2:    "8px",
      2.5:  "10px",
      3:    "12px",
      3.5:  "14px",
      4:    "16px",
      5:    "20px",
      6:    "24px",
      7:    "28px",
      8:    "32px",
      9:    "36px",
      10:   "40px",
      11:   "44px",
      12:   "48px",
      14:   "56px",
      16:   "64px",
      20:   "80px",
      24:   "96px",
      32:   "128px",
      sidebar:        "var(--layout-sidebar-w)",
      "sidebar-c":    "var(--layout-sidebar-w-compact)",
      "header-strip": "var(--layout-header-h)",
      "status-strip": "var(--layout-status-h)",
      research:       "var(--layout-research-max-w)",
    },

    borderRadius: {
      none: "0",
      xs:   "1px",
      sm:   "2px",
      md:   "3px",
      lg:   "4px",
      pill: "999px",
    },

    borderWidth: {
      0: "0",
      DEFAULT: "1px",
      1: "1px",
      2: "2px",
    },

    boxShadow: {
      none:    "none",
      overlay: "var(--elevation-overlay)",
      popover: "var(--elevation-popover)",
    },

    extend: {
      transitionDuration: {
        instant: "0ms",
        fast:    "80ms",
        medium:  "160ms",
        tick:    "400ms",
      },
      transitionTimingFunction: {
        linear:    "linear",
        "out-soft":"cubic-bezier(0.22, 1, 0.36, 1)",
      },
      ringWidth:       { DEFAULT: "2px" },
      ringColor:       { DEFAULT: "var(--border-focus)" },
      ringOffsetWidth: { DEFAULT: "0" },
      letterSpacing:   { eyebrow: "0.10em" },
      zIndex: {
        sticky:   "10",
        sidebar:  "20",
        header:   "30",
        dropdown: "40",
        overlay:  "50",
        modal:    "60",
        toast:    "70",
      },
      maxWidth: {
        research: "var(--layout-research-max-w)",
      },
      animation: {
        "live-pulse": "live-pulse 1.6s linear infinite",
        "tick-up":    "tick-up 400ms linear 1",
        "tick-dn":    "tick-dn 400ms linear 1",
      },
      keyframes: {
        "live-pulse": {
          "0%":   { transform: "scale(0.6)", opacity: "0.6" },
          "100%": { transform: "scale(1.6)", opacity: "0"   },
        },
        "tick-up": {
          "0%":   { backgroundColor: "var(--bid-soft)" },
          "100%": { backgroundColor: "transparent"     },
        },
        "tick-dn": {
          "0%":   { backgroundColor: "var(--offer-soft)" },
          "100%": { backgroundColor: "transparent"       },
        },
      },
    },
  },
  plugins: [],
};

export default config;
