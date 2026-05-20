import type { ReactNode } from "react";
import ui from "./AdminUi.module.css";

export function AdminEmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className={ui.empty}>
      <p className={ui.emptyTitle}>{title}</p>
      {message ? <p style={{ margin: 0, fontSize: "0.85rem" }}>{message}</p> : null}
      {action ? <div style={{ marginTop: 12 }}>{action}</div> : null}
    </div>
  );
}
