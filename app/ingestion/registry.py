"""Adapter registry — the scheduler and the /sources endpoint read this list.

Order matters for the Sources page: this is the order rows render in.
"""

from __future__ import annotations

from app.ingestion.adapters.bloomberg import BloombergMarketAdapter, BloombergNewsAdapter
from app.ingestion.adapters.cb_speeches import CentralBankSpeechesAdapter
from app.ingestion.adapters.excel_vol_sheet import (
    CMESettlementAdapter,
    CVOLAdapter,
    ExcelVolSheetAdapter,
)
from app.ingestion.adapters.forexlive import ForexLiveAdapter
from app.ingestion.adapters.fred import FredAdapter
from app.ingestion.adapters.outlook import AnalystNotesFolderAdapter, OutlookAdapter
from app.ingestion.adapters.reuters import ReutersAdapter
from app.ingestion.adapters.synthesis import (
    AnthropicSynthesisAdapter,
    MockSynthesisAdapter,
)
from app.ingestion.adapters.tradingeconomics import (
    ForexFactoryAdapter,
    InvestingDotComAdapter,
    TradingEconomicsAdapter,
)
from app.ingestion.adapters.yahoo_finance import AlphaVantageAdapter, YahooFinanceAdapter
from app.ingestion.base import SourceAdapter, SourceCategory


def build_registry() -> list[SourceAdapter]:
    """Instantiate every adapter in render order."""
    return [
        # News
        ForexLiveAdapter(),
        BloombergNewsAdapter(),
        ReutersAdapter(),
        CentralBankSpeechesAdapter(),
        # Calendar
        TradingEconomicsAdapter(),
        InvestingDotComAdapter(),
        ForexFactoryAdapter(),
        # Market data
        YahooFinanceAdapter(),
        AlphaVantageAdapter(),
        FredAdapter(),
        BloombergMarketAdapter(),
        # Desk
        OutlookAdapter(),
        AnalystNotesFolderAdapter(),
        # Volatility
        ExcelVolSheetAdapter(),
        CMESettlementAdapter(),
        CVOLAdapter(),
        # Synthesis
        MockSynthesisAdapter(),
        AnthropicSynthesisAdapter(),
    ]


ADAPTERS: list[SourceAdapter] = build_registry()


def by_category(category: SourceCategory) -> list[SourceAdapter]:
    return [a for a in ADAPTERS if a.metadata.category == category]


def by_name(name: str) -> SourceAdapter | None:
    for a in ADAPTERS:
        if a.metadata.name == name:
            return a
    return None
