"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { freezoneApiUrl } from "@/lib/api-internal";
import { confirmDialog } from "@/lib/confirm";
import { SECTION_TYPES } from "@/lib/cms-section-defaults";
import {
  FeaturedProductsSectionEditor,
  TabbedProductsSectionEditor,
} from "@/components/admin/content/HomeSectionPayloadEditors";
import {
  BannerSliderSectionEditor,
  BrandsStripSectionEditor,
  CategoryStripSectionEditor,
  CategoriesShowcaseSectionEditor,
  CtaSectionEditor,
  FaqSectionEditor,
  HeroSectionEditor,
  PromoGridSectionEditor,
  PromoMegaSectionEditor,
  ShowroomSectionEditor,
  SplitRichtextSectionEditor,
  TestimonialsSectionEditor,
  TrustBarSectionEditor,
} from "@/components/admin/content/HomeSectionVisualEditors";

type SectionRow = {
  id: number;
  type: string;
  visible: boolean;
  sortOrder: number;
  draftPayload: unknown;
  publishedPayload: unknown | null;
};

type CmsPage = {
  id: number;
  slug: string;
  labelAr: string;
  sections: SectionRow[];
};

function typeLabelAr(type: string) {
  return SECTION_TYPES.find((s) => s.type === type)?.labelAr ?? type;
}

