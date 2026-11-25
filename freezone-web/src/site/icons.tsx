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
