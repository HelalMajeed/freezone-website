"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import type { ButtonStyleToken, ThemeTokens } from "@/lib/theme-tokens";
import { DEFAULT_THEME } from "@/lib/theme-tokens";

function spacingPresetFromGap(gap: string): "compact" | "normal" | "relaxed" {
  if (gap.includes("32") || gap === "2rem") return "compact";
  if (gap.includes("72") || gap.includes("64") || gap === "4rem") return "relaxed";
  return "normal";
}

function gapFromPreset(p: "compact" | "normal" | "relaxed"): string {
  if (p === "compact") return "32px";
  if (p === "relaxed") return "72px";
  return "48px";
}

export default function AdminDesignPage() {
  const navigate = useNavigate();
  const [tokens, setTokens] = useState<ThemeTokens>(DEFAULT_THEME);
  const [preset, setPreset] = useState<"compact" | "normal" | "relaxed">("normal");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/theme", { credentials: "include" });
    if (res.status === 401) {
      navigate("/admin/login", { replace: true });
      return;
    }
    if (!res.ok) {
      setErr("تعذّر التحميل");
      return;
    }
    const data = (await res.json()) as { tokens: ThemeTokens };
    setTokens(data.tokens);
    setPreset(spacingPresetFromGap(data.tokens.sectionSpacing));
    setErr("");
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    const res = await fetch("/api/admin/theme", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokens }),
    });
    if (!res.ok) {
      setErr("فشل الحفظ — تأكد من قاعدة البيانات");
      return;
    }
    setErr("");
    setMsg("تم حفظ المظهر");
    void load();
  }

  function setPresetAndGap(p: "compact" | "normal" | "relaxed") {
    setPreset(p);
    setTokens((t) => ({ ...t, sectionSpacing: gapFromPreset(p) }));
  }

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0, flex: 1 }}>المظهر والألوان</h1>
        <Link to="/admin" style={{ color: "var(--admin-muted)", fontSize: 14 }}>
          لوحة التحكم
        </Link>
      </div>
      <p style={{ color: "var(--admin-muted)", fontSize: 14, marginBottom: 16 }}>
        تُحفظ القيم في <code>SiteConfig.themeTokens</code> وتُحقَن كمتغيرات CSS في واجهة المتجر (<code>ThemeApplier</code>).
      </p>
      {err && <div style={{ color: "#fecaca", marginBottom: 10 }}>{err}</div>}
      {msg && <div style={{ color: "#86efac", marginBottom: 10 }}>{msg}</div>}

      <div style={{ display: "grid", gap: 14, maxWidth: 560 }}>
        <label style={lab}>لون أساسي</label>
        <input type="color" value={tokens.primary} onChange={(e) => setTokens({ ...tokens, primary: e.target.value })} />

        <label style={lab}>نص فوق الأساسي</label>
        <input
          type="color"
          value={tokens.primaryForeground}
          onChange={(e) => setTokens({ ...tokens, primaryForeground: e.target.value })}
        />

        <label style={lab}>لون ثانوي (خلفيات داكنة)</label>
        <input type="color" value={tokens.secondary} onChange={(e) => setTokens({ ...tokens, secondary: e.target.value })} />

        <label style={lab}>نص فوق الثانوي</label>
        <input
          type="color"
          value={tokens.secondaryForeground}
          onChange={(e) => setTokens({ ...tokens, secondaryForeground: e.target.value })}
        />

        <label style={lab}>خلفية الصفحة</label>
        <input type="color" value={tokens.background} onChange={(e) => setTokens({ ...tokens, background: e.target.value })} />

        <label style={lab}>سطح البطاقات</label>
        <input type="color" value={tokens.surface} onChange={(e) => setTokens({ ...tokens, surface: e.target.value })} />

        <label style={lab}>صورة أو تدرج خلفية (اختياري)</label>
        <input
          dir="ltr"
          placeholder="https://… أو linear-gradient(…)"
          value={tokens.backgroundImage}
          onChange={(e) => setTokens({ ...tokens, backgroundImage: e.target.value })}
          style={inp}
        />

        <label style={lab}>زوايا البطاقات (CSS)</label>
        <input value={tokens.cardRadius} onChange={(e) => setTokens({ ...tokens, cardRadius: e.target.value })} style={inp} />

        <label style={lab}>زوايا الأزرار (CSS)</label>
        <input value={tokens.buttonRadius} onChange={(e) => setTokens({ ...tokens, buttonRadius: e.target.value })} style={inp} />

        <label style={lab}>ظل البطاقات (CSS)</label>
        <input value={tokens.shadowCard} onChange={(e) => setTokens({ ...tokens, shadowCard: e.target.value })} style={inp} />

        <label style={lab}>تباعد الأقسام (preset)</label>
        <select
          value={preset}
          onChange={(e) => setPresetAndGap(e.target.value as "compact" | "normal" | "relaxed")}
          style={inp}
        >
          <option value="compact">مضغوط (32px)</option>
          <option value="normal">قياسي (48px)</option>
          <option value="relaxed">واسع (72px)</option>
        </select>
        <label style={lab}>قيمة تباعد مخصصة (CSS)</label>
        <input
          value={tokens.sectionSpacing}
          onChange={(e) => {
            setTokens({ ...tokens, sectionSpacing: e.target.value });
            setPreset(spacingPresetFromGap(e.target.value));
          }}
          style={inp}
        />

        <label style={lab}>عائلة خط العناوين (CSS)</label>
        <input value={tokens.fontHeading} onChange={(e) => setTokens({ ...tokens, fontHeading: e.target.value })} style={inp} />

        <label style={lab}>عائلة خط النص (CSS)</label>
        <input value={tokens.fontBody} onChange={(e) => setTokens({ ...tokens, fontBody: e.target.value })} style={inp} />

        <label style={lab}>مقياس العناوين (CSS، مثل 1 أو 1.05)</label>
        <input value={tokens.headingScale} onChange={(e) => setTokens({ ...tokens, headingScale: e.target.value })} style={inp} />

        <label style={lab}>نمط الأزرار في الطبقة (رمزية للتوسع)</label>
        <select
          value={tokens.buttonStyle}
          onChange={(e) => setTokens({ ...tokens, buttonStyle: e.target.value as ButtonStyleToken })}
          style={inp}
        >
          <option value="solid">ممتلئ</option>
          <option value="outline">إطار</option>
          <option value="ghost">شفاف</option>
        </select>
      </div>

      <button
        type="button"
        onClick={() => void save()}
        style={{
          marginTop: 24,
          padding: "12px 24px",
          background: "#dc2626",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        حفظ المظهر
      </button>
    </div>
  );
}

const lab: CSSProperties = { fontSize: 13, color: "var(--admin-muted)" };
const inp: CSSProperties = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #334155",
  background: "var(--admin-surface)",
  color: "var(--admin-text)",
};
