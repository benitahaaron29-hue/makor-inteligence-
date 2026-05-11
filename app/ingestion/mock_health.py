"""Mock-realism layer for adapter health.

In Phase 1, adapters have no live fetch loop, so their `health()` returns
PHASE_2 by default. For the Sources page to look operationally realistic
(latency, last-success age, reliability score, vendor, region), this module
exposes a deterministic mock health builder keyed by adapter name. The
registry endpoint reads from here when an adapter's own `health()` is the
default PHASE_2 placeholder.

This is presentation-only — when Phase-2 adapters land, their concrete
`health()` queries `ingestion_runs` for true reliability data, and the mock
layer falls out automatically.
"""

from __future__ import annotations

from dataclasses import asdict
from datetime import datetime, timedelta, timezone
from hashlib import md5

from app.ingestion.base import SourceHealth, SourceStatus


def _seed_for(name: str, day: int) -> int:
    h = md5(f"{name}|{day}".encode()).digest()
    return int.from_bytes(h[:4], "big")


def _jitter(seed: int, lo: int, hi: int) -> int:
    return lo + (seed % max(1, hi - lo))


# Per-adapter operational metadata. Used to dress the mock health response so
# the Sources page reads like a real desk console.
PROFILES: dict[str, dict] = {
    # News
    "ForexLive":              {"vendor": "ForexLive",          "region": "GLOBAL", "latency": (180, 380), "reliability": 0.992, "stale_min": (1, 4)},
    "Bloomberg news":         {"vendor": "Bloomberg L.P.",     "region": "GLOBAL", "latency": (40, 120),  "reliability": 0.998, "stale_min": (15, 60)},
    "Reuters":                {"vendor": "Refinitiv",          "region": "GLOBAL", "latency": (40, 120),  "reliability": 0.997, "stale_min": (15, 60)},
    "Central-bank speeches":  {"vendor": "Per-CB scrape",      "region": "GLOBAL", "latency": (220, 480), "reliability": 0.961, "stale_min": (12, 90)},

    # Calendar
    "TradingEconomics":       {"vendor": "TradingEconomics",   "region": "GLOBAL", "latency": (110, 240), "reliability": 0.989, "stale_min": (5, 30)},
    "Investing.com":          {"vendor": "Investing.com",      "region": "GLOBAL", "latency": (380, 720), "reliability": 0.943, "stale_min": (60, 240)},
    "ForexFactory":           {"vendor": "ForexFactory",       "region": "GLOBAL", "latency": (320, 640), "reliability": 0.927, "stale_min": (60, 240)},

    # Market
    "Yahoo Finance":          {"vendor": "Yahoo",              "region": "GLOBAL", "latency": (140, 320), "reliability": 0.984, "stale_min": (1, 5)},
    "AlphaVantage":           {"vendor": "AlphaVantage",       "region": "GLOBAL", "latency": (200, 420), "reliability": 0.971, "stale_min": (5, 20)},
    "FRED":                   {"vendor": "FRBSL",              "region": "US",     "latency": (90, 240),  "reliability": 0.998, "stale_min": (60, 1440)},
    "Bloomberg market data":  {"vendor": "Bloomberg BLPAPI",   "region": "GLOBAL", "latency": (12, 38),   "reliability": 0.999, "stale_min": (0, 2)},

    # Desk
    "Outlook desk inbox":     {"vendor": "Microsoft Graph",    "region": "DESK",   "latency": (80, 220),  "reliability": 0.996, "stale_min": (1, 3)},
    "Analyst notes folder":   {"vendor": "SMB share",          "region": "DESK",   "latency": (10, 40),   "reliability": 0.999, "stale_min": (5, 120)},

    # Volatility
    "Internal vol sheet":     {"vendor": "Strategist XLSX",    "region": "DESK",   "latency": (20, 80),   "reliability": 0.998, "stale_min": (5, 60)},
    "CME settlement":         {"vendor": "CME Group",          "region": "US",     "latency": (120, 280), "reliability": 0.995, "stale_min": (60, 1440)},
    "CVOL":                   {"vendor": "CME Group",          "region": "US",     "latency": (130, 290), "reliability": 0.993, "stale_min": (60, 1440)},

    # Synthesis
    "Mock briefing generator":{"vendor": "Local (Python)",     "region": "DESK",   "latency": (8, 28),    "reliability": 1.000, "stale_min": (0, 5)},
    "Anthropic Claude":       {"vendor": "Anthropic",          "region": "GLOBAL", "latency": (1800, 3200), "reliability": 0.996, "stale_min": (0, 30)},
}


def mock_health(name: str, default_status: SourceStatus) -> SourceHealth:
    """Build a realistic-looking SourceHealth for an adapter.

    `default_status` is the adapter's own declared status; for everything
    except `MOCK` we leave the status as PHASE_2 but still populate the
    operational fields so the Sources page is fully populated.
    """
    profile = PROFILES.get(name)
    now = datetime.now(timezone.utc)
    day = now.date().toordinal()
    seed = _seed_for(name, day)

    if profile is None:
        # Unknown adapter — return the default PHASE_2 health
        return SourceHealth(status=default_status)

    lo, hi = profile["latency"]
    latency = _jitter(seed, lo, hi)

    smin, smax = profile["stale_min"]
    stale = _jitter(seed >> 7, smin, smax)
    last_success = now - timedelta(minutes=stale)

    # Reliability — Phase-1 reports the static profile value verbatim.
    reliability = float(profile["reliability"])

    # Phase-1 records-per-run: 0 because no live fetch. Show a small number
    # for the mock generator since it's the only "live" producer.
    records = 1 if default_status == SourceStatus.MOCK else 0

    return SourceHealth(
        status=default_status,
        # Populate last_success_at + reliability_score for every adapter so the
        # Sources page reads operationally — Phase-2 adapters get plausible
        # mock telemetry from the static profile. Real ingestion_runs data
        # supersedes this when the scheduler is live.
        last_success_at=last_success,
        last_error=None,
        reliability_score=reliability,
        records_last_run=records,
        latency_ms=latency,
        vendor=profile["vendor"],
        region=profile["region"],
    )


def asdict_safe(h: SourceHealth) -> dict:
    """Convert SourceHealth to a JSON-friendly dict (datetime → isoformat)."""
    out = asdict(h)
    out["status"] = h.status.value if hasattr(h.status, "value") else h.status
    if h.last_success_at is not None:
        out["last_success_at"] = h.last_success_at.isoformat()
    return out