/** Deep-clone JSON-serializable payload for form state (no raw JSON editing). */
function cloneDraftPayload(raw: unknown): Record<string, unknown> {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {};
  try {
    return JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

const SUPPORTED_HOME_SECTION_TYPES = new Set([
  "hero",
  "trust_bar",
  "category_strip",
  "featured_products",
  "brands_strip",
  "banner_slider",
  "categories_showcase",
  "promo_mega",
  "promo_grid",
  "tabbed_products",
  "testimonials",
  "faq",
  "cta",
  "split_richtext",
  "showroom",
]);

export default function AdminContentBuilderPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draftPayload, setDraftPayload] = useState<Record<string, unknown>>({});
  const [newType, setNewType] = useState(SECTION_TYPES[0]?.type ?? "hero");

  const load = useCallback(async () => {
    const res = await fetch(freezoneApiUrl("/api/admin/cms-page?slug=home"), { credentials: "include" });
    if (res.status === 401) {
      navigate("/admin/login", { replace: true });
      return;
    }
    if (res.status === 503) {
      setErr("قاعدة البيانات غير متاحة — أضف DATABASE_URL ونفّذ prisma migrate.");
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setErr("تعذّر تحميل الصفحة");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as CmsPage;
    setPage(data);
    setErr("");
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const sections = page?.sections ?? [];
  const selected = selectedId != null ? sections.find((s) => s.id === selectedId) : undefined;

  useEffect(() => {
    if (!selected) {
      setDraftPayload({});
      return;
    }
    setDraftPayload(cloneDraftPayload(selected.draftPayload));
  }, [selected]);

  async function saveDraft() {
    if (!selected) return;
    const res = await fetch(freezoneApiUrl(`/api/admin/cms-page/sections/${selected.id}`), {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftPayload }),
    });
    if (!res.ok) {
      setErr("فشل حفظ المسودة");
      return;
    }
    setErr("");
    setMsg("تم حفظ المسودة");
    await load();
  }

  async function toggleVisible(s: SectionRow) {
    await fetch(freezoneApiUrl(`/api/admin/cms-page/sections/${s.id}`), {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible: !s.visible }),
    });
    await load();
  }

  async function publishAll() {
    if (
      !(await confirmDialog({
        title: "نشر الصفحة",
        message:
          "سيُنسَخ محتوى «المسودة» الحالي لكل مكوّنات الصفحة إلى «المنشور». الزوار يرون النسخة المنشورة فقط. متابعة؟",
        confirmLabel: "نشر",
      }))
    ) {
      return;
    }
    const res = await fetch(freezoneApiUrl("/api/admin/cms-page/publish"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "home" }),
    });
    if (!res.ok) {
      setErr("فشل النشر");
      return;
    }
    setErr("");
    setMsg("تم نشر جميع مكوّنات الصفحة");
    await load();
  }

  async function reorder(ordered: SectionRow[]) {
    const res = await fetch(freezoneApiUrl("/api/admin/cms-page/reorder"), {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: ordered.map((s) => s.id) }),
    });
    if (!res.ok) setErr("فشل إعادة الترتيب");
    else await load();
  }

  async function move(idx: number, dir: -1 | 1) {
    const list = [...sections];
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    const t = list[idx];
    list[idx] = list[j];
    list[j] = t;
    await reorder(list);
  }

  async function addSection() {
    const res = await fetch(freezoneApiUrl("/api/admin/cms-page/sections"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageSlug: "home", type: newType }),
    });
    if (!res.ok) {
      setErr("فشل إنشاء المكوّن");
      return;
    }
    setMsg("تمت إضافة مكوّن");
    await load();
  }

  async function duplicateSection(id: number) {
    const res = await fetch(freezoneApiUrl("/api/admin/cms-page/sections"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duplicateSectionId: id }),
    });
    if (!res.ok) {
      setErr("فشل النسخ");
      return;
    }
    await load();
  }

  async function deleteSection(id: number) {
    if (!(await confirmDialog({ title: "حذف مكوّن", message: "حذف هذا المكوّن؟", confirmLabel: "حذف", danger: true }))) return;
    await fetch(freezoneApiUrl(`/api/admin/cms-page/sections/${id}`), { method: "DELETE", credentials: "include" });
    setSelectedId(null);
    await load();
  }

  if (loading) return <div style={{ padding: 24 }}>جاري التحميل…</div>;

  return (
    <div style={{ padding: "16px 0", width: "100%" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0, flex: 1 }}>بناء الصفحة الرئيسية</h1>
        <Link to="/admin/media" style={{ color: "var(--admin-muted)", fontSize: 14 }}>
          مكتبة الوسائط
        </Link>
        <Link to="/admin/cms" style={{ color: "var(--admin-muted)", fontSize: 14 }}>
          إعدادات الموقع
        </Link>
      </div>
      <p style={{ color: "var(--admin-muted)", fontSize: 14, marginBottom: 16 }}>
        رتّب <strong>مكوّنات الصفحة</strong> من اليسار (↑↓). <strong>كل نوع</strong> له نموذج تحرير (أو شرح واضح إن كان المحتوى من الكتالوج/الإعدادات).
        لشرائح منتجات أفقية بعدّة فئات، أضِف مكوّناً من نوع «شريط منتجات أفقي» أكثر من مرة واستخدم الأزرار السريعة داخل المحرر.
        التحرير بالكامل من النماذج — دون JSON. روابط الصور من{" "}
        <Link to="/admin/media" style={{ color: "#0b1f3b" }}>
          مكتبة الوسائط
        </Link>
        . انقر «نشر كل المكوّنات» ليظهر المحتوى للزوار.
      </p>
      {err && <div style={{ color: "#fecaca", marginBottom: 10 }}>{err}</div>}
      {msg && <div style={{ color: "#86efac", marginBottom: 10 }}>{msg}</div>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => void publishAll()}
          style={{
            padding: "10px 18px",
            background: "#15803d",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          نشر كل المكوّنات للزوار
        </button>
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
          style={{ padding: 10, borderRadius: 8, background: "var(--admin-surface)", color: "var(--admin-text)", border: "1px solid #334155" }}
        >
          {SECTION_TYPES.map((t) => (
            <option key={t.type} value={t.type}>
              {t.labelAr}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void addSection()}
          style={{ padding: "10px 16px", background: "#0b1f3b", color: "#fff", border: "none", borderRadius: 8 }}
        >
          + مكوّن من قالب
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 360px) 1fr", gap: 20, alignItems: "start" }}>
        <div style={{ border: "1px solid #334155", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: 12, background: "var(--admin-surface)", borderBottom: "1px solid #334155", fontWeight: 700 }}>
            مكوّنات الصفحة (من الأعلى للأسفل)
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {sections.map((s, idx) => {
              const published = s.publishedPayload != null;
              const on = selectedId === s.id;
              return (
                <li
                  key={s.id}
                  style={{
                    borderBottom: "1px solid var(--admin-border)",
                    background: on ? "#1e1b4b" : "transparent",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    style={{
                      width: "100%",
                      textAlign: "right",
                      padding: 12,
                      background: "transparent",
                      border: "none",
                      color: "var(--admin-text)",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{typeLabelAr(s.type)}</div>
                    <div style={{ fontSize: 11, color: "var(--admin-muted)", marginTop: 4 }}>
                      {published ? "منشور ✓" : "مسودة فقط"} · {s.visible ? "ظاهر" : "مخفي"}
                    </div>
                  </button>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 10px 10px" }}>
                    <button
                      type="button"
                      onClick={() => void move(idx, -1)}
                      disabled={idx === 0}
                      style={miniBtn}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => void move(idx, 1)}
                      disabled={idx === sections.length - 1}
                      style={miniBtn}
                    >
                      ↓
                    </button>
                    <button type="button" onClick={() => void toggleVisible(s)} style={miniBtn}>
                      {s.visible ? "إخفاء" : "إظهار"}
                    </button>
                    <button type="button" onClick={() => void duplicateSection(s.id)} style={miniBtn}>
                      نسخ
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteSection(s.id)}
                      style={{ ...miniBtn, borderColor: "#7f1d1d", color: "#fecaca" }}
                    >
                      حذف
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          {sections.length === 0 && <p style={{ padding: 16, color: "#64748b" }}>لا مكوّنات بعد — أضف من قالب.</p>}
        </div>

        <div style={{ border: "1px solid #334155", borderRadius: 10, padding: 16, minHeight: 320 }}>
          {!selected ? (
            <p style={{ color: "#64748b" }}>اختر مكوّناً من القائمة لتحرير المسودة.</p>
          ) : (
            <>
              <h2 style={{ marginTop: 0 }}>{typeLabelAr(selected.type)}</h2>
              <p style={{ fontSize: 13, color: "var(--admin-muted)" }}>
                النوع: <code>{selected.type}</code>
              </p>
              {!SUPPORTED_HOME_SECTION_TYPES.has(selected.type) ? (
                <p style={{ color: "#fbbf24", fontSize: 13, marginBottom: 12 }}>
                  لا يوجد نموذج تحرير لهذا النوع ({selected.type}). يمكنك حفظ المسودة دون تغيير أو حذف المكوّن وإضافة نوعاً
                  من القائمة اليسرى.
                </p>
              ) : null}
              {selected.type === "hero" ? (
                <div style={{ marginBottom: 16 }}>
                  <HeroSectionEditor value={draftPayload} onChange={setDraftPayload} />
                </div>
              ) : null}
              {selected.type === "trust_bar" ? (
                <div style={{ marginBottom: 16 }}>
                  <TrustBarSectionEditor value={draftPayload} onChange={setDraftPayload} />
                </div>
              ) : null}
              {selected.type === "category_strip" ? (
                <div style={{ marginBottom: 16 }}>
                  <CategoryStripSectionEditor value={draftPayload} onChange={setDraftPayload} />
                </div>
              ) : null}
              {selected.type === "featured_products" ? (
                <div style={{ marginBottom: 16 }}>
                  <FeaturedProductsSectionEditor value={draftPayload} onChange={setDraftPayload} />
                </div>
              ) : null}
              {selected.type === "brands_strip" ? (
                <div style={{ marginBottom: 16 }}>
                  <BrandsStripSectionEditor value={draftPayload} onChange={setDraftPayload} />
                </div>
              ) : null}
              {selected.type === "banner_slider" ? (
                <div style={{ marginBottom: 16 }}>
                  <BannerSliderSectionEditor value={draftPayload} onChange={setDraftPayload} />
                </div>
              ) : null}
              {selected.type === "categories_showcase" ? (
                <div style={{ marginBottom: 16 }}>
                  <CategoriesShowcaseSectionEditor />
                </div>
              ) : null}
              {selected.type === "promo_mega" ? (
                <div style={{ marginBottom: 16 }}>
                  <PromoMegaSectionEditor value={draftPayload} onChange={setDraftPayload} />
                </div>
              ) : null}
              {selected.type === "promo_grid" ? (
                <div style={{ marginBottom: 16 }}>
                  <PromoGridSectionEditor value={draftPayload} onChange={setDraftPayload} />
                </div>
              ) : null}
              {selected.type === "tabbed_products" ? (
                <div style={{ marginBottom: 16 }}>
                  <TabbedProductsSectionEditor value={draftPayload} onChange={setDraftPayload} />
                </div>
              ) : null}
              {selected.type === "testimonials" ? (
                <div style={{ marginBottom: 16 }}>
                  <TestimonialsSectionEditor value={draftPayload} onChange={setDraftPayload} />
                </div>
              ) : null}
              {selected.type === "faq" ? (
                <div style={{ marginBottom: 16 }}>
                  <FaqSectionEditor value={draftPayload} onChange={setDraftPayload} />
                </div>
              ) : null}
              {selected.type === "cta" ? (
                <div style={{ marginBottom: 16 }}>
                  <CtaSectionEditor value={draftPayload} onChange={setDraftPayload} />
                </div>
              ) : null}
              {selected.type === "split_richtext" ? (
                <div style={{ marginBottom: 16 }}>
                  <SplitRichtextSectionEditor value={draftPayload} onChange={setDraftPayload} />
                </div>
              ) : null}
              {selected.type === "showroom" ? (
                <div style={{ marginBottom: 16 }}>
                  <ShowroomSectionEditor />
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => void saveDraft()}
                style={{
                  marginTop: 12,
                  padding: "10px 20px",
                  background: "#0b1f3b",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 700,
                }}
              >
                حفظ المسودة
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const miniBtn: CSSProperties = {
  padding: "4px 8px",
  fontSize: 12,
  borderRadius: 6,
  border: "1px solid #475569",
  background: "var(--admin-surface-muted)",
  color: "var(--admin-text)",
  cursor: "pointer",
};
