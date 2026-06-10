"use client";

import { Suspense, lazy, useState } from "react";
import styles from "./ImageGallery.module.css";
import { Maximize, Box } from "lucide-react";
import { useTranslations } from "@/i18n/hooks";
import { ResponsiveImage } from "./ResponsiveImage";

const ModelViewer = lazy(() => import("./ModelViewer").then((m) => ({ default: m.ModelViewer })));

interface ImageGalleryProps {
  images: string[];
  model3d?: string | null;
  alt: string;
}

export function ImageGallery({ images, model3d, alt }: ImageGalleryProps) {
  const t = useTranslations("pdp");
  const allMedia = [...images];
  if (model3d) allMedia.push("model3d"); // special ID for 3D model

  const [activeIdx, setActiveIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // If no main image, fallback to a placeholder or empty
  if (allMedia.length === 0) {
    return <div className={styles.emptyGallery}>No media available</div>;
  }

  const activeMedia = allMedia[activeIdx];
  const is3DActive = activeMedia === "model3d";

  return (
    <div className={styles.galleryContainer}>
      {/* Main Display Area */}
      <div className={`${styles.mainDisplay} ${isFullscreen ? styles.fullscreen : ""}`}>
        {isFullscreen && (
          <button className={styles.closeBtn} onClick={() => setIsFullscreen(false)}>
            {t("galleryClose")}
          </button>
        )}
        
        {is3DActive && model3d ? (
          <div className={styles.modelWrapper}>
            <Suspense fallback={<div className={styles.mainImage}>3D…</div>}>
              <ModelViewer src={model3d} alt={alt} />
            </Suspense>
          </div>
        ) : (
          <ResponsiveImage
            src={activeMedia}
            alt={alt}
            className={styles.mainImage}
            sizes="(max-width: 900px) 100vw, 600px"
            priority
          />
        )}

        {!isFullscreen && (
          <button
            className={styles.expandBtn}
            aria-label={t("galleryExpand")}
            onClick={() => setIsFullscreen(true)}
          >
            <Maximize size={20} />
          </button>
        )}
      </div>

      {/* Thumbnails */}
      {allMedia.length > 1 && (
        <div className={styles.thumbnailList}>
          {allMedia.map((media, idx) => {
            const is3D = media === "model3d";
            return (
              <button
                key={idx}
                className={`${styles.thumbnailBtn} ${idx === activeIdx ? styles.active : ""}`}
                onClick={() => setActiveIdx(idx)}
              >
                {is3D ? (
                  <div className={styles.thumbnail3d}>
                    <Box size={24} />
                    <span>3D</span>
                  </div>
                ) : (
                  <ResponsiveImage
                    src={media}
                    alt={`Thumbnail ${idx + 1}`}
                    className={styles.thumbnailImg}
                    sizes="96px"
                    aspectRatio={1}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
