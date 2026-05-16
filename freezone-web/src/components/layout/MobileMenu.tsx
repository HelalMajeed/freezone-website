"use client";

import { useState } from "react";
import styles from "./MobileMenu.module.css";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@/navigation";
import { SiteLogo } from "./SiteLogo";
import { X, ChevronRight, User, LogIn, Cpu, Globe2, ChevronDown } from "lucide-react";
import type { NavItemResolved } from "@/lib/nav-types";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  megaNavItems?: NavItemResolved[];
  onToggleLocale?: () => void;
  locale?: "en" | "ar";
}

const MAIN_LINKS = [
  { name: "Home", href: "/" },
  { name: "All Products", href: "/products" },
  { name: "About Us", href: "/about" },
  { name: "Contact", href: "/contact" },
];

export function MobileMenu({
  isOpen,
  onClose,
  megaNavItems,
  onToggleLocale,
  locale = "en",
}: MobileMenuProps) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);

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
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
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
                    <Cpu size={16} /> PC Builder
                  </span>
                  <ChevronRight size={16} />
                </Link>
              </div>

              <div className={styles.divider} />

              <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Navigation</h4>
                <div className={styles.menuList}>
                  {MAIN_LINKS.map((link) => (
                    <Link key={link.name} href={link.href} className={styles.menuItem} onClick={onClose}>
                      {link.name} <ChevronRight size={16} />
                    </Link>
                  ))}
                </div>
              </div>

              {megaNavItems && megaNavItems.length > 0 ? (
                <>
                  <div className={styles.divider} />
                  <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>Categories</h4>
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
                                    View all in {item.label}
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
                    <Globe2 size={16} /> {locale === "ar" ? "العربية / English" : "English / العربية"}
                  </span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className={styles.footer}>
              <div className={styles.authList}>
                <Link href="/login" className={styles.authBtn} onClick={onClose}>
                  <LogIn size={16} /> Sign In
                </Link>
                <Link href="/register" className={styles.authBtn} onClick={onClose}>
                  <User size={16} /> Create Account
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
