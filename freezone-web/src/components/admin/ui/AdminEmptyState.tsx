import ui from "./AdminUi.module.css";

export function AdminEmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <div className={ui.empty}>
      <p className={ui.emptyTitle}>{title}</p>
      {message ? <p style={{ margin: 0, fontSize: "0.85rem" }}>{message}</p> : null}
    </div>
  );
}
