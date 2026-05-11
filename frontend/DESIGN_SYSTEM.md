# Makor Intelligence Platform — Design System

> Institutional FX & Macro terminal. Bloomberg-grade data density,
> Makor-grade institutional restraint, FT-grade editorial typography.

**Version 0.2** — refined for Makor Securities identity (May 2026).

This document is the source of truth for the platform's visual language.
The companion technical artifacts are:

- [tokens.css](src/styles/tokens.css) — CSS custom properties (the canonical token layer)
- [globals.css](src/styles/globals.css) — base layer (typography, scrollbars, focus)
- [components.css](src/styles/components.css) — reusable utility classes
- [tailwind.config.ts](tailwind.config.ts) — Tailwind theme bound to the tokens
- [design-tokens.ts](src/lib/design-tokens.ts) — typed token exports for TS

Live wireframes:

- [preview.html](preview.html) — Dashboard (Morning Briefing)
- [wireframes/archive.html](wireframes/archive.html) — Briefing Archive
- [wireframes/briefing-detail.html](wireframes/briefing-detail.html) — Briefing Detail (research note)

If you change a value, change it in `tokens.css` first.

---

## 0. North Star

The platform must read as a **professional macro / FX desk terminal**, not a
SaaS dashboard. The reference triangulation is:

> **Bloomberg Terminal** (data density, eyebrow labels, mono numerics, dense tables)
> ×
> **Financial Times** (editorial typography, generous reading column, serif headlines)
> ×
> **Makor Group** (deep navy identity, restrained palette, premium spacing)

It should feel like:

- a prime-broker risk console
- a hedge-fund internal tool no client ever sees
- a research desk's research surface, where briefings read like FT op-eds

It should NOT feel like:

- a Notion / Linear-style productivity app
- a crypto exchange (no neon, no glow)
- an AI startup dashboard (no gradients, no purple, no "magic" decoration)
- legacy enterprise software (no skeuomorphism, no over-decorated chrome)

**Rules of restraint**

- No gradients except the masthead rule (a single 2px brand-accent transition).
- No drop shadows beyond the overlay/popover token. No glassmorphism.
- No purple. No teal. No "AI" colors.
- No emoji in product UI.
- Border radii are measured in **pixels, not rems**. The maximum is 4 px.
- Animations are functional only.

---

## 1. Color Palette

The palette is divided into five layers. They are independent — surfaces
never borrow from brand, semantics never borrow from surfaces.

### 1.1 Surface — deep institutional navy stack

The navy character is the single most important branding decision. The base is
a deep-navy black (`#08111F`) — never pure grey, never pure black. Each step up
adds saturation toward the Makor blue family.

| Token              | Hex       | Use                                              |
| ------------------ | --------- | ------------------------------------------------ |
| `--surface-base`   | `#08111F` | App background. Deep navy, almost-black.         |
| `--surface-panel`  | `#0D1828` | Default panel.                                   |
| `--surface-sunken` | `#060D18` | Wells (inputs, table interiors).                 |
| `--surface-raised` | `#142136` | Sidebar, header, raised strip.                   |
| `--surface-overlay`| `#1B2C46` | Menus, popovers, modals.                         |
| `--surface-hover`  | `#213352` | Row / item hover.                                |
| `--surface-active` | `#28406A` | Selected / pressed.                              |
| `--surface-inset`  | `#0A1422` | Inset panels inside a panel.                     |
| `--surface-research`| `#0B1626`| Editorial reading panel — slightly warmer navy.  |

### 1.2 Border — navy hairlines

| Token               | Hex       | Use                                            |
| ------------------- | --------- | ---------------------------------------------- |
| `--border-subtle`   | `#182438` | Row separators inside tables.                  |
| `--border-default`  | `#233452` | Default panel border.                          |
| `--border-strong`   | `#2E4470` | Section dividers, header underlines.           |
| `--border-focus`    | `#3970E8` | Keyboard focus ring (Makor 400).               |
| `--border-accent`   | `#1F56D1` | Left-bar accents on key panels / sidebar items.|

### 1.3 Text — navy-tinted whites

| Token                | Hex       | Use                                            |
| -------------------- | --------- | ---------------------------------------------- |
| `--text-primary`     | `#E8EEF7` | Body, headings.                                |
| `--text-secondary`   | `#A4B0C3` | Sub-labels, captions.                          |
| `--text-tertiary`    | `#74819A` | Hints, placeholders, time stamps.              |
| `--text-disabled`    | `#44516A` | Disabled.                                      |
| `--text-inverse`     | `#0D1828` | On light fills (rare).                         |
| `--text-data`        | `#F2F5FA` | Numeric — slightly brighter than primary.      |
| `--text-eyebrow`     | `#8A98B0` | Eyebrow / section labels.                      |
| `--text-editorial`   | `#ECE9E0` | **Warm ivory** for serif body — research note. |
| `--text-accent`      | `#5E8FFB` | Links.                                         |

