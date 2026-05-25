"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const KEY = "admin-onboarding-v1-done";

export function AdminOnboardingTour() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  if (!open) return null;

  return (
    <div
      dir="rtl"
      style={{
        position: "fixed",
        bottom: 24,
        left: 24,
        maxWidth: 320,
        padding: 16,
        background: "#0f172a",
        color: "#f1f5f9",
        borderRadius: 12,
        border: "1px solid #334155",
        zIndex: 1500,
        boxShadow: "0 12px 32px rgba(0,0,0,0.3)",
      }}
    >
      <strong>مرحباً في لوحة الإدخال</strong>
      <ol style={{ margin: "10px 0", paddingInlineStart: 20, fontSize: 13 }}>
        <li>لوحتك الذكية تعرض مهام اليوم</li>
        <li>
          <Link to="/admin/products/new">أضف منتجاً جديداً</Link>
        </li>
        <li>
          <Link to="/admin/products">تابع منتجاتك</Link>
        </li>
        <li>Ctrl+K للبحث السريع</li>
      </ol>
      <button
        type="button"
        onClick={() => {
          localStorage.setItem(KEY, "1");
          setOpen(false);
        }}
      >
        فهمت، ابدأ
      </button>
    </div>
  );
}
