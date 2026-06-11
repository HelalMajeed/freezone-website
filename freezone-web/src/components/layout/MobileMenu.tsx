"use client";

import { useState } from "react";
import styles from "./MobileMenu.module.css";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@/navigation";
import { SiteLogo } from "./SiteLogo";
import { X, ChevronRight, User, LogIn, Cpu, ChevronDown } from "lucide-react";
import { BrandMarkIcon } from "./BrandMarkIcon";
import { useTranslations } from "@/i18n/hooks";
import type { NavItemResolved } from "@/lib/nav-types";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  megaNavItems?: NavItemResolved[];
  onToggleLocale?: () => void;
  locale?: "en" | "ar";
}

export function MobileMenu({
  isOpen,
  onClose,
  megaNavItems,
  onToggleLocale,
  locale = "en",
}: MobileMenuProps) {
  const t = useTranslations("content.menu");
  const tNav = useTranslations("Navigation");
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  /** Drawer sits at inline-start: offscreen is -100% in LTR (left), +100% in RTL (right). */
  const offX = locale === "ar" ? "100%" : "-100%";

  const mainLinks = [
    { name: t("home"), href: "/" },
    { name: t("allProducts"), href: "/products" },
    { name: t("about"), href: "/about" },
    { name: t("contact"), href: "/contact" },
    { name: t("warranty"), href: "/warranty" },
    { name: t("faq"), href: "/faq" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={styles.mobileMenuOverlay}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: "absolute", inset: 0, zIndex: -1 }}
          />

          <motion.div
            id="mobile-menu"
            initial={{ x: offX }}
            animate={{ x: 0 }}
            exit={{ x: offX }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className={styles.drawer}
          >
            <div className={styles.header}>
              <SiteLogo variant="mobile" onNavigate={onClose} />
              <button type="button" className={styles.closeBtn} onClick={onClose}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.scrollArea}>
              <div className={styles.section}>
                <Link href="/pc-builder" className={`${styles.menuItem} ${styles.menuItemHighlight}`} onClick={onClose}>
                  <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Cpu size={16} /> {t("pcBuilder")}
                  </span>
                  <ChevronRight size={16} />
                </Link>
              </div>

              <div className={styles.divider} />

              <div className={styles.section}>
                <h4 className={styles.sectionTitle}>{t("navigation")}</h4>
                <div className={styles.menuList}>
                  {mainLinks.map((link) => (
                    <Link key={link.href} href={link.href} className={styles.menuItem} onClick={onClose}>
                      {link.name} <ChevronRight size={16} />
                    </Link>
                  ))}
                </div>
              </div>

              {megaNavItems && megaNavItems.length > 0 ? (
                <>
                  <div className={styles.divider} />
                  <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>{t("categories")}</h4>
                    <div className={styles.accordion}>
                      {megaNavItems.map((item) => {
                        const open = openGroup === item.id;
                        return (
                          <div key={item.id} className={styles.accordionItem}>
                            <button
                              type="button"
                              className={styles.accordionHead}
                              aria-expanded={open}
                              onClick={() => setOpenGroup(open ? null : item.id)}
                            >
                              <span className={styles.accordionTitle}>{item.label}</span>
                              <ChevronDown
                                size={18}
                                className={open ? styles.accordionChevOpen : styles.accordionChev}
                              />
                            </button>
                            <AnimatePresence initial={false}>
                              {open ? (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className={styles.accordionBody}
                                >
                                  {item.columns.map((col, ci) => (
                                    <div key={ci} className={styles.accordionCol}>
                                      <div className={styles.accordionColTitle}>{col.title}</div>
                                      <div className={styles.accordionLinks}>
                                        {col.items.map((row, li) => (
                                          <Link key={li} href={row.href} className={styles.accordionLink} onClick={onClose}>
                                            {row.label}
                                          </Link>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                  <Link href={item.href} className={styles.accordionViewAll} onClick={onClose}>
                                    {t("viewAll", { label: item.label })}
                                  </Link>
                                </motion.div>
                              ) : null}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : null}

              <div className={styles.divider} />

              <div className={styles.section}>
                <button type="button" className={styles.menuItem} onClick={() => onToggleLocale?.()}>
                  <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <BrandMarkIcon size={16} /> {locale === "ar" ? "العربية / English" : "English / العربية"}
                  </span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className={styles.footer}>
              <div className={styles.authList}>
                <Link href="/login" className={styles.authBtn} onClick={onClose}>
                  <LogIn size={16} /> {tNav("signIn")}
                </Link>
                <Link href="/register" className={styles.authBtn} onClick={onClose}>
                  <User size={16} /> {tNav("createAccount")}
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
