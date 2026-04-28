"use client";

import type { CSSProperties, ReactNode } from "react";
import type { ThemeTokens } from "@/lib/theme-tokens";
import { themeToCssVars } from "@/lib/theme-tokens";

function cssBackgroundImageValue(raw: string): string | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  if (t.startsWith("linear-gradient(") || t.startsWith("radial-gradient(") || t.startsWith("url(")) return t;
  return `url(${t})`;
}

export function ThemeApplier({ tokens, children }: { tokens: ThemeTokens; children: ReactNode }) {
  const vars = themeToCssVars(tokens) as CSSProperties;
  const bg = cssBackgroundImageValue(tokens.backgroundImage);
  return (
    <div
      className={`fz-theme-root fz-btn-${tokens.buttonStyle}`}
      style={{
        ...vars,
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        backgroundColor: tokens.background,
        ...(bg
          ? {
              backgroundImage: bg,
              backgroundSize: "cover",
              backgroundAttachment: "scroll",
              backgroundPosition: "center top",
            }
          : {}),
      }}
    >
      {children}
    </div>
  );
}
