/**
 * Share-link helpers — always return a production-safe URL.
 *
 * The platform may run on localhost during development, but no share link
 * or distributed email body should ever quote a localhost URL: it will not
 * resolve for the recipient. Resolution order:
 *
 *   1. NEXT_PUBLIC_SITE_URL (when set to a real https host)
 *   2. NEXT_PUBLIC_SHARE_HOST (alternate name for the same)
 *   3. PLACEHOLDER_HOST — visible signal that the prod host is not yet set
 *
 * In every case, localhost / 127.* / 0.0.0.0 / file:// hosts are rejected
 * and replaced with the placeholder. This keeps the public surface clean
 * even when an operator forgets to set the env var.
 */

const PLACEHOLDER_HOST = "https://research.makor-group.com";

function cleanedEnvHost(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_SHARE_HOST ??
    "";
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  if (/^(?:https?:\/\/)?(?:localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(trimmed)) return null;
  if (/^file:\/\//i.test(trimmed)) return null;
  // Ensure scheme present
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function siteBase(): string {
  return cleanedEnvHost() ?? PLACEHOLDER_HOST;
}

export function publicBriefingUrl(date: string): string {
  return `${siteBase()}/briefings/${encodeURIComponent(date)}`;
}

export function publicTerminalUrl(): string {
  return siteBase();
}

/** True when the share base is the placeholder (no prod host configured). */
export function isPlaceholderShareHost(): boolean {
  return cleanedEnvHost() === null;
}

export { PLACEHOLDER_HOST };
