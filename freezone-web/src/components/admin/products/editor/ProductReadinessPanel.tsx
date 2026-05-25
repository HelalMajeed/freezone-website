"use client";

import { computeProductReadiness } from "@/lib/admin/product-readiness";
import type { ProductEditorValues } from "@/lib/admin/product-editor-schema";

export function ProductReadinessPanel({
  values,
  imageCount,
  requiredAttrCount,
  filledAttrCount,
  onPublishBlocked,
}: {
  values: ProductEditorValues;
  imageCount: number;
  requiredAttrCount: number;
  filledAttrCount: number;
  onPublishBlocked?: (blocked: boolean) => void;
}) {
  const { score, items } = computeProductReadiness(values, imageCount, requiredAttrCount, filledAttrCount);
  const ready = score >= 100;
  onPublishBlocked?.(!ready);

  return (
    <aside
      style={{
        position: "fixed",
        right: 16,
        top: 120,
        width: 260,
        padding: 14,
        borderRadius: 12,
        border: "1px solid #334155",
        background: "#0f172a",
        zIndex: 15,
      }}
    >
      <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>جاهزية المنتج</h3>
      <div style={{ fontSize: 22, fontWeight: 800, color: ready ? "#10b981" : "#fbbf24" }}>{score}%</div>
      {ready ? <p style={{ color: "#10b981", fontSize: 13 }}>جاهز للنشر!</p> : null}
      <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", fontSize: 12 }}>
        {items.map((it) => (
          <li key={it.id} style={{ marginBottom: 6, color: it.ok ? "#86efac" : "#fca5a5" }}>
            {it.ok ? "✓" : "✗"} {it.label}
          </li>
        ))}
      </ul>
    </aside>
  );
}
