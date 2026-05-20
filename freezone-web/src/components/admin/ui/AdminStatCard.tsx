import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import ui from "./AdminUi.module.css";

export function AdminStatCard({
  label,
  value,
  subtitle,
  href,
  actionLabel = "عرض",
  tone = "default",
  icon: Icon,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  href?: string;
  actionLabel?: string;
  tone?: "default" | "warn" | "error";
  icon?: LucideIcon;
}) {
  const toneClass =
    tone === "warn" ? ui.statCardWarn : tone === "error" ? ui.statCardError : "";

  return (
    <div className={`${ui.statCard} ${toneClass}`}>
      <div className={ui.statCardTop}>
        {Icon ? (
          <span className={ui.statIcon} aria-hidden>
            <Icon size={18} />
          </span>
        ) : null}
        <div className={ui.statLabel}>{label}</div>
      </div>
      <div className={ui.statValue}>{value}</div>
      {subtitle ? <div className={ui.statHint}>{subtitle}</div> : null}
      {href ? (
        <Link to={href} className={ui.statLink}>
          {actionLabel} →
        </Link>
      ) : null}
    </div>
  );
}
