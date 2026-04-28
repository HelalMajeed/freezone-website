"use client";

import type { CmsHeroSlideRow } from "@/lib/layout-cms";
import styles from "@/app/admin/(secure)/cms/cms.module.css";

function emptySlide(n: number): CmsHeroSlideRow {
  return {
    id: -Math.abs(Date.now() + n),
    sortOrder: n,
    layoutMode: "structured",
    freeformLayers: null,
    badgeEn: "NEW",
    badgeAr: "جديد",
    titleLine1En: "TITLE",
    titleLine1Ar: "عنوان",
    titleLine2En: "LINE 2",
    titleLine2Ar: "سطر 2",
    descEn: "Short description for this slide.",
    descAr: "وصف قصير لهذه الشريحة.",
    imageUrl: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=1920",
    primaryLabelEn: "Shop now",
    primaryLabelAr: "تسوق",
    primaryHref: "/products",
    secondaryLabelEn: "Contact",
    secondaryLabelAr: "تواصل",
    secondaryHref: "/contact",
    active: true,
    stats: null,
  };
}

type Props = {
  slides: CmsHeroSlideRow[];
  onChange: (next: CmsHeroSlideRow[]) => void;
  heroAutoplayMs: number;
  onAutoplayMsChange: (ms: number) => void;
  /** 0–100: black overlay darkness on hero images */
  heroScrimOpacityPct: number;
  onHeroScrimOpacityPctChange: (pct: number) => void;
  /** Hex + 0–100: hero prev/next chevron color */
  heroNavArrowColor: string;
  onHeroNavArrowColorChange: (hex: string) => void;
  heroNavArrowOpacityPct: number;
  onHeroNavArrowOpacityPctChange: (pct: number) => void;
  /** Hex + 0–100: arrow button box fill */
  heroNavBoxColor: string;
  onHeroNavBoxColorChange: (hex: string) => void;
  heroNavBoxOpacityPct: number;
  onHeroNavBoxOpacityPctChange: (pct: number) => void;
  onUploadSlideImage: (slideIndex: number, file: File) => void | Promise<void>;
};

