import type { ReactNode } from "react";
import ui from "./AdminUi.module.css";

export function AdminBadge({
  children,
  variant = "muted",
}: {
  children: ReactNode;
  variant?: "ok" | "warn" | "error" | "muted";
}) {
  const cls =
    variant === "ok"
      ? ui.badgeOk
      : variant === "warn"
        ? ui.badgeWarn
        : variant === "error"
          ? ui.badgeError
          : ui.badgeMuted;
  return <span className={`${ui.badge} ${cls}`}>{children}</span>;
}