> `--text-editorial` is the single "warm" color in the system. It only appears
> against `--surface-research`, where the slightly warmer cast gives the serif
> body the broadsheet-newsprint feel of an FT article.

### 1.4 Brand — Makor Blue

The institutional navy / blue family. `500` is the canonical brand color; `400`
is the interactive / focus tone.

| Token            | Hex       |
| ---------------- | --------- |
| `--makor-50`     | `#EBF2FF` |
| `--makor-100`    | `#C7DAFF` |
| `--makor-200`    | `#93B5FF` |
| `--makor-300`    | `#5E8FFB` |
| `--makor-400`    | `#3970E8` |
| `--makor-500`    | `#1F56D1` ← primary brand                |
| `--makor-600`    | `#1545AE` |
| `--makor-700`    | `#0E3686` |
| `--makor-800`    | `#0A2A6A` |
| `--makor-900`    | `#06204F` |
| `--makor-950`    | `#03132F` |

### 1.5 Accent — Brass (premium / editorial moments only)

A muted brass tone for premium / editorial moments — desk crest mark, masthead
rule. **Never** for general UI accents. Never gold; never warm-amber.

| Token                  | Hex       |
| ---------------------- | --------- |
| `--accent-brass`       | `#B89968` |
| `--accent-brass-soft`  | `#2A2218` |

### 1.6 Semantic — finance

Muted, institutional. Bid = green, offer = red, alert = amber. Soft variants
are navy-tinted so they sit cleanly on the surface stack.

| Token              | Hex       | Use                                              |
| ------------------ | --------- | ------------------------------------------------ |
| `--bid`            | `#1AAE6F` | Positive change, bid, risk-on.                   |
| `--bid-soft`       | `#0F3526` | Positive cell tint (navy-tinted green).          |
| `--offer`          | `#E5484D` | Negative change, offer, risk-off.                |
| `--offer-soft`     | `#3A1A22` | Negative cell tint (navy-tinted red).            |
| `--neutral`        | `#A4B0C3` | Unchanged, flat.                                 |
| `--warning`        | `#E89A3C` | Caution, watch.                                  |
| `--warning-soft`   | `#382712` | Warning cell tint.                               |
| `--info`           | `#4A9EFF` | Informational accents (prefer Makor blue).       |
| `--alert`          | `#FF6A3D` | Hard alert — breaking / urgent only.             |

### 1.7 Risk Tones (briefing.risk_tone enum)

| Enum value | Token            | Hex       |
| ---------- | ---------------- | --------- |
| `risk_on`  | `--risk-on`      | `#1AAE6F` |
| `risk_off` | `--risk-off`     | `#E5484D` |
| `mixed`    | `--risk-mixed`   | `#E89A3C` |
| `neutral`  | `--risk-neutral` | `#A4B0C3` |

---

## 2. Typography

Three families. The presence of a serif is the single biggest type decision
in v0.2 — it is what gives the platform its premium / editorial / FT-meets-Makor
character.

### 2.1 Families

| Token            | Stack                                                            | Use                                                |
| ---------------- | ---------------------------------------------------------------- | -------------------------------------------------- |
| `--font-sans`    | `"Inter Variable", "Inter", system-ui, sans-serif`               | UI, headings, body.                                |
| `--font-mono`    | `"JetBrains Mono Variable", "JetBrains Mono", monospace`         | **All numeric data.**                              |
| `--font-display` | same as sans, used at heavier weights                            | (Reserved — currently aliased to sans.)            |
| `--font-serif`   | `"Source Serif 4 Variable", "Source Serif Pro", "Charter", "Georgia", serif` | **Editorial / research-note** headlines, dek, body. |

**Rule:** every numeric value rendered in the product is set in `--font-mono`
with `font-variant-numeric: tabular-nums slashed-zero`. No exceptions.

**Rule:** serif typography appears only inside `.editorial-*` / `.research-note`
containers and inside the briefing-detail reading column. It never appears in
tables, headers, or sidebars.

### 2.2 UI scale (sans / mono)

