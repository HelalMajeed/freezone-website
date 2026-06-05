import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  dashboardApi,
  DashboardApiError,
  uploadDashboardFile,
  type SiteConfigPublic,
  type SiteConfigUpdatePayload,
} from "@/lib/dashboard/api";
import { freezoneApiUrl } from "@/lib/api-internal";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Textarea,
} from "@/components/dashboard/ui";

type Lang = "ar" | "en";

function resolveImage(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return freezoneApiUrl(url);
}

export function DashboardSettingsPage() {
  const { i18n } = useTranslation();
  const lang = ((i18n.resolvedLanguage ?? "en").startsWith("ar") ? "ar" : "en") as Lang;

  const [config, setConfig] = useState<SiteConfigPublic | null>(null);
  const [draft, setDraft] = useState<SiteConfigPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    dashboardApi
      .get<SiteConfigPublic>("/api/admin/site-config")
      .then((d) => {
        setConfig(d);
        setDraft(d);
        setErr(null);
      })
      .catch((e) =>
        setErr(e instanceof DashboardApiError ? e.code : (e as Error).message),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const dirty =
    config != null &&
    draft != null &&
    Object.keys(config).some(
      (k) =>
        (config as Record<string, unknown>)[k] !== (draft as Record<string, unknown>)[k],
    );

  const update = <K extends keyof SiteConfigPublic>(k: K, v: SiteConfigPublic[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  const onLogoUpload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErr(lang === "ar" ? "الحد ٥ ميغابايت." : "Max 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadDashboardFile(file, {
        register: true,
        title: "Site logo",
      });
      update("logoUrl", url);
    } catch (e) {
      setErr(e instanceof DashboardApiError ? e.code : "UPLOAD_FAILED");
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    if (!draft || !config) return;
    setSaving(true);
    setSavedMsg(null);
    setErr(null);
    try {
      // Send only the changed keys
      const payload: SiteConfigUpdatePayload = {};
      (Object.keys(draft) as Array<keyof SiteConfigPublic>).forEach((k) => {
        if (k === "updatedAt") return;
        if (draft[k] !== config[k]) {
          (payload as Record<string, unknown>)[k] = draft[k];
        }
      });
      const updated = await dashboardApi.patch<SiteConfigPublic>(
        "/api/admin/site-config",
        payload,
      );
      setConfig(updated);
      setDraft(updated);
      setSavedMsg(lang === "ar" ? "تم الحفظ." : "Saved.");
      window.setTimeout(() => setSavedMsg(null), 2500);
    } catch (e) {
      setErr(e instanceof DashboardApiError ? e.code : (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onReset = () => {
    setDraft(config);
    setErr(null);
  };

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">
            {lang === "ar" ? "إعدادات الموقع" : "Site settings"}
          </h1>
          <div className="dashboard-page-subtitle">
            {lang === "ar"
              ? "اسم المتجر، بيانات التواصل، الشحن، الدفع، وSEO — مصدر موحَّد."
              : "Store name, contact info, shipping, payment, and SEO — single source of truth."}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {savedMsg && <span style={{ color: "var(--fz-success, #16a34a)", fontSize: 13 }}>✓ {savedMsg}</span>}
          {dirty && (
            <Button variant="ghost" onClick={onReset} disabled={saving}>
              {lang === "ar" ? "إلغاء" : "Reset"}
            </Button>
          )}
          <Button onClick={onSave} loading={saving} disabled={!dirty}>
            {lang === "ar" ? "حفظ التغييرات" : "Save changes"}
          </Button>
        </div>
      </div>

      {loading || !draft ? (
        <Card>
          <div className="dashboard-loader" />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {err && (
            <div
              style={{
                background: "var(--fz-danger-bg)",
                color: "var(--fz-danger)",
                padding: "10px 14px",
                borderRadius: "var(--fz-radius)",
                fontSize: 13,
              }}
            >
              {err}
            </div>
          )}

          {draft.maintenanceMode && (
            <Card>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  color: "var(--fz-warning, #b45309)",
                  fontWeight: 500,
                  fontSize: 14,
                }}
              >
                <Badge tone="warning">
                  {lang === "ar" ? "وضع الصيانة" : "Maintenance"}
                </Badge>
                <span>
                  {lang === "ar"
                    ? "المتجر يعرض شاشة الصيانة للزوار حالياً."
                    : "Storefront is showing the maintenance screen to visitors."}
                </span>
              </div>
            </Card>
          )}

          <Card title={lang === "ar" ? "العلامة التجارية" : "Brand"}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label={lang === "ar" ? "اسم المتجر (إنجليزي)" : "Store name (English)"}>
                  <Input
                    value={draft.storeNameEn}
                    onChange={(e) => update("storeNameEn", e.target.value)}
                  />
                </Field>
                <Field label={lang === "ar" ? "اسم المتجر (عربي)" : "Store name (Arabic)"}>
                  <Input
                    value={draft.storeNameAr}
                    onChange={(e) => update("storeNameAr", e.target.value)}
                  />
                </Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label={lang === "ar" ? "العبارة (إنجليزي)" : "Tagline (English)"}>
                  <Input
                    value={draft.taglineEn}
                    onChange={(e) => update("taglineEn", e.target.value)}
                  />
                </Field>
                <Field label={lang === "ar" ? "العبارة (عربي)" : "Tagline (Arabic)"}>
                  <Input
                    value={draft.taglineAr}
                    onChange={(e) => update("taglineAr", e.target.value)}
                  />
                </Field>
              </div>
              <Field label={lang === "ar" ? "الشعار" : "Logo"}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      display: "inline-flex",
                      width: 80,
                      height: 60,
                      background: "var(--fz-bg-soft, #f1f5f9)",
                      border: "1px solid var(--fz-border, #e5e7eb)",
                      borderRadius: 8,
                      overflow: "hidden",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {draft.logoUrl ? (
                      <img
                        src={resolveImage(draft.logoUrl)}
                        alt=""
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      />
                    ) : (
                      <span style={{ color: "var(--fz-text-muted)" }}>—</span>
                    )}
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      style={{ display: "none" }}
                      onChange={(e) => onLogoUpload(e.target.files?.[0] ?? undefined)}
                    />
                    <div style={{ display: "flex", gap: 6 }}>
                      <Button
                        size="sm"
                        variant="secondary"
                        type="button"
                        loading={uploading}
                        onClick={() => fileRef.current?.click()}
                      >
                        {draft.logoUrl
                          ? lang === "ar" ? "استبدال" : "Replace"
                          : lang === "ar" ? "رفع شعار" : "Upload logo"}
                      </Button>
                      {draft.logoUrl && (
                        <Button
                          size="sm"
                          variant="ghost"
                          type="button"
                          onClick={() => update("logoUrl", null)}
                        >
                          {lang === "ar" ? "إزالة" : "Remove"}
                        </Button>
                      )}
                    </div>
                    <Input
                      value={draft.logoUrl ?? ""}
                      onChange={(e) => update("logoUrl", e.target.value || null)}
                      placeholder={lang === "ar" ? "أو ألصق رابطاً" : "Or paste a URL"}
                    />
                  </div>
                </div>
              </Field>
              <Field
                label={lang === "ar" ? "ارتفاع الشعار في الهيدر (بكسل)" : "Header logo height (px)"}
              >
                <Input
                  type="number"
                  value={String(draft.headerLogoHeightPx)}
                  onChange={(e) =>
                    update("headerLogoHeightPx", Number(e.target.value) || 0)
                  }
                />
              </Field>
            </div>
          </Card>

          <Card title={lang === "ar" ? "بيانات التواصل" : "Contact"}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                <Field label={lang === "ar" ? "الهاتف" : "Phone"}>
                  <Input
                    value={draft.phone}
                    onChange={(e) => update("phone", e.target.value)}
                  />
                </Field>
                <Field label="WhatsApp">
                  <Input
                    value={draft.whatsapp}
                    onChange={(e) => update("whatsapp", e.target.value)}
                  />
                </Field>
                <Field label={lang === "ar" ? "البريد" : "Email"}>
                  <Input
                    type="email"
                    value={draft.email}
                    onChange={(e) => update("email", e.target.value)}
                  />
                </Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label={lang === "ar" ? "العنوان (إنجليزي)" : "Address (English)"}>
                  <Textarea
                    rows={2}
                    value={draft.addressEn}
                    onChange={(e) => update("addressEn", e.target.value)}
                  />
                </Field>
                <Field label={lang === "ar" ? "العنوان (عربي)" : "Address (Arabic)"}>
                  <Textarea
                    rows={2}
                    value={draft.addressAr}
                    onChange={(e) => update("addressAr", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </Card>

          <Card title={lang === "ar" ? "الشحن والدفع" : "Shipping & payment"}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field
                  label={lang === "ar" ? "حد التوصيل المجاني (د.ع)" : "Free delivery threshold (IQD)"}
                >
                  <Input
                    type="number"
                    value={String(draft.freeDeliveryThreshold)}
                    onChange={(e) =>
                      update("freeDeliveryThreshold", Number(e.target.value) || 0)
                    }
                  />
                </Field>
                <Field
                  label={lang === "ar" ? "أجور الشحن الاعتيادية (د.ع)" : "Standard shipping fee (IQD)"}
                >
                  <Input
                    type="number"
                    value={String(draft.standardShippingFee)}
                    onChange={(e) =>
                      update("standardShippingFee", Number(e.target.value) || 0)
                    }
                  />
                </Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="ZainCash wallet">
                  <Input
                    value={draft.zainCashWallet}
                    onChange={(e) => update("zainCashWallet", e.target.value)}
                  />
                </Field>
                <Field label="Qi-Card merchant ID">
                  <Input
                    value={draft.qiCardMerchantId}
                    onChange={(e) => update("qiCardMerchantId", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </Card>

          <Card title={lang === "ar" ? "الشريط الترويجي" : "Promo bar"}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <input
                  type="checkbox"
                  checked={draft.promoBarEnabled}
                  onChange={(e) => update("promoBarEnabled", e.target.checked)}
                />
                <span>
                  {lang === "ar"
                    ? "إظهار الشريط الترويجي في أعلى المتجر."
                    : "Show the promo bar above the storefront."}
                </span>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label={lang === "ar" ? "النص (إنجليزي)" : "Text (English)"}>
                  <Input
                    value={draft.promoBarTextEn}
                    onChange={(e) => update("promoBarTextEn", e.target.value)}
                  />
                </Field>
                <Field label={lang === "ar" ? "النص (عربي)" : "Text (Arabic)"}>
                  <Input
                    value={draft.promoBarTextAr}
                    onChange={(e) => update("promoBarTextAr", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </Card>

          <Card title="SEO">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label={lang === "ar" ? "Meta title (إنجليزي)" : "Meta title (English)"}>
                  <Input
                    value={draft.metaTitleEn ?? ""}
                    onChange={(e) => update("metaTitleEn", e.target.value || null)}
                  />
                </Field>
                <Field label={lang === "ar" ? "Meta title (عربي)" : "Meta title (Arabic)"}>
                  <Input
                    value={draft.metaTitleAr ?? ""}
                    onChange={(e) => update("metaTitleAr", e.target.value || null)}
                  />
                </Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label={lang === "ar" ? "Meta description (إنجليزي)" : "Meta description (English)"}>
                  <Textarea
                    rows={3}
                    value={draft.metaDescriptionEn ?? ""}
                    onChange={(e) => update("metaDescriptionEn", e.target.value || null)}
                  />
                </Field>
                <Field label={lang === "ar" ? "Meta description (عربي)" : "Meta description (Arabic)"}>
                  <Textarea
                    rows={3}
                    value={draft.metaDescriptionAr ?? ""}
                    onChange={(e) => update("metaDescriptionAr", e.target.value || null)}
                  />
                </Field>
              </div>
              <Field
                label={lang === "ar" ? "كلمات مفتاحية" : "Keywords"}
                hint={lang === "ar" ? "مفصولة بفواصل." : "Comma-separated."}
              >
                <Input
                  value={draft.seoKeywords ?? ""}
                  onChange={(e) => update("seoKeywords", e.target.value || null)}
                />
              </Field>
            </div>
          </Card>

          <Card title={lang === "ar" ? "وضع الصيانة" : "Maintenance mode"}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: 10,
                background: "var(--fz-bg-soft, #f8fafc)",
                borderRadius: "var(--fz-radius)",
                fontSize: 13,
              }}
            >
              <input
                type="checkbox"
                checked={draft.maintenanceMode}
                onChange={(e) => update("maintenanceMode", e.target.checked)}
              />
              <span>
                {lang === "ar"
                  ? "تشغيل وضع الصيانة — يعرض الزوار شاشة الصيانة فوراً عند الحفظ."
                  : "Enable maintenance — visitors see the maintenance screen as soon as you save."}
              </span>
            </label>
          </Card>
        </div>
      )}
    </>
  );
}

export default DashboardSettingsPage;
