"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { freezoneApiUrl } from "@/lib/api-internal";
import type { AdminSearchResult } from "@/lib/admin/admin-search-types";

async function searchApi(q: string): Promise<AdminSearchResult> {
  const res = await fetch(freezoneApiUrl(`/api/admin/search?q=${encodeURIComponent(q)}`), {
    credentials: "include",
  });
  if (!res.ok) throw new Error("search");
  const j = (await res.json()) as { data: AdminSearchResult };
  return j.data;
}

export function AdminGlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [data, setData] = useState<AdminSearchResult | null>(null);
  const [idx, setIdx] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const flat = data
    ? [
        ...data.products.map((p) => ({
          key: `p-${p.id}`,
          label: `${p.nameAr || p.nameEn} · منتج`,
          href: `/admin/products/edit/${p.id}`,
        })),
        ...data.categories.map((c) => ({
          key: `c-${c.id}`,
          label: `${c.nameAr || c.nameEn} · قسم`,
          href: `/admin/categories/${c.id}`,
        })),
        ...data.brands.map((b) => ({
          key: `b-${b.id}`,
          label: `${b.nameAr || b.nameEn} · علامة`,
          href: `/admin/brands`,
        })),
        ...data.users.map((u) => ({
          key: `u-${u.id}`,
          label: `${u.name} · موظف`,
          href: "/admin/users",
        })),
      ]
    : [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!q.trim()) {
      setData(null);
      return;
    }
    const t = window.setTimeout(() => {
      void searchApi(q).then(setData).catch(() => setData(null));
    }, 200);
    return () => window.clearTimeout(t);
  }, [q]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQ("");
      navigate(href);
    },
    [navigate],
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="بحث شامل"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.6)",
        zIndex: 2000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
      }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 92vw)",
          background: "var(--fz-surface, #fff)",
          borderRadius: 12,
          boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
          overflow: "hidden",
        }}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setIdx(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIdx((i) => Math.min(i + 1, flat.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIdx((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && flat[idx]) {
              e.preventDefault();
              go(flat[idx].href);
            }
          }}
          placeholder="بحث منتجات، أقسام، علامات، موظفين…"
          dir="auto"
          style={{
            width: "100%",
            padding: 16,
            border: "none",
            borderBottom: "1px solid var(--fz-border)",
            fontSize: 16,
            outline: "none",
          }}
        />
        <ul style={{ listStyle: "none", margin: 0, padding: 8, maxHeight: 360, overflow: "auto" }}>
          {flat.map((item, i) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => go(item.href)}
                style={{
                  width: "100%",
                  textAlign: "start",
                  padding: "10px 12px",
                  border: "none",
                  borderRadius: 8,
                  background: i === idx ? "var(--fz-brand-muted, #e0e7ff)" : "transparent",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
          {q && flat.length === 0 ? (
            <li style={{ padding: 12, color: "var(--fz-text-muted)" }}>لا نتائج</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
