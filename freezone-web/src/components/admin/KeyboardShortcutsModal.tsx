"use client";

const SHORTCUTS = [
  ["Ctrl+S", "حفظ"],
  ["Ctrl+Shift+P", "نشر (مدير)"],
  ["Ctrl+D", "تكرار المنتج"],
  ["Ctrl+K", "بحث شامل"],
  ["Ctrl+N", "منتج جديد"],
  ["Ctrl+/", "بحث (قريباً)"],
  ["Esc", "إغلاق النوافذ"],
  ["Tab", "الحقل التالي"],
];

export function KeyboardShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
        style={{ background: "#fff", padding: 24, borderRadius: 12, maxWidth: 400 }}
      >
        <h2 style={{ marginTop: 0 }}>اختصارات لوحة المفاتيح</h2>
        <table style={{ width: "100%", fontSize: 14 }}>
          <tbody>
            {SHORTCUTS.map(([k, v]) => (
              <tr key={k}>
                <td style={{ fontFamily: "monospace", padding: "6px 0" }}>{k}</td>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={onClose} style={{ marginTop: 16 }}>
          إغلاق
        </button>
      </div>
    </div>
  );
}
