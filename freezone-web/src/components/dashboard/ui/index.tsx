/**
 * Dashboard UI kit — the shared primitives every dashboard feature page builds on.
 *
 * Owned by the foundation stream (WS2): feature agents consume, never edit.
 * Conventions: CSS modules over `--fz-*` tokens, logical properties (RTL-safe),
 * bilingual strings via `useDashboardLocale`, lucide-react icons (objects never
 * mirror; directional chevrons mirror via CSS under `[dir="rtl"]`).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
  type TextareaHTMLAttributes,
} from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  AlertCircle,
  Inbox,
  Info,
  Loader2,
  X,
} from "lucide-react";
import { useDashboardLocale } from "@/lib/dashboard/i18n";
import s from "./ui.module.css";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

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
  const cls = cx(
    s.btn,
    variant === "primary" && s.btnPrimary,
    variant === "secondary" && s.btnSecondary,
    variant === "ghost" && s.btnGhost,
    variant === "danger" && s.btnDanger,
    size === "sm" && s.btnSm,
    size === "lg" && s.btnLg,
    iconOnly && s.btnIcon,
    className,
  );
  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 className={s.spin} size={16} aria-hidden /> : children}
    </button>
  );
}

// ─── Field / Input / Textarea / Select ──────────────────────────────────────

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
}: {
  label?: string;
  hint?: string;
  /** Per-field error: when set, replaces the hint and turns the copy red. */
  error?: string | null;
  /** Shows a required marker next to the label. */
  required?: boolean;
  /** Connects the label to its control for a11y. */
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx(s.field, error && s.fieldInvalid)}>
      {label && (
        <label className={s.label} htmlFor={htmlFor}>
          {label}
          {required && (
            <span className={s.requiredMark} aria-hidden>
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <div className={s.errorText} role="alert">
          {error}
        </div>
      ) : hint ? (
        <div className={s.helpText}>{hint}</div>
      ) : null}
    </div>
  );
}

export type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export function Input({ invalid, className, ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      {...props}
      className={cx(s.input, invalid && s.inputInvalid, className)}
    />
  );
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export function Textarea({ invalid, className, ...props }: TextareaProps) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      {...props}
      className={cx(s.textarea, invalid && s.inputInvalid, className)}
    />
  );
}

export function Select({
  options,
  invalid,
  className,
  ...rest
}: InputHTMLAttributes<HTMLSelectElement> & {
  options: Array<{ value: string; label: string }>;
  invalid?: boolean;
}) {
  return (
    <select
      aria-invalid={invalid || undefined}
      {...(rest as unknown as React.SelectHTMLAttributes<HTMLSelectElement>)}
      className={cx(s.select, invalid && s.inputInvalid, className)}
    >
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
  const cls = cx(
    s.badge,
    tone === "success" && s.badgeSuccess,
    tone === "warning" && s.badgeWarning,
    tone === "danger" && s.badgeDanger,
    tone === "info" && s.badgeInfo,
    tone === "brand" && s.badgeBrand,
  );
  return <span className={cls}>{children}</span>;
}

// ─── Pagination ─────────────────────────────────────────────────────────────

export type PaginationProps = {
  /** 1-based current page. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** When provided, renders the page-size select. */
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
};

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: PaginationProps) {
  const { t } = useDashboardLocale();
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const clamped = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (clamped - 1) * pageSize + 1;
  const to = Math.min(total, clamped * pageSize);

  const go = (next: number) => {
    const target = Math.min(Math.max(1, next), totalPages);
    if (target !== clamped) onPageChange(target);
  };

  return (
    <div className={s.pagination}>
      <span className={s.paginationRange}>{t("pagination.rangeOf", { from, to, total })}</span>
      {onPageSizeChange && (
        <label className={s.paginationSize}>
          <select
            className={s.paginationSizeSelect}
            value={String(pageSize)}
            onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span>{t("pagination.perPage")}</span>
        </label>
      )}
      <div className={s.paginationButtons}>
        <button
          type="button"
          className={s.pageBtn}
          onClick={() => go(1)}
          disabled={clamped <= 1}
          aria-label={t("pagination.first")}
        >
          <ChevronsLeft size={16} className={s.dirIcon} aria-hidden />
        </button>
        <button
          type="button"
          className={s.pageBtn}
          onClick={() => go(clamped - 1)}
          disabled={clamped <= 1}
          aria-label={t("pagination.previous")}
        >
          <ChevronLeft size={16} className={s.dirIcon} aria-hidden />
        </button>
        <span className={s.paginationPage}>
          {t("pagination.page", { page: clamped, pages: totalPages })}
        </span>
        <button
          type="button"
          className={s.pageBtn}
          onClick={() => go(clamped + 1)}
          disabled={clamped >= totalPages}
          aria-label={t("pagination.next")}
        >
          <ChevronRight size={16} className={s.dirIcon} aria-hidden />
        </button>
        <button
          type="button"
          className={s.pageBtn}
          onClick={() => go(totalPages)}
          disabled={clamped >= totalPages}
          aria-label={t("pagination.last")}
        >
          <ChevronsRight size={16} className={s.dirIcon} aria-hidden />
        </button>
      </div>
    </div>
  );
}

