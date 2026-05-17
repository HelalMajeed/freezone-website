"use client";

import { Truck, ShieldCheck, RotateCcw } from "lucide-react";
import { useTranslations } from "@/i18n/hooks";
import styles from "./HomePromoStrip.module.css";

/** Three trust/promo chips — master prompt §8.2 Section 3. */
export function HomePromoStrip() {
  const t = useTranslations("Home");

  const items = [
    { icon: Truck, label: t("promoFreeDelivery") },
    { icon: ShieldCheck, label: t("promoWarranty") },
    { icon: RotateCcw, label: t("promoReturns7") },
  ] as const;

  return (
    <section className={styles.strip} aria-label={t("promoStripAria")}>
      <div className={`container ${styles.grid}`}>
        {items.map(({ icon: Icon, label }) => (
          <div key={label} className={styles.card}>
            <span className={styles.iconWrap} aria-hidden>
              <Icon size={20} strokeWidth={2.25} />
            </span>
            <span className={styles.label}>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
