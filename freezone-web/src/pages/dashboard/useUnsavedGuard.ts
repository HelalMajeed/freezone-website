/**
 * Dirty-state navigation guard for dashboard form pages.
 *
 * The app mounts plain `<BrowserRouter>` (no data router), so `useBlocker` is
 * unavailable. Instead this hook:
 *  - warns on tab close / hard reload via `beforeunload`, and
 *  - intercepts in-app anchor clicks (capture phase, before react-router's
 *    `<Link>` handler — Link ignores clicks with `defaultPrevented`), shows the
 *    shared ConfirmDialog, and resumes the navigation when confirmed.
 */
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useConfirm } from "@/components/dashboard/ui";
import { useDashboardLocale } from "@/lib/dashboard/i18n";

export function useUnsavedGuard(dirty: boolean): void {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { t } = useDashboardLocale();

  // Keep the latest values without re-binding the listeners on every render.
  const ref = useRef({ dirty, confirm, navigate, t });
  ref.current = { dirty, confirm, navigate, t };

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!ref.current.dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };

    const onClickCapture = (e: MouseEvent) => {
      if (!ref.current.dirty) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest?.("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      // Only guard in-app navigations.
      if (!href.startsWith("/")) return;
      if (anchor.getAttribute("target") === "_blank") return;

      e.preventDefault();
      e.stopPropagation();
      const { confirm: ask, navigate: go, t: tr } = ref.current;
      void ask({
        title: tr("editor.dirtyTitle"),
        message: tr("editor.dirtyMessage"),
        confirmLabel: tr("editor.dirtyLeave"),
        cancelLabel: tr("editor.dirtyStay"),
        tone: "danger",
      }).then((ok) => {
        if (ok) go(href);
      });
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClickCapture, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClickCapture, true);
    };
  }, []);
}

/** Imperative variant for programmatic navigations (back buttons, cancels). */
export function useGuardedNavigate(dirty: boolean): (to: string) => void {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { t } = useDashboardLocale();

  return (to: string) => {
    if (!dirty) {
      navigate(to);
      return;
    }
    void confirm({
      title: t("editor.dirtyTitle"),
      message: t("editor.dirtyMessage"),
      confirmLabel: t("editor.dirtyLeave"),
      cancelLabel: t("editor.dirtyStay"),
      tone: "danger",
    }).then((ok) => {
      if (ok) navigate(to);
    });
  };
}