// ─── Table ──────────────────────────────────────────────────────────────────

export type TableColumn<Row> = {
  header: ReactNode;
  cell: (row: Row) => ReactNode;
  width?: string;
  /** Logical alignment — numeric columns should use "end" (design system §5). */
  align?: "start" | "center" | "end";
  /** Enables the sort toggle on this column; reported through `onSortChange`. */
  sortKey?: string;
  /** Renders the cell in `--fz-font-mono` tabular figures (IDs, SKUs, money). */
  mono?: boolean;
};

export type TableSort = { key: string; dir: "asc" | "desc" };

export type TableProps<Row> = {
  columns: Array<TableColumn<Row>>;
  rows: Row[];
  rowKey: (row: Row) => string | number;
  empty?: ReactNode;
  /** Controlled sort state (server-driven lists pass it straight to the API). */
  sort?: TableSort | null;
  onSortChange?: (sort: TableSort) => void;
  /** Row-selection checkboxes. `selected` holds row keys. */
  selectable?: boolean;
  selected?: Array<string | number>;
  onSelectedChange?: (selected: Array<string | number>) => void;
  /** Sticky header inside a scrollable wrapper (pair with `maxHeight`). */
  stickyHeader?: boolean;
  /** Wrapper max-height when `stickyHeader` is on (default 65vh). */
  maxHeight?: string;
  /** Built-in pagination footer. */
  pagination?: PaginationProps;
};

