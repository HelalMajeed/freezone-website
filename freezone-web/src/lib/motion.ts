/** Shared motion presets — use with Framer Motion across the app */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export const DURATION = {
  page: 0.34,
  reveal: 0.48,
  micro: 0.22,
  stagger: 0.055,
} as const;

export const springSnappy = { type: "spring" as const, stiffness: 420, damping: 28 };
export const springSoft = { type: "spring" as const, stiffness: 280, damping: 32 };

/** Parent variants: use with motion container + initial="hidden" whileInView="show" */
export const staggerContainer = (delayChildren = 0.08, stagger = DURATION.stagger) => ({
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { delayChildren, staggerChildren: stagger },
  },
});

export const staggerItem = (y = 18) => ({
  hidden: { opacity: 0, y },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: EASE_OUT },
  },
});

export const fadeScaleItem = {
  hidden: { opacity: 0, scale: 0.94 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: EASE_OUT },
  },
};
