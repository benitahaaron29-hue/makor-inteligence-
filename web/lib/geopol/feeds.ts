/**
 * Geopolitical / government source registry.
 *
 * Every URL is a public, no-auth RSS or Atom endpoint published by the
 * source organisation itself. The service layer iterates this table and
 * any failed feed simply contributes nothing — per-feed status surfaces
 * in /api/diag so operators can tell at a glance which feeds are healthy.
 *
 * Market-impact frames are desk-authored. They describe each source's
 * structural role in moving FX / rates / commodities, NOT today's specific
 * news. Today's specific news comes from the feed body and is classified
 * downstream by `classify()`.
 *
 * Adding a source: append one entry below. No code changes elsewhere.
 *
 * Removing a source: delete the entry. If a feed is consistently dead
 * (visible in /api/diag), prefer to remove rather than leave a 404 in
 * the diagnostic output.
 */

import type { GeoSourceSpec } from "./types";

export const GEO_SOURCES: GeoSourceSpec[] = [
  // ----- United States --------------------------------------------------
  {
    org: "WhiteHouse",
    source: "The White House",
    region: "US",
    feed_url: "https://www.whitehouse.gov/feed/",
    market_impact:
      "US executive direction. Sanctions, tariffs, fiscal posture, and foreign-policy statements move USD risk premium, EM-FX, and commodity-bloc positioning.",
    tier: 1,
  },
  {
    org: "StateDept",
    source: "US Department of State",
    region: "US",
    feed_url: "https://www.state.gov/feed/",
    market_impact:
      "US foreign-policy direction. Sanctions designations, diplomatic posture, and crisis statements feed safe-haven flow into USD / JPY / CHF and gold.",
    tier: 1,
  },
  {
    org: "USTreasury",
    source: "US Treasury",
    region: "US",
    feed_url: "https://home.treasury.gov/news/press-releases/rss.xml",
    market_impact:
      "OFAC designations and Treasury fiscal posture. Sanctions announcements drive EM-FX risk premium; debt-management statements feed front-end Treasury pricing.",
    tier: 1,
  },
  {
    org: "USTR",
    source: "Office of the US Trade Representative",
    region: "US",
    feed_url: "https://ustr.gov/rss.xml",
    market_impact:
      "Tariffs and trade-policy direction. Section-301 actions, USMCA / China measures, and trade-deal announcements move CNH, MXN, CAD, and broad EM-FX risk premium.",
    tier: 1,
  },

  // ----- United Kingdom -------------------------------------------------
  {
    org: "UKPM",
    source: "10 Downing Street",
    region: "UK",
    feed_url:
      "https://www.gov.uk/government/organisations/prime-ministers-office-10-downing-street.atom",
    market_impact:
      "UK executive direction. Fiscal posture, foreign-policy commitments, and political stability commentary the primary drivers of gilt-yield risk premium and GBP flow.",
    tier: 1,
  },
  {
    org: "HMTreasury",
    source: "HM Treasury",
    region: "UK",
    feed_url: "https://www.gov.uk/government/organisations/hm-treasury.atom",
    market_impact:
      "UK fiscal direction. Budget statements, OBR coordination, and debt-management remits are the live signals for gilts and GBP crosses.",
    tier: 1,
  },
  {
    org: "UKFCDO",
    source: "UK Foreign, Commonwealth & Development Office",
    region: "UK",
    feed_url:
      "https://www.gov.uk/government/organisations/foreign-commonwealth-development-office.atom",
    market_impact:
      "UK foreign-policy posture and sanctions designations. Crisis statements move GBP risk premium and safe-haven flow into gilts.",
    tier: 2,
  },

  // ----- European Union --------------------------------------------------
  {
    org: "EUCommission",
    source: "European Commission · Press Corner",
    region: "EU",
    feed_url: "https://ec.europa.eu/commission/presscorner/api/rss?language=en",
    market_impact:
      "EU executive direction. Sanctions packages, trade measures, and fiscal-coordination announcements drive EUR risk premium and peripheral-spread positioning.",
    tier: 1,
  },

  // ----- Supranational --------------------------------------------------
  {
    org: "IMF",
    source: "International Monetary Fund",
    region: "Global",
    feed_url:
      "https://www.imf.org/en/News/rss?Language=ENG&Series=News+Articles",
    market_impact:
      "Multilateral surveillance and crisis-financing announcements. WEO updates, Article IV reports, and emergency-facility activations move EM-FX risk premium broadly.",
    tier: 2,
  },
  {
    org: "WorldBank",
    source: "World Bank",
    region: "Global",
    feed_url: "https://www.worldbank.org/en/news/all?format=rss",
    market_impact:
      "Development-financing posture and country-policy statements. Less acute than IMF for short-horizon FX, but a structural input on EM-fundamentals narrative.",
    tier: 2,
  },

  // ----- Commodity supply ----------------------------------------------
  {
    org: "OPEC",
    source: "OPEC",
    region: "OPEC",
    feed_url: "https://www.opec.org/opec_web/en/press_room/press_releases.html",
    market_impact:
      "Production-quota decisions and OPEC+ communication. Direct driver of front-month Brent + diesel cracks; secondary read-through to commodity-bloc FX (CAD, NOK, MXN, RUB-proxy) and global inflation expectations.",
    tier: 1,
  },
];

/**
 * Map lookup for the rare case downstream code needs the spec by org id
 * (e.g. enriching a stored GeoEvent with its origin frame).
 */
export const GEO_BY_ORG: Record<string, GeoSourceSpec> = (() => {
  const m: Record<string, GeoSourceSpec> = {};
  for (const s of GEO_SOURCES) m[s.org] = s;
  return m;
})();