export function Table<Row>({
  columns,
  rows,
  rowKey,
  empty,
  sort,
  onSortChange,
  selectable,
  selected = [],
  onSelectedChange,
  stickyHeader,
  maxHeight,
  pagination,
}: TableProps<Row>) {
  const { t } = useDashboardLocale();

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const pageKeys = useMemo(() => rows.map((r) => rowKey(r)), [rows, rowKey]);
  const allSelected = pageKeys.length > 0 && pageKeys.every((k) => selectedSet.has(k));
  const someSelected = !allSelected && pageKeys.some((k) => selectedSet.has(k));

  const toggleAll = () => {
    if (!onSelectedChange) return;
    if (allSelected) {
      onSelectedChange(selected.filter((k) => !pageKeys.includes(k)));
    } else {
      const merged = new Set(selected);
      for (const k of pageKeys) merged.add(k);
      onSelectedChange([...merged]);
    }
  };

  const toggleRow = (key: string | number) => {
    if (!onSelectedChange) return;
    if (selectedSet.has(key)) {
      onSelectedChange(selected.filter((k) => k !== key));
    } else {
      onSelectedChange([...selected, key]);
    }
  };

  const cycleSort = (key: string) => {
    if (!onSortChange) return;
    const dir: "asc" | "desc" = sort?.key === key && sort.dir === "asc" ? "desc" : "asc";
    onSortChange({ key, dir });
  };

  if (rows.length === 0) {
    return <div className={s.empty}>{empty ?? t("table.empty")}</div>;
  }

  return (
    <div>
      <div
        className={cx(s.tableWrap, stickyHeader && s.tableWrapSticky)}
        style={stickyHeader ? { maxHeight: maxHeight ?? "65vh" } : undefined}
      >
        <table className={s.table}>
          <thead className={stickyHeader ? s.theadSticky : undefined}>
            <tr>
              {selectable && (
                <th className={s.checkCol}>
                  <input
                    type="checkbox"
                    className={s.checkbox}
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleAll}
                    aria-label={t("table.selectAll")}
                  />
                </th>
              )}
              {columns.map((c, i) => {
                const sortable = Boolean(c.sortKey && onSortChange);
                const active = sortable && sort?.key === c.sortKey;
                return (
                  <th
                    key={i}
                    style={c.width ? { width: c.width } : undefined}
                    className={cx(
                      c.align === "end" && s.cellEnd,
                      c.align === "center" && s.cellCenter,
                    )}
                    aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        className={cx(s.sortBtn, active && s.sortBtnActive)}
                        onClick={() => cycleSort(c.sortKey!)}
                      >
                        <span>{c.header}</span>
                        {active ? (
                          sort!.dir === "asc" ? (
                            <ArrowUp size={13} aria-hidden />
                          ) : (
                            <ArrowDown size={13} aria-hidden />
                          )
                        ) : (
                          <ChevronsUpDown size={13} className={s.sortIdleIcon} aria-hidden />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = rowKey(row);
              const isSelected = selectable && selectedSet.has(key);
              return (
                <tr key={key} className={isSelected ? s.rowSelected : undefined}>
                  {selectable && (
                    <td className={s.checkCol}>
                      <input
                        type="checkbox"
                        className={s.checkbox}
                        checked={selectedSet.has(key)}
                        onChange={() => toggleRow(key)}
                        aria-label={t("table.selectRow")}
                      />
                    </td>
                  )}
                  {columns.map((c, i) => (
                    <td
                      key={i}
                      className={cx(
                        c.align === "end" && s.cellEnd,
                        c.align === "center" && s.cellCenter,
                        c.mono && s.cellMono,
                      )}
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {pagination && (
        <div className={s.tableFooter}>
          {selectable && selected.length > 0 && (
            <div className={s.selectionInfo}>
              <span>{t("table.selectedCount", { count: selected.length })}</span>
              {onSelectedChange && (
                <button type="button" className={s.linkBtn} onClick={() => onSelectedChange([])}>
                  {t("table.clearSelection")}
                </button>
              )}
            </div>
          )}
          <Pagination {...pagination} />
        </div>
      )}
    </div>
  );
}

// ─── Dialog focus management (shared by Modal + Drawer) ──────────────────────

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog behaviour for an overlay surface: on open it captures the
 * previously-focused element and moves focus into the panel; while open it traps
 * Tab/Shift+Tab within the panel; on close it restores focus to the trigger.
 * Satisfies WCAG 2.4.3 (Focus Order) and 2.1.2 (No Keyboard Trap — focus can
 * always leave via Escape).
 */
function useDialogFocusTrap(open: boolean, panelRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      panel
        ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
            (el) => el.offsetParent !== null || el === panel,
          )
        : [];

    /** Respect a child's autoFocus (e.g. ConfirmDialog's confirm button) —
     *  only move focus if it isn't already inside the panel. */
    if (panel && !panel.contains(document.activeElement)) {
      (focusables()[0] ?? panel).focus();
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !panel) return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !panel.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      previouslyFocused?.focus?.();
    };
  }, [open, panelRef]);
}

// ─── Modal ──────────────────────────────────────────────────────────────────

export function Modal({
  open,
  onClose,
  title,
  ariaLabel,
  size = "md",
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** Accessible name when no visible `title` is rendered. */
  ariaLabel?: string;
  size?: "sm" | "md" | "lg";
  footer?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useDashboardLocale();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
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
  useDialogFocusTrap(open, panelRef);

  if (!open) return null;
  return (
    <div className={s.modalBackdrop} onClick={onClose}>
      <div
        ref={panelRef}
        className={cx(s.modal, size === "lg" && s.modalLg, size === "sm" && s.modalSm)}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        {...(title ? { "aria-labelledby": titleId } : ariaLabel ? { "aria-label": ariaLabel } : {})}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className={s.modalHeader}>
            <h2 className={s.modalTitle} id={titleId}>
              {title}
            </h2>
            <Button variant="ghost" size="sm" iconOnly onClick={onClose} aria-label={t("dialog.close")}>
              <X size={16} aria-hidden />
            </Button>
          </div>
        )}
        <div className={s.modalBody}>{children}</div>
        {footer && <div className={s.modalFooter}>{footer}</div>}
      </div>
    </div>
  );
}

// ─── ConfirmDialog ──────────────────────────────────────────────────────────

export type ConfirmDialogProps = {
  open: boolean;
  title?: ReactNode;
  /** Body copy — pass a string or rich content. */
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" renders a destructive confirm button + warning icon. */
  tone?: "default" | "danger";
  /** Disables the buttons and shows a spinner on confirm. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Drop-in replacement for `window.confirm(...)` call sites. For a one-liner
 * promise API, mount {@link ConfirmProvider} and use {@link useConfirm}.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = "default",
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useDashboardLocale();
  return (
    <Modal
      open={open}
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel ?? t("confirm.cancel")}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
            autoFocus
          >
            {confirmLabel ?? t("confirm.confirm")}
          </Button>
        </>
      }
    >
      <div className={s.confirmBody}>
        <span className={cx(s.confirmIcon, tone === "danger" && s.confirmIconDanger)} aria-hidden>
          {tone === "danger" ? <AlertTriangle size={22} /> : <Info size={22} />}
        </span>
        <div>
          <div className={s.confirmTitle}>{title ?? t("confirm.title")}</div>
          {message && <div className={s.confirmMessage}>{message}</div>}
        </div>
      </div>
    </Modal>
  );
}

export type ConfirmOptions = {
  title?: ReactNode;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

type ConfirmContextValue = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

/** Promise-based confirm — `const ok = await confirm({ message, tone: "danger" })`. */
export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    options: ConfirmOptions;
    resolve: (ok: boolean) => void;
  } | null>(null);

  const confirm = useCallback<ConfirmContextValue>(
    (options) =>
      new Promise<boolean>((resolve) => {
        setState({ options, resolve });
      }),
    [],
  );

  const settle = (ok: boolean) => {
    state?.resolve(ok);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={state !== null}
        title={state?.options.title}
        message={state?.options.message}
        confirmLabel={state?.options.confirmLabel}
        cancelLabel={state?.options.cancelLabel}
        tone={state?.options.tone}
        onConfirm={() => settle(true)}
        onCancel={() => settle(false)}
      />
    </ConfirmContext.Provider>
  );
}

// ─── Drawer (end-side, 400px, RTL-aware) ────────────────────────────────────

export function Drawer({
  open,
  onClose,
  title,
  ariaLabel,
  footer,
  width,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** Accessible name when no visible `title` is rendered. */
  ariaLabel?: string;
  footer?: ReactNode;
  /** Defaults to `var(--fz-drawer-w)` (400px). */
  width?: string;
  children: ReactNode;
}) {
  const { t } = useDashboardLocale();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);
  useDialogFocusTrap(open, panelRef);

  if (!open) return null;
  return (
    <div className={s.drawerBackdrop} onClick={onClose}>
      <div
        ref={panelRef}
        className={s.drawer}
        style={width ? { width } : undefined}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        {...(title ? { "aria-labelledby": titleId } : ariaLabel ? { "aria-label": ariaLabel } : {})}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={s.drawerHeader}>
          {title ? (
            <h2 className={s.drawerTitle} id={titleId}>
              {title}
            </h2>
          ) : (
            <span />
          )}
          <Button variant="ghost" size="sm" iconOnly onClick={onClose} aria-label={t("drawer.close")}>
            <X size={16} aria-hidden />
          </Button>
        </div>
        <div className={s.drawerBody}>{children}</div>
        {footer && <div className={s.drawerFooter}>{footer}</div>}
      </div>
    </div>
  );
}

// ─── Tabs (underline style — design system §5) ──────────────────────────────

export type TabItem = {
  key: string;
  label: ReactNode;
  count?: number;
  disabled?: boolean;
};

export function Tabs({
  items,
  value,
  onChange,
  ariaLabel,
}: {
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
  ariaLabel?: string;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const enabled = items.filter((it) => !it.disabled);
    if (enabled.length === 0) return;
    const idx = enabled.findIndex((it) => it.key === value);
    const rtl = document.documentElement.getAttribute("dir") === "rtl";
    const forward = e.key === (rtl ? "ArrowLeft" : "ArrowRight");
    const next = enabled[(idx + (forward ? 1 : -1) + enabled.length) % enabled.length];
    onChange(next.key);
    listRef.current
      ?.querySelector<HTMLButtonElement>(`[data-tab-key="${CSS.escape(next.key)}"]`)
      ?.focus();
  };

  return (
    <div className={s.tabs} role="tablist" aria-label={ariaLabel} ref={listRef} onKeyDown={onKeyDown}>
      {items.map((item) => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            data-tab-key={item.key}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            disabled={item.disabled}
            className={cx(s.tab, active && s.tabActive)}
            onClick={() => onChange(item.key)}
          >
            <span>{item.label}</span>
            {item.count !== undefined && <span className={s.tabCount}>{item.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ─── EmptyState ─────────────────────────────────────────────────────────────

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={s.emptyState}>
      <span className={s.emptyStateIcon} aria-hidden>
        {icon ?? <Inbox size={26} />}
      </span>
      <div className={s.emptyStateTitle}>{title}</div>
      {description && <div className={s.emptyStateDesc}>{description}</div>}
      {action && <div className={s.emptyStateAction}>{action}</div>}
    </div>
  );
}

// ─── Toast ──────────────────────────────────────────────────────────────────

export type ToastTone = "success" | "error" | "info";

type ToastEntry = {
  id: number;
  tone: ToastTone;
  message: ReactNode;
  title?: ReactNode;
};

type ToastApi = {
  push: (tone: ToastTone, message: ReactNode, opts?: { title?: ReactNode; durationMs?: number }) => void;
  success: (message: ReactNode, title?: ReactNode) => void;
  error: (message: ReactNode, title?: ReactNode) => void;
  info: (message: ReactNode, title?: ReactNode) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

/** `const toast = useToast(); toast.success("Saved");` — needs `<ToastProvider>` up the tree (mounted by DashboardLayout). */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const TOAST_ICONS: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 size={18} aria-hidden />,
  error: <AlertCircle size={18} aria-hidden />,
  info: <Info size={18} aria-hidden />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useDashboardLocale();
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback<ToastApi["push"]>(
    (tone, message, opts) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev.slice(-4), { id, tone, message, title: opts?.title }]);
      const duration = opts?.durationMs ?? (tone === "error" ? 6500 : 4000);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (message, title) => push("success", message, { title }),
      error: (message, title) => push("error", message, { title }),
      info: (message, title) => push("info", message, { title }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={s.toastViewport} role="region" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cx(
              s.toast,
              toast.tone === "success" && s.toastSuccess,
              toast.tone === "error" && s.toastError,
              toast.tone === "info" && s.toastInfo,
            )}
            role={toast.tone === "error" ? "alert" : "status"}
          >
            <span className={s.toastIcon}>{TOAST_ICONS[toast.tone]}</span>
            <div className={s.toastContent}>
              {toast.title && <div className={s.toastTitle}>{toast.title}</div>}
              <div className={s.toastMessage}>{toast.message}</div>
            </div>
            <button
              type="button"
              className={s.toastClose}
              onClick={() => dismiss(toast.id)}
              aria-label={t("toast.dismiss")}
            >
              <X size={14} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
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
    <span className={cx(s.avatar, small && s.avatarSm)}>
      {url ? <img src={url} alt={name} /> : initials || "?"}
    </span>
  );
}

// Re-export style hooks for the layout / pages that want direct access
export const ui = s;