| Token            | Size / Line     | Weight | Tracking | Use                              |
| ---------------- | --------------- | ------ | -------- | -------------------------------- |
| `--text-display` | 32 / 40 px      | 600    | -0.02em  | Desk hero (rare)                 |
| `--text-h1`      | 24 / 32 px      | 600    | -0.015em | Page heading                     |
| `--text-h2`      | 20 / 28 px      | 600    | -0.01em  | Section heading                  |
| `--text-h3`      | 16 / 22 px      | 600    | -0.005em | Panel sub-section                |
| `--text-h4`      | 14 / 20 px      | 600    | 0        | Panel title                      |
| `--text-body`    | 13 / 20 px      | 400    | 0        | Default body                     |
| `--text-body-sm` | 12 / 18 px      | 400    | 0        | Compact body                     |
| `--text-caption` | 11 / 16 px      | 400    | 0.01em   | Captions, timestamps             |
| `--text-eyebrow` | 10 / 14 px      | 600    | 0.10em   | **UPPERCASE** section labels     |
| `--text-data-lg` | mono 14 / 20 px | 500    | 0        | Large numeric (P&L headline)     |
| `--text-data`    | mono 12 / 18 px | 500    | 0        | Default numeric                  |
| `--text-data-sm` | mono 11 / 16 px | 500    | 0        | Compact numeric                  |

### 2.3 Editorial scale (serif)

Used inside the briefing detail and any research-note panel.

| Token                   | Size / Line | Weight | Tracking | Use                          |
| ----------------------- | ----------- | ------ | -------- | ---------------------------- |
| `--text-edit-display`   | 40 / 48 px  | 600    | -0.018em | Briefing headline            |
| `--text-edit-h1`        | 30 / 38 px  | 600    | -0.012em | Editorial H1                 |
| `--text-edit-h2`        | 22 / 30 px  | 600    | -0.005em | Editorial section heading    |
| `--text-edit-dek`       | 17 / 26 px  | 400    | -0.003em | Italic dek beneath headline  |
| `--text-edit-body`      | 15 / 24 px  | 400    | 0        | Editorial body copy          |
| `--text-edit-quote`     | 18 / 28 px  | 500    | -0.005em | Pull quote                   |

### 2.4 Eyebrow labels — the Bloomberg signature

Every panel header has a small uppercase eyebrow label above the title. This
is the single most distinctive typographic element of the system.

```
FX · MAJORS                       ← eyebrow (10 px, 600, 0.10em, uppercase)
G10 Spot                          ← title   (14 px, 600, --text-primary)
EUR/USD  1.0842  ▲ +0.21%         ← data    (mono, --text-data, --bid)
```

### 2.5 The masthead rule

A horizontal 2 px rule that opens the editorial / research-note containers.
The first 64 px is `--makor-500`, the rest is `--border-strong`. This is the
single use of gradient in the system, and it is functional — it signals
"this is desk-issued content."

---

## 3. Information Hierarchy

Hierarchy is communicated in this order:

1. **Container** — research panels (`.panel-research`) read as editorial
   content; standard panels (`.panel`) read as data widgets.
2. **Typography** — serif headlines dominate; sans headings sit lower; mono
   numerics anchor each row.
3. **Color emphasis** — primary text (`#E8EEF7`) for the lede; secondary
   (`#A4B0C3`) for support; tertiary (`#74819A`) for metadata. Accent only on
   what the user must act on.
4. **Spatial weight** — premium spacing variants (`panel-body-prem`,
   `panel-body-edit`) give the most important panels more breathing room.
5. **Left-bar accent** — `.panel-highlight` (2 px Makor 400) marks one panel
   per page as the focus.

**Rule of one focus per page:** at most one panel carries `.panel-highlight`
plus the editorial typography. Everything else recedes.

---

## 4. Layout & Grid

### 4.1 Page architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│  COMMAND BAR (56 px)                                                       │
│  [breadcrumb · context]      [ ⌕  search  ⌘K ]      [regime · clock · ⏷ ]  │
├────────┬───────────────────────────────────────────────────────────────────┤
│        │  WORKSPACE (12-column grid, 16 px gap, 20 px gutter)              │
│ SIDE   │                                                                   │
│ BAR    │   ┌────────────────────────────┬──────────────────────────────┐   │
│ 248 px │   │ Hero panel (col-8)         │ Regime/Snapshot (col-4)      │   │
│        │   ├────────────────────────────┴──────────────────────────────┤   │
│        │   │ Performance / Exposure (col-12)                           │   │
│        │   ├──────────────────────┬────────────────────────────────────┤   │
│        │   │ FX (col-7)           │ Rates (col-5)                      │   │
│        │   ├──────────────────────┴────────────────────────────────────┤   │
│        │   │ Calendar (col-5) · Themes (col-4) · Vol (col-4) · …       │   │
│        │   └───────────────────────────────────────────────────────────┘   │
├────────┴───────────────────────────────────────────────────────────────────┤
│  STATUS TICKER (28 px) — live ticker, session clock                        │
└────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Layout tokens

