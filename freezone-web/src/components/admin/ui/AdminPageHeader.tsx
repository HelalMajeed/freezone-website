import type { ReactNode } from "react";
import ui from "./AdminUi.module.css";

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className={ui.pageHeader}>
      <div>
        <h1 className={ui.pageTitle}>{title}</h1>
        {description ? <p className={ui.pageDesc}>{description}</p> : null}
      </div>
      {actions ? <div className={ui.pageActions}>{actions}</div> : null}
    </header>
  );
}
