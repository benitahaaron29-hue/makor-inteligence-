"""Mock briefing generation pipeline — Phase 1, institutional-grade.

This module produces a deeply structured Morning FX & Macro briefing using
deterministic seeded content. The voice and structure are modelled on
Bloomberg morning notes / Goldman FX desk runs / institutional macro
strategy publications. Real AI synthesis lands in Phase 2; the interface
(`generate`) is identical so the swap is mechanical.

The generator now emits both the legacy free-text commentary fields and a
rich `intelligence` payload (StrategistView, KeyTakeaways, TradeIdeas with
levels/stops/catalysts, CentralBankWatch, PairCommentary, Positioning,
SessionBreakdown, CrossAssetLinks, PullStats, RiskWarnings, ConsensusCalls,
Provenance). See `app.schemas.intelligence`.
"""

from __future__ import annotations

import random
from datetime import date, datetime, timedelta, timezone
from typing import Any

from app.core.config import settings
from app.core.enums import (
    BriefingStatus,
    BriefingType,
    GenerationSource,
    RiskTone,
)
from app.schemas.briefing import (
    BriefingCreate,
    KeyEvent,
    MarketSnapshot,
)
from app.schemas.intelligence import (
    CentralBankItem,
    ConsensusCall,
    CrossAssetLink,
    DeskPriority,
    GeopoliticalPulse,
    GeopoliticalRegion,
    Intelligence,
    KeyTakeaway,
    MacroOverview,
    PairCommentary,
    PairLevel,
    PositioningNote,
    ProvenanceEntry,
    PullStat,
    RiskScenario,
    RiskWarning,
    SessionBreakdown,
    StrategistView,
    TradeIdea,
    WhatChanged,
)


# ============================================================ CONSTANTS

_RISK_TONES: list[RiskTone] = [
    RiskTone.RISK_ON,
    RiskTone.RISK_OFF,
    RiskTone.NEUTRAL,
    RiskTone.MIXED,
]

_RISK_THEMES_POOL: list[str] = [
    "Fed reaction function",
    "ECB terminal rate path",
    "BoJ policy normalisation",
    "China growth pulse",
    "USD funding stress",
    "Oil supply risk premium",
    "US fiscal trajectory",
    "Eurozone PMIs",
    "EM carry conditions",
    "Front-end real yields",
]

_FX_PAIRS = ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD"]
_RATES = ["UST_2Y", "UST_10Y", "BUND_10Y", "GILT_10Y", "JGB_10Y"]
_EQUITIES = ["SPX", "NDX", "SX5E", "FTSE", "NKY"]
_COMMODITIES = ["BRENT", "WTI", "GOLD", "COPPER"]


# Base levels around which the seeded jitter wobbles. Keeps levels realistic
# across regenerations of the same date.
_PAIR_BASE_SPOT: dict[str, float] = {
    "EURUSD": 1.0842, "GBPUSD": 1.2734, "USDJPY": 154.21,
    "USDCHF": 0.9047, "AUDUSD": 0.6614, "USDCAD": 1.3692,
}

_PAIR_ATM_BASE: dict[str, float] = {
    "EURUSD": 6.42, "GBPUSD": 7.18, "USDJPY": 8.94,
    "USDCHF": 6.80, "AUDUSD": 9.21, "USDCAD": 5.94,
}

_PAIR_RR_BASE: dict[str, float] = {
    "EURUSD": -0.18, "GBPUSD": -0.42, "USDJPY": 0.62,
    "USDCHF": -0.10, "AUDUSD": -0.31, "USDCAD": 0.08,
}


# ============================================================ COMMENTARY POOLS


def _mock_market_snapshot(rng: random.Random) -> MarketSnapshot:
    return MarketSnapshot(
        fx={
            sym: round(_PAIR_BASE_SPOT[sym] * (1 + rng.uniform(-0.004, 0.004)), 4)
            for sym in _FX_PAIRS
        },
        rates={r: round(rng.uniform(0.5, 5.5), 3) for r in _RATES},
        equities={e: round(rng.uniform(7000, 21000), 2) for e in _EQUITIES},
        commodities={c: round(rng.uniform(60, 2400), 2) for c in _COMMODITIES},
        as_of=datetime.now(timezone.utc),
    )


