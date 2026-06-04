"use client";

import { Suspense, lazy, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import i18n from "@/i18n/i18n";
import { StorefrontProvider } from "@/components/providers/StorefrontProvider";
import { ThemeApplier } from "@/components/providers/ThemeApplier";
import { LucideByName } from "@/lib/lucide-icon-map";
import { LucideIconSelect } from "@/components/admin/LucideIconSelect";
import type { LocaleCode } from "@/lib/layout-cms";
import { HeroSlidesEditor } from "@/components/admin/HeroSlidesEditor";
import { NavItemsEditor, loadExampleNav } from "@/components/admin/NavItemsEditor";
import { HomePageCopyEditor } from "@/components/admin/HomePageCopyEditor";
import { useAdminCmsDraft } from "@/contexts/AdminCmsDraftContext";
import type { CmsEditorTab } from "@/lib/cms-editor-tab";
import { FREEZONE_Z_LOGO } from "@/lib/brand-assets";
import { isSiteLogoPdfUrl } from "@/lib/siteConfig";
import { DEFAULT_TOP_BAR_SOCIAL_COLOR } from "@/lib/site-public";
import styles from "@/app/admin/(secure)/cms/cms.module.css";

const CmsVisitorPreview = lazy(() =>
  import("@/components/admin/CmsVisitorPreview").then((m) => ({ default: m.CmsVisitorPreview })),
);

const CMS_TABS: { id: CmsEditorTab; label: string }[] = [
  { id: "identity", label: "هوية وشعار" },
  { id: "topBar", label: "الشريط العلوي" },
  { id: "contact", label: "تواصل" },
  { id: "commerce", label: "شحن ودفع" },
  { id: "seo", label: "SEO" },
  { id: "social", label: "تواصل اجتماعي" },
  { id: "trust", label: "شريط الثقة" },
  { id: "spots", label: "أيقونات الأقسام" },
  { id: "showroom", label: "معرض الصور" },
  { id: "promo", label: "بانرات العروض" },
  { id: "hero", label: "الهيرو" },
  { id: "nav", label: "القائمة" },
  { id: "homePage", label: "نصوص الرئيسية" },
  { id: "products", label: "المنتجات" },
];

export function AdminCmsEditor() {
  const [tab, setTab] = useState<CmsEditorTab>("identity");

  const {
    draft,
    setDraft,
    navItems,
    setNavItems,
    previewLocale,
    setPreviewLocale,
    previewValue,
    save,
    msg,
    msgIsError,
    loading,
    offlineMode,
    dbUnreachable,
    dbBlockReason,
    uploadLogo,
    uploadSpotlightImage,
    uploadPromoBannerImage,
    uploadHeroSlideImage,
    logout,
  } = useAdminCmsDraft();

  useEffect(() => {
    if (previewValue) void i18n.changeLanguage(previewLocale);
  }, [previewValue, previewLocale]);

  if (loading || !draft) {
    return (
      <div style={{ padding: 40 }}>
        {loading ? (
          "جاري التحميل…"
        ) : (
          <>
            {msg ? (
              <div className={msgIsError ? styles.msgErr : styles.msg}>{msg}</div>
            ) : (
              "لا توجد بيانات"
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <h1 className={styles.title}>إعدادات الموقع — معاينة مباشرة</h1>
        <div className={styles.actions}>
          <select
            value={previewLocale}
            onChange={(e) => setPreviewLocale(e.target.value as LocaleCode)}
            className={styles.select}
          >
            <option value="en">معاينة EN</option>
            <option value="ar">معاينة AR</option>
          </select>
          <button type="button" className={styles.btn} onClick={save}>
            حفظ كل التغييرات
          </button>
          <Link to="/admin" className={styles.linkBtn}>
            لوحة الإدارة
          </Link>
          <Link to="/admin/products" className={styles.linkBtn}>
            المنتجات
          </Link>
          <button type="button" className={styles.btnGhost} onClick={logout}>
            خروج
          </button>
        </div>
      </header>
      {offlineMode && (
        <div className={styles.offlineBanner}>
          <strong>وضع بدون قاعدة بيانات — الحفظ إلى PostgreSQL غير مفعّل.</strong>{" "}
          {dbUnreachable ? (
            <>
              يوجد <code>DATABASE_URL</code> لكن الاتصال فشل (Postgres غير شغّال أو المنفذ في الرابط غير صحيح).
              من <strong>جذر المشروع</strong> (المجلد الذي يضم <code>freezone-web</code> و<code>freezone-api</code>): شغّل{" "}
              <code>npm run db:up</code> ثم <code>npm run db:setup</code> — يتطلّب Docker Desktop على Windows.
              إن كان المنفذ 5432 مستخدماً عندك، غيّر <code>DATABASE_URL</code> إلى <code>localhost:5433</code> وعدّل{" "}
              <code>freezone-web/docker-compose.yml</code> (مثلاً <code>5433:5432</code>) بنفس المنفذ في ملفي{" "}
              <code>.env</code>. بعدها أعد تشغيل خادم الـ API و<code>npm run dev</code> للواجهة.
            </>
          ) : dbBlockReason === "static_only" ? (
            <>
              المتجر مضبوط على <code>STATIC_STOREFRONT_ONLY=true</code> فيطّبق الكود بيانات ثابتة دون Postgres.
              احذف هذا السطر أو عيّنه <code>false</code> في <code>.env</code> ثم أعد تشغيل <code>npm run dev</code>.
            </>
          ) : (
            <>
              أنشئ ملف البيئة ثم ارفع قاعدة البيانات المحلية دفعة واحدة:{" "}
              <code>npm run env:init</code> ثم <code>npm run db:local</code> (ينسخ <code>.env</code> من المثال إن
              لزم، يشغّل Docker، ويطبّق المهاجرات والبذرة). أعد تشغيل <code>npm run dev</code> وأعد فتح الصفحة. إن
              كان لديك <code>.env</code> بدون سطر <code>DATABASE_URL</code>، انسخه من <code>.env.example</code>.
            </>
          )}
        </div>
      )}
      {msg && <div className={msgIsError ? styles.msgErr : styles.msg}>{msg}</div>}

      <div className={styles.grid}>
        <aside className={styles.editor}>
          <div className={styles.editorScroll}>
          <div className={styles.tabsToolbar}>
            <nav className={styles.tabs} aria-label="أقسام إعدادات الموقع">
              {CMS_TABS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={tab === id ? styles.tabOn : styles.tab}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {tab === "identity" && (
            <div className={styles.form}>
              <h3 className={styles.sectionTitle}>اسم الموقع والشعار</h3>
              <label>اسم المتجر (EN)</label>
              <input
                value={draft.siteConfig.storeNameEn}
                onChange={(e) =>
                  setDraft({ ...draft, siteConfig: { ...draft.siteConfig, storeNameEn: e.target.value } })
                }
              />
              <label>اسم المتجر (AR)</label>
              <input
                value={draft.siteConfig.storeNameAr}
                onChange={(e) =>
                  setDraft({ ...draft, siteConfig: { ...draft.siteConfig, storeNameAr: e.target.value } })
                }
              />
              <label>الشعار (سطر قصير) EN</label>
              <input
                value={draft.siteConfig.taglineEn}
                onChange={(e) =>
                  setDraft({ ...draft, siteConfig: { ...draft.siteConfig, taglineEn: e.target.value } })
                }
              />
              <label>الشعار (سطر قصير) AR</label>
              <input
                value={draft.siteConfig.taglineAr}
                onChange={(e) =>
                  setDraft({ ...draft, siteConfig: { ...draft.siteConfig, taglineAr: e.target.value } })
                }
              />
              <label>معاينة رأس الموقع (أيقونة Z + اسم المتجر)</label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #334155",
                  background: "#fff",
                  maxWidth: 420,
                }}
              >
                <img src={FREEZONE_Z_LOGO} alt="" style={{ height: 40, width: "auto" }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 18, color: "#111827", lineHeight: 1.2 }}>
                    {draft.siteConfig.storeNameAr?.trim() ||
                      draft.siteConfig.storeNameEn?.trim() ||
                      "Freezone"}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    {draft.siteConfig.taglineAr?.trim() || draft.siteConfig.taglineEn?.trim() || "—"}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 8px" }}>
                أيقونة Z الحمراء ثابتة في الشريط العلوي. الملف أدناه اختياري (شعار كامل للتذييل أو SEO).
              </p>
              <label>شعار كامل اختياري (PNG أو JPEG أو PDF)</label>
              {draft.siteConfig.logoUrl ? (
                isSiteLogoPdfUrl(draft.siteConfig.logoUrl) ? (
                  <object
                    data={draft.siteConfig.logoUrl}
                    type="application/pdf"
                    aria-label="Logo preview"
                    style={{
                      maxHeight: 48,
                      width: "auto",
                      borderRadius: 6,
                      border: "1px solid #334155",
                      pointerEvents: "none",
                    }}
                  />
                ) : (
                  <img
                    src={draft.siteConfig.logoUrl}
                    alt=""
                    style={{ maxHeight: 48, width: "auto", borderRadius: 6, border: "1px solid #334155" }}
                  />
                )
              ) : (
                <span style={{ fontSize: 12, color: "#64748b" }}>لا يوجد شعار بعد</span>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,application/pdf,.png,.jpg,.jpeg,.pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void uploadLogo(f);
                }}
              />
              <label>ارتفاع الشعار في أعلى الموقع (بكسل) — شريط التنقل والقائمة الجوالية</label>
              <input
                type="number"
                min={20}
                max={160}
                step={1}
                value={draft.siteConfig.headerLogoHeightPx ?? 48}
                onChange={(e) => {
                  const n = Number.parseInt(e.target.value, 10);
                  const v = Number.isFinite(n) ? Math.min(160, Math.max(20, n)) : 40;
                  setDraft({
                    ...draft,
                    siteConfig: { ...draft.siteConfig, headerLogoHeightPx: v },
                  });
                }}
              />
              <p className={styles.hint}>العرض يبقى تلقائياً حسب نسبة الصورة (20–160 بكسل).</p>
              <h3 className={styles.sectionTitle}>الموقع والصيانة</h3>
              <label className={styles.inline}>
                <input
                  type="checkbox"
                  checked={draft.siteConfig.maintenanceMode}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      siteConfig: { ...draft.siteConfig, maintenanceMode: e.target.checked },
                    })
                  }
                />
                وضع الصيانة (يُظهر في المعاينة؛ لاحقاً يمكن ربطه بإخفاء الموقع للزوار)
              </label>
            </div>
          )}

          {tab === "topBar" && (
            <div className={styles.form}>
              <h3 className={styles.sectionTitle}>الشريط العلوي الداكن</h3>
              <p className={styles.hint}>
                يظهر فوق شريط البحث. أرقام الاتصال الأساسية تُعرَض من تبويب «تواصل»؛ يمكنك هنا تغيير النص الظاهر بجانب
                الأيقونة، الألوان، والأيقونات والروابط الاختيارية.
              </p>
              <label>لون الخلفية</label>
              <input
                value={draft.siteConfig.topBarBgColor ?? "#f5f5f5"}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    siteConfig: { ...draft.siteConfig, topBarBgColor: e.target.value },
                  })
                }
              />
              <label>لون نص وخط الهاتف والواتساب (يسار)</label>
              <input
                value={draft.siteConfig.topBarContactColor ?? "rgba(255,255,255,0.65)"}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    siteConfig: { ...draft.siteConfig, topBarContactColor: e.target.value },
                  })
                }
              />
              <label>لون نص وأيقونة العرض (وسط/يمين)</label>
              <input
                value={draft.siteConfig.topBarPromoColor ?? "#10b981"}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    siteConfig: { ...draft.siteConfig, topBarPromoColor: e.target.value },
                  })
                }
              />

              <h3 className={styles.sectionTitle}>أيقونات التواصل (الشريط العلوي)</h3>
              <p className={styles.hint}>
                اضبط الحجم والمسافة واللون هنا؛ الروابط نفسها من تبويب «تواصل اجتماعي» مع خيار إظهار كل رابط في الشريط أو
                التذييل فقط.
              </p>
              <label className={styles.inline}>
                <input
                  type="checkbox"
                  checked={draft.siteConfig.topBarSocialEnabled !== false}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      siteConfig: { ...draft.siteConfig, topBarSocialEnabled: e.target.checked },
                    })
                  }
                />
                إظهار أيقونات التواصل في الشريط العلوي
              </label>
              <label>حجم الأيقونة (بكسل، 12–36)</label>
              <input
                type="number"
                min={12}
                max={36}
                value={draft.siteConfig.topBarSocialIconSizePx ?? 20}
                onChange={(e) => {
                  const v = Math.round(Number(e.target.value));
                  setDraft({
                    ...draft,
                    siteConfig: {
                      ...draft.siteConfig,
                      topBarSocialIconSizePx: Number.isFinite(v) ? v : 20,
                    },
                  });
                }}
              />
              <label>المسافة بين الأيقونات (بكسل، 4–32)</label>
              <input
                type="number"
                min={4}
                max={32}
                value={draft.siteConfig.topBarSocialGapPx ?? 14}
                onChange={(e) => {
                  const v = Math.round(Number(e.target.value));
                  setDraft({
                    ...draft,
                    siteConfig: {
                      ...draft.siteConfig,
                      topBarSocialGapPx: Number.isFinite(v) ? v : 14,
                    },
                  });
                }}
              />
              <label>لون أيقونات التواصل (CSS)</label>
              <input
                dir="ltr"
                placeholder={DEFAULT_TOP_BAR_SOCIAL_COLOR}
                value={draft.siteConfig.topBarSocialColor ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    siteConfig: { ...draft.siteConfig, topBarSocialColor: e.target.value },
                  })
                }
              />
              <p className={styles.hint}>
                الافتراضي هو لون شعار العلامة الأحمر القاني ({DEFAULT_TOP_BAR_SOCIAL_COLOR}). اترك الحقل فارغاً
                لاستخدامه، أو اكتب لوناً مختلفاً (مثل <code dir="ltr">#ffffff</code> للأبيض).
              </p>

              <h3 className={styles.sectionTitle}>الهاتف (العرض بجانب الأيقونة)</h3>
              <p className={styles.hint}>اترك الحقل فارغاً لعرض رقم الهاتف من «تواصل» كما هو.</p>
              <label>نص الهاتف (EN)</label>
              <input
                value={draft.siteConfig.topBarPhoneLabelEn ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    siteConfig: { ...draft.siteConfig, topBarPhoneLabelEn: e.target.value },
                  })
                }
              />
              <label>نص الهاتف (AR)</label>
              <input
                value={draft.siteConfig.topBarPhoneLabelAr ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    siteConfig: { ...draft.siteConfig, topBarPhoneLabelAr: e.target.value },
                  })
                }
              />
              <label>رابط الهاتف (اختياري — مثل tel:+9647...)</label>
              <input
                dir="ltr"
                value={draft.siteConfig.topBarPhoneHref ?? ""}
                placeholder="فارغ = tel: حسب حقل الهاتف في تواصل"
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    siteConfig: { ...draft.siteConfig, topBarPhoneHref: e.target.value || null },
                  })
                }
              />
              <LucideIconSelect
                label="أيقونة الهاتف"
                value={draft.siteConfig.topBarPhoneIconKey ?? "phone"}
                onChange={(next) =>
                  setDraft({
                    ...draft,
                    siteConfig: { ...draft.siteConfig, topBarPhoneIconKey: next ?? "phone" },
                  })
                }
                selectClassName={styles.select}
              />

              <h3 className={styles.sectionTitle}>واتساب</h3>
              <label>نص الرابط (EN)</label>
              <input
                value={draft.siteConfig.topBarWhatsappLabelEn ?? "WhatsApp"}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    siteConfig: { ...draft.siteConfig, topBarWhatsappLabelEn: e.target.value },
                  })
                }
              />
              <label>نص الرابط (AR)</label>
              <input
                value={draft.siteConfig.topBarWhatsappLabelAr ?? "واتساب"}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    siteConfig: { ...draft.siteConfig, topBarWhatsappLabelAr: e.target.value },
                  })
                }
              />
              <label>رابط واتساب (اختياري — https://wa.me/964...)</label>
              <input
                dir="ltr"
                value={draft.siteConfig.topBarWhatsappHref ?? ""}
                placeholder="فارغ = wa.me حسب رقم واتساب في تواصل"
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    siteConfig: { ...draft.siteConfig, topBarWhatsappHref: e.target.value || null },
                  })
                }
              />
              <LucideIconSelect
                label="أيقونة واتساب"
                value={draft.siteConfig.topBarWhatsappIconKey ?? "message-circle"}
                onChange={(next) =>
                  setDraft({
                    ...draft,
                    siteConfig: { ...draft.siteConfig, topBarWhatsappIconKey: next ?? "message-circle" },
                  })
                }
                selectClassName={styles.select}
              />

              <h3 className={styles.sectionTitle}>نص العرض الترويجي</h3>
              <label className={styles.inline}>
                <input
                  type="checkbox"
                  checked={draft.siteConfig.promoBarEnabled}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      siteConfig: { ...draft.siteConfig, promoBarEnabled: e.target.checked },
                    })
                  }
                />
                تفعيل النص (عند الإيقاف يُعرض نص احتياطي من الترجمة)
              </label>
              <label>نص العرض (EN)</label>
              <textarea
                rows={2}
                value={draft.siteConfig.promoBarTextEn}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    siteConfig: { ...draft.siteConfig, promoBarTextEn: e.target.value },
                  })
                }
              />
              <label>نص العرض (AR)</label>
              <textarea
                rows={2}
                value={draft.siteConfig.promoBarTextAr}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    siteConfig: { ...draft.siteConfig, promoBarTextAr: e.target.value },
                  })
                }
              />
              <label>رابط عند النقر على نص العرض (اختياري — مسار أو https://)</label>
              <input
                dir="ltr"
                value={draft.siteConfig.topBarPromoHref ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    siteConfig: { ...draft.siteConfig, topBarPromoHref: e.target.value || null },
                  })
                }
              />
              <LucideIconSelect
                label="أيقونة العرض"
                value={draft.siteConfig.topBarPromoIconKey ?? "zap"}
                onChange={(next) =>
                  setDraft({
                    ...draft,
                    siteConfig: { ...draft.siteConfig, topBarPromoIconKey: next ?? "zap" },
                  })
                }
                selectClassName={styles.select}
              />
            </div>
          )}

          {tab === "contact" && (
            <div className={styles.form}>
              <label>هاتف</label>
              <input
                value={draft.siteConfig.phone}
                onChange={(e) =>
                  setDraft({ ...draft, siteConfig: { ...draft.siteConfig, phone: e.target.value } })
                }
              />
              <label>بريد</label>
              <input
                value={draft.siteConfig.email}
                onChange={(e) =>
                  setDraft({ ...draft, siteConfig: { ...draft.siteConfig, email: e.target.value } })
                }
              />
              <label>واتساب (رقم أو رابط)</label>
              <input
                value={draft.siteConfig.whatsapp}
                onChange={(e) =>
                  setDraft({ ...draft, siteConfig: { ...draft.siteConfig, whatsapp: e.target.value } })
                }
              />
              <label>العنوان (EN)</label>
              <textarea
                rows={2}
                value={draft.siteConfig.addressEn}
                onChange={(e) =>
                  setDraft({ ...draft, siteConfig: { ...draft.siteConfig, addressEn: e.target.value } })
                }
              />
              <label>العنوان (AR)</label>
              <textarea
                rows={2}
                value={draft.siteConfig.addressAr}
                onChange={(e) =>
                  setDraft({ ...draft, siteConfig: { ...draft.siteConfig, addressAr: e.target.value } })
                }
              />
            </div>
          )}

          {tab === "commerce" && (
            <div className={styles.form}>
              <label>حد التوصيل المجاني (د.ع)</label>
              <input
                type="number"
                min={0}
                step={1}
                value={draft.siteConfig.freeDeliveryThreshold}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    siteConfig: {
                      ...draft.siteConfig,
                      freeDeliveryThreshold: Number(e.target.value) || 0,
                    },
                  })
                }
              />
              <label>رسوم الشحن القياسية (د.ع)</label>
              <input
                type="number"
                min={0}
                step={1}
                value={draft.siteConfig.standardShippingFee}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    siteConfig: {
                      ...draft.siteConfig,
                      standardShippingFee: Number(e.target.value) || 0,
                    },
                  })
                }
              />
              <label>محفظة زين كاش</label>
              <input
                value={draft.siteConfig.zainCashWallet ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    siteConfig: { ...draft.siteConfig, zainCashWallet: e.target.value },
                  })
                }
              />
              <label>معرّف تاجر Qi Card</label>
              <input
                value={draft.siteConfig.qiCardMerchantId ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    siteConfig: { ...draft.siteConfig, qiCardMerchantId: e.target.value },
                  })
                }
              />
            </div>
          )}

          {tab === "seo" && (
            <div className={styles.form}>
              <label>عنوان الميتا (EN)</label>
              <input
                value={draft.siteConfig.metaTitleEn ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    siteConfig: { ...draft.siteConfig, metaTitleEn: e.target.value || null },
                  })
                }
              />
              <label>عنوان الميتا (AR)</label>
              <input
                value={draft.siteConfig.metaTitleAr ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    siteConfig: { ...draft.siteConfig, metaTitleAr: e.target.value || null },
                  })
                }
              />
              <label>وصف الميتا (EN)</label>
              <textarea
                rows={3}
                value={draft.siteConfig.metaDescriptionEn ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    siteConfig: { ...draft.siteConfig, metaDescriptionEn: e.target.value || null },
                  })
                }
              />
              <label>وصف الميتا (AR)</label>
              <textarea
                rows={3}
                value={draft.siteConfig.metaDescriptionAr ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    siteConfig: { ...draft.siteConfig, metaDescriptionAr: e.target.value || null },
                  })
                }
              />
              <label>كلمات مفتاحية SEO (مفصولة بفواصل)</label>
              <textarea
                rows={2}
                value={draft.siteConfig.seoKeywords ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    siteConfig: { ...draft.siteConfig, seoKeywords: e.target.value || null },
                  })
                }
              />
            </div>
          )}

          {tab === "social" && (
            <div className={styles.form}>
              <p className={styles.hint}>
                روابط تظهر في تذييل الموقع؛ يمكنك إخفاء أي رابط من الشريط العلوي فقط من خلال الخيار أدناه (يظل في التذييل).
              </p>
              {draft.socialLinks.map((l, i) => (
                <div key={i} className={styles.rowCard}>
                  <label>المنصة (مثلاً facebook, instagram, tiktok)</label>
                  <input
                    value={l.platform}
                    onChange={(e) => {
                      const next = [...draft.socialLinks];
                      next[i] = { ...next[i], platform: e.target.value };
                      setDraft({ ...draft, socialLinks: next });
                    }}
                  />
                  <label>الرابط الكامل (https://…)</label>
                  <input
                    value={l.url}
                    onChange={(e) => {
                      const next = [...draft.socialLinks];
                      next[i] = { ...next[i], url: e.target.value };
                      setDraft({ ...draft, socialLinks: next });
                    }}
                  />
                  <label className={styles.inline}>
                    <input
                      type="checkbox"
                      checked={l.showInTopBar !== false}
                      onChange={(e) => {
                        const next = [...draft.socialLinks];
                        next[i] = { ...next[i], showInTopBar: e.target.checked };
                        setDraft({ ...draft, socialLinks: next });
                      }}
                    />
                    إظهار في الشريط العلوي
                  </label>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        socialLinks: draft.socialLinks.filter((_, j) => j !== i),
                      })
                    }
                  >
                    حذف
                  </button>
                </div>
              ))}
              <button
                type="button"
                className={styles.btn}
                onClick={() =>
                  setDraft({
                    ...draft,
                    socialLinks: [
                      ...draft.socialLinks,
                      {
                        platform: "facebook",
                        url: "https://",
                        sortOrder: draft.socialLinks.length,
                        showInTopBar: true,
                      },
                    ],
                  })
                }
              >
                + رابط
              </button>
            </div>
          )}

          {tab === "trust" && (
            <div className={styles.form}>
              <label>لون خلفية شريط الثقة (hex)</label>
              <input
                type="text"
                dir="ltr"
                placeholder="#030712"
                value={draft.siteConfig.trustBarBgColor ?? "#030712"}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    siteConfig: { ...draft.siteConfig, trustBarBgColor: e.target.value },
                  })
                }
              />
              <label>شفافية طبقة الخلفية فقط (0–100٪)</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.min(
                    100,
                    Math.max(0, Math.round(draft.siteConfig.trustBarBgOpacityPct ?? 100)),
                  )}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      siteConfig: {
                        ...draft.siteConfig,
                        trustBarBgOpacityPct: Number(e.target.value),
                      },
                    })
                  }
                  style={{ flex: "1 1 180px", minWidth: 120 }}
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={Math.min(
                    100,
                    Math.max(0, Math.round(draft.siteConfig.trustBarBgOpacityPct ?? 100)),
                  )}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      siteConfig: {
                        ...draft.siteConfig,
                        trustBarBgOpacityPct: Math.min(
                          100,
                          Math.max(0, Math.round(Number(e.target.value) || 0)),
                        ),
                      },
                    })
                  }
                  style={{ width: 72 }}
                />
              </div>
              <p className={styles.hint}>
                تُطبَّق الشفافية على <strong>لون الخلفية فقط</strong>؛ النصوص والأيقونات تبقى واضحة بالكامل. 0% =
                خلفية شفافة، 100% = خلفية صلبة. اللون الافتراضي مطابق لـ{" "}
                <code dir="ltr">--gray-950</code> (#030712).
              </p>
              <label>لون نص شريط الثقة (CSS)</label>
              <input
                type="text"
                dir="ltr"
                placeholder="#f8fafc"
                value={draft.siteConfig.trustBarTextColor ?? "#f8fafc"}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    siteConfig: { ...draft.siteConfig, trustBarTextColor: e.target.value },
                  })
                }
              />
              <label>لون أيقونات شريط الثقة (CSS)</label>
              <input
                type="text"
                dir="ltr"
                placeholder="فارغ = لون العلامة من التصميم"
                value={draft.siteConfig.trustBarIconColor ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    siteConfig: { ...draft.siteConfig, trustBarIconColor: e.target.value },
                  })
                }
              />
              <p className={styles.hint}>
                اتركه فارغاً لاستخدام <strong>لون العلامة الأساسي</strong> من لوحة التصميم (نفس لون الشعار عادةً)، أو
                أدخل لوناً صريحاً. أمثلة: <code dir="ltr">#22c55e</code>،{" "}
                <code dir="ltr">var(--fz-primary)</code>.
              </p>
              {draft.trustBarItems.map((t, i) => (
                <div key={i} className={styles.rowCard}>
                  <input
                    placeholder="EN"
                    value={t.textEn}
                    onChange={(e) => {
                      const next = [...draft.trustBarItems];
                      next[i] = { ...next[i], textEn: e.target.value };
                      setDraft({ ...draft, trustBarItems: next });
                    }}
                  />
                  <input
                    placeholder="AR"
                    value={t.textAr}
                    onChange={(e) => {
                      const next = [...draft.trustBarItems];
                      next[i] = { ...next[i], textAr: e.target.value };
                      setDraft({ ...draft, trustBarItems: next });
                    }}
                  />
                  <LucideIconSelect
                    label="أيقونة السطر"
                    selectClassName={styles.select}
                    value={t.iconKey}
                    onChange={(icon) => {
                      const arr = [...draft.trustBarItems];
                      arr[i] = { ...arr[i], iconKey: icon ?? "" };
                      setDraft({ ...draft, trustBarItems: arr });
                    }}
                  />
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        trustBarItems: draft.trustBarItems.filter((_, j) => j !== i),
                      })
                    }
                  >
                    حذف
                  </button>
                </div>
              ))}
              <button
                type="button"
                className={styles.btn}
                onClick={() =>
                  setDraft({
                    ...draft,
                    trustBarItems: [
                      ...draft.trustBarItems,
                      {
                        id: Date.now(),
                        textEn: "",
                        textAr: "",
                        iconKey: "truck",
                        sortOrder: draft.trustBarItems.length,
                      },
                    ],
                  })
                }
              >
                + صف
              </button>
            </div>
          )}

          {tab === "spots" && (
            <div className={styles.form}>
              <p className={styles.hint}>
                الدوائر تحت بانر الهيرو في الصفحة الرئيسية. املأ الاسم والرابط، ثم اختر <strong>أيقونة</strong> من
                القائمة أو ارفع <strong>صورة</strong> — زر «أيقونة» يزيل الصورة وتعود للأيقونة. المعاينة على اليمين
                ومعاينة صغيرة داخل كل بطاقة تعكس لغة المعاينة العلوية (EN/AR).
              </p>
              {draft.homeSpotlights.map((p, i) => {
                const visitorLabel =
                  previewLocale === "ar"
                    ? (p.labelAr || "").trim() || p.labelEn
                    : (p.labelEn || "").trim() || p.labelAr;
                return (
                  <div key={`${p.id}-${i}`} className={styles.spotlightCard}>
                    <div className={styles.spotlightHead}>
                      <h3 className={styles.spotlightTitle}>قسم {i + 1}</h3>
                      <div className={styles.modeToggle} role="group" aria-label="طريقة عرض الدائرة للزائر">
                        <button
                          type="button"
                          className={`${styles.modeToggleBtn} ${!p.imageUrl ? styles.modeToggleBtnActive : ""}`}
                          onClick={() => {
                            if (!p.imageUrl) return;
                            setDraft({
                              ...draft,
                              homeSpotlights: draft.homeSpotlights.map((row, j) =>
                                j === i ? { ...row, imageUrl: null } : row,
                              ),
                            });
                          }}
                        >
                          أيقونة
                        </button>
                        <button
                          type="button"
                          className={`${styles.modeToggleBtn} ${p.imageUrl ? styles.modeToggleBtnActive : ""}`}
                          onClick={() => {
                            if (!p.imageUrl) document.getElementById(`spotlight-upload-${i}`)?.click();
                          }}
                        >
                          صورة
                        </button>
                      </div>
                    </div>

                    <label className={styles.fieldLabel}>اسم القسم (إنجليزي)</label>
                    <input
                      placeholder="Laptops"
                      value={p.labelEn}
                      onChange={(e) => {
                        const next = [...draft.homeSpotlights];
                        next[i] = { ...next[i], labelEn: e.target.value };
                        setDraft({ ...draft, homeSpotlights: next });
                      }}
                    />
                    <label className={styles.fieldLabel}>اسم القسم (عربي)</label>
                    <input
                      placeholder="لابتوبات"
                      value={p.labelAr}
                      onChange={(e) => {
                        const next = [...draft.homeSpotlights];
                        next[i] = { ...next[i], labelAr: e.target.value };
                        setDraft({ ...draft, homeSpotlights: next });
                      }}
                    />
                    <label className={styles.fieldLabel}>الرابط (مسار أو ?cat=)</label>
                    <input
                      placeholder="/products?cat=gaming"
                      dir="ltr"
                      value={p.href}
                      onChange={(e) => {
                        const next = [...draft.homeSpotlights];
                        next[i] = { ...next[i], href: e.target.value };
                        setDraft({ ...draft, homeSpotlights: next });
                      }}
                    />

                    <div className={styles.spotVisitorPreview}>
                      <span className={styles.spotVisitorPreviewLabel}>معاينة الزائر</span>
                      <div className={styles.spotVisitorCircle}>
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt="" />
                        ) : (
                          <LucideByName name={p.iconKey ?? undefined} size={26} strokeWidth={1.5} />
                        )}
                      </div>
                      <span style={{ fontSize: 12, color: "var(--admin-muted)", flex: 1, minWidth: 0 }}>
                        {visitorLabel || "—"}
                      </span>
                    </div>

                    <LucideIconSelect
                      label="أيقونة الدائرة (تُعرض عند اختيار وضع أيقونة أعلاه)"
                      selectClassName={styles.select}
                      value={p.iconKey}
                      onChange={(icon) => {
                        const row = [...draft.homeSpotlights];
                        row[i] = { ...row[i], iconKey: icon };
                        setDraft({ ...draft, homeSpotlights: row });
                      }}
                    />

                    <label className={styles.fieldLabel}>رفع صورة الدائرة (اختياري — يفعّل وضع «صورة»)</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt=""
                          style={{
                            width: 44,
                            height: 44,
                            objectFit: "cover",
                            borderRadius: "50%",
                            border: "1px solid #334155",
                          }}
                        />
                      ) : null}
                      <input
                        id={`spotlight-upload-${i}`}
                        type="file"
                        accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = "";
                          if (f) void uploadSpotlightImage(i, f);
                        }}
                      />
                      {p.imageUrl ? (
                        <button
                          type="button"
                          className={styles.btnGhost}
                          onClick={() => {
                            const next = [...draft.homeSpotlights];
                            next[i] = { ...next[i], imageUrl: null };
                            setDraft({ ...draft, homeSpotlights: next });
                          }}
                        >
                          إزالة الصورة والعودة للأيقونة
                        </button>
                      ) : null}
                    </div>

                    <label className={styles.inline}>
                      <input
                        type="checkbox"
                        checked={p.active}
                        onChange={(e) => {
                          const next = [...draft.homeSpotlights];
                          next[i] = { ...next[i], active: e.target.checked };
                          setDraft({ ...draft, homeSpotlights: next });
                        }}
                      />
                      ظاهر في الموقع
                    </label>
                    <button
                      type="button"
                      className={styles.btnGhost}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          homeSpotlights: draft.homeSpotlights.filter((_, j) => j !== i),
                        })
                      }
                    >
                      حذف القسم
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                className={styles.btn}
                onClick={() =>
                  setDraft({
                    ...draft,
                    homeSpotlights: [
                      ...draft.homeSpotlights,
                      {
                        id: Date.now(),
                        labelEn: "New",
                        labelAr: "جديد",
                        href: "/products",
                        imageUrl: null,
                        iconKey: "package",
                        sortOrder: draft.homeSpotlights.length,
                        active: true,
                      },
                    ],
                  })
                }
              >
                + إضافة قسم
              </button>
            </div>
          )}

          {tab === "showroom" && (
            <div className={styles.form}>
              <p className={styles.hint}>
                صور قسم «معرض الصور» في الصفحة الرئيسية (تخطيط bento). يُفضّل 4 صور على الأقل؛ الأنواع غير
                «video» تُستخدم كصور. احفظ التغييرات في الأسفل.
              </p>
              {draft.showroomMedia.map((row, i) => (
                <div key={`sr-${row.id}-${i}`} className={styles.rowCard}>
                  <label>نوع الوسيط</label>
                  <select
                    value={row.kind}
                    onChange={(e) => {
                      const next = [...draft.showroomMedia];
                      next[i] = { ...row, kind: e.target.value };
                      setDraft({ ...draft, showroomMedia: next });
                    }}
                  >
                    <option value="image">image</option>
                    <option value="video">video</option>
                  </select>
                  <label>رابط الصورة أو الفيديو</label>
                  <input
                    dir="ltr"
                    value={row.url}
                    onChange={(e) => {
                      const next = [...draft.showroomMedia];
                      next[i] = { ...row, url: e.target.value };
                      setDraft({ ...draft, showroomMedia: next });
                    }}
                  />
                  <input
                    placeholder="عنوان EN (اختياري)"
                    value={row.titleEn ?? ""}
                    onChange={(e) => {
                      const next = [...draft.showroomMedia];
                      next[i] = { ...row, titleEn: e.target.value };
                      setDraft({ ...draft, showroomMedia: next });
                    }}
                  />
                  <input
                    placeholder="عنوان AR (اختياري)"
                    value={row.titleAr ?? ""}
                    onChange={(e) => {
                      const next = [...draft.showroomMedia];
                      next[i] = { ...row, titleAr: e.target.value };
                      setDraft({ ...draft, showroomMedia: next });
                    }}
                  />
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        showroomMedia: draft.showroomMedia.filter((_, j) => j !== i),
                      })
                    }
                  >
                    حذف
                  </button>
                </div>
              ))}
              <button
                type="button"
                className={styles.btn}
                onClick={() =>
                  setDraft({
                    ...draft,
                    showroomMedia: [
                      ...draft.showroomMedia,
                      {
                        id: Date.now(),
                        kind: "image",
                        url: "",
                        titleEn: "",
                        titleAr: "",
                        sortOrder: draft.showroomMedia.length,
                      },
                    ],
                  })
                }
              >
                + صورة للمعرض
              </button>
            </div>
          )}

          {tab === "promo" && (
            <div className={styles.form}>
              <p className={styles.hint}>
                بلاطات العروض الكبيرة في الصفحة الرئيسية (Promo mega / grid حسب المكوّن). يجب أن يحتوي كل بانر على
                صورة صالحة.
              </p>
              {draft.promoBanners.map((row, i) => (
                <div key={`pr-${row.id}-${i}`} className={styles.rowCard}>
                  <input
                    placeholder="عنوان EN"
                    value={row.titleEn}
                    onChange={(e) => {
                      const next = [...draft.promoBanners];
                      next[i] = { ...row, titleEn: e.target.value };
                      setDraft({ ...draft, promoBanners: next });
                    }}
                  />
                  <input
                    placeholder="عنوان AR"
                    value={row.titleAr}
                    onChange={(e) => {
                      const next = [...draft.promoBanners];
                      next[i] = { ...row, titleAr: e.target.value };
                      setDraft({ ...draft, promoBanners: next });
                    }}
                  />
                  <input
                    placeholder="وصف فرعي EN"
                    value={row.subEn}
                    onChange={(e) => {
                      const next = [...draft.promoBanners];
                      next[i] = { ...row, subEn: e.target.value };
                      setDraft({ ...draft, promoBanners: next });
                    }}
                  />
                  <input
                    placeholder="وصف فرعي AR"
                    value={row.subAr}
                    onChange={(e) => {
                      const next = [...draft.promoBanners];
                      next[i] = { ...row, subAr: e.target.value };
                      setDraft({ ...draft, promoBanners: next });
                    }}
                  />
                  <label>رابط الصورة (أو ارفع أدناه)</label>
                  <input
                    dir="ltr"
                    value={row.imageUrl}
                    onChange={(e) => {
                      const next = [...draft.promoBanners];
                      next[i] = { ...row, imageUrl: e.target.value };
                      setDraft({ ...draft, promoBanners: next });
                    }}
                  />
                  <input
                    type="file"
                    accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) void uploadPromoBannerImage(i, f);
                    }}
                  />
                  <input
                    placeholder="رابط الزر href"
                    dir="ltr"
                    value={row.href}
                    onChange={(e) => {
                      const next = [...draft.promoBanners];
                      next[i] = { ...row, href: e.target.value };
                      setDraft({ ...draft, promoBanners: next });
                    }}
                  />
                  <input
                    placeholder="catSlug (اختياري)"
                    dir="ltr"
                    value={row.catSlug ?? ""}
                    onChange={(e) => {
                      const next = [...draft.promoBanners];
                      next[i] = { ...row, catSlug: e.target.value || null };
                      setDraft({ ...draft, promoBanners: next });
                    }}
                  />
                  <label className={styles.inline}>
                    <input
                      type="checkbox"
                      checked={row.active}
                      onChange={(e) => {
                        const next = [...draft.promoBanners];
                        next[i] = { ...row, active: e.target.checked };
                        setDraft({ ...draft, promoBanners: next });
                      }}
                    />
                    ظاهر
                  </label>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        promoBanners: draft.promoBanners.filter((_, j) => j !== i),
                      })
                    }
                  >
                    حذف
                  </button>
                </div>
              ))}
              <button
                type="button"
                className={styles.btn}
                onClick={() =>
                  setDraft({
                    ...draft,
                    promoBanners: [
                      ...draft.promoBanners,
                      {
                        id: Date.now(),
                        titleEn: "New deal",
                        titleAr: "عرض جديد",
                        subEn: "",
                        subAr: "",
                        imageUrl: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=800",
                        href: "/products",
                        catSlug: null,
                        sortOrder: draft.promoBanners.length,
                        active: true,
                      },
                    ],
                  })
                }
              >
                + بانر عرض
              </button>
            </div>
          )}

          {tab === "hero" && (
            <HeroSlidesEditor
              slides={draft.heroSlides}
              previewLocale={previewLocale}
              onChange={(next) => setDraft({ ...draft, heroSlides: next })}
              heroAutoplayMs={draft.siteConfig.heroAutoplayMs ?? 7000}
              onAutoplayMsChange={(ms) =>
                setDraft({
                  ...draft,
                  siteConfig: { ...draft.siteConfig, heroAutoplayMs: ms },
                })
              }
              heroScrimOpacityPct={draft.siteConfig.heroScrimOpacityPct ?? 25}
              onHeroScrimOpacityPctChange={(pct) =>
                setDraft({
                  ...draft,
                  siteConfig: { ...draft.siteConfig, heroScrimOpacityPct: pct },
                })
              }
              heroNavArrowColor={draft.siteConfig.heroNavArrowColor ?? "#ffffff"}
              onHeroNavArrowColorChange={(hex) =>
                setDraft({ ...draft, siteConfig: { ...draft.siteConfig, heroNavArrowColor: hex } })
              }
              heroNavArrowOpacityPct={draft.siteConfig.heroNavArrowOpacityPct ?? 80}
              onHeroNavArrowOpacityPctChange={(pct) =>
                setDraft({
                  ...draft,
                  siteConfig: { ...draft.siteConfig, heroNavArrowOpacityPct: pct },
                })
              }
              heroNavBoxColor={draft.siteConfig.heroNavBoxColor ?? "#ffffff"}
              onHeroNavBoxColorChange={(hex) =>
                setDraft({ ...draft, siteConfig: { ...draft.siteConfig, heroNavBoxColor: hex } })
              }
              heroNavBoxOpacityPct={draft.siteConfig.heroNavBoxOpacityPct ?? 8}
              onHeroNavBoxOpacityPctChange={(pct) =>
                setDraft({
                  ...draft,
                  siteConfig: { ...draft.siteConfig, heroNavBoxOpacityPct: pct },
                })
              }
              onUploadSlideImage={(i, f) => void uploadHeroSlideImage(i, f)}
            />
          )}

          {tab === "nav" && (
            <NavItemsEditor
              items={navItems}
              onChange={setNavItems}
              onLoadExample={() => setNavItems(loadExampleNav())}
              onClearUseDefault={() => setNavItems([])}
            />
          )}

          {tab === "homePage" && <HomePageCopyEditor draft={draft} setDraft={setDraft} />}

          {tab === "products" && (
            <div className={styles.form}>
              <p>إدارة المنتجات والأقسام والصور ونموذج 3D من صفحة مخصصة.</p>
              <Link to="/admin/products" className={styles.btn}>
                فتح صفحة المنتجات
              </Link>
            </div>
          )}

          </div>
          <div className={styles.editorStickyBar}>
            <p className={styles.stickyHint}>
              التغييرات هنا تنعكس على معاينة الزائر فوراً؛ لظهورها على الموقع العام احفظ، ويتطلّب ذلك اتصالاً
              بقاعدة البيانات.
            </p>
            <button type="button" className={styles.btn} onClick={save}>
              حفظ كل التغييرات
            </button>
          </div>
        </aside>

        <section className={styles.preview}>
          <div className={styles.previewLabel}>معاينة الزائر</div>
          <p className={styles.previewSub}>
            تعكس التعديلات فوراً هنا. ليظهر المحتوى للجميع على النطاق العام اضغط «حفظ كل التغييرات» أسفل المحرّر
            (يتطلّب قاعدة بيانات).
          </p>
          {previewValue && (
            <StorefrontProvider value={previewValue}>
              <ThemeApplier tokens={previewValue.theme}>
                <div className={styles.previewScale}>
                  <Suspense
                    fallback={
                      <div className={styles.previewLoading} role="status" aria-live="polite">
                        جاري تحميل المعاينة…
                      </div>
                    }
                  >
                    <CmsVisitorPreview activeTab={tab} />
                  </Suspense>
                </div>
              </ThemeApplier>
            </StorefrontProvider>
          )}
        </section>
      </div>
    </div>
  );
}
