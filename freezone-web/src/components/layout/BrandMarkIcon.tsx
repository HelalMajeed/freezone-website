import { FREEZONE_Z_LOGO } from "@/lib/brand-assets";

/** Transparent red Z — header actions, language toggle, avatars. */
export function BrandMarkIcon({
  size = 22,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={FREEZONE_Z_LOGO}
      alt=""
      width={size}
      height={size}
      aria-hidden
      className={className}
      style={{ display: "block", width: size, height: size, objectFit: "contain" }}
    />
  );
}
