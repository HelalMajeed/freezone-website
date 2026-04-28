"use client";

import styles from "./contact.module.css";
import { MapPin, Phone, MessageCircle, Clock } from "lucide-react";
import { MotionReveal } from "@/components/motion/MotionReveal";
import { MotionStagger, MotionStaggerItem } from "@/components/motion/MotionStagger";
import { motion } from "framer-motion";
import { springSnappy } from "@/lib/motion";
import { usePublicSite } from "@/components/providers/StorefrontProvider";
import { useLocale } from "@/i18n/hooks";
import { staticPublicSite } from "@/lib/site-public";

export default function ContactPage() {
  const locale = useLocale();
  const site = usePublicSite();
  const phone = site.phone || "+964 000 000 0000";
  const waDigits = (site.whatsapp || site.phone || "+9640000000000").replace(/\D/g, "");
  /** From CMS (SiteConfig addressEn / addressAr) via storefront bootstrap; falls back to static locale default if empty. */
  const address = site.address?.trim() || staticPublicSite(locale).address;

  return (
    <div className={`container ${styles.wrapper}`}>
      <MotionReveal direction="down" amount={18}>
        <div className={styles.header}>
          <h1 className={styles.headerTitle}>Get in touch</h1>
          <p className={styles.headerDesc}>
            Have questions about a PC build or an enterprise order? Our team is available to assist you.
          </p>
        </div>
      </MotionReveal>

      <MotionStagger className={styles.grid}>
        <MotionStaggerItem>
          <div className={styles.contactInfo}>
            <motion.div className={styles.infoItem} whileHover={{ y: -3 }} transition={springSnappy}>
              <div className={styles.iconBox}>
                <MapPin size={28} />
              </div>
              <div>
                <h4 className={styles.infoLabel}>Our Location</h4>
                <p className={styles.infoText} style={{ whiteSpace: "pre-line" }}>
                  {address}
                </p>
              </div>
            </motion.div>

            <motion.div className={styles.infoItem} whileHover={{ y: -3 }} transition={springSnappy}>
              <div className={styles.iconBox}>
                <Phone size={28} />
              </div>
              <div>
                <h4 className={styles.infoLabel}>Phone Support</h4>
                <p className={styles.infoText}>
                  Sales: {phone}
                  <br />
                  WhatsApp Available
                </p>
              </div>
            </motion.div>

            <motion.div className={styles.infoItem} whileHover={{ y: -3 }} transition={springSnappy}>
              <div className={styles.iconBox}>
                <MessageCircle size={28} />
              </div>
              <div>
                <h4 className={styles.infoLabel}>WhatsApp</h4>
                <p className={styles.infoText}>
                  <a href={`https://wa.me/${waDigits}`} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>
                    Chat on WhatsApp
                  </a>
                </p>
              </div>
            </motion.div>

            <motion.div className={styles.infoItem} whileHover={{ y: -3 }} transition={springSnappy}>
              <div className={styles.iconBox}>
                <Clock size={28} />
              </div>
              <div>
                <h4 className={styles.infoLabel}>Working Hours</h4>
                <p className={styles.infoText}>
                  Saturday - Thursday
                  <br />
                  9:00 AM - 9:00 PM
                </p>
              </div>
            </motion.div>
          </div>
        </MotionStaggerItem>

        <MotionStaggerItem>
          <MotionReveal direction="scale" delay={0.08}>
            <motion.div className={styles.formCard} whileHover={{ y: -3 }} transition={springSnappy}>
              <h3>Send us a message</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  alert("Message sent successfully!");
                }}
              >
                <div className={styles.formGroup}>
                  <label className={styles.label}>Full Name</label>
                  <input type="text" className={styles.input} required placeholder="Ahmed Ali" />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Phone number</label>
                  <input type="tel" inputMode="tel" autoComplete="tel" className={styles.input} required placeholder="07XX XXX XXXX" />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Message</label>
                  <textarea className={styles.textarea} required placeholder="How can we help you?" />
                </div>

                <motion.button type="submit" className={`btn-red ${styles.submitBtn}`} whileTap={{ scale: 0.98 }}>
                  Send Message
                </motion.button>
              </form>
            </motion.div>
          </MotionReveal>
        </MotionStaggerItem>
      </MotionStagger>
    </div>
  );
}
