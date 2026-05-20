import type { ReactNode } from "react";
import ui from "./AdminUi.module.css";

export function AdminSectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={ui.section}>
      <div className={ui.sectionHead}>
        <h2 className={ui.sectionTitle}>{title}</h2>
        {action}
      </div>
      <div className={ui.sectionBody}>{children}</div>
    </section>
  );
}
