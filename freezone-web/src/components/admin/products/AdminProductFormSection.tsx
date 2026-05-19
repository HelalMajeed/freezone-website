"use client";

import type { CSSProperties, ReactNode } from "react";

const sectionStyle: CSSProperties = {
  padding: 16,
  borderRadius: 12,
  border: "1px solid var(--admin-border, #334155)",
  background: "var(--admin-surface-muted)",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

export function AdminProductFormSection({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <section style={sectionStyle}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--admin-text, #e2e8f0)" }}>
            {title}
          </h2>
          {badge ? (
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 999,
                background: "var(--admin-surface-inset)",
                color: "var(--admin-muted)",
              }}
            >
              {badge}
            </span>
          ) : null}
        </div>
        {subtitle ? (
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--admin-muted)" }}>{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
