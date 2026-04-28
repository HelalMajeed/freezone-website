"use client";

import type { Dispatch, SetStateAction } from "react";
import type { AdminCmsDraft } from "@/lib/admin-draft-to-storefront";
import type { HomeFaqItemCopy, HomePageCopy } from "@/lib/home-page-copy";
import { parseHomePageCopy } from "@/lib/home-page-copy";
import styles from "@/app/admin/(secure)/cms/cms.module.css";

function mergeCopy(base: HomePageCopy | null, patch: Partial<HomePageCopy>): Record<string, unknown> {
  return { ...(base ?? {}), ...patch };
}

type Props = {
  draft: AdminCmsDraft;
  setDraft: Dispatch<SetStateAction<AdminCmsDraft | null>>;
};

export function HomePageCopyEditor({ draft, setDraft }: Props) {
  const c = parseHomePageCopy(draft.siteConfig.homePageCopyJson) ?? {};
  const faqList: HomeFaqItemCopy[] =
    c.faqItems?.length && Array.isArray(c.faqItems)
      ? c.faqItems
      : [{ qEn: "", qAr: "", aEn: "", aAr: "" }];

  const patch = (partial: Partial<HomePageCopy>) => {
    const next = mergeCopy(c, partial);
    setDraft((d) =>
      d
        ? {
            ...d,
            siteConfig: {
              ...d.siteConfig,
              homePageCopyJson: Object.keys(next).length ? next : null,
            },
          }
        : d,
    );
  };

  const setFaq = (items: HomeFaqItemCopy[]) => {
    const cleaned = items.filter((x) => x.qEn.trim() || x.qAr.trim() || x.aEn.trim() || x.aAr.trim());
    patch({ faqItems: cleaned.length ? cleaned : undefined });
  };

  return (
    <div className={styles.form}>
      <p className={styles.hint}>
        نصوص اختيارية تستبدل الترجمات الافتراضية في الصفحة الرئيسية (قسم الاكتشاف، وصل حديثاً، المعرض، الأسئلة
        الشائعة). اترك الحقل فارغاً لاستخدام النص الافتراضي من ملفات الترجمة.
      </p>

      <h3 className={styles.sectionTitle}>قسم المنتجات المميزة (Discover)</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input
          placeholder="Eyebrow EN (Featured products)"
          value={c.discoverEyebrowEn ?? ""}
          onChange={(e) => patch({ discoverEyebrowEn: e.target.value || undefined })}
        />
        <input
          placeholder="Eyebrow AR"
          dir="rtl"
          value={c.discoverEyebrowAr ?? ""}
          onChange={(e) => patch({ discoverEyebrowAr: e.target.value || undefined })}
        />
        <input
          placeholder="Title EN (Discover the latest tech)"
          value={c.discoverTitleEn ?? ""}
          onChange={(e) => patch({ discoverTitleEn: e.target.value || undefined })}
        />
        <input
          placeholder="Title AR"
          dir="rtl"
          value={c.discoverTitleAr ?? ""}
          onChange={(e) => patch({ discoverTitleAr: e.target.value || undefined })}
        />
      </div>

      <h3 className={styles.sectionTitle}>وصل حديثاً (شريط المنتجات)</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input
          placeholder="Section title EN"
          value={c.newArrivalsTitleEn ?? ""}
          onChange={(e) => patch({ newArrivalsTitleEn: e.target.value || undefined })}
        />
        <input
          placeholder="Section title AR"
          dir="rtl"
          value={c.newArrivalsTitleAr ?? ""}
          onChange={(e) => patch({ newArrivalsTitleAr: e.target.value || undefined })}
        />
      </div>

      <h3 className={styles.sectionTitle}>معرض الصور (Our showroom)</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input
          placeholder="Title EN"
          value={c.showroomTitleEn ?? ""}
          onChange={(e) => patch({ showroomTitleEn: e.target.value || undefined })}
        />
        <input
          placeholder="Title AR"
          dir="rtl"
          value={c.showroomTitleAr ?? ""}
          onChange={(e) => patch({ showroomTitleAr: e.target.value || undefined })}
        />
      </div>
      <textarea
        rows={2}
        placeholder="Description EN"
        value={c.showroomDescEn ?? ""}
        onChange={(e) => patch({ showroomDescEn: e.target.value || undefined })}
      />
      <textarea
        rows={2}
        placeholder="Description AR"
        dir="rtl"
        value={c.showroomDescAr ?? ""}
        onChange={(e) => patch({ showroomDescAr: e.target.value || undefined })}
      />

      <h3 className={styles.sectionTitle}>الأسئلة الشائعة</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input
          placeholder="FAQ block title EN"
          value={c.faqTitleEn ?? ""}
          onChange={(e) => patch({ faqTitleEn: e.target.value || undefined })}
        />
        <input
          placeholder="FAQ block title AR"
          dir="rtl"
          value={c.faqTitleAr ?? ""}
          onChange={(e) => patch({ faqTitleAr: e.target.value || undefined })}
        />
      </div>
      <textarea
        rows={2}
        placeholder="FAQ description EN"
        value={c.faqDescEn ?? ""}
        onChange={(e) => patch({ faqDescEn: e.target.value || undefined })}
      />
      <textarea
        rows={2}
        placeholder="FAQ description AR"
        dir="rtl"
        value={c.faqDescAr ?? ""}
        onChange={(e) => patch({ faqDescAr: e.target.value || undefined })}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input
          placeholder="Contact button EN"
          value={c.faqContactBtnEn ?? ""}
          onChange={(e) => patch({ faqContactBtnEn: e.target.value || undefined })}
        />
        <input
          placeholder="Contact button AR"
          dir="rtl"
          value={c.faqContactBtnAr ?? ""}
          onChange={(e) => patch({ faqContactBtnAr: e.target.value || undefined })}
        />
      </div>

      <label>أسئلة وأجوبة (تستبدل الترجمة الافتراضية عند وجود سؤال واحد على الأقل بمحتوى)</label>
      {faqList.map((row, i) => (
        <div key={i} className={styles.rowCard} style={{ flexDirection: "column", alignItems: "stretch" }}>
          <input
            placeholder="Question EN"
            value={row.qEn}
            onChange={(e) => {
              const next = [...faqList];
              next[i] = { ...row, qEn: e.target.value };
              setFaq(next);
            }}
          />
          <input
            placeholder="Question AR"
            dir="rtl"
            value={row.qAr}
            onChange={(e) => {
              const next = [...faqList];
              next[i] = { ...row, qAr: e.target.value };
              setFaq(next);
            }}
          />
          <textarea
            placeholder="Answer EN"
            rows={2}
            value={row.aEn}
            onChange={(e) => {
              const next = [...faqList];
              next[i] = { ...row, aEn: e.target.value };
              setFaq(next);
            }}
          />
          <textarea
            placeholder="Answer AR"
            rows={2}
            dir="rtl"
            value={row.aAr}
            onChange={(e) => {
              const next = [...faqList];
              next[i] = { ...row, aAr: e.target.value };
              setFaq(next);
            }}
          />
          <button
            type="button"
            className={styles.btnGhost}
            onClick={() => setFaq(faqList.filter((_, j) => j !== i))}
          >
            حذف سؤال
          </button>
        </div>
      ))}
      <button
        type="button"
        className={styles.btn}
        onClick={() => setFaq([...faqList, { qEn: "", qAr: "", aEn: "", aAr: "" }])}
      >
        + سؤال
      </button>

      <button
        type="button"
        className={styles.btnGhost}
        onClick={() =>
          setDraft((d) =>
            d ? { ...d, siteConfig: { ...d.siteConfig, homePageCopyJson: null } } : d,
          )
        }
      >
        مسح كل النصوص المخصصة (العودة للترجمات الافتراضية)
      </button>
    </div>
  );
}
