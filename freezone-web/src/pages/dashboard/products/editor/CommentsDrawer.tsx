/**
 * Product comment thread — staff-only discussion shown from the editor header
 * (used heavily by the review workflow: reviewer notes land here too).
 */
import { useCallback, useEffect, useState } from "react";
import { Button, Drawer, EmptyState, Textarea, useToast } from "@/components/dashboard/ui";
import { useDashboardLocale } from "@/lib/dashboard/i18n";
import { productCommentsApi, type ProductComment } from "@/lib/dashboard/api-extra";
import s from "./editor.module.css";

export function CommentsDrawer({
  productId,
  open,
  onClose,
  onCountChange,
}: {
  productId: number;
  open: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}) {
  const { t, lang, formatError } = useDashboardLocale();
  const toast = useToast();
  const [comments, setComments] = useState<ProductComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await productCommentsApi.list(productId);
      setComments(list);
      onCountChange?.(list.length);
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setLoading(false);
    }
  }, [productId, toast, formatError, onCountChange]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      await productCommentsApi.add(productId, trimmed);
      setText("");
      toast.success(t("comments.added"));
      await load();
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString(lang === "ar" ? "ar-IQ" : "en-IQ", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t("comments.title")}
      footer={
        <div className={s.commentForm}>
          <Textarea
            rows={3}
            value={text}
            placeholder={t("comments.placeholder")}
            onChange={(e) => setText(e.target.value)}
          />
          <div className={s.commentFormActions}>
            <Button size="sm" loading={sending} disabled={!text.trim()} onClick={() => void send()}>
              {t("comments.send")}
            </Button>
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="dashboard-loader" />
      ) : comments.length === 0 ? (
        <EmptyState title={t("comments.empty")} />
      ) : (
        <div className={s.commentList}>
          {comments.map((c) => (
            <div key={c.id} className={s.comment}>
              <div className={s.commentMeta}>
                <span className={s.commentAuthor}>{c.user?.name || c.user?.email || "—"}</span>
                <span>{formatTime(c.createdAt)}</span>
              </div>
              <div className={s.commentText}>{c.text}</div>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}
