/**
 * Per-bank registry: public RSS feed URLs, official meeting-calendar
 * URLs, and the desk-authored "why this CB matters today" frame.
 *
 * Every URL here is a public, no-auth endpoint published by the bank
 * itself. The registry is the only place these URLs live; the service
 * iterates this table and any failed feed simply contributes nothing
 * (per-feed status is surfaced in /api/central-banks diagnostics).
 *
 * Market-impact frames are desk-authored — they describe each bank's
 * structural role in the rate / FX / risk cycle, NOT today's specific
 * policy expectations. Specific pricing belongs in a future
 * CME-FedWatch / OIS adapter; this is the always-true framing.
 */

import type { CBName, CBSpec } from "./types";

export const CB_SPECS: Record<CBName, CBSpec> = {
  Fed: {
    bank: "Fed",
    name: "Federal Reserve",
    feeds: [
      {
        url: "https://www.federalreserve.gov/feeds/press_all.xml",
        default_kind: "release",
      },
      {
        url: "https://www.federalreserve.gov/feeds/speeches.xml",
        default_kind: "speech",
      },
    ],
    calendar_url: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    market_impact:
      "FOMC reaction function watched for sensitivity to inflation prints and labour data. Forward-guidance language at press conferences carries more cross-asset signal than the rate level itself.",
    bias: "Path conditioned on inflation + labour data; SEP medians the structural anchor",
  },

  ECB: {
    bank: "ECB",
    name: "European Central Bank",
    feeds: [
      {
        url: "https://www.ecb.europa.eu/rss/press.xml",
        default_kind: "release",
      },
      {
        url: "https://www.ecb.europa.eu/rss/speeches.xml",
        default_kind: "speech",
      },
    ],
    calendar_url: "https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html",
    market_impact:
      "Governing Council path conditioned on services-inflation persistence and EUR cross dynamics. Communication discipline between meetings is the structural variable.",
    bias: "Data-dependent; services inflation the binary, growth backdrop the conditioning factor",
  },

  BoE: {
    bank: "BoE",
    name: "Bank of England",
    feeds: [
      {
        url: "https://www.bankofengland.co.uk/boeapps/database/rss/feed.aspx?CategoryId=1",
        default_kind: "release",
      },
      {
        url: "https://www.bankofengland.co.uk/boeapps/database/rss/feed.aspx?CategoryId=11",
        default_kind: "speech",
      },
    ],
    calendar_url: "https://www.bankofengland.co.uk/monetary-policy",
    market_impact:
      "MPC vote-split structure is the cross-asset variable. Services-inflation read is the binary; fiscal coordination with HMT shapes the longer-run path.",
    bias: "Vote-split is the live signal; services inflation conditions the policy path",
  },

  BoJ: {
    bank: "BoJ",
    name: "Bank of Japan",
    feeds: [
      {
        url: "https://www.boj.or.jp/en/rss/whatsnew.xml",
        default_kind: "release",
      },
    ],
    calendar_url: "https://www.boj.or.jp/en/mopo/mpmsche_minu/index.htm",
    market_impact:
      "YCC framework + USD/JPY level are the dominant cross-asset readthrough. The wage-negotiation cycle anchors rate-normalisation timing.",
    bias: "Patient normalisation; wage cycle and USD/JPY level the structural anchors",
  },

  SNB: {
    bank: "SNB",
    name: "Swiss National Bank",
    feeds: [
      {
        url: "https://www.snb.ch/selectionService/feeds/rss?identifier=press_releases",
        default_kind: "release",
      },
    ],
    calendar_url: "https://www.snb.ch/en/about/monetary-policy/monetary-policy-decisions",
    market_impact:
      "Tolerance for CHF strength and imported euro-area inflation are the key drivers. Intervention threshold visible only in retrospect via FX-reserve disclosures.",
    bias: "FX-reserve flows + CHF appreciation tolerance are the live signals",
  },
};

export const ALL_BANKS: CBName[] = ["Fed", "ECB", "BoE", "BoJ", "SNB"];