| Token                          | Value   | Used for                          |
| ------------------------------ | ------- | --------------------------------- |
| `--layout-sidebar-w`           | 248 px  | Sidebar (was 240 in v0.1)         |
| `--layout-sidebar-w-compact`   | 208 px  | Sidebar < 1440 px viewports       |
| `--layout-header-h`            | 56 px   | Command bar (was 48 in v0.1)      |
| `--layout-status-h`            | 28 px   | Status ticker                     |
| `--layout-min-width`           | 1280 px | Min app width                     |
| `--layout-grid-bp-wide`        | 1600 px | Threshold for full premium gutters|
| `--layout-panel-gap`           | 16 px   | Panel-to-panel gap (was 12)       |
| `--layout-page-gutter`         | 20 px   | Workspace padding (was 16)        |
| `--layout-research-max-w`      | 760 px  | Editorial reading column          |

### 4.3 Column conventions

- Hero rows: **col-8 / col-4** (editorial headline + macro snapshot).
- Data rows: **col-7 / col-5** or **col-6 / col-6** for balanced tables.
- Triplet rows: **col-4 / col-4 / col-4**.
- Full-bleed: **col-12** for metric strips and editorial reading columns
  that anchor the page.

---

## 5. Sidebar — sophisticated, sticky

```
┌────────────────────────────────┐
│  ▌ MAKOR                       │
│    Intelligence · FX           │   ← brand row (crest + name + sub)
│                                │
│  Desk      Macro & FX          │   ← session block (mono key/value)
│  Session   LDN · 08:42 BST     │
│  Regime    Risk-On · stable    │
├────────────────────────────────┤
│  DESK                          │   ← group label (eyebrow)
│  ─ Morning Briefing       11   │   ← active item with left bar + badge
│  ─ Live Markets            ●   │   ← live-dot badge
│  ─ Economic Calendar       3   │   ← alert badge (orange ring)
│                                │
│  ANALYTICS                     │   ← group hairline above
│  ─ FX Regime                   │
│  ─ Volatility Surface          │
│  ─ Macro Themes                │
│  …                             │
├────────────────────────────────┤
│  ● LIVE FEED        08:42:11   │   ← footer (status + clock)
│  A. Benitah · Strategy    ⌘    │
└────────────────────────────────┘
```

**Anatomy**

- Width: `248px` desktop, `208px` ≥1280 / <1440.
- Background: `--surface-raised`. Right border: 1 px `--border-default`.
- Brand block: padding 16/20 px, crest mark `4 × 28` Makor 400 with 1 px
  Makor 700 shadow.
- **Session block** (new in v0.2): two-column key/value grid showing desk,
  session, regime — mono values, sticky context.
- Group label: 10 px uppercase, padded 12 / 8 / 4. Groups are separated by a
  hairline (`--border-subtle`) — a more sophisticated rhythm than v0.1's
  pure-padding separation.
- Item: 32 px row, 20 px horizontal padding, 8 px gap. The active item has a
  **2 px Makor 400 vertical bar** flush left + `--surface-active` background.
- Item badge: count or live-dot, mono 10 px, soft border. Active-item badges
  switch to Makor 950 background with Makor 200 text.
- Footer: status row + identity row, both mono caption.

---

