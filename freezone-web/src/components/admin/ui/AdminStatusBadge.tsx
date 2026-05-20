import ui from "./AdminUi.module.css";

export type ProductWorkflowStatus = "published" | "draft" | "disabled" | "missing" | "ready";

const LABELS: Record<ProductWorkflowStatus, string> = {
  published: "منشور",
  draft: "مسودة",
  disabled: "معطّل",
  missing: "بيانات ناقصة",
  ready: "جاهز للنشر",
};

export function AdminStatusBadge({ status }: { status: ProductWorkflowStatus }) {
  const cls =
    status === "published"
      ? ui.workflowPub
      : status === "ready"
        ? ui.workflowReady
        : status === "missing"
          ? ui.workflowMissing
          : status === "disabled"
            ? ui.workflowDisabled
            : ui.workflowDraft;
  return <span className={`${ui.workflowBadge} ${cls}`}>{LABELS[status]}</span>;
}
