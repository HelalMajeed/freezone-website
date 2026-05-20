import ui from "./AdminUi.module.css";

export function AdminStickySaveBar({
  visible,
  saving,
  onSave,
  onDiscard,
}: {
  visible: boolean;
  saving?: boolean;
  onSave: () => void;
  onDiscard?: () => void;
}) {
  if (!visible) return null;
  return (
    <div className={ui.stickySaveBar} role="region" aria-label="حفظ التغييرات">
      <span className={ui.stickySaveHint}>لديك تغييرات غير محفوظة</span>
      <div className={ui.stickySaveActions}>
        {onDiscard ? (
          <button type="button" className={ui.btnSm} onClick={onDiscard} disabled={saving}>
            تجاهل
          </button>
        ) : null}
        <button type="button" className={`${ui.btnSm} ${ui.btnPrimaryOutline}`} onClick={onSave} disabled={saving}>
          {saving ? "جاري الحفظ…" : "حفظ"}
        </button>
      </div>
    </div>
  );
}
