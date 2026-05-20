import ui from "./AdminUi.module.css";

export function AdminErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className={`${ui.stateBox} ${ui.stateError}`} role="alert">
      <p className={ui.stateText}>{message}</p>
      {onRetry ? (
        <button type="button" className={ui.btnSm} onClick={onRetry}>
          إعادة المحاولة
        </button>
      ) : null}
    </div>
  );
}
