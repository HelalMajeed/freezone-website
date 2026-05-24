"use client";

import type { CSSProperties } from "react";
import type { ProductTabMode } from "@/lib/home-section-products";
import { FEATURED_PRODUCT_RAIL_PRESETS } from "@/lib/cms-section-defaults";
import { confirmDialog } from "@/lib/confirm";

const TAB_MODES: { value: ProductTabMode; label: string }[] = [
  { value: "new", label: "وافدون جدد (isNew)" },
  { value: "featured", label: "مميزون (featured)" },
  { value: "gaming", label: "ألعاب / لابتوبات / كمبيوتر" },
  { value: "components", label: "مكونات + تخزين" },
  { value: "cat", label: "قسم (cat slug)" },
  { value: "manual", label: "منتجات محددة (معرّفات)" },
];

function newTabId() {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

type TabRow = {
  id: string;
  labelAr: string;
  labelEn: string;
  mode: ProductTabMode;
  catSlug: string;
  productIds: string;
  viewAllLink: string;
};

function payloadToRows(payload: Record<string, unknown>): TabRow[] {
  const raw = payload.tabs;
  if (!Array.isArray(raw) || raw.length === 0) {
    return [
      {
        id: newTabId(),
        labelAr: "الوافدون الجدد",
        labelEn: "New Arrivals",
        mode: "new",
        catSlug: "",
        productIds: "",
        viewAllLink: "",
      },
    ];
  }
  return raw.map((t, i) => {
    const o = t && typeof t === "object" && !Array.isArray(t) ? (t as Record<string, unknown>) : {};
    const ids = Array.isArray(o.productIds) ? o.productIds.map((x) => String(x)).join(", ") : "";
    return {
      id: typeof o.id === "string" && o.id.trim() ? o.id : `tab-${i}`,
      labelAr: typeof o.labelAr === "string" ? o.labelAr : "",
      labelEn: typeof o.labelEn === "string" ? o.labelEn : "",
      mode: (typeof o.mode === "string" ? o.mode : "new") as ProductTabMode,
      catSlug: typeof o.catSlug === "string" ? o.catSlug : "",
      productIds: ids,
      viewAllLink: typeof o.viewAllLink === "string" ? o.viewAllLink : "",
    };
  });
}

function rowsToPayload(rows: TabRow[], base: Record<string, unknown>) {
  const tabs = rows.map((r) => {
    const productIds = r.productIds
      .split(/[,\s]+/)
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));
    return {
      id: r.id,
      labelAr: r.labelAr,
      labelEn: r.labelEn,
      mode: r.mode,
      ...(r.mode === "cat" && r.catSlug.trim() ? { catSlug: r.catSlug.trim() } : {}),
      ...(r.mode === "manual" && productIds.length ? { productIds } : {}),
      ...(r.viewAllLink.trim() ? { viewAllLink: r.viewAllLink.trim() } : {}),
    };
  });
  return { ...base, tabs };
}

const inp: CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #334155",
  background: "var(--admin-surface)",
  color: "var(--admin-text)",
  fontSize: 13,
  boxSizing: "border-box",
};

const labelStyle: CSSProperties = { fontSize: 12, color: "var(--admin-muted)", marginBottom: 4, display: "block" };

