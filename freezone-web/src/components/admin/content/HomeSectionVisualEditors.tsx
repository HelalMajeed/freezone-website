"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { LUCIDE_ICON_PICKER_OPTIONS } from "@/lib/lucide-icon-map";
import { parsePromoMegaSlots, promoMegaCardCount, type PromoMegaSlotDraft } from "@/lib/home-promo-mega";
import { freezoneApiUrl } from "@/lib/api-internal";
import { HeroDestLinkEditor } from "@/components/admin/HeroDestLinkEditor";

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

const miniBtn: CSSProperties = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid #475569",
  background: "var(--admin-surface-inset)",
  color: "var(--admin-text)",
  cursor: "pointer",
  fontSize: 12,
};

function defaultHeroSlide(): Record<string, unknown> {
  return {
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1920",
    active: true,
    badgeEn: "NEW COLLECTION",
    badgeAr: "تشكيلة جديدة",
    titleLine1En: "PREMIUM",
    titleLine1Ar: "تقنية",
    titleLine2En: "PERFORMANCE",
    titleLine2Ar: "احترافية",
    descEn: "CCTV, gaming rigs, workstations, and smart solutions.",
    descAr: "كاميرات، أنظمة ألعاب، محطات عمل، وحلول ذكية.",
    primaryLabelEn: "Shop now",
    primaryLabelAr: "تسوق الآن",
    primaryHref: "/products",
    primaryLink: null,
    secondaryLabelEn: "PC Builder",
    secondaryLabelAr: "بناء PC",
    secondaryHref: "/pc-builder",
    secondaryLink: null,
  };
}

