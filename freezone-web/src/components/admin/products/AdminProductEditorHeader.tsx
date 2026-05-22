"use client";

import { Link } from "react-router-dom";
import { AdminStatusBadge, type ProductWorkflowStatus } from "@/components/admin/ui/AdminStatusBadge";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import ui from "@/components/admin/ui/AdminUi.module.css";

export function AdminProductEditorHeader({
  title,
  workflowStatus,
  storefrontUrl,
  saving,
  onSave,
  onSaveDraft,
  onPublish,
  onCancel,
}: {
  title: string;
  workflowStatus: ProductWorkflowStatus;
  storefrontUrl?: string;
  saving?: boolean;
  onSave: () => void;
  onSaveDraft?: () => void;
  onPublish?: () => void;
  onCancel?: () => void;
}) {
  const compact = useBreakpoint(640);

  const actionButtons = (
    <>
      {storefrontUrl ? (
        <a className={ui.btnSm} href={storefrontUrl} target="_blank" rel="noreferrer">
          معاينة في المتجر
        </a>
      ) : null}
      {onCancel ? (
        <button type="button" className={ui.btnSm} onClick={onCancel} disabled={saving}>
          إلغاء
        </button>
      ) : null}
      {onSaveDraft ? (
        <button type="button" className={ui.btnSm} onClick={onSaveDraft} disabled={saving}>
          حفظ كمسودة
        </button>
      ) : null}
      <button type="button" className={ui.btnSm} onClick={onSave} disabled={saving}>
        {saving ? "جاري الحفظ…" : "حفظ"}
      </button>
      {onPublish ? (
        <button type="button" className={`${ui.btnSm} ${ui.btnPrimaryOutline}`} onClick={onPublish} disabled={saving}>
          نشر
        </button>
      ) : null}
    </>
  );

  return (
    <div className={ui.editorHeader}>
      <div className={ui.editorHeaderMain}>
        <Link to="/admin/products" className={ui.editorBack}>
          ← المنتجات
        </Link>
        <h1 className={ui.editorTitle}>{title}</h1>
        <AdminStatusBadge status={workflowStatus} />
      </div>
      {compact ? (
        <details className={ui.editorActionsMenu}>
          <summary className={ui.editorActionsMenuBtn} aria-label="إجراءات">
            ⋮
          </summary>
          <div className={ui.editorActionsMenuPanel}>{actionButtons}</div>
        </details>
      ) : (
        <div className={ui.editorHeaderActions}>{actionButtons}</div>
      )}
    </div>
  );
}
