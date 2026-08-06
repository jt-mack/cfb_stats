/** Build CSS custom properties and contrast-safe text for a team's brand colors. */

import type { CSSProperties } from "react";

export type TeamStyle = {
  color?: string;
  backgroundColor?: string;
};

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace(/^#/, "").trim();
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    if ([r, g, b].some(Number.isNaN)) return null;
    return { r, g, b };
  }
  if (cleaned.length === 6) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    if ([r, g, b].some(Number.isNaN)) return null;
    return { r, g, b };
  }
  return null;
}

/** Relative luminance 0–1 (sRGB). */
export function hexLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
}

export function contrastText(backgroundHex: string): string {
  return hexLuminance(backgroundHex) > 0.45 ? "#0a0a0a" : "#fafafa";
}

export function normalizeHex(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback;
  const cleaned = raw.replace(/^#/, "").trim();
  if (!cleaned) return fallback;
  return `#${cleaned}`;
}

export function teamStyleFromColors(
  color: string | null | undefined,
  alternateColor: string | null | undefined
): TeamStyle {
  const primary = normalizeHex(color, "#18181b");
  const secondary = normalizeHex(alternateColor, "#a1a1aa");
  return { color: primary, backgroundColor: secondary };
}

/** CSS vars scoped to the team page root. */
export function teamCssVars(style: TeamStyle): CSSProperties {
  const primary = style.color ?? "#18181b";
  const secondary = style.backgroundColor ?? "#a1a1aa";
  return {
    ["--team-primary" as string]: primary,
    ["--team-secondary" as string]: secondary,
    ["--team-on-primary" as string]: contrastText(primary),
    ["--team-on-secondary" as string]: contrastText(secondary),
  };
}

export function withAlpha(hex: string, alpha: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}
