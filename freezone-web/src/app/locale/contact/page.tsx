"use client";

import { useState, type FormEvent } from "react";
import styles from "./contact.module.css";
import { MapPin, Phone, MessageCircle, Clock } from "lucide-react";
import { MotionReveal } from "@/components/motion/MotionReveal";
import { MotionStagger, MotionStaggerItem } from "@/components/motion/MotionStagger";
import { motion } from "framer-motion";
import { springSnappy } from "@/lib/motion";
import { usePublicSite } from "@/components/providers/StorefrontProvider";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { staticPublicSite } from "@/lib/site-public";
import { freezoneApiUrl } from "@/lib/api-internal";
import { Seo } from "@/components/seo/Seo";

type SubmitStatus =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success" }
  | { state: "error"; messageKey: "errorValidation" | "errorRateLimited" | "errorServer" };

export default function ContactPage() {
  const locale = useLocale();
  const t = useTranslations("content.contact");
  const tSeo = useTranslations("Seo");
  const site = usePublicSite();
  const phone = site.phone || "+964 000 000 0000";
  const waDigits = (site.whatsapp || site.phone || "+9640000000000").replace(/\D/g, "");
  /** From CMS (SiteConfig addressEn / addressAr) via storefront bootstrap; falls back to static locale default if empty. */
  const address = site.address?.trim() || staticPublicSite(locale).address;

  const [name, setName] = useState("");
  const [phoneField, setPhoneField] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<SubmitStatus>({ state: "idle" });

  /**
   * POST /api/public/contact — server requires `name` (1–120), `phone` (5–20)
   * and `message` (5–4000); rate limit 5/min/IP returns 429. Success is shown
   * only on a real 201 `{ ok: true }` — never optimistically.
   */
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status.state === "submitting") return;

    const body = { name: name.trim(), phone: phoneField.trim(), message: message.trim() };
    if (!body.name || body.phone.length < 5 || body.phone.length > 20 || body.message.length < 5) {
      setStatus({ state: "error", messageKey: "errorValidation" });
      return;
    }

    setStatus({ state: "submitting" });
    try {
      const res = await fetch(freezoneApiUrl("/api/public/contact"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 429) {
        setStatus({ state: "error", messageKey: "errorRateLimited" });
        return;
      }
      const j = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (res.ok && j?.ok) {
        setStatus({ state: "success" });
        setName("");
        setPhoneField("");
        setMessage("");
        return;
      }
      setStatus({
        state: "error",
        messageKey: res.status === 400 ? "errorValidation" : "errorServer",
      });
    } catch {
      setStatus({ state: "error", messageKey: "errorServer" });
    }
  }

  return (
    <div className={`container ${styles.wrapper}`}>
      <Seo title={tSeo("contactTitle")} description={tSeo("contactDesc")} />
      <MotionReveal direction="down" amount={18}>
        <div className={styles.header}>
          <h1 className={styles.headerTitle}>{t("heroTitle")}</h1>
          <p className={styles.headerDesc}>{t("heroLead")}</p>
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
                <h4 className={styles.infoLabel}>{t("locationLabel")}</h4>
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
                <h4 className={styles.infoLabel}>{t("phoneLabel")}</h4>
                <p className={styles.infoText}>
                  {t("phoneSales", { phone })}
                  <br />
                  {t("phoneWhatsappNote")}
                </p>
              </div>
            </motion.div>

            <motion.div className={styles.infoItem} whileHover={{ y: -3 }} transition={springSnappy}>
              <div className={styles.iconBox}>
                <MessageCircle size={28} />
              </div>
              <div>
                <h4 className={styles.infoLabel}>{t("whatsappLabel")}</h4>
                <p className={styles.infoText}>
                  <a href={`https://wa.me/${waDigits}`} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>
                    {t("whatsappCta")}
                  </a>
                </p>
              </div>
            </motion.div>

            <motion.div className={styles.infoItem} whileHover={{ y: -3 }} transition={springSnappy}>
              <div className={styles.iconBox}>
                <Clock size={28} />
              </div>
              <div>
                <h4 className={styles.infoLabel}>{t("hoursLabel")}</h4>
                <p className={styles.infoText}>
                  {t("hoursDays")}
                  <br />
                  {t("hoursTime")}
                </p>
              </div>
            </motion.div>
          </div>
        </MotionStaggerItem>

        <MotionStaggerItem>
          <MotionReveal direction="scale" delay={0.08}>
            <motion.div className={styles.formCard} whileHover={{ y: -3 }} transition={springSnappy}>
              <h3>{t("formTitle")}</h3>
              <form onSubmit={onSubmit} noValidate>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="contact-name">
                    {t("nameLabel")}
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    className={styles.input}
                    required
                    maxLength={120}
                    autoComplete="name"
                    placeholder={t("namePlaceholder")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="contact-phone">
                    {t("phoneFieldLabel")}
                  </label>
                  <input
                    id="contact-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    className={styles.input}
                    required
                    maxLength={20}
                    placeholder={t("phonePlaceholder")}
                    value={phoneField}
                    onChange={(e) => setPhoneField(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="contact-message">
                    {t("messageLabel")}
                  </label>
                  <textarea
                    id="contact-message"
                    className={styles.textarea}
                    required
                    maxLength={4000}
                    placeholder={t("messagePlaceholder")}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>

                {status.state === "error" ? (
                  <p className={styles.formError} role="alert">
                    {t(status.messageKey)}
                  </p>
                ) : null}
                {status.state === "success" ? (
                  <p className={styles.formSuccess} role="status">
                    {t("successMsg")}
                  </p>
                ) : null}

                <motion.button
                  type="submit"
                  className={`btn-primary ${styles.submitBtn}`}
                  whileTap={{ scale: 0.98 }}
                  disabled={status.state === "submitting"}
                >
                  {status.state === "submitting" ? t("submitting") : t("submit")}
                </motion.button>
              </form>
            </motion.div>
          </MotionReveal>
        </MotionStaggerItem>
      </MotionStagger>
    </div>
  );
}
