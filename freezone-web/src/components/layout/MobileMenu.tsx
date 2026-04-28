"use client";

import styles from "./MobileMenu.module.css";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@/navigation";
import { SiteLogo } from "./SiteLogo";
import { X, ChevronRight, User, LogIn, Cpu } from "lucide-react";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAIN_LINKS = [
  { name: "Home",           href: "/" },
  { name: "All Products",   href: "/products" },
  { name: "About Us",       href: "/about" },
  { name: "Contact",        href: "/contact" },
];

const CATEGORY_LINKS = [
  { name: "Laptops & PCs",   href: "/products?cat=laptops" },
  { name: "PC Components",   href: "/products?cat=components" },
  { name: "Monitors",        href: "/products?cat=monitors" },
  { name: "Networking",      href: "/products?cat=network" },
];

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className={styles.mobileMenuOverlay}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: "absolute", inset: 0, zIndex: -1 }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className={styles.drawer}
          >
            {/* Header */}
            <div className={styles.header}>
              <SiteLogo variant="mobile" onNavigate={onClose} />
              <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
            </div>

            {/* Scroll Area */}
            <div className={styles.scrollArea}>
              {/* PC Builder CTA */}
              <div className={styles.section}>
                <Link href="/pc-builder" className={`${styles.menuItem} ${styles.menuItemHighlight}`} onClick={onClose}>
                  <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Cpu size={16} /> PC Builder
                  </span>
                  <ChevronRight size={16} />
                </Link>
              </div>

              <div className={styles.divider} />

              {/* Main Links */}
              <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Navigation</h4>
                <div className={styles.menuList}>
                  {MAIN_LINKS.map(link => (
                    <Link key={link.name} href={link.href} className={styles.menuItem} onClick={onClose}>
                      {link.name} <ChevronRight size={16} />
                    </Link>
                  ))}
                </div>
              </div>

              <div className={styles.divider} />

              {/* Categories */}
              <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Categories</h4>
                <div className={styles.menuList}>
                  {CATEGORY_LINKS.map(link => (
                    <Link key={link.name} href={link.href} className={styles.menuItem} onClick={onClose}>
                      {link.name} <ChevronRight size={16} />
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={styles.footer}>
              <div className={styles.authList}>
                <Link href="/login"    className={styles.authBtn} onClick={onClose}><LogIn size={16} /> Sign In</Link>
                <Link href="/register" className={styles.authBtn} onClick={onClose}><User  size={16} /> Create Account</Link>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
