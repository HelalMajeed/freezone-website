import ui from "./AdminUi.module.css";

export function AdminLoadingState({ message = "جاري التحميل…" }: { message?: string }) {
  return (
    <div className={ui.stateBox} role="status" aria-live="polite">
      <div className={ui.spinner} aria-hidden />
      <p className={ui.stateText}>{message}</p>
    </div>
  );
}
