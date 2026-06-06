import type { CSSProperties, ImgHTMLAttributes } from "react";

/**
 * Responsive product/CMS image (WS4-B task 3).
 *
 * The API writes WebP variants for every product image at 200/400/800/1600
 * widths with a deterministic `<stem>-<width>.webp` filename
 * (freezone-api/src/lib/product-image-process.ts → ProductImage.urlW200/400/800;
 * the catalog payload carries the 1600 URL). This component reconstructs the
 * variant `srcset` from that convention, so cards download ~10 KB thumbnails
 * instead of the 1600px original, and reserves layout space (`aspectRatio` /
 * width+height) to eliminate CLS.
 *
 * Non-variant URLs (brand SVGs, external images, legacy uploads) fall through
 * to a plain `<img>` with the same lazy/decoding/reservation behavior.
 */

const VARIANT_WIDTHS = [200, 400, 800, 1600] as const;
const VARIANT_RE = /^(.*)-(?:200|400|800|1600)\.webp(\?.*)?$/i;

/** `srcset` across the API's WebP variants, or undefined when `src` is not a variant URL. */
export function productImageSrcSet(src: string): string | undefined {
  const m = VARIANT_RE.exec(src);
  if (!m) return undefined;
  const stem = m[1];
  const query = m[2] ?? "";
  return VARIANT_WIDTHS.map((w) => `${stem}-${w}.webp${query} ${w}w`).join(", ");
}

export type ResponsiveImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "srcSet"> & {
  src: string;
  alt: string;
  /**
   * Rendered slot widths for the browser's source selection, e.g.
   * `"(max-width: 640px) 50vw, 280px"`. Only applied when variants exist.
   */
  sizes?: string;
  /** Reserve space via CSS `aspect-ratio` when intrinsic width/height are unknown. */
  aspectRatio?: number | string;
  /** Above-the-fold image: eager load + high fetch priority. */
  priority?: boolean;
};

export function ResponsiveImage({
  src,
  alt,
  sizes,
  aspectRatio,
  priority = false,
  style,
  loading,
  decoding,
  ...rest
}: ResponsiveImageProps) {
  const srcSet = productImageSrcSet(src);
  const mergedStyle: CSSProperties | undefined = aspectRatio
    ? { aspectRatio: String(aspectRatio), ...style }
    : style;

  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? (sizes ?? "100vw") : sizes}
      alt={alt}
      loading={loading ?? (priority ? "eager" : "lazy")}
      decoding={decoding ?? "async"}
      fetchPriority={priority ? "high" : undefined}
      style={mergedStyle}
      {...rest}
    />
  );
}
