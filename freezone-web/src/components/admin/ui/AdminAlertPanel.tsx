import { Link } from "react-router-dom";
import ui from "./AdminUi.module.css";

export type AdminAlert = {
  level: "warning" | "error";
  message: string;
  href?: string;
};

export function AdminAlertPanel({ alerts }: { alerts: AdminAlert[] }) {
  if (!alerts.length) return null;
  return (
    <div className={ui.alertList}>
      {alerts.map((a, i) => (
        <div
          key={`${a.message}-${i}`}
          className={`${ui.alertItem} ${a.level === "error" ? ui.alertError : ui.alertWarn}`}
        >
          <span>{a.message}</span>
          {a.href ? (
            <Link to={a.href} className={ui.btnSm}>
              مراجعة
            </Link>
          ) : null}
        </div>
      ))}
    </div>
  );
}
