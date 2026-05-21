import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes, useEffect } from "react";
import s from "./ui.module.css";

// ─── Button ─────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconOnly?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  iconOnly,
  disabled,
  children,
  className,
  ...rest
}: ButtonProps) {
  const cls = [
    s.btn,
    variant === "primary" && s.btnPrimary,
    variant === "secondary" && s.btnSecondary,
    variant === "ghost" && s.btnGhost,
    variant === "danger" && s.btnDanger,
    size === "sm" && s.btnSm,
    size === "lg" && s.btnLg,
    iconOnly && s.btnIcon,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {loading ? "…" : children}
    </button>
  );
}

// ─── Field / Input / Textarea / Select ──────────────────────────────────────

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className={s.field}>
      {label && <label className={s.label}>{label}</label>}
      {children}
      {error ? <div className={s.errorText}>{error}</div> : hint ? <div className={s.helpText}>{hint}</div> : null}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={[s.input, props.className].filter(Boolean).join(" ")} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={[s.textarea, props.className].filter(Boolean).join(" ")} />;
}

export function Select({
  options,
  className,
  ...rest
}: InputHTMLAttributes<HTMLSelectElement> & {
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select {...(rest as unknown as React.SelectHTMLAttributes<HTMLSelectElement>)} className={[s.select, className].filter(Boolean).join(" ")}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ─── Card ───────────────────────────────────────────────────────────────────

export function Card({
  title,
  action,
  tight,
  children,
}: {
  title?: ReactNode;
  action?: ReactNode;
  tight?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={s.card}>
      {(title || action) && (
        <div className={s.cardHeader}>
          {title ? <h3 className={s.cardTitle}>{title}</h3> : <span />}
          {action}
        </div>
      )}
      <div className={tight ? s.cardBodyTight : s.cardBody}>{children}</div>
    </div>
  );
}

// ─── Badge ──────────────────────────────────────────────────────────────────

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  const cls = [
    s.badge,
    tone === "success" && s.badgeSuccess,
    tone === "warning" && s.badgeWarning,
    tone === "danger" && s.badgeDanger,
    tone === "info" && s.badgeInfo,
    tone === "brand" && s.badgeBrand,
  ]
    .filter(Boolean)
    .join(" ");
  return <span className={cls}>{children}</span>;
}

// ─── Table ──────────────────────────────────────────────────────────────────

export function Table<Row>({
  columns,
  rows,
  rowKey,
  empty,
}: {
  columns: Array<{ header: ReactNode; cell: (row: Row) => ReactNode; width?: string }>;
  rows: Row[];
  rowKey: (row: Row) => string | number;
  empty?: ReactNode;
}) {
  if (rows.length === 0) {
    return <div className={s.empty}>{empty ?? "—"}</div>;
  }
  return (
    <div className={s.tableWrap}>
      <table className={s.table}>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} style={c.width ? { width: c.width } : undefined}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((c, i) => (
                <td key={i}>{c.cell(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Modal ──────────────────────────────────────────────────────────────────

export function Modal({
  open,
  onClose,
  title,
  size = "md",
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  size?: "md" | "lg";
  footer?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className={s.modalBackdrop} onClick={onClose}>
      <div className={[s.modal, size === "lg" && s.modalLg].filter(Boolean).join(" ")} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className={s.modalHeader}>
            <h2 className={s.modalTitle}>{title}</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
        )}
        <div className={s.modalBody}>{children}</div>
        {footer && <div className={s.modalFooter}>{footer}</div>}
      </div>
    </div>
  );
}

// ─── Avatar ─────────────────────────────────────────────────────────────────

export function Avatar({ name, url, small }: { name: string; url?: string | null; small?: boolean }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className={[s.avatar, small && s.avatarSm].filter(Boolean).join(" ")}>
      {url ? <img src={url} alt={name} /> : initials || "?"}
    </span>
  );
}

// Re-export style hooks for the layout / pages that want direct access
export const ui = s;
