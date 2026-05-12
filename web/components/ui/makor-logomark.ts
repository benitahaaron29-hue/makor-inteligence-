/**
 * Legacy alias module — superseded by ./makor-logo.tsx.
 *
 * The historical `MakorLogomark` placeholder is gone; every brand surface
 * now renders the real asset at /brand/makor-logo.png via the `MakorLogo`
 * component. This module preserves the old import path so any unchanged
 * caller continues to resolve to the same authoritative asset.
 */

export { MakorLogo as MakorLogomark } from "@/components/ui/makor-logo";
export { MakorLogo, MakorWordmark, MakorMark, MakorGlyph } from "@/components/ui/makor-logo";