export function TabbedProductsSectionEditor({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const rows = payloadToRows(value);
  const eyebrowAr = typeof value.eyebrowAr === "string" ? value.eyebrowAr : "";
  const eyebrowEn = typeof value.eyebrowEn === "string" ? value.eyebrowEn : "";
  const titleAr = typeof value.titleAr === "string" ? value.titleAr : "";
  const titleEn = typeof value.titleEn === "string" ? value.titleEn : "";
  const viewAllLink = typeof value.viewAllLink === "string" ? value.viewAllLink : "";
  const limit = typeof value.limit === "number" ? value.limit : 24;
  const tabStyle = value.tabStyle === "separated" ? "separated" : "grouped";

  const push = (nextRows: TabRow[]) => {
    onChange(rowsToPayload(nextRows, value));
  };

  const updateMeta = (patch: Record<string, unknown>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 13, color: "var(--admin-muted)", margin: 0 }}>
        حدّد العناوين والتبويبات. كل تبويب يعرض منتجات حسب النمط (فلترة أو معرّفات). استخدم «مجمّع» لشريط
        واحد بإطار كما في المرجع.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>عنوان صغير (عربي)</label>
          <input
            style={inp}
            value={eyebrowAr}
            onChange={(e) => updateMeta({ eyebrowAr: e.target.value })}
          />
        </div>
        <div>
          <label style={labelStyle}>Eyebrow (EN)</label>
          <input
            style={inp}
            dir="ltr"
            value={eyebrowEn}
            onChange={(e) => updateMeta({ eyebrowEn: e.target.value })}
          />
        </div>
        <div>
          <label style={labelStyle}>عنوان رئيسي (عربي)</label>
          <input style={inp} value={titleAr} onChange={(e) => updateMeta({ titleAr: e.target.value })} />
        </div>
        <div>
          <label style={labelStyle}>Title (EN)</label>
          <input
            style={inp}
            dir="ltr"
            value={titleEn}
            onChange={(e) => updateMeta({ titleEn: e.target.value })}
          />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>رابط «عرض الكل» الافتراضي</label>
          <input
            style={inp}
            dir="ltr"
            value={viewAllLink}
            onChange={(e) => updateMeta({ viewAllLink: e.target.value })}
            placeholder="/products"
          />
        </div>
        <div>
          <label style={labelStyle}>الحد الأقصى للمنتجات لكل تبويب</label>
          <input
            style={inp}
            type="number"
            min={1}
            max={48}
            value={limit}
            onChange={(e) => updateMeta({ limit: Number(e.target.value) || 24 })}
          />
        </div>
        <div>
          <label style={labelStyle}>شكل التبويبات</label>
          <select
            style={inp}
            value={tabStyle}
            onChange={(e) => updateMeta({ tabStyle: e.target.value })}
          >
            <option value="grouped">مجمّع — صندوق واحد</option>
            <option value="separated">منفصل — أزرار مستقلة</option>
          </select>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #334155", paddingTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <strong style={{ color: "var(--admin-text)" }}>التبويبات</strong>
          <button
            type="button"
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid #475569",
              background: "var(--admin-surface-inset)",
              color: "var(--admin-text)",
              cursor: "pointer",
            }}
            onClick={() => push([...rows, { id: newTabId(), labelAr: "تبويب", labelEn: "Tab", mode: "new", catSlug: "", productIds: "", viewAllLink: "" }])}
          >
            + تبويب
          </button>
        </div>
        {rows.map((row, idx) => (
          <div
            key={row.id}
            style={{
              border: "1px solid #1e293b",
              borderRadius: 10,
              padding: 12,
              marginBottom: 10,
              background: "var(--admin-surface-muted)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>#{idx + 1}</span>
              <button
                type="button"
                style={{ fontSize: 12, color: "#fecaca", background: "none", border: "none", cursor: "pointer" }}
                onClick={() => push(rows.filter((_, j) => j !== idx))}
              >
                حذف
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label style={labelStyle}>اسم التبويب (عربي)</label>
                <input
                  style={inp}
                  value={row.labelAr}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...row, labelAr: e.target.value };
                    push(next);
                  }}
                />
              </div>
              <div>
                <label style={labelStyle}>Tab label (EN)</label>
                <input
                  style={inp}
                  dir="ltr"
                  value={row.labelEn}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...row, labelEn: e.target.value };
                    push(next);
                  }}
                />
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={labelStyle}>مصدر المنتجات</label>
              <select
                style={inp}
                value={row.mode}
                onChange={(e) => {
                  const next = [...rows];
                  next[idx] = { ...row, mode: e.target.value as ProductTabMode };
                  push(next);
                }}
              >
                {TAB_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            {row.mode === "cat" && (
              <div style={{ marginTop: 8 }}>
                <label style={labelStyle}>cat slug (مثال: components)</label>
                <input
                  style={inp}
                  dir="ltr"
                  value={row.catSlug}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...row, catSlug: e.target.value };
                    push(next);
                  }}
                />
              </div>
            )}
            {row.mode === "manual" && (
              <div style={{ marginTop: 8 }}>
                <label style={labelStyle}>معرّفات المنتجات (مفصولة بفواصل)</label>
                <input
                  style={inp}
                  dir="ltr"
                  placeholder="101, 102, 103"
                  value={row.productIds}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...row, productIds: e.target.value };
                    push(next);
                  }}
                />
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              <label style={labelStyle}>رابط «عرض الكل» لهذا التبويب (اختياري)</label>
              <input
                style={inp}
                dir="ltr"
                value={row.viewAllLink}
                onChange={(e) => {
                  const next = [...rows];
                  next[idx] = { ...row, viewAllLink: e.target.value };
                  push(next);
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FeaturedProductsSectionEditor({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const productIdsStr = Array.isArray(value.productIds)
    ? (value.productIds as unknown[]).map((x) => String(x)).join(", ")
    : "";

  const patch = (p: Record<string, unknown>) => onChange({ ...value, ...p });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13, color: "var(--admin-muted)", margin: 0 }}>
        شريط منتجات أفقي واحد (نفس واجهة «وصل حديثاً»). أضِف القسم من «+ قسم من قالب» ثم اختر قالباً سريعاً أو املأ
        الحقول يدوياً. يمكنك تكرار القسم عدة مرات لكل فئة وترتيبها من القائمة اليسرى.
      </p>
      <div>
        <span style={{ ...labelStyle, display: "block", marginBottom: 8 }}>قوالب سريعة (استبدال محتوى المسودة)</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {FEATURED_PRODUCT_RAIL_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={async () => {
                if (
                  !(await confirmDialog({
                    title: "تطبيق قالب",
                    message: `استبدال إعدادات القسم الحالي بقالب «${preset.labelAr}»؟ (يمكنك التراجع عبر إعادة التحميل إن لم تحفظ)`,
                    confirmLabel: "استبدال",
                  }))
                )
                  return;
                onChange({ ...preset.payload });
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #475569",
                background: "var(--admin-surface-inset)",
                color: "var(--admin-text)",
                cursor: "pointer",
                fontSize: 12,
              }}
              title={preset.labelEn}
            >
              {preset.labelAr}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>العنوان (عربي)</label>
          <input
            style={inp}
            value={typeof value.titleAr === "string" ? value.titleAr : ""}
            onChange={(e) => patch({ titleAr: e.target.value })}
          />
        </div>
        <div>
          <label style={labelStyle}>Title (EN)</label>
          <input
            style={inp}
            dir="ltr"
            value={typeof value.titleEn === "string" ? value.titleEn : ""}
            onChange={(e) => patch({ titleEn: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label style={labelStyle}>رابط زر العرض</label>
        <input
          style={inp}
          dir="ltr"
          value={typeof value.link === "string" ? value.link : "/products"}
          onChange={(e) => patch({ link: e.target.value })}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>التصفية</label>
          <select
            style={inp}
            value={typeof value.filter === "string" ? value.filter : "new"}
            onChange={(e) => patch({ filter: e.target.value })}
          >
            <option value="new">جدد فقط</option>
            <option value="featured">مميزون</option>
            <option value="cat">حسب قسم</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>cat slug — أكثر من قسم بفاصلة: gaming,computers</label>
          <input
            style={inp}
            dir="ltr"
            placeholder="monitors أو security,cctv"
            value={typeof value.catSlug === "string" ? value.catSlug : ""}
            onChange={(e) => patch({ catSlug: e.target.value })}
          />
        </div>
        <div>
          <label style={labelStyle}>الحد</label>
          <input
            style={inp}
            type="number"
            min={1}
            max={48}
            value={typeof value.limit === "number" ? value.limit : 12}
            onChange={(e) => patch({ limit: Number(e.target.value) || 12 })}
          />
        </div>
      </div>
      <div>
        <label style={labelStyle}>معرّفات منتجات يدوية (تتجاهل الفلتر إن وُجدت)</label>
        <input
          style={inp}
          dir="ltr"
          placeholder="مثال: 1, 5, 12"
          value={productIdsStr}
          onChange={(e) => {
            const ids = e.target.value
              .split(/[,\s]+/)
              .map((s) => Number(s.trim()))
              .filter((n) => Number.isFinite(n));
            patch({ productIds: ids.length ? ids : undefined });
          }}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>نص زر العرض (عربي)</label>
          <input
            style={inp}
            value={typeof value.viewAllAr === "string" ? value.viewAllAr : ""}
            onChange={(e) => patch({ viewAllAr: e.target.value })}
          />
        </div>
        <div>
          <label style={labelStyle}>View-all button (EN)</label>
          <input
            style={inp}
            dir="ltr"
            value={typeof value.viewAllEn === "string" ? value.viewAllEn : ""}
            onChange={(e) => patch({ viewAllEn: e.target.value })}
          />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>لون زر العرض</label>
          <select
            style={inp}
            value={value.ctaVariant === "teal" ? "teal" : "gray"}
            onChange={(e) => patch({ ctaVariant: e.target.value })}
          >
            <option value="gray">رمادي (افتراضي)</option>
            <option value="teal">تركواز (مرجع)</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>لون خلفية القسم (CSS)</label>
          <input
            style={inp}
            dir="ltr"
            placeholder="var(--gray-50)"
            value={typeof value.bgColor === "string" ? value.bgColor : ""}
            onChange={(e) => patch({ bgColor: e.target.value || undefined })}
          />
        </div>
      </div>
    </div>
  );
}