## 6. Command Bar — top strip

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Desk / Morning Briefing │ ⌕ Search briefings, tickers… ⌘K │ Risk-On 4.2σ ⤢ ⊞ │
└─────────────────────────────────────────────────────────────────────────────┘
```

Three columns (`1fr / 280–480 / 1fr`):

1. **Left** — breadcrumb + status pills for current artifact.
2. **Center** — prominent ⌘K search (34 px tall, ⌘K hint chip on the right).
3. **Right** — `.regime-widget` (live regime + sparkline) · primary actions.

**Specs**

- Height: 56 px, `--surface-raised`, 1 px bottom border.
- Sticky to top (`z-header`).
- The regime widget always shows current regime, its strength (σ deviation
  from neutral), and a 1-week sparkline. It is the "is the market in trouble?"
  glance affordance.

---

## 7. Panels — terminal & research

Two variants:

### 7.1 Terminal panel (default `.panel`)

- 44 px header, 16 px body padding.
- Hairline border `--border-default`.
- Used for: tables, metric tiles, watchlists.

### 7.2 Premium panel (`.panel` + `.panel-body-prem`)

- 20 px body padding, optional `.panel-header-prem` for 52 px header.
- Used for: regime widgets, theme watchlists, summary panels.

### 7.3 Research panel (`.panel-research` + `.panel-body-edit`)

- Background `--surface-research` (slightly warmer navy).
- 28 px body padding.
- Combined with `.panel-highlight` (2 px Makor 400 left bar).
- Used for: editorial hero on dashboard, briefing detail reading column.

**Section divider:** `.section + .section { border-top: 1px solid var(--border-subtle); padding-top: 24px; }` — sections inside a research panel are separated by a hairline, never by a heavy rule.

---

## 8. Tables — Reuters / Bloomberg

Tables are **the** primary UI. They are typeset, not decorated.

| Aspect              | Spec                                                                 |
| ------------------- | -------------------------------------------------------------------- |
| Header              | 32 px, `--surface-raised`, eyebrow type, 1 px `--border-strong` btm. |
| Body row (default)  | 30 px. Compact variant 26 px. Roomy variant 36 px (rare).            |
| Cell padding        | 12 px horizontal (default), 8 px (compact), 16 px (roomy).           |
| Numeric cells       | Right-aligned, `--font-mono`, `tabular-nums slashed-zero`.           |
| Hover               | `--surface-hover`. No transform.                                     |
| Selected row        | `--surface-active` + 2 px Makor 400 inset left bar.                  |
| Separators          | 1 px `--border-subtle` rows; 1 px `--border-strong` under header.    |
| Zebra               | **Off** by default. Enable only via `.data-table-zebra`.             |
| Heatmap tints       | `.cell-heat-positive` / `-negative` / `-warn` — soft, navy-tinted.   |
| Direction glyphs    | `▲ ▼ ▬` (Unicode, baseline-aligned with mono).                       |
| Sparklines          | Inline `.sparkline` SVG, 1.25 px stroke, single color, no fill.      |

**Numeric column header pattern:** label uppercase eyebrow + abbreviation
(e.g. `Δ`, `Δ%`, `Yield`, `Δ bp`). Never sentence-case ("Change percent").

---

## 9. Charts — Reuters/FT styling

Charts must read as data instruments, not infographics.

| Element            | Style                                                                  |
| ------------------ | ---------------------------------------------------------------------- |
| Background         | Transparent.                                                           |
| Plot border        | None.                                                                  |
| Axes               | 1 px `--border-strong`. Ticks 1 px, 4 px long.                         |
| Gridlines          | 1 px `--border-subtle`, **dashed** `stroke-dasharray: 2 4`.            |
| Axis labels        | 10 px mono, `--text-tertiary`, tabular.                                |
| Primary series     | 1.5 px stroke, `--makor-400`. No area fill by default.                 |
| Multi-series       | **Monochrome** along the Makor scale + `--text-secondary`. Never rainbow. |
| Sparkline          | 1.25 px stroke, single color, no fill, no caps.                        |
| Positive line      | `--bid`. Negative: `--offer`. Sparingly.                               |
| Area fill          | Optional, opacity 0.08, same color as line.                            |
| Crosshair          | 1 px dashed `--text-tertiary`.                                         |
| Tooltip            | `.panel-overlay` — `--surface-overlay`, 1 px `--border-strong`.        |
| Animation          | None on load. Pan/zoom instant.                                        |

Forbidden: drop shadows under lines, gradient fills under area charts,
rounded line caps, default chart-library color palettes. Pass `chartPalette`
explicitly from `design-tokens.ts`.

---

## 10. Spacing System

Strict **4 px micro-grid** (data) × **8 px macro-grid** (layout).

| Token         | px  | Use                                            |
| ------------- | --- | ---------------------------------------------- |
| `--space-0`   | 0   |                                                |
| `--space-px`  | 1   | Hairline borders.                              |
| `--space-1`   | 4   | Tight icon-text gap.                           |
| `--space-1-5` | 6   | TOC items, fine adjustments.                   |
| `--space-2`   | 8   | Default tight gap.                             |
| `--space-3`   | 12  | Cell padding, default item gap.                |
| `--space-4`   | 16  | Default panel body padding.                    |
| `--space-5`   | 20  | Page gutter, premium panel padding.            |
| `--space-6`   | 24  | Section gap inside research panel.             |
| `--space-7`   | 28  | Editorial panel padding.                       |
| `--space-8`   | 32  | Major section gap.                             |
| `--space-12`  | 48  | Major editorial gap.                           |
| `--space-16`  | 64  | Hero spacing only.                             |

**Premium spacing tokens:**

| Token                          | px  | Use                                         |
| ------------------------------ | --- | ------------------------------------------- |
| `--space-panel-pad`            | 16  | Default panel body                          |
| `--space-panel-pad-prem`       | 20  | Premium panel body                          |
| `--space-panel-pad-edit`       | 28  | Editorial / research panel body             |
| `--space-panel-header-h`       | 44  | Default panel header                        |
| `--space-panel-header-h-prem`  | 52  | Premium panel header                        |

---

## 11. Hover / Interaction Behavior

Stoic. Interactions are state changes, not animations.

| Surface              | Hover                                            | Active / Pressed                    |
| -------------------- | ------------------------------------------------ | ----------------------------------- |
| Table row            | `--surface-hover`                                | `--surface-active` + 2 px Makor bar |
| Sidebar item         | `--surface-hover`                                | `--surface-active` + left bar       |
| Button (primary)     | `--makor-400`                                    | `--makor-600`                       |
| Button (ghost)       | `--surface-hover`                                | `--surface-active`                  |
| Icon button          | text `secondary → primary`                       | `primary`                           |
| Link                 | `--makor-200` underline 1 px                     | `--makor-400`                       |
| Input                | `--border-strong`                                | 2 px ring `--border-focus`          |
| Segmented item       | text `secondary → primary`                       | `--surface-raised` + 1 px border    |

**Transitions:** the only acceptable transitions are
`background-color 80ms linear`, `border-color 80ms linear`, and
`color 80ms linear`. The command bar may use a soft `out` curve once on
mount (`--easing-out`) for a single 160 ms reveal — nowhere else.

**Live data tick:** numeric cells flash `--bid-soft` / `--offer-soft` for
400 ms on update, then revert. This is the only ambient animation.

**Focus ring:** 2 px `--border-focus` outline, 0 offset, always on keyboard.

---

## 12. Wireframes

### 12.1 Dashboard ([preview.html](preview.html))

```
┌─ COMMAND BAR ──────────────────────────────────────────────────────────────┐
│ Desk / Morning Briefing · [pills]      ⌕ Search ⌘K          Regime · Pub ⌘P │
├────────────────────────────────────────────────────────────────────────────┤
│ ┌─ § Editorial hero (col-8) ─────────────┐ ┌─ Regime/Snapshot (col-4) ───┐ │
│ │ MORNING FX & MACRO · 11 MAY 2026       │ │ REGIME · TODAY              │ │
│ │ (serif display headline, 40/48)        │ │ Macro Snapshot              │ │
│ │ italic dek (serif, 17/26)              │ │ ▢▢▢▢▢ key/value rows         │ │
│ │ byline · time · live                   │ │                             │ │
│ │ section links →                        │ │                             │ │
│ └────────────────────────────────────────┘ └─────────────────────────────┘ │
│ ┌─ Performance / Exposure (col-12) ────────────────────────────────────┐   │
│ │ [Metric tile] [Metric tile] [Metric tile] [Metric tile] [Metric tile]│   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│ ┌─ FX Majors (col-7) ───────────────────┐ ┌─ Rates 10Y (col-5) ────────┐   │
│ │ Pair Last Δ Δ% Range 1W-Spark         │ │ Sovereign Yield Δbp Trend  │   │
│ │ EUR/USD 1.0842 +0.21% ─/\__/¯         │ │ US 10Y 4.182 −4.2 ─/\__   │   │
│ └───────────────────────────────────────┘ └────────────────────────────┘   │
│ ┌─ Calendar (col-5) ─────┐ ┌─ Themes (col-4) ──┐ ┌─ Vol/Meta (col-4) ──┐   │
│ │ 08:00 DE ZEW           │ │ Fed reaction ▲    │ │ EUR/USD 6.42 …       │   │
│ │ 12:30 US CPI (High)    │ │ China growth ▼    │ │ GBP/USD 7.18 …       │   │
│ └────────────────────────┘ └───────────────────┘ └─────────────────────┘   │
├────────────────────────────────────────────────────────────────────────────┤
│ ● LIVE  SPX +0.18%  NDX +0.32%  BRENT +0.42%  UST 10Y −4.2 bp  …  08:42:11 │
└────────────────────────────────────────────────────────────────────────────┘
```

### 12.2 Archive ([wireframes/archive.html](wireframes/archive.html))

```
┌─ COMMAND BAR ──────────────────────────────────────────────────────────────┐
│ Research / Briefing Archive   312 records   ⌕ Search   Export · CSV · PDF  │
├────────────────────────────────────────────────────────────────────────────┤
│ ┌─ Filter bar (col-12) ────────────────────────────────────────────────┐   │
│ │ FILTERS │ Date [▢] │ Type [All Morning Midday …] │ Status │ Regime …│   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│ ┌─ Archive table (col-9) ──────────────┐ ┌─ Facets rail (col-3) ────┐     │
│ │ Date · Headline · Type · Risk · Sta… │ │ REGIME MIX               │     │
│ │ 2026-05-11  Dollar firm…  Morning  …│ │ ▮▮▮▮▮ Risk-On 48          │     │
│ │ 2026-05-10  Risk wobble…  Weekly   …│ │ ▮▮▮  Risk-Off 22          │     │
│ │ …                                    │ │ TOP THEMES                │     │
│ │ ‹ 1 2 3 … 24 ›                       │ │ Fed reaction (38)         │     │
│ └──────────────────────────────────────┘ │ CADENCE 5.0/wk            │     │
│                                          └──────────────────────────┘     │
├────────────────────────────────────────────────────────────────────────────┤
│ STATUS TICKER                                                              │
└────────────────────────────────────────────────────────────────────────────┘
```

### 12.3 Briefing Detail ([wireframes/briefing-detail.html](wireframes/briefing-detail.html))

```
┌─ COMMAND BAR ──────────────────────────────────────────────────────────────┐
│ Desk / Morning Briefing / 11 May 2026   ← Prev  Next →   Print  Email  ⌘P │
├────────────────────────────────────────────────────────────────────────────┤
│ ┌─ Research reading column (col-8) ───────┐ ┌─ Right rail (col-4) ───────┐ │
│ │ ─── MASTHEAD RULE ───                   │ │ IN THIS BRIEFING (sticky)  │ │
│ │ MORNING FX & MACRO · DAILY BRIEFING     │ │ § 01 Executive Summary     │ │
│ │                                          │ │ § 02 FX · G10 & Crosses    │ │
│ │ Headline in serif display (40/48)        │ │ § 03 Rates                 │ │
│ │ Italic dek in serif (17/26)              │ │ § 04 Equities              │ │
│ │ By A. Benitah · 06:30 GMT · 4 min        │ │ § 05 Commodities           │ │
│ │ ━━━━━━━━━━━━━━━━━━━━                    │ │ § 06 Key Events            │ │
│ │ § 01  Executive Summary  ─────           │ │ § 07 Watchlist             │ │
│ │  (serif body with drop cap)              │ │                            │ │
│ │  (second paragraph…)                     │ │ MARKET SNAPSHOT             │ │
│ │ § 02  FX · G10 & Crosses  ────           │ │ DXY 104.81 ▲ +0.18%        │ │
│ │  (serif body w/ inline bold pairs)       │ │ UST 10Y 4.182 ▼ −4.2 bp    │ │
│ │  [embedded data table — FX snapshot]     │ │ …                          │ │
│ │ ┃ pull-stat ┃  +0.18% DXY overnight…     │ │                            │ │
│ │ § 03 Rates ─── (serif body)              │ │ PREVIOUS BRIEFINGS         │ │
│ │ § 04 Equities ─── (serif body)           │ │ • 2026-05-10 Risk-Off …    │ │
│ │ § 05 Commodities ─── (serif body)        │ │ • 2026-05-09 Risk-On  …    │ │
│ │ § 06 Calendar  ── (embedded table)       │ │ …                          │ │
│ │ § 07 Watchlist ── (ticker chips)         │ │ Open archive →             │ │
│ │ footer metadata · ID · generator         │ │                            │ │
│ └──────────────────────────────────────────┘ └────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────┤
│ STATUS TICKER                                                              │
└────────────────────────────────────────────────────────────────────────────┘
```

**Reading-column rules:**

- Max width `--layout-research-max-w` (760 px) for body copy.
- Editorial body has a first-paragraph drop cap (`.first-graf::first-letter`).
- Section headers use **§ 0n** marker eyebrows (Makor 300) + sans heading + 1 px rule.
- Pull stats (`.pull-stat`) for the single most quotable number per section.
- Embedded data tables use `.data-table-compact` and sit flush against the
  body type — no panel chrome inside the reading column.

---

## 13. Component Reference

### 13.1 Newly added in v0.2

| Class                          | Purpose                                              |
| ------------------------------ | ---------------------------------------------------- |
| `.command-bar`                 | Top strip — 3-column grid (left / center / right).   |
| `.command-search`              | Prominent ⌘K search with hint chips.                 |
| `.crumb` / `.breadcrumb`       | Breadcrumb trail.                                    |
| `.regime-widget`               | Live regime indicator with sparkline.                |
| `.metric-tile`                 | Hero metric block with label / value / delta.        |
| `.sparkline`                   | Inline 1.25 px SVG line.                             |
| `.masthead-rule`               | Editorial masthead rule.                             |
| `.editorial-display` / `-h1` / `-h2` / `-dek` / `-body` / `-quote` | FT-style serif scale. |
| `.editorial-meta`              | Byline · dateline · status row.                      |
| `.panel-research`              | Research-panel surface (warmer navy).                |
| `.panel-body-prem` / `-edit`   | Premium / editorial padding variants.                |
| `.panel-header-prem`           | Premium header height (52 px).                       |
| `.sidebar-session`             | Sidebar key/value session block.                     |
| `.sidebar-item-badge`          | Count badge on sidebar item.                         |
| `.filter-bar`                  | Filter bar container.                                |
| `.segmented` / `.segmented-item` | Segmented control.                                  |
| `.toc` / `.toc-item`           | Briefing-detail sticky jump nav.                     |
| `.pull-stat`                   | Editorial pull-stat callout.                         |
| `.input-with-affix`            | Input with leading/trailing chip.                    |

### 13.2 Carried from v0.1

`.panel`, `.panel-header`, `.panel-body`, `.panel-footer`, `.panel-highlight`,
`.panel-inset`, `.panel-flush`, `.data-table` (+ `-compact` / `-roomy` / `-zebra`),
`.eyebrow`, `.heading-{1,2,3,4}`, `.body`, `.body-sm`, `.caption`,
`.data` / `.data-lg` / `.data-sm` (+ `-pos` / `-neg` / `-neu` / `-warn`),
`.ticker-chip` (+ `-pos` / `-neg` / `-neu`),
`.status-pill` (+ `-published` / `-draft` / `-archived` / `-failed` / `-alert`),
risk pills (`.risk-on` / `-off` / `-mixed` / `-neutral`),
`.live-dot`, `.kbd`,
`.btn` (+ `-primary` / `-ghost` / `-danger` / `-sm` / `-lg` / `-icon`),
`.input`, `.input-mono`,
`.sidebar`, `.sidebar-brand`, `.sidebar-scroll`, `.sidebar-group`,
`.sidebar-group-label`, `.sidebar-item`, `.sidebar-footer`,
`.status-ticker`, `.divider-h`, `.divider-v`,
`.workspace`, `.col-span-{3,4,5,6,7,8,9,12}`,
tick animations (`.tick-up` / `.tick-dn`).

---

## 14. Responsive Behavior

The platform is **terminal-first** — desktop only. Mobile and tablet are out of
scope for the desk product.

| Viewport             | Behavior                                                   |
| -------------------- | ---------------------------------------------------------- |
| ≥ 1600 px            | Premium grid: 248 px sidebar, 16 px gap, 20 px gutter.     |
| 1440 – 1599 px       | Standard: 248 px sidebar, 12 px gap, 16 px gutter.         |
| 1280 – 1439 px       | Compact: 208 px sidebar, 12 px gap, 16 px gutter, command bar center shrinks. |
| < 1280 px            | Horizontal scroll. The app is not laid out for mobile.     |

**Rules**

- Panel column spans never change responsively — they cascade by giving up the
  premium gutter first, then the sidebar width, never the column structure.
- Tables are horizontally scrollable inside their panel below 1440 px.
- The editorial reading column always sits at `--layout-research-max-w` (760 px);
  if the surrounding panel narrows, the column does not — it lets right-side
  whitespace absorb the change.
- Mobile is **not** an A-list use case. A future mobile companion view would be
  a *separate product surface*, not a responsive collapse of the terminal.

---

## 15. Component Design Principles

1. **Density over decoration.** If you can fit more data without losing
   scannability, do.
2. **Mono for every number.** Every price, P&L, time, percentage, bp. No exceptions.
3. **Eyebrow + title is the panel signature.** Never write a section without
   the small uppercase eyebrow above it.
4. **Serif for the editorial layer only.** Briefing detail, research panels,
   pull quotes. Never in tables, headers, or sidebars.
5. **Borders, not shadows.** Elevation is communicated by surface color steps,
   not shadows. Shadows are only used on overlays.
6. **The accent is rare.** Makor blue is for active state, focus ring, primary
   action, key data lines. Most of the UI is greyscale navy.
7. **One focus panel per page.** `.panel-highlight` plus editorial typography
   on exactly one panel. Everything else recedes.
8. **Status is encoded twice.** Color + glyph (`▲ ▼ ▬`) so the system is
   colorblind-safe and prints legibly.
9. **No marketing copy in the product.** Section labels are nouns
   (`POSITIONS`, `RISK`, `CALENDAR`).
10. **Keyboard first.** Every primary action has a shortcut, rendered with `.kbd`.
11. **The 4 px / 8 px grid is law.** No half-pixels, no 14 px gaps.
12. **One radius scale.** 0, 1, 2, 3, 4. That's it.
13. **Premium spacing is for chrome, not data.** Tables stay tight; the chrome
    around them breathes.
