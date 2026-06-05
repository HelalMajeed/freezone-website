import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  dashboardApi,
  DashboardApiError,
  type ButtonStyleToken,
  type ThemeResponse,
  type ThemeTokens,
} from "@/lib/dashboard/api";
import {
  Button,
  Card,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/dashboard/ui";

type Lang = "ar" | "en";

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 40,
            height: 36,
            border: "1px solid var(--fz-border, #e5e7eb)",
            borderRadius: 6,
            padding: 2,
            background: "#fff",
            cursor: "pointer",
            flexShrink: 0,
          }}
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </Field>
  );
}

export function DashboardDesignPage() {
  const { i18n } = useTranslation();
  const lang = ((i18n.resolvedLanguage ?? "en").startsWith("ar") ? "ar" : "en") as Lang;

  const [tokens, setTokens] = useState<ThemeTokens | null>(null);
  const [draft, setDraft] = useState<ThemeTokens | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    dashboardApi
      .get<ThemeResponse>("/api/admin/theme")
      .then((d) => {
        setTokens(d.tokens);
        setDraft(d.tokens);
        setErr(null);
      })
      .catch((e) =>
        setErr(e instanceof DashboardApiError ? e.code : (e as Error).message),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const dirty =
    tokens != null &&
    draft != null &&
    Object.keys(tokens).some(
      (k) =>
        (tokens as Record<string, unknown>)[k] !==
        (draft as Record<string, unknown>)[k],
    );

  const update = <K extends keyof ThemeTokens>(k: K, v: ThemeTokens[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  const onSave = async () => {
    if (!draft) return;
    setSaving(true);
    setErr(null);
    setSavedMsg(null);
    try {
      const res = await dashboardApi.patch<{ ok: boolean; tokens: ThemeTokens }>(
        "/api/admin/theme",
        { tokens: draft },
      );
      const next = res.tokens ?? draft;
      setTokens(next);
      setDraft(next);
      setSavedMsg(lang === "ar" ? "تم الحفظ." : "Saved.");
      window.setTimeout(() => setSavedMsg(null), 2500);
    } catch (e) {
      setErr(e instanceof DashboardApiError ? e.code : (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onReset = () => {
    setDraft(tokens);
    setErr(null);
  };

  const preview = useMemo(() => {
    if (!draft) return {};
    return {
      "--fz-preview-primary": draft.primary,
      "--fz-preview-primary-fg": draft.primaryForeground,
      "--fz-preview-secondary": draft.secondary,
      "--fz-preview-secondary-fg": draft.secondaryForeground,
      "--fz-preview-bg": draft.background,
      "--fz-preview-surface": draft.surface,
      "--fz-preview-card-radius": draft.cardRadius,
      "--fz-preview-btn-radius": draft.buttonRadius,
      "--fz-preview-shadow": draft.shadowCard,
    } as React.CSSProperties;
  }, [draft]);

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">
            {lang === "ar" ? "التصميم" : "Design & theme"}
          </h1>
          <div className="dashboard-page-subtitle">
            {lang === "ar"
              ? "ألوان، خطوط، زوايا، وظلال — تنعكس على واجهة المتجر."
              : "Colors, fonts, radii, and shadows — applied across the storefront."}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {savedMsg && (
            <span style={{ color: "var(--fz-success, #16a34a)", fontSize: 13 }}>
              ✓ {savedMsg}
            </span>
          )}
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 18,
            alignItems: "start",
          }}
        >
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

            <Card title={lang === "ar" ? "الألوان" : "Colors"}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <ColorField
                  label={lang === "ar" ? "اللون الأساسي" : "Primary"}
                  value={draft.primary}
                  onChange={(v) => update("primary", v)}
                />
                <ColorField
                  label={lang === "ar" ? "نص الأساسي" : "Primary foreground"}
                  value={draft.primaryForeground}
                  onChange={(v) => update("primaryForeground", v)}
                />
                <ColorField
                  label={lang === "ar" ? "اللون الثانوي" : "Secondary"}
                  value={draft.secondary}
                  onChange={(v) => update("secondary", v)}
                />
                <ColorField
                  label={lang === "ar" ? "نص الثانوي" : "Secondary foreground"}
                  value={draft.secondaryForeground}
                  onChange={(v) => update("secondaryForeground", v)}
                />
                <ColorField
                  label={lang === "ar" ? "خلفية الصفحة" : "Background"}
                  value={draft.background}
                  onChange={(v) => update("background", v)}
                />
                <ColorField
                  label={lang === "ar" ? "السطح (بطاقات)" : "Surface (cards)"}
                  value={draft.surface}
                  onChange={(v) => update("surface", v)}
                />
              </div>
              <Field
                label={lang === "ar" ? "صورة الخلفية (CSS)" : "Background image (CSS)"}
                hint={
                  lang === "ar"
                    ? "url(…) أو linear-gradient(…). اتركه فارغاً للخلفية المسطّحة."
                    : "url(…) or linear-gradient(…). Leave blank for a flat background."
                }
              >
                <Input
                  value={draft.backgroundImage}
                  onChange={(e) => update("backgroundImage", e.target.value)}
                  style={{ fontFamily: "monospace", fontSize: 12 }}
                />
              </Field>
            </Card>

            <Card title={lang === "ar" ? "الشكل والحواف" : "Shape"}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                <Field
                  label={lang === "ar" ? "زوايا البطاقات" : "Card radius"}
                  hint="px / rem"
                >
                  <Input
                    value={draft.cardRadius}
                    onChange={(e) => update("cardRadius", e.target.value)}
                  />
                </Field>
                <Field
                  label={lang === "ar" ? "زوايا الأزرار" : "Button radius"}
                  hint="px / rem"
                >
                  <Input
                    value={draft.buttonRadius}
                    onChange={(e) => update("buttonRadius", e.target.value)}
                  />
                </Field>
                <Field label={lang === "ar" ? "مسافة الأقسام" : "Section spacing"}>
                  <Input
                    value={draft.sectionSpacing}
                    onChange={(e) => update("sectionSpacing", e.target.value)}
                  />
                </Field>
              </div>
              <Field
                label={lang === "ar" ? "ظل البطاقات" : "Card shadow"}
                hint="CSS box-shadow"
              >
                <Textarea
                  rows={2}
                  value={draft.shadowCard}
                  onChange={(e) => update("shadowCard", e.target.value)}
                  style={{ fontFamily: "monospace", fontSize: 12 }}
                />
              </Field>
              <Field label={lang === "ar" ? "شكل الأزرار" : "Button style"}>
                <Select
                  value={draft.buttonStyle}
                  onChange={(e) =>
                    update("buttonStyle", (e.target as HTMLSelectElement).value as ButtonStyleToken)
                  }
                  options={[
                    { value: "solid", label: lang === "ar" ? "مصمت" : "Solid" },
                    { value: "outline", label: lang === "ar" ? "إطار" : "Outline" },
                    { value: "ghost", label: lang === "ar" ? "شفاف" : "Ghost" },
                  ]}
                />
              </Field>
            </Card>

            <Card title={lang === "ar" ? "الخطوط" : "Typography"}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field
                  label={lang === "ar" ? "خط العناوين" : "Heading font"}
                  hint={lang === "ar" ? "اسم CSS أو inherit." : "CSS family or inherit."}
                >
                  <Input
                    value={draft.fontHeading}
                    onChange={(e) => update("fontHeading", e.target.value)}
                  />
                </Field>
                <Field label={lang === "ar" ? "خط النص" : "Body font"}>
                  <Input
                    value={draft.fontBody}
                    onChange={(e) => update("fontBody", e.target.value)}
                  />
                </Field>
              </div>
              <Field
                label={lang === "ar" ? "حجم العناوين" : "Heading scale"}
                hint={lang === "ar" ? "مثل 1, 1.05, 1.1." : "e.g. 1, 1.05, 1.1."}
              >
                <Input
                  value={draft.headingScale}
                  onChange={(e) => update("headingScale", e.target.value)}
                />
              </Field>
            </Card>
          </div>

          <ThemePreview tokens={draft} lang={lang} previewVars={preview} />
        </div>
      )}
    </>
  );
}

function ThemePreview({
  tokens,
  lang,
  previewVars,
}: {
  tokens: ThemeTokens;
  lang: Lang;
  previewVars: React.CSSProperties;
}) {
  return (
    <div style={{ position: "sticky", top: 12 }}>
      <Card title={lang === "ar" ? "معاينة" : "Live preview"}>
        <div
          style={{
            ...previewVars,
            padding: 24,
            background: "var(--fz-preview-bg)",
            backgroundImage: tokens.backgroundImage || undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            borderRadius: "var(--fz-radius)",
            border: "1px solid var(--fz-border, #e5e7eb)",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            fontFamily: tokens.fontBody && tokens.fontBody !== "inherit" ? tokens.fontBody : undefined,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: tokens.fontHeading && tokens.fontHeading !== "inherit" ? tokens.fontHeading : undefined,
              fontSize: `calc(1.6em * ${Number(tokens.headingScale) || 1})`,
              color: tokens.secondary,
            }}
          >
            {lang === "ar" ? "أهلاً بكم في فري‑زون" : "Welcome to Freezone"}
          </h2>
          <p style={{ margin: 0, color: tokens.secondaryForeground }}>
            {lang === "ar"
              ? "هذه معاينة للون الأساسي، البطاقات، والأزرار حسب إعدادات التصميم الحالية."
              : "Preview of how the primary color, cards, and buttons render with the current settings."}
          </p>

          <div
            style={{
              background: "var(--fz-preview-surface)",
              padding: 20,
              borderRadius: "var(--fz-preview-card-radius)",
              boxShadow: "var(--fz-preview-shadow)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ fontWeight: 600, color: tokens.secondary }}>
              {lang === "ar" ? "بطاقة منتج" : "Product card"}
            </div>
            <div style={{ fontSize: 13, color: tokens.secondaryForeground }}>
              {lang === "ar"
                ? "بضع كلمات عن المنتج تبيّن تباين الألوان."
                : "A few words to show the color contrast."}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                style={
                  tokens.buttonStyle === "solid"
                    ? {
                        background: tokens.primary,
                        color: tokens.primaryForeground,
                        border: "none",
                        padding: "10px 18px",
                        borderRadius: "var(--fz-preview-btn-radius)",
                        fontWeight: 600,
                        cursor: "pointer",
                      }
                    : tokens.buttonStyle === "outline"
                      ? {
                          background: "transparent",
                          color: tokens.primary,
                          border: `2px solid ${tokens.primary}`,
                          padding: "8px 16px",
                          borderRadius: "var(--fz-preview-btn-radius)",
                          fontWeight: 600,
                          cursor: "pointer",
                        }
                      : {
                          background: "transparent",
                          color: tokens.primary,
                          border: "none",
                          padding: "10px 18px",
                          borderRadius: "var(--fz-preview-btn-radius)",
                          fontWeight: 600,
                          cursor: "pointer",
                        }
                }
              >
                {lang === "ar" ? "أضف للسلّة" : "Add to cart"}
              </button>
              <button
                type="button"
                style={{
                  background: "transparent",
                  color: tokens.secondary,
                  border: `1px solid ${tokens.secondary}33`,
                  padding: "10px 18px",
                  borderRadius: "var(--fz-preview-btn-radius)",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {lang === "ar" ? "التفاصيل" : "Details"}
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default DashboardDesignPage;