def _mock_key_events(target_date: date) -> list[KeyEvent]:
    return [
        KeyEvent(
            time_utc="08:00", region="DE", event="ZEW Economic Sentiment",
            importance="medium", forecast="12.5", previous="10.7",
            category="survey", sensitivity="medium",
            pairs_affected=["EUR/USD", "EUR/GBP"],
            vol_impact="15–25 pip range in EUR crosses",
            desk_focus="EUR crosses sensitive to upside surprise",
        ),
        KeyEvent(
            time_utc="09:30", region="UK", event="PM Starmer · Mansion House preview address",
            importance="high", forecast=None, previous=None,
            speaker="Keir Starmer (Prime Minister)",
            topic="Fiscal trajectory · public-debt rule · post-Brexit trade",
            category="political", sensitivity="desk_critical",
            pairs_affected=["GBP/USD", "EUR/GBP", "Gilt 10Y"],
            vol_impact="20–40 pip move in GBP crosses on fiscal-rule changes",
            desk_focus="Watch fiscal-rule language — any softening sells the front-end Gilt curve",
        ),
        KeyEvent(
            time_utc="10:00", region="EZ", event="Industrial Production YoY",
            importance="medium", forecast="+1.2%", previous="+0.6%",
            category="growth", sensitivity="low",
            pairs_affected=["EUR/USD"],
            vol_impact="<10 pip impact unless tail surprise",
            desk_focus="Germany IP the swing component; watch the country breakdown",
        ),
        KeyEvent(
            time_utc="10:30", region="EZ", event="ECB Lagarde · Q&A panel · Brussels Economic Forum",
            importance="high", forecast=None, previous=None,
            speaker="Christine Lagarde (ECB President)",
            topic="Services inflation persistence · gradual cut path · neutral rate framework",
            category="monetary", sensitivity="desk_critical",
            pairs_affected=["EUR/USD", "EUR/GBP", "Bund 10Y"],
            vol_impact="30–50 pip swings in EUR pairs on tone divergence",
            desk_focus="Q&A more market-moving than the prepared remarks — listen for services-pricing signal",
        ),
        KeyEvent(
            time_utc="12:30", region="US", event="CPI YoY",
            importance="high", forecast="3.1%", previous="3.2%",
            category="inflation", sensitivity="desk_critical",
            pairs_affected=["EUR/USD", "USD/JPY", "DXY", "GBP/USD"],
            vol_impact="60–80 pip move in EUR/USD · 1–1.5 figure in USDJPY",
            desk_focus="High focus across DXY, front-end rates and USDJPY",
        ),
        KeyEvent(
            time_utc="12:30", region="US", event="CPI Core MoM",
            importance="high", forecast="+0.3%", previous="+0.4%",
            category="inflation", sensitivity="desk_critical",
            pairs_affected=["EUR/USD", "USD/JPY", "UST 2Y"],
            vol_impact="Bonds: 6–8bp at the front end on a surprise",
            desk_focus="Front-end rates most reactive to core MoM",
        ),
        KeyEvent(
            time_utc="13:30", region="US", event="Treasury Sec Yellen · Bretton Woods panel",
            importance="high", forecast=None, previous=None,
            speaker="Janet Yellen (US Treasury Secretary)",
            topic="Global trade policy · sanctions architecture · IMF capital review",
            category="policy", sensitivity="high",
            pairs_affected=["DXY", "USD/CNH", "EUR/USD"],
            vol_impact="Tail risk on dollar-system / sanctions remarks",
            desk_focus="Watch for explicit Russia / China sanctions framing — moves CNH first",
        ),
        KeyEvent(
            time_utc="14:00", region="US", event="Fed speakers · Williams, Logan",
            importance="medium", forecast=None, previous=None,
            speaker="J. Williams (NY Fed) · L. Logan (Dallas Fed)",
            topic="Post-CPI reaction function · balance-sheet runoff pace",
            category="monetary", sensitivity="high",
            pairs_affected=["DXY", "USD/JPY"],
            vol_impact="20–40 pip drift on tone divergence between the two",
            desk_focus="Williams sets framing; Logan the hawkish counterweight",
        ),
        KeyEvent(
            time_utc="15:30", region="G7", event="G7 trade communiqué · post-summit release",
            importance="high", forecast=None, previous=None,
            speaker=None,
            topic="Tariff regime · supply-chain resilience · semis export controls",
            category="geopolitical", sensitivity="high",
            pairs_affected=["USD/CNH", "AUD/USD", "Semis basket"],
            vol_impact="Headline-driven · 0.3–0.6% in CNH on tariff escalation language",
            desk_focus="Read-through to USD/CNH and Asia FX; semis the cleanest equity expression",
        ),
        KeyEvent(
            time_utc="17:00", region="US", event="3Y Note Auction · $58bn",
            importance="low", forecast="bid-to-cover 2.55x", previous="2.51x",
            category="auction", sensitivity="medium",
            pairs_affected=["UST 2Y", "UST 5Y"],
            vol_impact="Tail > 1.5bp re-prices the curve 3–5bp",
            desk_focus="Auction tail the cleanest positioning gauge",
        ),
        KeyEvent(
            time_utc="23:50", region="JP", event="Machinery Orders MoM",
            importance="low", forecast="+0.8%", previous="−1.5%",
            category="growth", sensitivity="low",
            pairs_affected=["USD/JPY"],
            vol_impact="<15 pip — second-tier domestic data",
            desk_focus="BoJ-watch only if back-to-back negatives",
        ),
    ]


def _tone_phrase(tone: RiskTone) -> str:
    return {
        RiskTone.RISK_ON: "a softer dollar on disinflation confirmation",
        RiskTone.RISK_OFF: "a defensive bid as growth concerns re-emerge",
        RiskTone.MIXED: "tactical neutrality with embedded long-vol hedges",
        RiskTone.NEUTRAL: "patience ahead of the key catalysts",
    }[tone]


def _risk_skew_phrase(tone: RiskTone) -> str:
    return {
        RiskTone.RISK_ON: "skewed to the upside on a benign print",
        RiskTone.RISK_OFF: "tilted defensively pending data confirmation",
        RiskTone.MIXED: "two-way pending the print",
        RiskTone.NEUTRAL: "balanced into the catalysts",
    }[tone]


def _mock_executive_summary(target_date: date, tone: RiskTone) -> str:
    return (
        "CPI is the binary. Everything else is conditioning.\n\n"
        "Dollar bid against the funders into the print, front-end USTs richer, "
        "real-money receiving the belly. Risk vols offered, positioning thinned. Three "
        "weeks of grind narrowed the range; today either confirms the disinflation "
        "path or breaks it.\n\n"
        "Base case: 3.1% headline / +0.3% core. Soft enough to extend the narrative "
        "without forcing the front-end to add cuts. Fade USD strength on confirmation; "
        "watch credit and front-end vol for first sign of stress.\n\n"
        "Positioning is moderately USD-long via levered accounts — real-money receiving "
        "the 5y belly. Path of least resistance: lower DXY on a soft print."
    )


def _mock_fx_commentary() -> str:
    return (
        "EUR/USD held a 30-pip range overnight; levered accounts pared shorts. Pivot "
        "1.0840. Clean break of 1.0890 (21d MA + congestion) opens 1.0950; loss of "
        "1.0820 accelerates to 1.0750 where real-money steps in.\n\n"
        "GBP/USD pinned by sticky services CPI and an unconvincing BoE pivot — 1.2790 "
        "rejected three times in a fortnight. Front-end Gilts price a shallower easing "
        "path than peers; Cable rate-supported on dips.\n\n"
        "USDJPY soft as the front-end UST richens. 152.50 the binding cap — intervention "
        "asymmetry biases the unwind path. Thin overnight liquidity raises the risk "
        "of a 1–1.5 figure flush on a soft CPI.\n\n"
        "AUD/USD trading as China proxy: copper bid, iron-ore weak — pivot 0.6620. "
        "Sell USD/CHF rallies into 0.9050; SNB tolerance for further CHF strength "
        "being tested."
    )


def _mock_rates_commentary() -> str:
    return (
        "Front-end USTs richened 4bp on Williams' 'data-dependent' framing. 2y traded "
        "through 4.30% briefly, settled 4.32%. Sustained break would force the OIS "
        "curve to add cuts and pull the dollar broadly lower.\n\n"
        "Bunds tracked USTs but lagged the long end on Schatz auction concession "
        "tomorrow. UST/Bund 10y spread 172bp, bottom of the 3m range — we fade further "
        "narrowing on a hawkish CPI.\n\n"
        "JGB 10y stalled at 0.95%; BoJ presence keeps the curve pinned. Tokyo CPI "
        "Friday the next domestic test. Gilts lagged on a shallower BoE path. Today's "
        "2y auction tail the cleanest positioning gauge — > 1.5bp re-prices the curve "
        "3–5bp."
    )


