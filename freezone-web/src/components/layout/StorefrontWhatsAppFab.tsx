"use client";

import { MessageCircle } from "lucide-react";
import { usePublicSite } from "@/components/providers/StorefrontProvider";
import { useTranslations } from "@/i18n/hooks";
import styles from "./StorefrontWhatsAppFab.module.css";

export function StorefrontWhatsAppFab() {
  const site = usePublicSite();
  const t = useTranslations("BottomDock");
  const digits = (site.whatsapp || site.phone || "").replace(/\D/g, "");
  if (!digits) return null;

  const href = `https://wa.me/${digits}`;

  return (
    <div className={styles.wrap}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.fab}
        aria-label={t("whatsappAria")}
      >
        <MessageCircle size={26} strokeWidth={2} aria-hidden />
      </a>
    </div>
  );
}
