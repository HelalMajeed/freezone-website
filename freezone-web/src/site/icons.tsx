import type { ReactNode } from "react";

/** The design's line icons: 24-unit grid, round caps, 1.75 stroke (2 for arrows). */
function Icon({ size = 22, stroke = 1.75, className, children }: { size?: number; stroke?: number; className?: string; children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={{ flex: "none", display: "block" }}
    >
      {children}
    </svg>
  );
}

type P = { size?: number; className?: string };

export const MenuIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
  </Icon>
);

export const CloseIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M6 6l12 12" />
    <path d="M18 6 6 18" />
  </Icon>
);

export const SearchIcon = ({ size }: P) => (
  <Icon size={size}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);

export const CartIcon = ({ size }: P) => (
  <Icon size={size}>
    <path d="M6 8h12l1 12H5L6 8z" />
    <path d="M9 8V7a3 3 0 0 1 6 0v1" />
  </Icon>
);

export const PinIcon = ({ size = 18 }: P) => (
  <Icon size={size}>
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Icon>
);

export const PhoneIcon = ({ size = 18 }: P) => (
  <Icon size={size}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  </Icon>
);

export const InstagramIcon = ({ size = 20 }: P) => (
  <Icon size={size}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <path d="M17.2 6.8v.01" />
  </Icon>
);

export const MinusIcon = ({ size = 16 }: P) => (
  <Icon size={size} stroke={2}>
    <path d="M6 12h12" />
  </Icon>
);

export const PlusIcon = ({ size = 16 }: P) => (
  <Icon size={size} stroke={2}>
    <path d="M6 12h12" />
    <path d="M12 6v12" />
  </Icon>
);

export const TrashIcon = ({ size = 18 }: P) => (
  <Icon size={size}>
    <path d="M5 7h14" />
    <path d="M10 7V5h4v2" />
    <path d="M7 7l1 13h8l1-13" />
  </Icon>
);

/** Chevron drawn pointing left; `className` flips it for the other direction or language. */
export const ChevronIcon = ({ size = 20, className }: P) => (
  <Icon size={size} stroke={2} className={className}>
    <path d="m15 6-6 6 6 6" />
  </Icon>
);

/** Arrow drawn pointing right ("back" in Arabic); flipped for English in the stylesheet. */
export const BackArrowIcon = ({ size = 18, className }: P) => (
  <Icon size={size} stroke={2} className={className}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </Icon>
);

export const ChevronDownIcon = ({ size = 16, className }: P) => (
  <Icon size={size} stroke={2} className={className}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

/** Outline heart; `filled` paints it in (a product already in the favourites). */
export const HeartIcon = ({ size = 20, className, filled }: P & { filled?: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
    style={{ flex: "none", display: "block" }}
  >
    <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.600-7.5 10.2-7.5 10.2z" />
  </svg>
);

export const ShareIcon = ({ size = 20 }: P) => (
  <Icon size={size}>
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="17.5" cy="6" r="2.5" />
    <circle cx="17.5" cy="18" r="2.5" />
    <path d="m8.2 10.8 7.1-3.6" />
    <path d="m8.2 13.2 7.1 3.6" />
  </Icon>
);

export const CheckIcon = ({ size = 20 }: P) => (
  <Icon size={size} stroke={2.25}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);

export const ArrowUpIcon = ({ size = 20 }: P) => (
  <Icon size={size} stroke={2}>
    <path d="M12 19V5" />
    <path d="m6 11 6-6 6 6" />
  </Icon>
);

export const ZoomIcon = ({ size = 20 }: P) => (
  <Icon size={size}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
    <path d="M8.5 11h5" />
    <path d="M11 8.500v5" />
  </Icon>
);

export const TruckIcon = ({ size = 20 }: P) => (
  <Icon size={size}>
    <path d="M3 6h11v10H3z" />
    <path d="M14 10h4l3 3v3h-7" />
    <circle cx="7.5" cy="17.5" r="1.8" />
    <circle cx="17.5" cy="17.5" r="1.8" />
  </Icon>
);

export const StoreIcon = ({ size = 20 }: P) => (
  <Icon size={size}>
    <path d="M4 10v10h16V10" />
    <path d="M3 10 5 4h14l2 6a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z" />
    <path d="M10 20v-5h4v5" />
  </Icon>
);

export const ChatIcon = ({ size = 20 }: P) => (
  <Icon size={size}>
    <path d="M20 12a8 8 0 0 1-11.800 7L4 20l1-4.200A8 8 0 1 1 20 12z" />
  </Icon>
);

/** WhatsApp mark, drawn as one filled shape (brand glyphs are not line icons). */
export const WhatsAppIcon = ({ size = 22, className }: P) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
    style={{ flex: "none", display: "block" }}
  >
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.750.46 3.450 1.320 4.950L2.05 22l5.250-1.380a9.900 9.900 0 0 0 4.740 1.210h.01c5.460 0 9.900-4.450 9.900-9.910 0-2.650-1.030-5.140-2.900-7.010A9.850 9.850 0 0 0 12.040 2zm0 1.670c2.200 0 4.270.86 5.820 2.420a8.180 8.180 0 0 1 2.410 5.830c0 4.540-3.700 8.230-8.240 8.230a8.200 8.200 0 0 1-4.190-1.150l-.3-.18-3.120.82.83-3.040-.2-.31a8.200 8.200 0 0 1-1.260-4.380c0-4.540 3.700-8.240 8.250-8.240zM8.530 7.330c-.16 0-.43.060-.660.310-.22.250-.870.850-.870 2.070 0 1.220.890 2.400 1.010 2.560.130.170 1.750 2.670 4.230 3.740.59.260 1.050.41 1.410.52.590.19 1.130.16 1.560.1.480-.07 1.460-.6 1.670-1.180.21-.580.21-1.070.15-1.180-.07-.1-.230-.160-.480-.290-.250-.120-1.470-.720-1.690-.810-.230-.080-.390-.120-.560.130-.160.250-.640.810-.780.970-.150.170-.290.190-.540.060-.250-.120-1.050-.390-1.990-1.230-.740-.660-1.230-1.470-1.380-1.720-.140-.250-.010-.380.110-.510.110-.110.250-.290.370-.430.130-.150.170-.250.250-.420.080-.160.040-.310-.020-.430-.060-.130-.560-1.350-.770-1.850-.200-.480-.410-.420-.560-.430h-.480z" />
  </svg>
);
