"use client";

import type { CSSProperties, FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type CouponRow = {
  id: number;
  code: string;
  labelAr: string;
  labelEn: string;
  discountType: string;
  discountValue: number;
  minSubtotal: number;
  active: boolean;
};

export default function AdminCouponsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CouponRow[]>([]);
  const [code, setCode] = useState("");
  const [labelAr, setLabelAr] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed_iqd">("percent");
  const [discountValue, setDiscountValue] = useState("10");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/coupons", { credentials: "include" });
    if (res.status === 401) {
      navigate("/admin/login", { replace: true });
      return;
    }
    if (res.ok) setRows(await res.json());
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        labelAr,
        labelEn: labelAr,
        discountType,
        discountValue: parseInt(discountValue.replace(/\D/g, ""), 10) || 0,
        active: true,
      }),
    });
    if (!res.ok) {
      setMsg("تعذّر الإنشاء — ربما الكود مكرر.");
      return;
    }
    setCode("");
    setLabelAr("");
    load();
  }

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <h1 style={{ marginBottom: 8 }}>كوبونات الخصم</h1>
      <p style={{ color: "var(--admin-muted)", marginBottom: 20, fontSize: 14 }}>
        إدارة رموز الحملات. تطبيق الخصم في سلّة الدفع سيربط لاحقاً بهذه الجداول.
      </p>

      <form
        onSubmit={add}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 28,
          padding: 16,
          background: "var(--admin-surface-inset)",
          borderRadius: 12,
          border: "1px solid #334155",
        }}
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="CODE"
          style={f}
        />
        <input
          value={labelAr}
          onChange={(e) => setLabelAr(e.target.value)}
          placeholder="وصف عربي"
          style={{ ...f, minWidth: 200 }}
        />
        <select
          value={discountType}
          onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed_iqd")}
          style={f}
        >
          <option value="percent">نسبة مئوية</option>
          <option value="fixed_iqd">مبلغ ثابت (د.ع)</option>
        </select>
        <input
          value={discountValue}
          onChange={(e) => setDiscountValue(e.target.value)}
          placeholder="قيمة"
          style={f}
        />
        <button
          type="submit"
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "none",
            background: "#dc2626",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          إضافة
        </button>
      </form>

      {msg && <div style={{ color: "#fecaca", marginBottom: 12 }}>{msg}</div>}

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {rows.map((c) => (
          <li
            key={c.id}
            style={{
              padding: 12,
              marginBottom: 8,
              background: "var(--admin-surface-inset)",
              borderRadius: 8,
              border: "1px solid #334155",
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <strong style={{ color: "#fecaca" }}>{c.code}</strong>
            <span>{c.labelAr || c.labelEn}</span>
            <span style={{ color: "var(--admin-muted)" }}>
              {c.discountType === "percent" ? `${c.discountValue}%` : `${c.discountValue} د.ع`}
            </span>
            <span>{c.active ? "نشط" : "متوقف"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const f: CSSProperties = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #334155",
  background: "var(--admin-surface)",
  color: "var(--admin-text)",
};
