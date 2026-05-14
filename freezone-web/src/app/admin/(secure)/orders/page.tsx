"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { freezoneApiUrl } from "@/lib/api-internal";

type OrderRow = {
  id: number;
  orderNumber: string;
  status: string;
  fulfillment: string;
  paymentMethod: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  subtotal: number;
  shipping: number;
  total: number;
  couponCode: string | null;
  discountTotal: number;
  createdAt: string;
  items: { id: number; nameSnapshot: string; qty: number; priceSnapshot: number }[];
};

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;

export default function AdminOrdersPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [msg, setMsg] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(freezoneApiUrl("/api/admin/orders"), { credentials: "include" });
    if (res.status === 401) {
      navigate("/admin/login", { replace: true });
      return;
    }
    if (!res.ok) {
      setMsg("تعذّر تحميل الطلبات — تأكد من قاعدة البيانات والمهاجرات.");
      return;
    }
    setRows(await res.json());
    setMsg("");
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(id: number, status: string) {
    const res = await fetch(freezoneApiUrl("/api/admin/orders"), {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      setMsg("فشل تحديث الحالة");
      return;
    }
    load();
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <h1 style={{ marginBottom: 8 }}>الطلبات</h1>
      <p style={{ color: "var(--admin-muted)", marginBottom: 20, fontSize: 14 }}>
        الطلبات الناتجة عن صفحة الدفع عند وجود <code>DATABASE_URL</code>. الحقل الأخضر يحدّث حالة التنفيذ.
      </p>
      {msg && <div style={{ marginBottom: 12, color: "#fecaca" }}>{msg}</div>}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "right", borderBottom: "1px solid #334155", color: "var(--admin-muted)" }}>
              <th style={{ padding: 10 }}>رقم</th>
              <th style={{ padding: 10 }}>العميل</th>
              <th style={{ padding: 10 }}>الهاتف</th>
              <th style={{ padding: 10 }}>الإجمالي</th>
              <th style={{ padding: 10 }}>الدفع</th>
              <th style={{ padding: 10 }}>الحالة</th>
              <th style={{ padding: 10 }}>تفاصيل</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <Fragment key={o.id}>
                <tr style={{ borderBottom: "1px solid var(--admin-border)" }}>
                  <td style={{ padding: 10, fontWeight: 700 }}>{o.orderNumber}</td>
                  <td style={{ padding: 10 }}>{o.customerName}</td>
                  <td style={{ padding: 10 }}>{o.customerPhone}</td>
                  <td style={{ padding: 10 }}>{o.total.toLocaleString("ar-IQ")} د.ع</td>
                  <td style={{ padding: 10 }}>{o.paymentMethod}</td>
                  <td style={{ padding: 10 }}>
                    <select
                      value={o.status}
                      onChange={(e) => setStatus(o.id, e.target.value)}
                      style={{
                        padding: 8,
                        borderRadius: 6,
                        background: "var(--admin-surface)",
                        color: "var(--admin-text)",
                        border: "1px solid #334155",
                      }}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: 10 }}>
                    <button
                      type="button"
                      className="text-sm"
                      onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                      style={{
                        background: "transparent",
                        border: "1px solid #475569",
                        color: "var(--admin-text)",
                        borderRadius: 6,
                        padding: "6px 10px",
                        cursor: "pointer",
                      }}
                    >
                      {expanded === o.id ? "إخفاء" : "عرض"}
                    </button>
                  </td>
                </tr>
                {expanded === o.id && (
                  <tr>
                    <td colSpan={7} style={{ padding: 12, background: "var(--admin-surface)" }}>
                      <div style={{ fontSize: 13, color: "var(--admin-muted)", marginBottom: 8 }}>
                        الهاتف: {o.customerPhone} · النوع: {o.fulfillment}
                        {o.customerEmail ? (
                          <>
                            <br />
                            بريد (قديم): {o.customerEmail}
                          </>
                        ) : null}
                        <br />
                        المجموع الفرعي: {(o.subtotal ?? 0).toLocaleString("ar-IQ")} د.ع · الشحن:{" "}
                        {(o.shipping ?? 0).toLocaleString("ar-IQ")} د.ع
                        {(o.discountTotal ?? 0) > 0 && (
                          <>
                            <br />
                            كوبون: {o.couponCode ?? "—"} · خصم: {(o.discountTotal ?? 0).toLocaleString("ar-IQ")} د.ع
                          </>
                        )}
                      </div>
                      <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                        {o.items.map((li) => (
                          <li key={li.id}>
                            {li.qty}× {li.nameSnapshot} — {(li.priceSnapshot * li.qty).toLocaleString("ar-IQ")}{" "}
                            د.ع
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && !msg && (
        <p style={{ color: "#64748b", marginTop: 24 }}>لا توجد طلبات بعد.</p>
      )}
    </div>
  );
}
