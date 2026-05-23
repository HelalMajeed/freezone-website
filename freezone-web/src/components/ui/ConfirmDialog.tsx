import { useEffect, useSyncExternalStore } from "react";
import { getConfirmState, resolveConfirm, subscribeConfirm } from "@/lib/confirm";

/** Single instance is mounted at app root; subscribes to the global confirm store. */
export function ConfirmDialogHost() {
  const state = useSyncExternalStore(subscribeConfirm, getConfirmState, getConfirmState);

  useEffect(() => {
    if (!state.open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") resolveConfirm(false);
      else if (e.key === "Enter") resolveConfirm(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.open]);

  if (!state.open) return null;
  const { opts } = state;
  const cancelLabel = opts.cancelLabel ?? "إلغاء";
  const confirmLabel = opts.confirmLabel ?? "تأكيد";
  const confirmBg = opts.danger ? "#dc2626" : "#0f172a";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={opts.title ?? confirmLabel}
      onClick={() => resolveConfirm(false)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          color: "#0f172a",
          borderRadius: 12,
          padding: "20px 22px",
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.25)",
          textAlign: "start",
          lineHeight: 1.55,
          fontFamily: "inherit",
        }}
      >
        {opts.title ? (
          <h2 style={{ fontSize: "1.05rem", margin: "0 0 10px", fontWeight: 700 }}>{opts.title}</h2>
        ) : null}
        <p style={{ margin: "0 0 18px", fontSize: "0.95rem", color: "#1f2937" }}>{opts.message}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            type="button"
            onClick={() => resolveConfirm(false)}
            autoFocus
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              background: "#f1f5f9",
              color: "#0f172a",
              border: "1px solid #e2e8f0",
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => resolveConfirm(true)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              background: confirmBg,
              color: "#ffffff",
              border: `1px solid ${confirmBg}`,
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
