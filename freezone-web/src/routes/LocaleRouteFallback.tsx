import styles from "./LocaleShellScreens.module.css";

/** Lightweight token-styled skeleton shown while storefront data loads. */
export function LocaleRouteFallback({ withChrome = true }: { withChrome?: boolean }) {
  return (
    <div className={styles.skeletonRoot} role="status" aria-label="Loading – جارٍ التحميل">
      {withChrome ? (
        <>
          <div className={styles.skeletonTopBar} aria-hidden />
          <div className={styles.skeletonBody}>
            <div className={`${styles.skeletonBar} ${styles.shimmer}`} aria-hidden />
            <div className={`${styles.skeletonHero} ${styles.shimmer}`} aria-hidden />
            <div className={styles.skeletonGrid} aria-hidden>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`${styles.skeletonCard} ${styles.shimmer}`} />
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className={styles.skeletonBody}>
          <div className={`${styles.skeletonHero} ${styles.shimmer}`} aria-hidden />
          <div className={styles.skeletonGrid} aria-hidden>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`${styles.skeletonCard} ${styles.shimmer}`} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