export function HeroSlidesEditor({
  slides,
  onChange,
  heroAutoplayMs,
  onAutoplayMsChange,
  heroScrimOpacityPct,
  onHeroScrimOpacityPctChange,
  heroNavArrowColor,
  onHeroNavArrowColorChange,
  heroNavArrowOpacityPct,
  onHeroNavArrowOpacityPctChange,
  heroNavBoxColor,
  onHeroNavBoxColorChange,
  heroNavBoxOpacityPct,
  onHeroNavBoxOpacityPctChange,
  onUploadSlideImage,
}: Props) {
  const setSlide = (i: number, patch: Partial<CmsHeroSlideRow>) => {
    const next = [...slides];
    const cur = next[i];
    if (!cur) return;
    next[i] = { ...cur, ...patch };
    onChange(next);
  };

  return (
    <div className={styles.form}>
      <label>زمن التبديل بين الشرائح (ms)</label>
      <input
        type="number"
        min={2000}
        step={500}
        value={heroAutoplayMs}
        onChange={(e) => onAutoplayMsChange(Number(e.target.value) || 7000)}
      />
      <label>ظلمة طبقة التعتيم على صورة الهيرو (0–100٪)</label>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.min(100, Math.max(0, Math.round(heroScrimOpacityPct)))}
          onChange={(e) => onHeroScrimOpacityPctChange(Number(e.target.value))}
          style={{ flex: "1 1 180px", minWidth: 120 }}
        />
        <input
          type="number"
          min={0}
          max={100}
          value={Math.min(100, Math.max(0, Math.round(heroScrimOpacityPct)))}
          onChange={(e) =>
            onHeroScrimOpacityPctChange(Math.min(100, Math.max(0, Math.round(Number(e.target.value) || 0))))
          }
          style={{ width: 72 }}
        />
      </div>
      <p className={styles.hint}>
        0 = صورة واضحة بدون تعتيم، 100 = أقصى سواد. يُطبَّق على كل شرائح الهيرو.
      </p>

      <label>لون أسهم التنقل في الهيرو (Hex)</label>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <input
          type="color"
          aria-label="معاينة لون السهم"
          value={/^#[0-9A-Fa-f]{6}$/.test(heroNavArrowColor.trim()) ? heroNavArrowColor.trim() : "#ffffff"}
          onChange={(e) => onHeroNavArrowColorChange(e.target.value)}
        />
        <input
          type="text"
          dir="ltr"
          placeholder="#ffffff"
          value={heroNavArrowColor}
          onChange={(e) => onHeroNavArrowColorChange(e.target.value.slice(0, 32))}
          style={{ flex: "1 1 160px", minWidth: 120 }}
        />
      </div>
      <label>شفافية الأسهم (0–100٪)</label>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.min(100, Math.max(0, Math.round(heroNavArrowOpacityPct)))}
          onChange={(e) => onHeroNavArrowOpacityPctChange(Number(e.target.value))}
          style={{ flex: "1 1 180px", minWidth: 120 }}
        />
        <input
          type="number"
          min={0}
          max={100}
          value={Math.min(100, Math.max(0, Math.round(heroNavArrowOpacityPct)))}
          onChange={(e) =>
            onHeroNavArrowOpacityPctChange(
              Math.min(100, Math.max(0, Math.round(Number(e.target.value) || 0))),
            )
          }
          style={{ width: 72 }}
        />
      </div>

      <label>لون خلفية مربّع الأسهم (Hex)</label>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <input
          type="color"
          aria-label="معاينة لون الخلفية"
          value={/^#[0-9A-Fa-f]{6}$/.test(heroNavBoxColor.trim()) ? heroNavBoxColor.trim() : "#ffffff"}
          onChange={(e) => onHeroNavBoxColorChange(e.target.value)}
        />
        <input
          type="text"
          dir="ltr"
          placeholder="#ffffff"
          value={heroNavBoxColor}
          onChange={(e) => onHeroNavBoxColorChange(e.target.value.slice(0, 32))}
          style={{ flex: "1 1 160px", minWidth: 120 }}
        />
      </div>
      <label>شفافية خلفية المربّع (0–100٪)</label>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.min(100, Math.max(0, Math.round(heroNavBoxOpacityPct)))}
          onChange={(e) => onHeroNavBoxOpacityPctChange(Number(e.target.value))}
          style={{ flex: "1 1 180px", minWidth: 120 }}
        />
        <input
          type="number"
          min={0}
          max={100}
          value={Math.min(100, Math.max(0, Math.round(heroNavBoxOpacityPct)))}
          onChange={(e) =>
            onHeroNavBoxOpacityPctChange(
              Math.min(100, Math.max(0, Math.round(Number(e.target.value) || 0))),
            )
          }
          style={{ width: 72 }}
        />
      </div>
      <p className={styles.hint}>
        يُحسب اللون النهائي كـ rgba من الـ Hex والشفافية. عند التمرير يبقى تمييز الأزرار بلون المظهر الأساسي.
      </p>

      <p className={styles.hint}>
        عدّل النصوص والروابط لكل شريحة. ارفع صورة الخلفية من الحقل أدناه لكل شريحة.
      </p>

      {slides.map((slide, i) => (
        <div key={`${slide.id}-${i}`} className={styles.rowCard} style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <strong>شريحة {i + 1}</strong>
            <label className={styles.inline}>
              <input
                type="checkbox"
                checked={slide.active !== false}
                onChange={(e) => setSlide(i, { active: e.target.checked })}
              />
              ظاهرة
            </label>
          </div>

          <label>صورة الخلفية (رفع)</label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void onUploadSlideImage(i, f);
            }}
          />
          <input
            placeholder="أو رابط الصورة (URL)"
            dir="ltr"
            value={slide.imageUrl}
            onChange={(e) => setSlide(i, { imageUrl: e.target.value })}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input placeholder="Badge EN" value={slide.badgeEn} onChange={(e) => setSlide(i, { badgeEn: e.target.value })} />
            <input placeholder="Badge AR" value={slide.badgeAr} onChange={(e) => setSlide(i, { badgeAr: e.target.value })} />
            <input placeholder="Title line 1 EN" value={slide.titleLine1En} onChange={(e) => setSlide(i, { titleLine1En: e.target.value })} />
            <input placeholder="Title line 1 AR" value={slide.titleLine1Ar} onChange={(e) => setSlide(i, { titleLine1Ar: e.target.value })} />
            <input placeholder="Title line 2 EN" value={slide.titleLine2En} onChange={(e) => setSlide(i, { titleLine2En: e.target.value })} />
            <input placeholder="Title line 2 AR" value={slide.titleLine2Ar} onChange={(e) => setSlide(i, { titleLine2Ar: e.target.value })} />
          </div>
          <textarea
            rows={3}
            placeholder="Description EN"
            value={slide.descEn}
            onChange={(e) => setSlide(i, { descEn: e.target.value })}
          />
          <textarea
            rows={3}
            placeholder="Description AR"
            dir="rtl"
            value={slide.descAr}
            onChange={(e) => setSlide(i, { descAr: e.target.value })}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input placeholder="Primary btn EN" value={slide.primaryLabelEn} onChange={(e) => setSlide(i, { primaryLabelEn: e.target.value })} />
            <input placeholder="Primary btn AR" value={slide.primaryLabelAr} onChange={(e) => setSlide(i, { primaryLabelAr: e.target.value })} />
            <input placeholder="Primary href" dir="ltr" value={slide.primaryHref} onChange={(e) => setSlide(i, { primaryHref: e.target.value })} />
            <span />
            <input placeholder="Secondary btn EN" value={slide.secondaryLabelEn} onChange={(e) => setSlide(i, { secondaryLabelEn: e.target.value })} />
            <input placeholder="Secondary btn AR" value={slide.secondaryLabelAr} onChange={(e) => setSlide(i, { secondaryLabelAr: e.target.value })} />
            <input placeholder="Secondary href" dir="ltr" value={slide.secondaryHref} onChange={(e) => setSlide(i, { secondaryHref: e.target.value })} />
          </div>

          <button
            type="button"
            className={styles.btnGhost}
            onClick={() => onChange(slides.filter((_, j) => j !== i))}
          >
            حذف هذه الشريحة
          </button>
        </div>
      ))}

      <button type="button" className={styles.btn} onClick={() => onChange([...slides, emptySlide(slides.length)])}>
        + إضافة شريحة
      </button>
    </div>
  );
}
