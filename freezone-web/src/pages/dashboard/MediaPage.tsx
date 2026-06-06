/**
 * Media library — drag-drop multi-upload with per-file progress, server
 * pagination, bulk select/delete (Table selection + confirm dialog), copy-URL,
 * and import-from-URL via /api/admin/media/import-image.
 */
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { Box, Clapperboard, Copy, Image as ImageIcon, Link2, Pencil, Trash2, UploadCloud } from "lucide-react";
import { DashboardApiError, type MediaAsset, type MediaKind } from "@/lib/dashboard/api";
import { mediaApi, uploadFileWithProgress, type MediaListResponse } from "@/lib/dashboard/api-extra";
import { dashboardErrorByCode, useDashboardLocale, type DashboardMessageKey } from "@/lib/dashboard/i18n";
import { formatBytes, formatDate } from "@/lib/dashboard/format";
import { freezoneApiUrl } from "@/lib/api-internal";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
  Table,
  useConfirm,
  useToast,
} from "@/components/dashboard/ui";
import s from "./Media.module.css";

const KIND_KEYS: Record<MediaKind, DashboardMessageKey> = {
  image: "media.kindImage",
  video: "media.kindVideo",
  model3d: "media.kindModel3d",
};

const MAX_FILE_BYTES = 16 * 1024 * 1024;

const ACCEPT =
  "image/png,image/jpeg,image/webp,application/pdf,model/gltf-binary,model/gltf+json,.glb,.gltf";

function resolveUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return freezoneApiUrl(url);
}

type UploadState = {
  name: string;
  progress: number;
  status: "uploading" | "done" | "error";
};

