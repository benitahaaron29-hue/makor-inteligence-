"""Ingestion package — adapter framework for the Phase 2 source layer.

In Phase 1, the adapters are scaffolds: they implement the interface, expose
metadata for the Sources page, and report `PHASE_2` health. In Phase 2 each
adapter is implemented against its real upstream (RSS, REST, BLPAPI, etc.).

Architecture: see /docs/INGESTION.md (or the design conversation). The scheduler
reads `registry.ADAPTERS`, runs each on its declared cadence, persists
normalized rows via the repository layer, and writes one `ingestion_runs` row
per execution.
"""
