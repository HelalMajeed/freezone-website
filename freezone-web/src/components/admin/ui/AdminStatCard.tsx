import { Link } from "react-router-dom";
import ui from "./AdminUi.module.css";

export function AdminStatCard({
  label,
  value,
  hint,
  href,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  tone?: "default" | "warn" | "error";
}) {
  const border =
    tone === "warn"
      ? { borderColor: "rgba(234, 179, 8, 0.45)" }
      : tone === "error"
        ? { borderColor: "rgba(239, 68, 68, 0.4)" }
        : undefined;

  return (
    <div className={ui.statCard} style={border}>
      <div className={ui.statLabel}>{label}</div>
      <div className={ui.statValue}>{value}</div>
      {hint ? <div className={ui.statHint}>{hint}</div> : null}
      {href ? (
        <Link to={href} className={ui.statLink}>
          عرض →
        </Link>
      ) : null}
    </div>
  );
}