def _mock_equities_commentary() -> str:
    return (
        "ES flat overnight after a marginal new cash high. Semis led on AI capex "
        "commentary; defensives heavy. Europe opens mixed — luxury under pressure on "
        "China demand. Nikkei firmer on a softer JPY but breadth narrow.\n\n"
        "Index vol compressed (VIX 14.21, near 6m lows); single-name vol elevated — "
        "earnings dispersion is the dominant driver. SX5E outperformed SPX by 60bp "
        "this week; the dollar tailwind funds the international-equities rotation."
    )


def _mock_commodities_commentary() -> str:
    return (
        "Brent traded a $1 range — spec longs trimmed, backwardation intact ($1.20 "
        "1m–6m). Hormuz noise re-emerged late Asia; the front of the curve has a "
        "floor into Europe.\n\n"
        "Gold consolidated $2,330. Real yields the swing factor into CPI — soft print "
        "clears $2,360 and breaks the three-week triangle. Copper firm on tight "
        "concentrate; LME stocks at multi-year lows. EU nat gas a regional story; "
        "storage adequate into shoulder season."
    )


# ============================================================ INTELLIGENCE BUILDER


def _build_intelligence(
    briefing_date: date,
    tone: RiskTone,
    themes: list[str],
    market_snapshot: MarketSnapshot,
    key_events: list[KeyEvent],
    rng: random.Random,
) -> Intelligence:
    """Construct the rich editorial payload for a briefing."""

    today_iso = briefing_date.isoformat()
    as_of = (datetime.now(timezone.utc)).strftime("%H:%M GMT")

    # ------------------------------------------------------------------ STRATEGIST VIEW

    strategist_view = StrategistView(
        headline=f"Short USD into CPI, USDJPY topside hedge — risks {_risk_skew_phrase(tone)}",
        body=(
            "Desk leans short USD at the front, hedged via USDJPY topside on "
            "intervention asymmetry. Disinflation largely priced; surprise asymmetry "
            "is to a soft print on continued goods deflation and easing shelter. "
            "Size 2/3 pre-data, add on confirmation. Cut on 1.0890 reclaim failure."
        ),
    )

    # ------------------------------------------------------------------ MACRO OVERVIEW

    macro_overview = MacroOverview(
        opening=(
            "Today is the cleanest test yet of whether the disinflation glide-path is "
            "intact. The setup is asymmetric.\n\n"
            "Front-end USTs richened 4bp overnight on Williams' framing — preparation, "
            "not commitment, in the desk's read. Real-money receiving the 5y belly. "
            "Leveraged accounts moderately USD-long. Positioning is tactically thin; "
            "surprise either side risks a disorderly move into intervention-talk "
            "territory in USDJPY and stop-cascade territory in EUR/USD.\n\n"
            "Soft print: DXY drifts lower, EUR/USD prints 1.09, SX5E extends the "
            "international-equity rotation. Hot print: July cut probability collapses "
            "from 72% to 50%, the curve bear-flattens, USDJPY tests 154.50 and "
            "breakevens widen 3–5bp.\n\n"
            "Second-order conditioning: Hormuz, semis export controls, the 2y auction tail."
        ),
        whats_moving=(
            "Three things moved overnight. Each matters into the print.\n\n"
            "Front-end USTs caught a 4bp bid on Williams' 'data-dependent' framing — 2y "
            "traded briefly through 4.30%, settled 4.32%. USDJPY 1M RR flipped — JPY "
            "calls bid for the first time in three weeks. Brent +0.42% on Hormuz tape; "
            "supply-premium is back in the front of the curve and 5y breakevens are "
            "sensitive to a sustained bid into Europe."
        ),
        rates_view=(
            "OIS prices 72% of a July −25bp and a terminal 3.75% by Q1 2027. The 2y "
            "trades 20bp above the December 2026 implied — front-end has lagged the "
            "dovish repricing.\n\n"
            "Soft CPI plus a stop-through 2y auction forces an 8–12bp catch-up. Bunds "
            "tracked but lagged the long end on Schatz auction concession; UST/Bund 10y "
            "spread 172bp, bottom of the 3m range. JGB 10y pinned at 0.95% by BoJ "
            "presence.\n\n"
            "Cleanest expression: receive 2y outright, hedge the convex tail via DXY "
            "topside calls."
        ),
        cross_asset_thesis=(
            "Rates → FX is the cleanest linkage. Front-end UST richening caps USDJPY "
            "topside — 154.50 held three sessions; 2y through 4.30% triggers a 1–1.5 "
            "figure unwind.\n\n"
            "USD softness funds the international-equity rotation (SX5E +60bp vs SPX "
            "this week). Sustained Brent bid leaves 5y breakevens vulnerable to a 3–5bp "
            "widening; short cash / long swap-spread is the cleanest expression. Tight "
            "CDX IG (−1.2bp overnight) supports the short-USD bias and the EM carry basket."
        ),
    )

    # ------------------------------------------------------------------ RISK SCENARIOS

    risk_scenarios = [
        RiskScenario(
            name="Soft CPI",
            probability="35% · upside skew",
            trigger="Core MoM ≤ 0.3% · headline ≤ 3.1%",
            fx_impact="DXY −0.4% · EUR/USD 1.0900 · USDJPY drifts to 152.50 cap · AUD outperforms",
            rates_impact="2y rallies 6–8bp · 5y belly received · 2s/10s steepens to 25bp · breakevens unchanged",
            equity_impact="SPX +0.4% · semis lead · SX5E rotation continues · dollar-bloc earners bid",
        ),
        RiskScenario(
            name="In-line CPI",
            probability="45% · base case",
            trigger="Core MoM +0.3% · headline 3.1–3.2%",
            fx_impact="DXY pinned · USDJPY range · EUR/USD 1.0820–1.0890",
            rates_impact="Front-end unchanged · curve flat · auction the next swing factor",
            equity_impact="Range-trade · VIX offered further · single-name dispersion dominant",
        ),
        RiskScenario(
            name="Hot CPI",
            probability="20% · downside tail",
            trigger="Core MoM ≥ 0.4% · headline ≥ 3.3%",
            fx_impact="DXY +0.5% · EUR/USD 1.0780 · USDJPY tests 154.50 cap · CHF a safe haven",
            rates_impact="Curve bear-flattens 5–7bp · July cut prob to 50% · breakevens widen 3–5bp",
            equity_impact="SPX −0.5% · defensives outperform · semis hit · credit widens 1–2bp",
        ),
    ]

    # ------------------------------------------------------------------ WHAT CHANGED

    what_changed = WhatChanged(
        summary=(
            "Two material shifts overnight. Front-end USTs richened 4bp on Williams' "
            "dovish framing; USDJPY 1M RR flipped — JPY calls bid for the first time "
            "in three weeks. Both consistent with positioning unwind into CPI."
        ),
        deltas=[
            "UST 2y · −4.2 bp · Williams 'data-dependent', auction tail concession faded",
            "USDJPY 1M 25Δ RR · +0.62 · USD calls → JPY calls flip · first in 3w",
            "VIX · 14.21 (−0.32) · 6m lows · risk vols offered pre-print",
            "Brent · +0.42% · Hormuz risk premium back in the front of the curve",
            "DXY · −0.18% · spec longs trimmed; real-money sellers below 104.30",
            "CDX IG · −1.2 bp · credit tighter on dovish Fed-speak; HY lagging",
        ],
    )

    # ------------------------------------------------------------------ KEY TAKEAWAYS

    key_takeaways = [
        KeyTakeaway(rank=1, text=(
            "US CPI 12:30 GMT is the binary risk of the day. "
            "Consensus 3.1% YoY · surprise asymmetry skews to a soft print."
        )),
        KeyTakeaway(rank=2, text=(
            "Desk leans short USD into the print, hedged via USDJPY topside "
            "on intervention risk above 152.50."
        )),
        KeyTakeaway(rank=3, text=(
            "Front-end USTs richening as Fed speakers tilt dovish; buy 2s on dips "
            "into the auction tail."
        )),
        KeyTakeaway(rank=4, text=(
            "EUR/USD 1.0820–1.0840 is the pivot. Break opens 1.0750; "
            "reclaim of 1.0890 targets 1.0950."
        )),
        KeyTakeaway(rank=5, text=(
            "Strait of Hormuz headlines back in the curve — Brent supply premium "
            "vulnerable to a $2–3 spike on further escalation."
        )),
    ]

    # ------------------------------------------------------------------ TRADE IDEAS

    trade_ideas = [
        TradeIdea(
            rank=1,
            theme="Fade USD strength on disinflation confirmation",
            direction="Long EUR/USD",
            vehicle="EUR/USD spot · 1m forward",
            entry="1.0830–1.0850",
            target="1.0960",
            stop="1.0780",
            horizon="1–2 weeks",
            conviction=7.2,
            catalyst="US CPI 12:30 · core ≤ 0.3% takes DXY < 104.30",
            rationale=(
                "Levered USD-long, real-money receiving belly. Path lower on soft print. "
                "Size 2/3 pre-data; cut on 1.0890 reclaim failure."
            ),
            vol_context="1M ATM 6.42 · RR −0.18 · USD-call skew fades on EUR-positive print",
        ),
        TradeIdea(
            rank=2,
            theme="Front-end UST richening on dovish Fed tilt",
            direction="Long UST 2Y",
            vehicle="2y futures (TUM26)",
            entry="4.32–4.34%",
            target="4.18%",
            stop="4.42%",
            horizon="2–4 weeks",
            conviction=6.8,
            catalyst="2y auction tail · CPI surprise · Williams/Logan tone",
            rationale=(
                "2y still 20bp above Dec-26 OIS. Soft CPI + stop-through auction = 8–12bp "
                "catch-up. Hedge tail via DXY topside calls."
            ),
            vol_context="MOVE 92 · front-end vol offered, term bid",
        ),
        TradeIdea(
            rank=3,
            theme="USDJPY intervention asymmetry hedge",
            direction="Short USD/JPY",
            vehicle="USDJPY 1M 152 put",
            entry="0.30% prem (~32 pips on spot ref)",
            target="2.0% prem on 152 break",
            stop="0.10% prem (decay to half)",
            horizon="1m",
            conviction=6.5,
            catalyst="MoF rhetoric · 152.50 break · soft US CPI",
            rationale=(
                "RR flipped JPY-call bid. Spot drifted without topside cover. "
                "Convex tail cheap; carry-positive through 152.50."
            ),
            vol_context="1M ATM 8.94 · 25Δ RR +0.62 · JPY calls bid first in 3w",
        ),
        TradeIdea(
            rank=4,
            theme="Brent supply-premium reflation",
            direction="Long Brent",
            vehicle="Front-month Brent (BRNN26)",
            entry="$84.10–$84.40",
            target="$87.20",
            stop="$82.40",
            horizon="2–3 weeks",
            conviction=5.8,
            catalyst="Hormuz escalation · OPEC+ chatter · EIA inventories",
            rationale=(
                "Spec longs cut 11k in 2w. Backwardation intact ($1.20 1m–6m). Headline "
                "premium leaked — fair-to-cheap. Asymmetric on geo noise."
            ),
            vol_context="OVX 32 · skew slightly call-bid · physical tight at Med differentials",
        ),
        TradeIdea(
            rank=5,
            theme="EUR/CHF carry into ECB hawkish tilt",
            direction="Long EUR/CHF",
            vehicle="EUR/CHF spot",
            entry="0.9670–0.9690",
            target="0.9820",
            stop="0.9620",
            horizon="3–5 weeks",
            conviction=5.2,
            catalyst="ECB minutes · SNB tone on FX intervention",
            rationale=(
                "SNB tolerance for CHF strength tested at 0.96. ECB minutes lean patient. "
                "Carry +80bp ann.; hawkish-CPI safe-haven flow is the stop."
            ),
            vol_context="1M ATM 5.31 · cheap protection if EU growth disappoints",
        ),
    ]

    # ------------------------------------------------------------------ CENTRAL BANKS

    central_banks = [
        CentralBankItem(
            bank="Federal Reserve",
            short="Fed",
            last_meeting="Held at 4.50–4.75% on 18 Mar 2026 · dot-plot revised to 2 cuts in 2026",
            next_meeting_date="2026-06-18",
            days_to_next=(date(2026, 6, 18) - briefing_date).days,
            market_pricing="OIS prices 72% of −25bp by July · terminal 3.75% by Q1 2027",
            bias="Dovish hold; cut probability rising with CPI miss",
            upcoming_speakers=["Williams · 14:00 GMT", "Logan · 16:30 GMT"],
            policy_stance="Hold · easing bias",
            inflation_sensitivity="High",
            growth_sensitivity="Medium",
            qt_stance="Runoff $60bn/mo since Sep 2025 · taper not signalled",
            pricing_change_1w="+8bp dovish · July cut probability 72% (was 64%)",
            hawkish_shift=-1,
            triggers=[
                "Soft CPI (core ≤ 0.3%): July cut firms · terminal 3.50% by Q1 2027",
                "Hot CPI (core ≥ 0.4%): July cut delayed to Sep · terminal 4.00%",
                "Williams panel 14:00 GMT: tone divergence vs Logan widens the band",
                "Auction tail > 1.5bp: forces 2y catch-up of 8–12bp",
            ],
        ),
        CentralBankItem(
            bank="European Central Bank",
            short="ECB",
            last_meeting="Cut 25bp to 2.50% on 11 Apr 2026 · Lagarde sustained 'gradual' language",
            next_meeting_date="2026-06-05",
            days_to_next=(date(2026, 6, 5) - briefing_date).days,
            market_pricing="OIS prices 40% of −25bp in June · terminal 2.00% by Q4 2026",
            bias="Patient hold · data-dependent through summer",
            upcoming_speakers=["Lane · 09:00 GMT", "Schnabel · 13:30 GMT (panel)"],
            policy_stance="Cutting · gradual",
            inflation_sensitivity="Medium",
            growth_sensitivity="High",
            qt_stance="PEPP reinvestment ends Dec 2025 · APP passive runoff",
            pricing_change_1w="−4bp hawkish · June cut probability 40% (was 50%)",
            hawkish_shift=1,
            triggers=[
                "HICP next Tue > 2.3%: delays June cut · EUR/USD bid",
                "Lagarde Q&A on services pricing: tone the swing factor",
                "BTP/Bund > 200bp: cut probability rises · periphery widening",
                "Bund 10y < 2.40%: spread to UST tightens further on dovish path",
            ],
        ),
        CentralBankItem(
            bank="Bank of England",
            short="BoE",
            last_meeting="Cut 25bp to 4.50% on 20 Mar 2026 · 7-2 vote split",
            next_meeting_date="2026-06-19",
            days_to_next=(date(2026, 6, 19) - briefing_date).days,
            market_pricing="OIS prices 55% of −25bp in June · terminal 3.75% by Q4 2026",
            bias="Cut bias retained · sticky services CPI the principal hawkish risk",
            upcoming_speakers=["Pill · 11:00 GMT (Mansion House preview)"],
            policy_stance="Cutting · cautious",
            inflation_sensitivity="Medium-High",
            growth_sensitivity="Medium",
            qt_stance="£100bn/yr Gilt runoff · active sales paused 2026",
            pricing_change_1w="+3bp hawkish · June cut probability 55% (was 62%)",
            hawkish_shift=0,
            triggers=[
                "UK services CPI > 5.0%: kills June cut · GBP bid",
                "Pill Mansion House preview: tone the principal hawkish risk",
                "Growth tracker sustained < 1.5%: August cut firms",
                "Gilt 10y > 4.20%: long-end re-prices, lazy curve steepens",
            ],
        ),
        CentralBankItem(
            bank="Bank of Japan",
            short="BoJ",
            last_meeting="Held at 0.25% on 30 Apr 2026 · Ueda emphasised 'no hurry' on next step",
            next_meeting_date="2026-06-16",
            days_to_next=(date(2026, 6, 16) - briefing_date).days,
            market_pricing="OIS prices 18% of +25bp in June · full hike priced by Sep",
            bias="Gradual normalisation · FX/CPI watch ahead of Tokyo print Friday",
            upcoming_speakers=["Himino · 23:50 GMT (financial-conditions speech)"],
            policy_stance="Patient normalisation",
            inflation_sensitivity="High",
            growth_sensitivity="Medium",
            qt_stance="JGB purchases ¥6tn/mo · ETF purchases halted",
            pricing_change_1w="+2bp hawkish · June hike probability 18% (was 14%)",
            hawkish_shift=1,
            triggers=[
                "Tokyo CPI Fri > 2.5%: accelerates hike timing · JPY bid",
                "Ueda press conf: explicit YCC-end timeline · long-end re-prices",
                "USDJPY > 156.00: MoF intervention risk binding · 1–2 figure flush",
                "Wage round results: > 5% raises hike confidence",
            ],
        ),
        CentralBankItem(
            bank="Swiss National Bank",
            short="SNB",
            last_meeting="Cut 25bp to 0.25% on 21 Mar 2026 · explicit FX intervention readiness",
            next_meeting_date="2026-06-19",
            days_to_next=(date(2026, 6, 19) - briefing_date).days,
            market_pricing="OIS prices 80% of −25bp in June · zero-bound by Q4 2026",
            bias="Easing bias dominant · CHF strength is the binding constraint",
            upcoming_speakers=[],
            policy_stance="Easing · zero-bound approach",
            inflation_sensitivity="Low",
            growth_sensitivity="Medium",
            qt_stance="FX intervention dominant tool · sight deposits at CHF 480bn",
            pricing_change_1w="−6bp dovish · June cut probability 80% (was 72%)",
            hawkish_shift=-2,
            triggers=[
                "EUR/CHF < 0.95: explicit FX intervention",
                "CPI < 1.0% YoY: zero-bound by Q4 2026",
                "ECB cut path: SNB shadows ECB minus 25bp",
                "Safe-haven flow on hot CPI: forces sight-deposit absorption",
            ],
        ),
    ]

    # ------------------------------------------------------------------ PAIR COMMENTARY

    fx_map = market_snapshot.fx
    pair_commentary: list[PairCommentary] = []
    pair_notes = {
        "EURUSD": (
            "Range-trade pattern intact; real-money positioned moderately long. "
            "Break of 1.0820 opens 1.0750 quickly given thin overnight liquidity."
        ),
        "GBPUSD": (
            "Sticky services CPI keeps the front-end rate-supportive; 1.2790 has "
            "rejected three times. Below 1.2680 the path opens to 1.2580."
        ),
        "USDJPY": (
            "Intervention asymmetry above 152.50 is the binding constraint. "
            "Front-end UST richening is capping any topside attempt; we like "
            "small downside via 1M 152 puts."
        ),
        "USDCHF": (
            "SNB FX-intervention readiness is testing 0.9020; we sell rallies "
            "into 0.9050. Below 0.8980 opens 0.8900 quickly."
        ),
        "AUDUSD": (
            "Trading as China proxy; copper strength supportive but iron-ore "
            "weakness caps upside. Pivot 0.6620 — reclaim opens 0.6680."
        ),
        "USDCAD": (
            "Oil-price beta now positive after BoC's 'pause-mode' tilt. We sell "
            "1.3720 rallies for 1.3620 retest on supportive Brent."
        ),
    }
    bias_map_on = {
        "EURUSD": "Buy dips into 1.0810",
        "GBPUSD": "Buy 1.2690 dips",
        "USDJPY": "Sell rallies into 152.50",
        "USDCHF": "Sell rallies into 0.9050",
        "AUDUSD": "Buy 0.6580 dips",
        "USDCAD": "Sell 1.3720 rallies",
    }
    bias_map_off = {
        "EURUSD": "Sell rallies into 1.0890",
        "GBPUSD": "Sell rallies into 1.2790",
        "USDJPY": "Buy dips into 153.00",
        "USDCHF": "Buy dips into 0.9020",
        "AUDUSD": "Sell rallies into 0.6660",
        "USDCAD": "Buy dips into 1.3640",
    }
    pair_levels = {
        "EURUSD": [
            PairLevel(label="Resistance", value="1.0890", note="21d MA · 3-week congestion"),
            PairLevel(label="Pivot",      value="1.0840"),
            PairLevel(label="Support",    value="1.0820", note="Range floor"),
            PairLevel(label="Stop",       value="1.0780"),
        ],
        "GBPUSD": [
            PairLevel(label="Resistance", value="1.2790", note="3x failure"),
            PairLevel(label="Pivot",      value="1.2730"),
            PairLevel(label="Support",    value="1.2680"),
            PairLevel(label="Stop",       value="1.2580"),
        ],
        "USDJPY": [
            PairLevel(label="Cap",        value="152.50", note="Intervention zone"),
            PairLevel(label="Pivot",      value="154.20"),
            PairLevel(label="Support",    value="153.00"),
            PairLevel(label="Target",     value="151.40"),
        ],
        "USDCHF": [
            PairLevel(label="Resistance", value="0.9050"),
            PairLevel(label="Pivot",      value="0.9020"),
            PairLevel(label="Support",    value="0.8980"),
        ],
        "AUDUSD": [
            PairLevel(label="Resistance", value="0.6680"),
            PairLevel(label="Pivot",      value="0.6620"),
            PairLevel(label="Support",    value="0.6580"),
        ],
        "USDCAD": [
            PairLevel(label="Resistance", value="1.3720"),
            PairLevel(label="Pivot",      value="1.3680"),
            PairLevel(label="Support",    value="1.3620"),
        ],
    }

    for sym in _FX_PAIRS:
        spot = fx_map.get(sym, _PAIR_BASE_SPOT[sym])
        pair_commentary.append(PairCommentary(
            pair=sym,
            spot=spot,
            bias=(bias_map_on if tone == RiskTone.RISK_ON else bias_map_off).get(sym, "Two-way"),
            one_day_pct=round(rng.uniform(-0.35, 0.35), 2),
            one_week_pct=round(rng.uniform(-1.4, 1.4), 2),
            one_month_atm=round(_PAIR_ATM_BASE[sym] + rng.uniform(-0.4, 0.4), 2),
            rr_25d=round(_PAIR_RR_BASE[sym] + rng.uniform(-0.15, 0.15), 2),
            levels=pair_levels[sym],
            note=pair_notes[sym],
        ))

    # ------------------------------------------------------------------ POSITIONING

    positioning = [
        PositioningNote(
            instrument="DXY",
            side="Long",
            weight="Moderate (15th pct vs 6m)",
            flow="Macro shorts trimming · spec longs added overnight",
            risk="Soft CPI triggers stop cascade below 104.30",
        ),
        PositioningNote(
            instrument="EUR/USD",
            side="Balanced",
            weight="Light (30th pct vs 6m)",
            flow="Real-money buyers on dips · CTAs short delta",
            risk="Break of 1.0820 forces CTA cover; reclaim of 1.0890 squeezes leveraged shorts",
        ),
        PositioningNote(
            instrument="USD/JPY",
            side="Long",
            weight="Stretched (78th pct vs 6m)",
            flow="Leveraged longs paring; corporate hedge demand sustained",
            risk="Intervention above 152.50 forces 1.5–2 figure unwind",
        ),
        PositioningNote(
            instrument="UST 2Y",
            side="Long (received)",
            weight="Moderate",
            flow="Real-money receivers in 5y belly · macro funds added 2s",
            risk="Hot CPI forces sell-off back to 4.42% (50d MA)",
        ),
        PositioningNote(
            instrument="Brent",
            side="Long",
            weight="Light (post recent trim)",
            flow="Spec longs cut 11k contracts last week · physical bid intact",
            risk="OPEC+ surprise on production opens $80 support",
        ),
    ]

    # ------------------------------------------------------------------ SESSION BREAKDOWN

    session_breakdown = SessionBreakdown(
        asia=(
            "Nikkei +0.41% on JPY softness; CSI 300 led by tech on earnings. AUD/USD "
            "held 0.6610; iron-ore Pilbara cargoes at 4w highs. JGB curve unchanged — "
            "BoJ presence pinning the long end at 0.95%."
        ),
        europe=(
            "European futures mixed; DAX defensives lag, luxury heavy on China demand. "
            "Bund 10y caught a real-money bid through the open — UST/Bund spread 172bp, "
            "the bottom of the 3m range. EUR/USD held 1.0830, thin offers above 1.0865; "
            "option demand at 1.0850 NY cut."
        ),
        us=(
            "ES flat after a marginal new cash high. Semis led on Asian beats; "
            "defensives heavy. UST 2y trading 4.32%, richer 4bp. 2s/10s steepest in a "
            "fortnight at 23bp. ESM26 implied open −0.05%."
        ),
    )

    # ------------------------------------------------------------------ CROSS-ASSET

    cross_asset = [
        CrossAssetLink(
            title="Rates → FX",
            body=(
                "Front-end UST richening (−4bp) caps USD/JPY topside. 154.50 ceiling held "
                "three sessions; 2y through 4.30% triggers a 1–1.5 figure unwind into "
                "intervention talk."
            ),
        ),
        CrossAssetLink(
            title="FX → Equities",
            body=(
                "USD softness is funding the international-equities rotation. SX5E "
                "outperformed SPX 60bp this week. Hot CPI reverses — watch dollar-bloc "
                "earners (LVMH, SAP, ASML) first."
            ),
        ),
        CrossAssetLink(
            title="Commodities → Rates",
            body=(
                "Brent +0.42% reignites the supply-premium debate. Sustained bid into "
                "Europe leaves 5y breakevens vulnerable to a 3–5bp widening — short cash / "
                "long swap-spread is the cleanest expression."
            ),
        ),
        CrossAssetLink(
            title="Credit → FX",
            body=(
                "CDX IG tightened 1.2bp on dovish Fed-speak; HY less convicted. Tight "
                "credit supports the short-USD bias and the BRL/MXN/IDR carry basket."
            ),
        ),
    ]

    # ------------------------------------------------------------------ PULL STATS

    pull_stats = [
        PullStat(section="movers", value="+0.42%", tone="pos",
                 label="Brent overnight — Strait of Hormuz risk premium back in the curve."),
        PullStat(section="regime", value="−4.2 bp", tone="pos",
                 label="UST 2Y move on Williams' dovish framing. 2s/10s steepening at 23bp."),
        PullStat(section="fx", value="6.42", tone="neu",
                 label="EUR/USD 1M ATM at the 5d average. RR slightly USD-call skewed."),
        PullStat(section="vol", value="+0.62", tone="warn",
                 label="USDJPY 1M RR flip — JPY calls bid for the first time in three weeks."),
        PullStat(section="central-banks", value="72%", tone="neu",
                 label="OIS probability of a Fed −25bp by July. Terminal 3.75% by Q1 2027."),
        PullStat(section="trades", value="7.2 / 10", tone="pos",
                 label="Top desk conviction — Long EUR/USD into a soft CPI print."),
    ]

    # ------------------------------------------------------------------ RISK WARNINGS

    risk_warnings = [
        RiskWarning(
            severity="high",
            title="US CPI · 12:30 GMT",
            body=(
                "Highest-impact print of the week. Liquidity is thinned by Williams' "
                "comments yesterday; positioning thin. Surprise either side risks "
                "60–80 pip moves in EUR/USD and a 1–1.5 figure unwind in USDJPY."
            ),
        ),
        RiskWarning(
            severity="medium",
            title="Strait of Hormuz headlines",
            body=(
                "Geopolitical noise re-emerged overnight; Brent supply premium back in "
                "the curve. Further escalation risks a $2–3 spike and forces a re-pricing "
                "of breakevens — short bond / long swap-spread is the cleanest expression."
            ),
        ),
    ]

    # ------------------------------------------------------------------ CONSENSUS CALLS

    consensus_calls = [
        ConsensusCall(
            event="US CPI YoY",
            consensus="3.1% (range 3.0–3.2%)",
            risk_skew="Slight downside skew — goods disinflation persisting; shelter cooling at the margin",
            impact=(
                "Below 3.0%: USD soft, 2y rallies 6–8bp, EUR/USD 1.0900, SPX +0.4%. "
                "Above 3.2%: USD bid, curve bear-flattens 5–7bp, EUR/USD 1.0780, "
                "USDJPY tests 154.50 cap."
            ),
        ),
        ConsensusCall(
            event="US CPI Core MoM",
            consensus="+0.3% (range +0.2–+0.4%)",
            risk_skew="Two-way — services ex-shelter remains the swing factor",
            impact=(
                "≤ +0.2%: front-end re-prices cuts, USD broadly soft. "
                "≥ +0.4%: pricing for July cut collapses to 50%, USDJPY topside test."
            ),
        ),
        ConsensusCall(
            event="DE ZEW Sentiment",
            consensus="12.5",
            risk_skew="Modest upside skew on improving manufacturing surveys",
            impact="Above 14: EUR/USD bid 20–30 pips; below 10: minimal reaction.",
        ),
    ]

    # ------------------------------------------------------------------ DESK PRIORITIES

    desk_priorities = [
        DeskPriority(
            rank=1,
            title="Fade USD strength on a soft CPI",
            body="Long EUR/USD 1.0830–1.0850, target 1.0960. Cut on 1.0890 reclaim failure.",
            timing="12:30 GMT",
        ),
        DeskPriority(
            rank=2,
            title="Cap USD/JPY topside via 152 puts",
            body="Intervention asymmetry compresses the binary. Convex tail cheap.",
            timing="All session",
        ),
        DeskPriority(
            rank=3,
            title="Buy UST 2y on auction concession",
            body="Front-end lags the OIS repricing. Tail > 1.5bp re-prices the curve 3–5bp.",
            timing="17:00 GMT",
        ),
        DeskPriority(
            rank=4,
            title="Watch Hormuz tape",
            body="Brent risk premium back in the curve. Long Brent vs short EUR/CHF the natural pair.",
            timing="Headline-driven",
        ),
    ]

    # ------------------------------------------------------------------ GEOPOLITICAL PULSE

    geopolitical = GeopoliticalPulse(
        narrative=(
            "Geopolitical complex tilted toward escalation overnight. Hormuz noise re-emerged "
            "after a Houthi statement on Bab al-Mandab transit; Brent supply premium back in "
            "the front of the curve. US–China rhetoric hardened on semis export controls — "
            "the May 17 review is now the next inflection. Russia–Ukraine quieter; G7 trade "
            "policy in holding pattern pending the Treasury statement. Energy security "
            "narrative re-tightening into European storage rebuild season."
        ),
        regions=[
            GeopoliticalRegion(
                name="US – China", short="USCH", intensity=68, trend="Escalating",
                headline="Semis export-control review on 17 May; tariff rhetoric hardening",
                detail=(
                    "Commerce Dept signalled the May 17 export-control review will tighten "
                    "the dual-use AI semis carve-out. CNY fix held below 7.20 for the eighth "
                    "session. Watch ASML/SAP/TSM tape for the immediate read-through; AUD/USD "
                    "and USD/CNH the cleanest FX expressions."
                ),
            ),
            GeopoliticalRegion(
                name="Middle East", short="MENA", intensity=74, trend="Escalating",
                headline="Hormuz / Bab al-Mandab transit risk back in the curve",
                detail=(
                    "Late-Asia Houthi statement on Bab al-Mandab transit lifted Brent 42c. "
                    "GCC tankers re-routing via Cape route adds 14–18 days. Risk premium has "
                    "rebuilt $1.20–$1.80 since Friday; further escalation opens a $2–3 spike."
                ),
            ),
            GeopoliticalRegion(
                name="Russia – Ukraine", short="RUUA", intensity=42, trend="Stable",
                headline="Energy corridor quiet; grain-deal extension talks pending",
                detail=(
                    "No new front-line escalation; G7 oil-cap enforcement chatter has cooled. "
                    "Black Sea grain deal extension talks scheduled for the week. EUR-energy "
                    "complex (TTF, CO2) range-trading."
                ),
            ),
            GeopoliticalRegion(
                name="EU Fiscal", short="EUFI", intensity=36, trend="De-escalating",
                headline="Periphery spreads tighter; supranational supply absorbed",
                detail=(
                    "BTP/Bund 10y narrowed 4bp last week on Lagarde patience comments. EU 30y "
                    "syndication on Tuesday cleared with 4.2x oversubscription. Periphery "
                    "carry-positive but range-bound until the next OAT auction."
                ),
            ),
            GeopoliticalRegion(
                name="Taiwan Strait", short="TWN", intensity=58, trend="Stable",
                headline="No new PLA activity; semis supply-chain risk premium intact",
                detail=(
                    "PLA activity at 2-week lows; KMT–DPP exchange on cross-Strait policy "
                    "remains the principal headline risk. TSM-NTD intervention floor at 32.10 "
                    "tested twice this week; CBC presence active."
                ),
            ),
            GeopoliticalRegion(
                name="G7 Trade Policy", short="G7T", intensity=46, trend="Stable",
                headline="Treasury FX report due; tariff rhetoric in holding pattern",
                detail=(
                    "US Treasury semi-annual FX report due next week; KRW and TWD on the watch "
                    "list. Tariff rhetoric in holding pattern post-NAFTA review extension. "
                    "MXN beta to G7-trade headlines compressed."
                ),
            ),
            GeopoliticalRegion(
                name="Energy Security", short="ENRG", intensity=62, trend="Escalating",
                headline="European storage refill at 41% vs 38% 5y avg",
                detail=(
                    "Front-month TTF +3.1% on Hormuz risk and Nord Stream legal-process delay. "
                    "European storage refill at 41% (vs 38% 5y avg) — comfortable into shoulder "
                    "season, but a cold snap or further Hormuz escalation tightens the balance."
                ),
            ),
        ],
    )

    # ------------------------------------------------------------------ PROVENANCE

    sources_for = {
        "opener":         ["Outlook desk", "BBG composite"],
        "movers":         ["Yahoo Finance", "BBG composite"],
        "regime":         ["FRED", "BBG composite", "CBOE"],
        "fx":             ["BBG composite", "Outlook desk"],
        "vol":            ["Internal vol sheet", "CVOL"],
        "calendar":       ["TradingEconomics"],
        "central-banks":  ["Central-bank speeches", "Outlook desk"],
        "geopolitical":   ["Strategist tracking"],
        "trades":         ["Strategist tracking", "BBG composite"],
        "risks":          ["TradingEconomics", "Strategist tracking"],
    }
    provenance = [
        ProvenanceEntry(section=section, sources=src, as_of=as_of)
        for section, src in sources_for.items()
    ]

    return Intelligence(
        strategist_view=strategist_view,
        macro_overview=macro_overview,
        what_changed=what_changed,
        key_takeaways=key_takeaways,
        desk_priorities=desk_priorities,
        risk_scenarios=risk_scenarios,
        trade_ideas=trade_ideas,
        central_banks=central_banks,
        pair_commentary=pair_commentary,
        positioning=positioning,
        session_breakdown=session_breakdown,
        cross_asset=cross_asset,
        pull_stats=pull_stats,
        risk_warnings=risk_warnings,
        consensus_calls=consensus_calls,
        geopolitical=geopolitical,
        provenance=provenance,
    )


