"use client";

import type { PublicSocialLink } from "@/lib/site-public";
import { DEFAULT_TOP_BAR_SOCIAL_COLOR } from "@/lib/site-public";
import styles from "./NavBar.module.css";

function FacebookGlyph({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}
function InstagramGlyph({ size }: { size: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
function TikTokGlyph({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

export function TopBarSocialIcons({
  links,
  enabled = true,
  iconSizePx = 20,
  gapPx = 14,
  color,
}: {
  links: PublicSocialLink[];
  enabled?: boolean;
  iconSizePx?: number;
  gapPx?: number;
  /** CSS color; empty uses logo crimson (`DEFAULT_TOP_BAR_SOCIAL_COLOR`) */
  color?: string;
}) {
  if (!enabled) return null;
  const visible = (links ?? []).filter((s) => s.showInTopBar !== false);
  if (!visible.length) return null;
  const size = Math.min(36, Math.max(12, Math.round(iconSizePx)));
  const gap = Math.min(32, Math.max(4, Math.round(gapPx)));
  const c = color?.trim() || DEFAULT_TOP_BAR_SOCIAL_COLOR;
  return (
    <div
      className={styles.topSocials}
      style={{
        gap,
        color: c,
      }}
    >
      {visible.map((s) => {
        const label = s.platform === "tiktok" ? "TikTok" : s.platform.charAt(0).toUpperCase() + s.platform.slice(1);
        const child =
          s.platform === "facebook" ? (
            <FacebookGlyph size={size} />
          ) : s.platform === "instagram" ? (
            <InstagramGlyph size={size} />
          ) : s.platform === "tiktok" ? (
            <TikTokGlyph size={size} />
          ) : (
            <span style={{ fontSize: Math.max(10, size * 0.45), fontWeight: 800 }}>{label[0]}</span>
          );
        return (
          <a
            key={`${s.platform}-${s.sortOrder}`}
            href={s.url}
            className={styles.topSocialLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
          >
            {child}
          </a>
        );
      })}
    </div>
  );
}