export function HeroSectionEditor({
  value,
  onChange,
  previewLocale = "ar",
}: {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  /** لعرض أسماء المنتجات/الأقسام في القوائم */
  previewLocale?: "en" | "ar";
}) {
  const source = value.source === "custom" ? "custom" : "global";
  const autoplayMs =
    typeof value.autoplayMs === "number" && value.autoplayMs >= 2000 ? value.autoplayMs : 7000;
  const slides = Array.isArray(value.slides) ? (value.slides as Record<string, unknown>[]) : [];

  const setSource = (next: "global" | "custom") => {
    if (next === "global") {
      onChange({ source: "global" });
      return;
    }
    onChange({
      source: "custom",
      autoplayMs: typeof value.autoplayMs === "number" ? value.autoplayMs : 7000,
      slides: slides.length ? slides : [defaultHeroSlide()],
    });
  };

  const updateSlides = (nextSlides: Record<string, unknown>[]) => {
    onChange({ ...value, source: "custom", slides: nextSlides });
  };

  const patchSlide = (idx: number, patch: Record<string, unknown>) => {
    const next = slides.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    updateSlides(next);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 13, color: "var(--admin-muted)", margin: 0 }}>
        اختر <strong>عالمي</strong> لاستخدام شرائح الهيرو من{" "}
        <Link to="/admin/cms" style={{ color: "#0b1f3b" }}>
          إعدادات الموقع → تبويب الهيرو
        </Link>
        ، أو <strong>مخصص</strong> لتحرير الشرائح هنا (صور وعناوين عربي/إنجليزي).
      </p>
      <div>
        <label style={labelStyle}>مصدر الهيرو</label>
        <select style={inp} value={source} onChange={(e) => setSource(e.target.value as "global" | "custom")}>
          <option value="global">عالمي — من إعدادات الموقع</option>
          <option value="custom">مخصص — لهذه الصفحة فقط</option>
        </select>
      </div>

      {source === "custom" ? (
        <>
          <div>
            <label style={labelStyle}>مدة العرض التلقائي (ملّي ثانية، ≥ 2500)</label>
            <input
              style={inp}
              type="number"
              min={2500}
              max={60000}
              step={500}
              value={autoplayMs}
              onChange={(e) =>
                onChange({
                  ...value,
                  source: "custom",
                  autoplayMs: Number(e.target.value) || 7000,
                  slides: slides.length ? slides : [defaultHeroSlide()],
                })
              }
            />
          </div>
          <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
            الصور: الصق رابطاً من{" "}
            <Link to="/admin/media" style={{ color: "#0b1f3b" }}>
              مكتبة الوسائط
            </Link>{" "}
            أو أي URL عام.
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ color: "var(--admin-text)" }}>الشرائح</strong>
            <button
              type="button"
              style={miniBtn}
              onClick={() => updateSlides([...slides, defaultHeroSlide()])}
            >
              + شريحة
            </button>
          </div>
          {slides.map((slide, idx) => (
            <div
              key={idx}
              style={{
                border: "1px solid #1e293b",
                borderRadius: 10,
                padding: 12,
                background: "var(--admin-surface-muted)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "#64748b" }}>شريحة #{idx + 1}</span>
                <button
                  type="button"
                  style={{ fontSize: 12, color: "#fecaca", background: "none", border: "none", cursor: "pointer" }}
                  onClick={() => updateSlides(slides.filter((_, j) => j !== idx))}
                >
                  حذف
                </button>
              </div>
              <label style={labelStyle}>رابط صورة الخلفية</label>
              <input
                style={{ ...inp, marginBottom: 10 }}
                dir="ltr"
                value={typeof slide.image === "string" ? slide.image : ""}
                onChange={(e) => patchSlide(idx, { image: e.target.value })}
              />
              <label style={labelStyle}>
                <input
                  type="checkbox"
                  checked={slide.active !== false}
                  onChange={(e) => patchSlide(idx, { active: e.target.checked })}
                />{" "}
                نشط
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                <div>
                  <label style={labelStyle}>شارة (EN)</label>
                  <input
                    style={inp}
                    dir="ltr"
                    value={typeof slide.badgeEn === "string" ? slide.badgeEn : ""}
                    onChange={(e) => patchSlide(idx, { badgeEn: e.target.value })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>شارة (عربي)</label>
                  <input
                    style={inp}
                    value={typeof slide.badgeAr === "string" ? slide.badgeAr : ""}
                    onChange={(e) => patchSlide(idx, { badgeAr: e.target.value })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>سطر العنوان 1 (EN)</label>
                  <input
                    style={inp}
                    dir="ltr"
                    value={typeof slide.titleLine1En === "string" ? slide.titleLine1En : ""}
                    onChange={(e) => patchSlide(idx, { titleLine1En: e.target.value })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>سطر العنوان 1 (عربي)</label>
                  <input
                    style={inp}
                    value={typeof slide.titleLine1Ar === "string" ? slide.titleLine1Ar : ""}
                    onChange={(e) => patchSlide(idx, { titleLine1Ar: e.target.value })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>سطر العنوان 2 (EN)</label>
                  <input
                    style={inp}
                    dir="ltr"
                    value={typeof slide.titleLine2En === "string" ? slide.titleLine2En : ""}
                    onChange={(e) => patchSlide(idx, { titleLine2En: e.target.value })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>سطر العنوان 2 (عربي)</label>
                  <input
                    style={inp}
                    value={typeof slide.titleLine2Ar === "string" ? slide.titleLine2Ar : ""}
                    onChange={(e) => patchSlide(idx, { titleLine2Ar: e.target.value })}
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>وصف (EN)</label>
                  <textarea
                    style={{ ...inp, minHeight: 56, resize: "vertical" }}
                    dir="ltr"
                    value={typeof slide.descEn === "string" ? slide.descEn : ""}
                    onChange={(e) => patchSlide(idx, { descEn: e.target.value })}
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>وصف (عربي)</label>
                  <textarea
                    style={{ ...inp, minHeight: 56, resize: "vertical" }}
                    value={typeof slide.descAr === "string" ? slide.descAr : ""}
                    onChange={(e) => patchSlide(idx, { descAr: e.target.value })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>زر رئيسي — نص (EN)</label>
                  <input
                    style={inp}
                    dir="ltr"
                    value={typeof slide.primaryLabelEn === "string" ? slide.primaryLabelEn : ""}
                    onChange={(e) => patchSlide(idx, { primaryLabelEn: e.target.value })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>زر رئيسي — نص (عربي)</label>
                  <input
                    style={inp}
                    value={typeof slide.primaryLabelAr === "string" ? slide.primaryLabelAr : ""}
                    onChange={(e) => patchSlide(idx, { primaryLabelAr: e.target.value })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>زر ثانوي — نص (EN)</label>
                  <input
                    style={inp}
                    dir="ltr"
                    value={typeof slide.secondaryLabelEn === "string" ? slide.secondaryLabelEn : ""}
                    onChange={(e) => patchSlide(idx, { secondaryLabelEn: e.target.value })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>زر ثانوي — نص (عربي)</label>
                  <input
                    style={inp}
                    value={typeof slide.secondaryLabelAr === "string" ? slide.secondaryLabelAr : ""}
                    onChange={(e) => patchSlide(idx, { secondaryLabelAr: e.target.value })}
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <HeroDestLinkEditor
                    title="الزر الرئيسي — الوجهة"
                    href={typeof slide.primaryHref === "string" ? slide.primaryHref : "/products"}
                    linkTarget={slide.primaryLink}
                    locale={previewLocale}
                    onChange={({ href, linkTarget }) =>
                      patchSlide(idx, { primaryHref: href, primaryLink: linkTarget })
                    }
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <HeroDestLinkEditor
                    title="الزر الثانوي — الوجهة"
                    href={typeof slide.secondaryHref === "string" ? slide.secondaryHref : "/products"}
                    linkTarget={slide.secondaryLink}
                    locale={previewLocale}
                    onChange={({ href, linkTarget }) =>
                      patchSlide(idx, { secondaryHref: href, secondaryLink: linkTarget })
                    }
                  />
                </div>
              </div>
            </div>
          ))}
          {slides.length === 0 && (
            <button type="button" style={{ ...miniBtn, alignSelf: "flex-start" }} onClick={() => updateSlides([defaultHeroSlide()])}>
              + إضافة أول شريحة
            </button>
          )}
        </>
      ) : null}
    </div>
  );
}

function defaultTrustItem(): Record<string, unknown> {
  return { iconKey: "truck", textEn: "Fast delivery", textAr: "توصيل سريع" };
}

export function TrustBarSectionEditor({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const source = value.source === "custom" ? "custom" : "global";
  const items = Array.isArray(value.items) ? (value.items as Record<string, unknown>[]) : [];

  const setSource = (next: "global" | "custom") => {
    if (next === "global") {
      onChange({ source: "global" });
      return;
    }
    onChange({
      source: "custom",
      items: items.length ? items : [defaultTrustItem(), defaultTrustItem(), defaultTrustItem()],
    });
  };

  const push = (next: Record<string, unknown>[]) => onChange({ ...value, source: "custom", items: next });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13, color: "var(--admin-muted)", margin: 0 }}>
        شريط الثقة: عالمي من إعدادات الموقع، أو مخصص بعناصر (أيقونة + نص عربي/إنجليزي).
      </p>
      <div>
        <label style={labelStyle}>المصدر</label>
        <select style={inp} value={source} onChange={(e) => setSource(e.target.value as "global" | "custom")}>
          <option value="global">عالمي</option>
          <option value="custom">مخصص</option>
        </select>
      </div>
      {source === "custom" ? (
        <>
          <button type="button" style={{ ...miniBtn, alignSelf: "flex-start" }} onClick={() => push([...items, defaultTrustItem()])}>
            + عنصر
          </button>
          {items.map((row, idx) => (
            <div key={idx} style={{ border: "1px solid #1e293b", borderRadius: 10, padding: 12, background: "var(--admin-surface-muted)" }}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                <button
                  type="button"
                  style={{ fontSize: 12, color: "#fecaca", background: "none", border: "none", cursor: "pointer" }}
                  onClick={() => push(items.filter((_, j) => j !== idx))}
                >
                  حذف
                </button>
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>الأيقونة</label>
                <select
                  style={inp}
                  value={typeof row.iconKey === "string" ? row.iconKey : "truck"}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...row, iconKey: e.target.value };
                    push(next);
                  }}
                >
                  {LUCIDE_ICON_PICKER_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.labelAr} / {o.key}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={labelStyle}>النص (EN)</label>
                  <input
                    style={inp}
                    dir="ltr"
                    value={typeof row.textEn === "string" ? row.textEn : ""}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...row, textEn: e.target.value };
                      push(next);
                    }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>النص (عربي)</label>
                  <input
                    style={inp}
                    value={typeof row.textAr === "string" ? row.textAr : ""}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...row, textAr: e.target.value };
                      push(next);
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}

function defaultSpot(): Record<string, unknown> {
  return {
    labelEn: "Laptops",
    labelAr: "لابتوبات",
    href: "/products?cat=gaming",
    iconKey: "laptop",
    imageUrl: "",
  };
}

export function CategoryStripSectionEditor({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const source = value.source === "custom" ? "custom" : "global";
  const spots = Array.isArray(value.spots) ? (value.spots as Record<string, unknown>[]) : [];

  const setSource = (next: "global" | "custom") => {
    if (next === "global") {
      onChange({ source: "global" });
      return;
    }
    onChange({
      source: "custom",
      spots: spots.length ? spots : [defaultSpot(), defaultSpot()],
    });
  };

  const push = (next: Record<string, unknown>[]) => onChange({ ...value, source: "custom", spots: next });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13, color: "var(--admin-muted)", margin: 0 }}>
        أيقونات الأقسام: عالمي من بيانات الموقع، أو مخصص (اسم، رابط، أيقونة، وصورة اختيارية بدل الأيقونة).
      </p>
      <div>
        <label style={labelStyle}>المصدر</label>
        <select style={inp} value={source} onChange={(e) => setSource(e.target.value as "global" | "custom")}>
          <option value="global">عالمي</option>
          <option value="custom">مخصص</option>
        </select>
      </div>
      {source === "custom" ? (
        <>
          <button type="button" style={{ ...miniBtn, alignSelf: "flex-start" }} onClick={() => push([...spots, defaultSpot()])}>
            + عنصر
          </button>
          {spots.map((row, idx) => (
            <div key={idx} style={{ border: "1px solid #1e293b", borderRadius: 10, padding: 12, background: "var(--admin-surface-muted)" }}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                <button
                  type="button"
                  style={{ fontSize: 12, color: "#fecaca", background: "none", border: "none", cursor: "pointer" }}
                  onClick={() => push(spots.filter((_, j) => j !== idx))}
                >
                  حذف
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={labelStyle}>الاسم (EN)</label>
                  <input
                    style={inp}
                    dir="ltr"
                    value={typeof row.labelEn === "string" ? row.labelEn : ""}
                    onChange={(e) => {
                      const next = [...spots];
                      next[idx] = { ...row, labelEn: e.target.value };
                      push(next);
                    }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>الاسم (عربي)</label>
                  <input
                    style={inp}
                    value={typeof row.labelAr === "string" ? row.labelAr : ""}
                    onChange={(e) => {
                      const next = [...spots];
                      next[idx] = { ...row, labelAr: e.target.value };
                      push(next);
                    }}
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>الرابط</label>
                  <input
                    style={inp}
                    dir="ltr"
                    value={typeof row.href === "string" ? row.href : ""}
                    onChange={(e) => {
                      const next = [...spots];
                      next[idx] = { ...row, href: e.target.value };
                      push(next);
                    }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>أيقونة (إن لم تُرفع صورة)</label>
                  <select
                    style={inp}
                    value={typeof row.iconKey === "string" ? row.iconKey : "laptop"}
                    onChange={(e) => {
                      const next = [...spots];
                      next[idx] = { ...row, iconKey: e.target.value };
                      push(next);
                    }}
                  >
                    {LUCIDE_ICON_PICKER_OPTIONS.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.labelAr} / {o.key}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>صورة اختيارية (URL)</label>
                  <input
                    style={inp}
                    dir="ltr"
                    placeholder="فارغ = أيقونة"
                    value={typeof row.imageUrl === "string" ? row.imageUrl : ""}
                    onChange={(e) => {
                      const next = [...spots];
                      next[idx] = { ...row, imageUrl: e.target.value };
                      push(next);
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}

function defaultBannerItem(): Record<string, unknown> {
  return {
    titleAr: "عنوان",
    titleEn: "Title",
    imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200",
    href: "/products",
  };
}

/** Shared editor for `banner_slider` and `promo_grid` (array of image promos). */
function PromoBannerItemsEditor({
  value,
  onChange,
  heading,
}: {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  heading: string;
}) {
  const raw = Array.isArray(value.items) ? (value.items as Record<string, unknown>[]) : [];
  const items = raw.length ? raw : [defaultBannerItem()];
  const push = (next: Record<string, unknown>[]) => onChange({ ...value, items: next });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13, color: "var(--admin-muted)", margin: 0 }}>{heading}</p>
      <button type="button" style={{ ...miniBtn, alignSelf: "flex-start" }} onClick={() => push([...items, defaultBannerItem()])}>
        + بانر
      </button>
      {items.map((row, idx) => (
        <div key={idx} style={{ border: "1px solid #1e293b", borderRadius: 10, padding: 12, background: "var(--admin-surface-muted)" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button
              type="button"
              style={{ fontSize: 12, color: "#fecaca", background: "none", border: "none", cursor: "pointer" }}
              onClick={() => push(items.filter((_, j) => j !== idx))}
            >
              حذف
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <label style={labelStyle}>عنوان (عربي)</label>
              <input
                style={inp}
                value={typeof row.titleAr === "string" ? row.titleAr : ""}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...row, titleAr: e.target.value };
                  push(next);
                }}
              />
            </div>
            <div>
              <label style={labelStyle}>Title (EN)</label>
              <input
                style={inp}
                dir="ltr"
                value={typeof row.titleEn === "string" ? row.titleEn : ""}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...row, titleEn: e.target.value };
                  push(next);
                }}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>رابط الصورة (URL)</label>
              <input
                style={inp}
                dir="ltr"
                value={typeof row.imageUrl === "string" ? row.imageUrl : ""}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...row, imageUrl: e.target.value };
                  push(next);
                }}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>الرابط عند النقر</label>
              <input
                style={inp}
                dir="ltr"
                value={typeof row.href === "string" ? row.href : ""}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...row, href: e.target.value };
                  push(next);
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function BannerSliderSectionEditor(props: {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  return (
    <PromoBannerItemsEditor
      {...props}
      heading="بانرات أفقية قابلة للتمرير. أضف صوراً من مكتبة الوسائط وروابط لكل بانر."
    />
  );
}

export function PromoGridSectionEditor(props: {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  return (
    <PromoBannerItemsEditor
      {...props}
      heading="شبكة بطاقات عروض (صورة + عنوان + رابط). مناسبة لعروض متعددة في صف واحدة."
    />
  );
}

export function BrandsStripSectionEditor({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const titleAr = typeof value.titleAr === "string" ? value.titleAr : "";
  const titleEn = typeof value.titleEn === "string" ? value.titleEn : "";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13, color: "var(--admin-muted)", margin: 0 }}>
        عنوان اختياري فوق شريط العلامات التجارية (الشعارات من إعدادات الموقع / الكتالوج).
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>العنوان (عربي)</label>
          <input style={inp} value={titleAr} onChange={(e) => onChange({ ...value, titleAr: e.target.value })} />
        </div>
        <div>
          <label style={labelStyle}>Title (EN)</label>
          <input
            style={inp}
            dir="ltr"
            value={titleEn}
            onChange={(e) => onChange({ ...value, titleEn: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

export function CategoriesShowcaseSectionEditor() {
  return (
    <div style={{ fontSize: 13, color: "var(--admin-muted)", lineHeight: 1.6 }}>
      <p style={{ margin: "0 0 8px" }}>
        <strong>شبكة أقسام الألعاب</strong> تبني نفسها تلقائياً من <strong>أول أربع فئات</strong> في الكتالوج (الأسماء، الألوان،
        والروابط). لا توجد حقول إضافية في المسودة — عدّل الفئات من إدارة المنتجات إن أردت تغيير ما يظهر هنا.
      </p>
    </div>
  );
}

type AdminCatRow = { id: number; slug: string; nameEn: string; nameAr?: string };

export function PromoMegaSectionEditor({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const [cats, setCats] = useState<AdminCatRow[]>([]);
  const count = promoMegaCardCount(value);
  const slots = parsePromoMegaSlots(value.slots);
  const customMode = slots.length > 0;

  useEffect(() => {
    let cancelled = false;
    void fetch(freezoneApiUrl("/api/admin/categories"), { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: unknown) => {
        if (cancelled || !Array.isArray(rows)) return;
        setCats(
          rows
            .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : null))
            .filter(Boolean)
            .map((r) => ({
              id: Number(r!.id),
              slug: String(r!.slug ?? "").trim(),
              nameEn: String(r!.nameEn ?? "").trim(),
              nameAr: typeof r!.nameAr === "string" ? r!.nameAr : "",
            }))
            .filter((c) => c.slug.length > 0 && Number.isFinite(c.id)),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setCount = (n: number) => onChange({ ...value, count: Math.min(6, Math.max(1, Math.floor(n))) });

  const setSlots = (next: PromoMegaSlotDraft[]) => {
    onChange({ ...value, slots: next.map((s) => (s.imageUrl ? { slug: s.slug, imageUrl: s.imageUrl } : { slug: s.slug })) });
  };

  const enableCustom = () => {
    const seed: PromoMegaSlotDraft[] =
      slots.length > 0
        ? slots
        : cats.slice(0, Math.min(count, cats.length)).map((c) => ({ slug: c.slug }));
    setSlots(seed.length ? seed : [{ slug: cats[0]?.slug ?? "gaming" }]);
  };

  const disableCustom = () => {
    onChange({ ...value, slots: [] });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 13, color: "var(--admin-muted)", lineHeight: 1.6, margin: 0 }}>
        <strong>ميجا بلوكات:</strong> بطاقات كبيرة تربط بصفحة المنتجات حسب الفئة. يمكنك الاعتماد على{" "}
        <strong>ترتيب الفئات في الكتالوج</strong> (من{" "}
        <Link to="/admin/categories" style={{ color: "#f87171" }}>
          إدارة التصنيفات
        </Link>
        ) أو تحديد فئات وصور هنا. الصورة الافتراضية لكل بطاقة: صورة الخلفية المحفوظة للفئة، وإلا صورة احتياطية من القالب.
      </p>

      <div>
        <label style={labelStyle}>عدد البطاقات (1–6)</label>
        <input
          type="number"
          min={1}
          max={6}
          style={{ ...inp, maxWidth: 120 }}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
        />
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
        <input
          type="checkbox"
          checked={customMode}
          onChange={(e) => {
            if (e.target.checked) enableCustom();
            else disableCustom();
          }}
        />
        <span>ترتيب وفئات محددة (بدلاً من أول الفئات تلقائياً)</span>
      </label>

      {customMode ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button type="button" style={{ ...miniBtn, alignSelf: "flex-start" }} onClick={() => setSlots([...slots, { slug: cats[0]?.slug ?? "" }])}>
            + صف فئة
          </button>
          {slots.map((row, idx) => (
            <div
              key={idx}
              style={{ border: "1px solid #334155", borderRadius: 10, padding: 12, background: "var(--admin-surface-muted)" }}
            >
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                <button
                  type="button"
                  style={{ fontSize: 12, color: "#fecaca", background: "none", border: "none", cursor: "pointer" }}
                  onClick={() => setSlots(slots.filter((_, j) => j !== idx))}
                >
                  حذف
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={labelStyle}>الفئة (slug)</label>
                  <select
                    style={inp}
                    value={row.slug}
                    onChange={(e) => {
                      const next = [...slots];
                      next[idx] = { ...row, slug: e.target.value };
                      setSlots(next);
                    }}
                  >
                    {cats.length === 0 ? <option value="">— جاري التحميل —</option> : null}
                    {row.slug && !cats.some((c) => c.slug === row.slug) ? (
                      <option value={row.slug}>
                        {row.slug} (غير في القائمة)
                      </option>
                    ) : null}
                    {cats.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.slug} — {c.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>صورة البطاقة (اختياري — يغلب صورة الفئة)</label>
                  <input
                    style={{ ...inp, direction: "ltr" }}
                    dir="ltr"
                    placeholder="https://…"
                    value={row.imageUrl ?? ""}
                    onChange={(e) => {
                      const next = [...slots];
                      next[idx] = { ...row, imageUrl: e.target.value };
                      setSlots(next);
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ShowroomSectionEditor() {
  return (
    <div style={{ fontSize: 13, color: "var(--admin-muted)", lineHeight: 1.6 }}>
      <p style={{ margin: "0 0 8px" }}>
        <strong>معرض الصور</strong> يستخدم وسائط المعرض من{" "}
        <Link to="/admin/cms" style={{ color: "#0b1f3b" }}>
          إعدادات الموقع → معرض الصور
        </Link>{" "}
        والعناوين من نسخ الصفحة. المسودة الافتراضية <code style={{ color: "#cbd5e1" }}>source: global</code> تكفي.
      </p>
    </div>
  );
}

function defaultTestimonial(): Record<string, unknown> {
  return { textAr: "", textEn: "", nameAr: "", nameEn: "" };
}

export function TestimonialsSectionEditor({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const raw = Array.isArray(value.items) ? (value.items as Record<string, unknown>[]) : [];
  const items = raw.length ? raw : [defaultTestimonial()];
  const push = (next: Record<string, unknown>[]) => onChange({ ...value, items: next });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13, color: "var(--admin-muted)", margin: 0 }}>آراء العملاء — نص واسم لكل بطاقة (عربي / إنجليزي).</p>
      <button type="button" style={{ ...miniBtn, alignSelf: "flex-start" }} onClick={() => push([...items, defaultTestimonial()])}>
        + رأي
      </button>
      {items.map((row, idx) => (
        <div key={idx} style={{ border: "1px solid #1e293b", borderRadius: 10, padding: 12, background: "var(--admin-surface-muted)" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button
              type="button"
              style={{ fontSize: 12, color: "#fecaca", background: "none", border: "none", cursor: "pointer" }}
              onClick={() => push(items.filter((_, j) => j !== idx))}
            >
              حذف
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>النص (عربي)</label>
              <textarea
                style={{ ...inp, minHeight: 72, resize: "vertical" as const }}
                value={typeof row.textAr === "string" ? row.textAr : ""}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...row, textAr: e.target.value };
                  push(next);
                }}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Quote (EN)</label>
              <textarea
                style={{ ...inp, minHeight: 72, resize: "vertical" as const }}
                dir="ltr"
                value={typeof row.textEn === "string" ? row.textEn : ""}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...row, textEn: e.target.value };
                  push(next);
                }}
              />
            </div>
            <div>
              <label style={labelStyle}>الاسم (عربي)</label>
              <input
                style={inp}
                value={typeof row.nameAr === "string" ? row.nameAr : ""}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...row, nameAr: e.target.value };
                  push(next);
                }}
              />
            </div>
            <div>
              <label style={labelStyle}>Name (EN)</label>
              <input
                style={inp}
                dir="ltr"
                value={typeof row.nameEn === "string" ? row.nameEn : ""}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...row, nameEn: e.target.value };
                  push(next);
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function defaultFaqPair(): Record<string, unknown> {
  return { qAr: "", qEn: "", aAr: "", aEn: "" };
}

export function FaqSectionEditor({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const mode = value.source === "i18n" || !Array.isArray(value.items) ? "i18n" : "custom";
  const raw = Array.isArray(value.items) ? (value.items as Record<string, unknown>[]) : [];
  const items = raw.length ? raw : [defaultFaqPair()];
  const push = (next: Record<string, unknown>[]) => onChange({ source: "custom", items: next });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13, color: "var(--admin-muted)", margin: 0 }}>
        إما الأسئلة من <strong>ملفات الترجمة</strong> (نفس الصفحة الافتراضية)، أو قائمة مخصصة هنا.
      </p>
      <div>
        <label style={labelStyle}>المصدر</label>
        <select
          style={inp}
          value={mode}
          onChange={(e) => {
            if (e.target.value === "i18n") onChange({ source: "i18n" });
            else onChange({ source: "custom", items: items.length ? items : [defaultFaqPair()] });
          }}
        >
          <option value="i18n">ترجمات الموقع (i18n)</option>
          <option value="custom">قائمة مخصصة</option>
        </select>
      </div>
      {mode === "custom" ? (
        <>
          <button type="button" style={{ ...miniBtn, alignSelf: "flex-start" }} onClick={() => push([...items, defaultFaqPair()])}>
            + سؤال
          </button>
          {items.map((row, idx) => (
            <div key={idx} style={{ border: "1px solid #1e293b", borderRadius: 10, padding: 12, background: "var(--admin-surface-muted)" }}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                <button
                  type="button"
                  style={{ fontSize: 12, color: "#fecaca", background: "none", border: "none", cursor: "pointer" }}
                  onClick={() => push(items.filter((_, j) => j !== idx))}
                >
                  حذف
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={labelStyle}>سؤال (عربي)</label>
                  <input
                    style={inp}
                    value={typeof row.qAr === "string" ? row.qAr : ""}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...row, qAr: e.target.value };
                      push(next);
                    }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Question (EN)</label>
                  <input
                    style={inp}
                    dir="ltr"
                    value={typeof row.qEn === "string" ? row.qEn : ""}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...row, qEn: e.target.value };
                      push(next);
                    }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>جواب (عربي)</label>
                  <textarea
                    style={{ ...inp, minHeight: 64, resize: "vertical" as const }}
                    value={typeof row.aAr === "string" ? row.aAr : ""}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...row, aAr: e.target.value };
                      push(next);
                    }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Answer (EN)</label>
                  <textarea
                    style={{ ...inp, minHeight: 64, resize: "vertical" as const }}
                    dir="ltr"
                    value={typeof row.aEn === "string" ? row.aEn : ""}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...row, aEn: e.target.value };
                      push(next);
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}

export function CtaSectionEditor({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const str = (k: string) => (typeof value[k] === "string" ? (value[k] as string) : "");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13, color: "var(--admin-muted)", margin: 0 }}>كتلة دعوة لإجراء: عناوين، زر، رابط، ولون خلفية.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>عنوان (عربي)</label>
          <input style={inp} value={str("titleAr")} onChange={(e) => onChange({ ...value, titleAr: e.target.value })} />
        </div>
        <div>
          <label style={labelStyle}>Title (EN)</label>
          <input style={inp} dir="ltr" value={str("titleEn")} onChange={(e) => onChange({ ...value, titleEn: e.target.value })} />
        </div>
        <div>
          <label style={labelStyle}>وصف فرعي (عربي)</label>
          <input style={inp} value={str("subtitleAr")} onChange={(e) => onChange({ ...value, subtitleAr: e.target.value })} />
        </div>
        <div>
          <label style={labelStyle}>Subtitle (EN)</label>
          <input
            style={inp}
            dir="ltr"
            value={str("subtitleEn")}
            onChange={(e) => onChange({ ...value, subtitleEn: e.target.value })}
          />
        </div>
        <div>
          <label style={labelStyle}>نص الزر (عربي)</label>
          <input style={inp} value={str("buttonAr")} onChange={(e) => onChange({ ...value, buttonAr: e.target.value })} />
        </div>
        <div>
          <label style={labelStyle}>Button (EN)</label>
          <input style={inp} dir="ltr" value={str("buttonEn")} onChange={(e) => onChange({ ...value, buttonEn: e.target.value })} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>رابط الزر</label>
          <input style={inp} dir="ltr" value={str("href")} onChange={(e) => onChange({ ...value, href: e.target.value })} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>لون الخلفية (CSS)</label>
          <input style={inp} dir="ltr" value={str("bg")} onChange={(e) => onChange({ ...value, bg: e.target.value })} placeholder="#0f172a" />
        </div>
      </div>
    </div>
  );
}

export function SplitRichtextSectionEditor({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const str = (k: string) => (typeof value[k] === "string" ? (value[k] as string) : "");
  const imageSide = value.imageSide === "left" ? "left" : "right";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13, color: "var(--admin-muted)", margin: 0 }}>قسم نص بجانب صورة — مناسب لصفحة تعريفية أو ميزة.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>عنوان (عربي)</label>
          <input style={inp} value={str("titleAr")} onChange={(e) => onChange({ ...value, titleAr: e.target.value })} />
        </div>
        <div>
          <label style={labelStyle}>Title (EN)</label>
          <input style={inp} dir="ltr" value={str("titleEn")} onChange={(e) => onChange({ ...value, titleEn: e.target.value })} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>النص (عربي)</label>
          <textarea
            style={{ ...inp, minHeight: 100, resize: "vertical" as const }}
            value={str("bodyAr")}
            onChange={(e) => onChange({ ...value, bodyAr: e.target.value })}
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Body (EN)</label>
          <textarea
            style={{ ...inp, minHeight: 100, resize: "vertical" as const }}
            dir="ltr"
            value={str("bodyEn")}
            onChange={(e) => onChange({ ...value, bodyEn: e.target.value })}
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>رابط الصورة</label>
          <input style={inp} dir="ltr" value={str("imageUrl")} onChange={(e) => onChange({ ...value, imageUrl: e.target.value })} />
        </div>
        <div>
          <label style={labelStyle}>موضع الصورة</label>
          <select
            style={inp}
            value={imageSide}
            onChange={(e) => onChange({ ...value, imageSide: e.target.value })}
          >
            <option value="right">يمين النص (افتراضي)</option>
            <option value="left">يسار النص</option>
          </select>
        </div>
      </div>
    </div>
  );
}