# ============================================================ GENERATOR


class MockBriefingGenerator:
    """Deterministic mock generator producing institutional-grade briefings.

    The interface (``generate``) is intentionally compatible with a future
    Anthropic-backed implementation: same inputs, same output schema.
    """

    def __init__(
        self,
        desk: str = settings.BRIEFING_DESK,
        author: str = "Makor Macro Strategist (AI Draft)",
        generator_version: str = settings.BRIEFING_GENERATOR_VERSION,
    ) -> None:
        self.desk = desk
        self.author = author
        self.generator_version = generator_version

    def generate(
        self,
        briefing_date: date,
        briefing_type: BriefingType = BriefingType.MORNING_FX_MACRO,
        publish: bool = True,
    ) -> BriefingCreate:
        rng = random.Random(briefing_date.toordinal())

        tone = rng.choice(_RISK_TONES)
        themes = rng.sample(_RISK_THEMES_POOL, k=5)
        snapshot = _mock_market_snapshot(rng)
        events = _mock_key_events(briefing_date)

        title = (
            f"Morning FX & Macro Briefing — {briefing_date.strftime('%A, %d %B %Y')}"
        )
        headline = (
            "Dollar firm, front-end USTs bid into US CPI; desk leans short USD "
            "with USDJPY topside hedge."
        )

        status = BriefingStatus.PUBLISHED if publish else BriefingStatus.DRAFT
        published_at = datetime.now(timezone.utc) if publish else None

        intelligence = _build_intelligence(
            briefing_date=briefing_date,
            tone=tone,
            themes=themes,
            market_snapshot=snapshot,
            key_events=events,
            rng=rng,
        )

        metadata: dict[str, Any] = {
            "seed": briefing_date.toordinal(),
            "tone": tone.value,
            "themes_pool_size": len(_RISK_THEMES_POOL),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "engine": "mock",
            "intelligence_version": "1.0",
        }

        return BriefingCreate(
            briefing_date=briefing_date,
            briefing_type=briefing_type,
            status=status,
            title=title,
            headline=headline,
            executive_summary=_mock_executive_summary(briefing_date, tone),
            fx_commentary=_mock_fx_commentary(),
            rates_commentary=_mock_rates_commentary(),
            equities_commentary=_mock_equities_commentary(),
            commodities_commentary=_mock_commodities_commentary(),
            risk_tone=tone,
            key_events=events,
            risk_themes=themes,
            market_snapshot=snapshot,
            intelligence=intelligence,
            generation_source=GenerationSource.MOCK,
            generator_version=self.generator_version,
            model_name=None,
            generation_metadata=metadata,
            desk=self.desk,
            author=self.author,
            published_at=published_at,
        )


def get_briefing_generator() -> MockBriefingGenerator:
    return MockBriefingGenerator()