export function DashboardMediaPage() {
  const { lang, t, formatError } = useDashboardLocale();
  const toast = useToast();
  const confirm = useConfirm();

  const [data, setData] = useState<MediaListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"" | MediaKind>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<Array<string | number>>([]);

  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState<MediaAsset | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAltAr, setEditAltAr] = useState("");
  const [editAltEn, setEditAltEn] = useState("");
  const [editKind, setEditKind] = useState<MediaKind>("image");
  const [saving, setSaving] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await mediaApi.list({
        page,
        pageSize,
        q: search || undefined,
        kind: kind || undefined,
      });
      setData(res);
      setErr(null);
    } catch (e) {
      setErr(formatError(e));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, kind, formatError]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  // Debounced server-side search.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = searchInput.trim();
      if (next === search) return;
      setPage(1);
      setSearch(next);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, search]);

  // ── Uploads ────────────────────────────────────────────────────────────────

  const handleFiles = async (files: FileList | File[] | null) => {
    const list = Array.from(files ?? []);
    if (list.length === 0) return;

    const accepted: File[] = [];
    for (const file of list) {
      if (file.size > MAX_FILE_BYTES) {
        toast.error(t("media.tooLarge", { name: file.name }));
      } else {
        accepted.push(file);
      }
    }
    if (accepted.length === 0) return;

    setUploading(true);
    setUploads(accepted.map((f) => ({ name: f.name, progress: 0, status: "uploading" })));

    let done = 0;
    for (let i = 0; i < accepted.length; i++) {
      const file = accepted[i];
      try {
        await uploadFileWithProgress(
          file,
          { register: true, title: file.name.replace(/\.[^.]+$/, "") },
          (fraction) => {
            setUploads((prev) =>
              prev.map((u, idx) => (idx === i ? { ...u, progress: fraction } : u)),
            );
          },
        );
        done++;
        setUploads((prev) =>
          prev.map((u, idx) => (idx === i ? { ...u, progress: 1, status: "done" } : u)),
        );
      } catch (e) {
        setUploads((prev) =>
          prev.map((u, idx) => (idx === i ? { ...u, status: "error" } : u)),
        );
        toast.error(formatError(e), file.name);
      }
    }

    setUploading(false);
    if (done > 0) {
      toast.success(t("media.uploadDone", { count: done }));
      setPage(1);
      await load();
    }
    window.setTimeout(() => setUploads([]), 2500);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (!uploading) void handleFiles(e.dataTransfer.files);
  };

  // ── Edit / delete / import ────────────────────────────────────────────────

  const openEdit = (m: MediaAsset) => {
    setEditing(m);
    setEditTitle(m.title);
    setEditAltAr(m.altAr);
    setEditAltEn(m.altEn);
    setEditKind(m.kind);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await mediaApi.update(editing.id, {
        title: editTitle,
        altAr: editAltAr,
        altEn: editAltEn,
        kind: editKind,
      });
      toast.success(t("media.saved"));
      setEditing(null);
      await load();
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setSaving(false);
    }
  };

  const deleteAssets = async (ids: number[]) => {
    const ok = await confirm({
      title: t("media.deleteTitle"),
      message:
        ids.length === 1
          ? t("media.deleteOneMessage")
          : t("media.deleteManyMessage", { count: ids.length }),
      confirmLabel: t("common.delete"),
      tone: "danger",
    });
    if (!ok) return;
    try {
      await Promise.all(ids.map((id) => mediaApi.remove(id)));
      toast.success(t("media.deleted"));
      setSelected((prev) => prev.filter((key) => !ids.includes(Number(key))));
      await load();
    } catch (e) {
      toast.error(formatError(e));
      await load();
    }
  };

  const copyUrl = async (m: MediaAsset) => {
    try {
      await navigator.clipboard.writeText(resolveUrl(m.url));
      toast.success(t("common.copied"));
    } catch {
      toast.error(formatError(new Error("copy")));
    }
  };

  const onImport = async () => {
    const url = importUrl.trim();
    if (!url) return;
    setImporting(true);
    try {
      const image = await mediaApi.importImage(url);
      await mediaApi.register({
        url: image.url,
        kind: "image",
        mimeType: image.mimeType,
        title: image.filename.replace(/\.[^.]+$/, ""),
        fileSize: image.size,
      });
      toast.success(t("media.importDone"));
      setImportOpen(false);
      setImportUrl("");
      setPage(1);
      await load();
    } catch (e) {
      // import-image responses carry the machine code in `code` (the `error`
      // field is a pre-localized Arabic message) — prefer the bilingual map.
      const machineCode =
        e instanceof DashboardApiError && typeof (e.extra as { code?: unknown })?.code === "string"
          ? ((e.extra as { code: string }).code)
          : null;
      toast.error(machineCode ? dashboardErrorByCode(machineCode)[lang] : formatError(e));
    } finally {
      setImporting(false);
    }
  };

  const rows = data?.items ?? [];
  const uploadingCount = uploads.filter((u) => u.status === "uploading").length;

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">{t("media.title")}</h1>
          <div className="dashboard-page-subtitle">{t("media.subtitle")}</div>
        </div>
        <div className={s.headerActions}>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={ACCEPT}
            style={{ display: "none" }}
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            <Link2 size={15} aria-hidden /> {t("media.importUrl")}
          </Button>
          <Button onClick={() => fileRef.current?.click()} loading={uploading}>
            <UploadCloud size={15} aria-hidden /> {t("media.upload")}
          </Button>
        </div>
      </div>

      <Card tight>
        {/* ── Drop zone ── */}
        <div
          className={[s.dropZone, dragOver && s.dropZoneActive].filter(Boolean).join(" ")}
          role="button"
          tabIndex={0}
          aria-label={t("media.dropHint")}
          onClick={() => !uploading && fileRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !uploading) {
              e.preventDefault();
              fileRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <UploadCloud size={22} aria-hidden />
          <div className={s.dropTitle}>{t("media.dropHint")}</div>
          <div className={s.dropSub}>{t("media.dropHintSub")}</div>
        </div>

        {uploads.length > 0 && (
          <div className={s.progressList} aria-live="polite">
            {uploadingCount > 0 && (
              <div className={s.dropSub}>
                {t("media.uploadProgress", {
                  done: uploads.filter((u) => u.status !== "uploading").length + 1,
                  total: uploads.length,
                })}
              </div>
            )}
            {uploads.map((u, i) => (
              <div
                key={`${u.name}-${i}`}
                className={[
                  s.progressRow,
                  u.status === "done" && s.progressDone,
                  u.status === "error" && s.progressError,
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className={s.progressName}>{u.name}</span>
                <span className={s.progressTrack}>
                  <span
                    className={s.progressFill}
                    style={{ width: `${Math.round(u.progress * 100)}%` }}
                  />
                </span>
                <span className={s.progressPct}>{Math.round(u.progress * 100)}%</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Filters ── */}
        <div className={s.filterBar}>
          <Input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("media.searchPlaceholder")}
            aria-label={t("common.search")}
          />
          <Select
            value={kind}
            onChange={(e) => {
              setPage(1);
              setKind((e.target as HTMLSelectElement).value as "" | MediaKind);
            }}
            options={[
              { value: "", label: t("media.allKinds") },
              { value: "image", label: t("media.kindImage") },
              { value: "video", label: t("media.kindVideo") },
              { value: "model3d", label: t("media.kindModel3d") },
            ]}
            aria-label={t("media.colKind")}
          />
        </div>

        {selected.length > 0 && (
          <div className={s.bulkBar}>
            <span>{t("table.selectedCount", { count: selected.length })}</span>
            <Button
              size="sm"
              variant="danger"
              onClick={() => void deleteAssets(selected.map(Number))}
            >
              <Trash2 size={13} aria-hidden /> {t("media.deleteSelected")}
            </Button>
          </div>
        )}

        {loading && !data ? (
          <div className="dashboard-loader" />
        ) : err ? (
          <div className={s.errorBox} role="alert">
            {err}
          </div>
        ) : (
          <Table<MediaAsset>
            rowKey={(m) => m.id}
            rows={rows}
            selectable
            selected={selected}
            onSelectedChange={setSelected}
            empty={
              <EmptyState
                icon={<ImageIcon size={26} />}
                title={t("media.empty")}
                description={t("media.emptyHint")}
              />
            }
            pagination={{
              page,
              pageSize,
              total: data?.total ?? 0,
              onPageChange: setPage,
              onPageSizeChange: (next) => {
                setPage(1);
                setPageSize(next);
              },
            }}
            columns={[
              {
                header: t("media.colPreview"),
                width: "70px",
                cell: (m) => (
                  <span className={s.thumb}>
                    {m.kind === "image" ? (
                      <img src={resolveUrl(m.url)} alt={m.altEn || m.title} loading="lazy" />
                    ) : m.kind === "video" ? (
                      <Clapperboard size={18} aria-hidden />
                    ) : (
                      <Box size={18} aria-hidden />
                    )}
                  </span>
                ),
              },
              {
                header: t("media.colTitle"),
                cell: (m) => (
                  <div className={s.titleCell}>
                    <div className={s.titleMain} title={m.title || m.url}>
                      {m.title || m.url.split("/").pop()}
                    </div>
                    <div className={s.titleSub} title={m.url}>
                      {m.url}
                    </div>
                  </div>
                ),
              },
              {
                header: t("media.colKind"),
                width: "110px",
                cell: (m) => <Badge tone="info">{t(KIND_KEYS[m.kind])}</Badge>,
              },
              {
                header: t("media.colSize"),
                align: "end",
                mono: true,
                width: "90px",
                cell: (m) => formatBytes(m.fileSize),
              },
              {
                header: t("media.colDimensions"),
                align: "end",
                mono: true,
                width: "110px",
                cell: (m) => (m.width && m.height ? `${m.width}×${m.height}` : "—"),
              },
              {
                header: t("media.colCreated"),
                width: "120px",
                cell: (m) => <span className={s.titleSub}>{formatDate(m.createdAt, lang)}</span>,
              },
              {
                header: t("common.actions"),
                align: "end",
                cell: (m) => (
                  <span className={s.rowActions}>
                    <Button
                      size="sm"
                      variant="ghost"
                      iconOnly
                      aria-label={t("media.copyUrl")}
                      title={t("media.copyUrl")}
                      onClick={() => void copyUrl(m)}
                    >
                      <Copy size={14} aria-hidden />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      iconOnly
                      aria-label={t("common.edit")}
                      title={t("common.edit")}
                      onClick={() => openEdit(m)}
                    >
                      <Pencil size={14} aria-hidden />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      iconOnly
                      aria-label={t("common.delete")}
                      title={t("common.delete")}
                      onClick={() => void deleteAssets([m.id])}
                    >
                      <Trash2 size={14} aria-hidden />
                    </Button>
                  </span>
                ),
              },
            ]}
          />
        )}
      </Card>

      {/* ── Edit modal ── */}
      <Modal
        open={editing != null}
        onClose={() => setEditing(null)}
        title={t("media.editAsset")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => void saveEdit()} loading={saving}>
              {t("common.save")}
            </Button>
          </>
        }
      >
        {editing && (
          <div className={s.editFields}>
            <div className={s.editPreview}>
              {editing.kind === "image" ? (
                <img src={resolveUrl(editing.url)} alt={editing.altEn} />
              ) : editing.kind === "video" ? (
                <Clapperboard size={48} aria-hidden />
              ) : (
                <Box size={48} aria-hidden />
              )}
            </div>
            <Field label="URL">
              <Input value={editing.url} readOnly className={s.monoInput} />
            </Field>
            <Field label={t("media.fieldKind")}>
              <Select
                value={editKind}
                onChange={(e) => setEditKind((e.target as HTMLSelectElement).value as MediaKind)}
                options={[
                  { value: "image", label: t(KIND_KEYS.image) },
                  { value: "video", label: t(KIND_KEYS.video) },
                  { value: "model3d", label: t(KIND_KEYS.model3d) },
                ]}
              />
            </Field>
            <Field label={t("media.fieldTitle")}>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </Field>
            <Field label={t("media.fieldAltAr")}>
              <Input dir="rtl" value={editAltAr} onChange={(e) => setEditAltAr(e.target.value)} />
            </Field>
            <Field label={t("media.fieldAltEn")}>
              <Input dir="ltr" value={editAltEn} onChange={(e) => setEditAltEn(e.target.value)} />
            </Field>
          </div>
        )}
      </Modal>

      {/* ── Import-from-URL modal ── */}
      <Modal
        open={importOpen}
        onClose={() => !importing && setImportOpen(false)}
        title={t("media.importTitle")}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setImportOpen(false)} disabled={importing}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => void onImport()} loading={importing} disabled={!importUrl.trim()}>
              {t("media.importUrl")}
            </Button>
          </>
        }
      >
        <Field label={t("media.importUrlLabel")} hint={t("media.importHint")}>
          <Input
            dir="ltr"
            type="url"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            placeholder="https://…"
            className={s.monoInput}
          />
        </Field>
      </Modal>
    </>
  );
}

export default DashboardMediaPage;
