/**
 * Route-level animation was removed: Framer `AnimatePresence mode="wait"` delayed the next
 * page until the exit animation finished, which felt like navigation lag. Children render immediately.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
