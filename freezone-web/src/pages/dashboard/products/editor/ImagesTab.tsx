/**
 * Images tab — drag-to-reorder gallery (dnd-kit), uploads with progress,
 * per-image bilingual alt text. The parent owns the list; images persist via
 * `PUT /api/admin/products/:id/images` in the save flow.
 */
import { useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ImagePlus, Trash2 } from "lucide-react";
import { Badge, Button, Input } from "@/components/dashboard/ui";
import { useDashboardLocale } from "@/lib/dashboard/i18n";
import { uploadDashboardFileWithProgress } from "@/lib/dashboard/api-extra";
import { resolveUploadUrl } from "../shared";
import { nextImageKey, type EditorImage } from "./form";
import s from "./editor.module.css";

type ImagesTabProps = {
  images: EditorImage[];
  onChange: (next: EditorImage[]) => void;
  onError: (message: string) => void;
};

function SortableImageCard({
  image,
  index,
  onPatch,
  onRemove,
}: {
  image: EditorImage;
  index: number;
  onPatch: (patch: Partial<EditorImage>) => void;
  onRemove: () => void;
}) {
  const { t } = useDashboardLocale();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.key,
  });

  return (
    <div
      ref={setNodeRef}
      className={`${s.imageCard} ${isDragging ? s.imageCardDragging : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className={s.imageThumb} aria-label={t("editor.imagesReorder")} {...attributes} {...listeners}>
        <img src={resolveUploadUrl(image.url)} alt={image.altTextEn || `#${index + 1}`} />
        {index === 0 && (
          <span className={s.coverChip}>
            <Badge tone="brand">{t("editor.imagesCover")}</Badge>
          </span>
        )}
      </div>
      <div className={s.imageMeta}>
        <div className={s.imageMetaTop}>
          <span className={s.imageIndex}>#{index + 1}</span>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            type="button"
            aria-label={t("common.remove")}
            onClick={onRemove}
          >
            <Trash2 size={14} aria-hidden />
          </Button>
        </div>
        <Input
          value={image.altTextEn}
          placeholder={t("editor.imagesAltEn")}
          aria-label={t("editor.imagesAltEn")}
          onChange={(e) => onPatch({ altTextEn: e.target.value })}
        />
        <Input
          value={image.altTextAr}
          dir="rtl"
          placeholder={t("editor.imagesAltAr")}
          aria-label={t("editor.imagesAltAr")}
          onChange={(e) => onPatch({ altTextAr: e.target.value })}
        />
      </div>
    </div>
  );
}

export function ImagesTab({ images, onChange, onError }: ImagesTabProps) {
  const { t } = useDashboardLocale();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = images.findIndex((img) => img.key === active.id);
    const to = images.findIndex((img) => img.key === over.id);
    if (from < 0 || to < 0) return;
    onChange(arrayMove(images, from, to));
  };

  const handleFiles = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    const accepted: EditorImage[] = [];
    setUploading(true);
    setProgress(0);
    try {
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        if (!file.type.startsWith("image/")) {
          onError(t("editor.imagesOnly"));
          continue;
        }
        if (file.size > 8 * 1024 * 1024) {
          onError(t("editor.imagesTooLarge"));
          continue;
        }
        const { url } = await uploadDashboardFileWithProgress(file, {
          register: true,
          title: file.name,
          onProgress: (fraction) => setProgress((i + fraction) / list.length),
        });
        accepted.push({
          key: nextImageKey(),
          url,
          altTextEn: "",
          altTextAr: "",
          originalSourceUrl: null,
        });
        setProgress((i + 1) / list.length);
      }
      if (accepted.length > 0) onChange([...images, ...accepted]);
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const patchAt = (index: number, patch: Partial<EditorImage>) =>
    onChange(images.map((img, i) => (i === index ? { ...img, ...patch } : img)));

  return (
    <>
      <div>
        <h3 className={s.sectionTitle}>{t("editor.imagesTitle")}</h3>
        <div className={s.sectionHint}>{t("editor.imagesHint")}</div>
      </div>

      <div
        className={`${s.dropZone} ${dragOver ? s.dropZoneActive : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
      >
        <span>{t("editor.imagesDropHint")}</span>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          className={s.hiddenInput}
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <Button
          variant="secondary"
          type="button"
          loading={uploading}
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus size={15} aria-hidden /> {t("editor.imagesUpload")}
        </Button>
        {uploading && (
          <>
            <div className={s.progressTrack}>
              <div className={s.progressFill} style={{ inlineSize: `${Math.round(progress * 100)}%` }} />
            </div>
            <span>{t("editor.imagesUploading", { pct: Math.round(progress * 100) })}</span>
          </>
        )}
      </div>

      {images.length === 0 ? (
        <div className={s.sectionHint}>{t("editor.imagesEmpty")}</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={images.map((img) => img.key)} strategy={rectSortingStrategy}>
            <div className={s.imageGrid}>
              {images.map((image, index) => (
                <SortableImageCard
                  key={image.key}
                  image={image}
                  index={index}
                  onPatch={(patch) => patchAt(index, patch)}
                  onRemove={() => onChange(images.filter((_, i) => i !== index))}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </>
  );
}
