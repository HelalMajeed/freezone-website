import { useEffect } from "react";
import { useTranslations } from "@/i18n/hooks";
import { CheckIcon, CloseIcon } from "./icons";
import { useSiteUi, type SiteToast } from "./ui";
import styles from "./site.module.css";

/** How long a message stays; one with a button stays a little longer. */
const SHOW_MS = 2600;
const SHOW_WITH_ACTION_MS = 4200;

function ToastItem({ toast }: { toast: SiteToast }) {
  const t = useTranslations("Site");
  const dismiss = useSiteUi((s) => s.dismissToast);

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), toast.action ? SHOW_WITH_ACTION_MS : SHOW_MS);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.action, dismiss]);

  return (
    <div className={styles.toast}>
      <span className={styles.toastMark}>
        <CheckIcon size={16} />
      </span>
      <span className={styles.toastText}>{toast.text}</span>
      {toast.action ? (
        <button
          type="button"
          className={styles.toastAction}
          onClick={() => {
            toast.action?.run();
            dismiss(toast.id);
          }}
        >
          {toast.action.label}
        </button>
      ) : null}
      <button type="button" className={styles.toastClose} aria-label={t("toastDismiss")} onClick={() => dismiss(toast.id)}>
        <CloseIcon size={16} />
      </button>
    </div>
  );
}

/** Short confirmations after an action ("added to cart"), read out to screen readers. */
export function Toasts() {
  const toasts = useSiteUi((s) => s.toasts);
  return (
    <div className={styles.toasts} role="status" aria-live="polite">
      {toasts.map((x) => (
        <ToastItem key={x.id} toast={x} />
      ))}
    </div>
  );
}
