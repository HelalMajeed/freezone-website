import { useEffect, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { Seo } from "@/components/seo/Seo";
import { IRAQ_PROVINCES } from "@/lib/iraq-provinces";
import { labelOf, useCatalog } from "./catalog";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL, WHATSAPP_DISPLAY, whatsappLink } from "./contact";
import { CheckIcon, ChevronDownIcon, InstagramIcon, PinIcon, WhatsAppIcon } from "./icons";
import { provinceName } from "./order";
import { useSitePrefs } from "./prefs";
import styles from "./site.module.css";

type Topic = "question" | "quote";

/** Sections a project quote can ask for (ids from the catalogue; its labels are used). */
const QUOTE_SYSTEMS = ["cctv", "net", "fire", "access", "audio", "smart", "pc"] as const;

/**
 * Contact page: the store's WhatsApp, Instagram and showroom address, a short
 * form that writes the message for WhatsApp (a question, or a project quote
 * with the systems needed), and how ordering works. `?topic=quote` opens the
 * quote form; `?ask=<brand>` starts a question about that brand.
 */
export default function ContactPage() {
  const t = useTranslations("Site");
  const locale = useLocale();
  const [params] = useSearchParams();
  const { data: catalog } = useCatalog();
  const saved = useSitePrefs((s) => s.customer);
  const setCustomer = useSitePrefs((s) => s.setCustomer);

  const ask = (params.get("ask") ?? "").trim().slice(0, 40);
  const [topic, setTopic] = useState<Topic>(params.get("topic") === "quote" ? "quote" : "question");
  const [name, setName] = useState(saved.name);
  const [message, setMessage] = useState(ask ? t("waAskBrand", { name: ask }) : "");
  const [systems, setSystems] = useState<string[]>([]);
  const [city, setCity] = useState(saved.city);
  const [errors, setErrors] = useState<{ message?: string; systems?: string }>({});
  /** The WhatsApp link of the message just sent, kept on screen in case the new tab was blocked. */
  const [sentUrl, setSentUrl] = useState("");

  /** A link to this page with another subject (banner → quote, brand logo → question) updates the form. */
  useEffect(() => {
    setTopic(params.get("topic") === "quote" ? "quote" : "question");
    if (ask) setMessage(t("waAskBrand", { name: ask }));
    // Only when the address changes; typing must not be overwritten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const systemLabel = (id: string) => labelOf(catalog?.catById.get(id), locale) || id;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found: typeof errors = {};
    if (topic === "question" && message.trim().length < 2) found.message = "errMessage";
    if (topic === "quote" && systems.length === 0) found.systems = "errSystems";
    setErrors(found);
    if (found.message || found.systems) return;

    const lines: string[] = [];
    if (topic === "quote") {
      lines.push(t("waQuote"));
      lines.push(`${t("waSystems")} ${systems.map(systemLabel).join(locale === "ar" ? "، " : ", ")}`);
      if (city) lines.push(`${t("waCity")} ${provinceName(city, locale)}`);
      if (message.trim()) lines.push(`${t("waDetails")} ${message.trim()}`);
    } else {
      lines.push(t("waQuestionIntro"));
      lines.push(message.trim());
    }
    if (name.trim()) lines.push(`${t("waName")} ${name.trim()}`);
    if (name.trim()) setCustomer({ name: name.trim() });
    const url = whatsappLink(lines.join("\n"));
    setSentUrl(url);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const steps = [
    { title: t("how1Title"), text: t("how1Text") },
    { title: t("how2Title"), text: t("how2Text") },
    { title: t("how3Title"), text: t("how3Text") },
  ];

  return (
    <section className={styles.page}>
      <Seo title={t("seoContactTitle")} description={t("seoContactDesc")} canonicalPath={`/${locale}/contact`} />
      <div className={`${styles.wrap} ${styles.pageStack}`}>
        <nav className={styles.crumbs} aria-label={t("breadcrumb")}>
          <RouterLink to={`/${locale}`}>{t("home")}</RouterLink>
          <span aria-hidden="true">/</span>
          <span className={styles.crumbNow} aria-current="page">
            {t("navContact")}
          </span>
        </nav>

        <div className={styles.listTitleBox}>
          <h1 className={styles.h1}>{t("navContact")}</h1>
          <p className={styles.lead}>{t("contactLead")}</p>
        </div>

        <div className={styles.contactCards}>
          <a className={styles.contactCard} href={whatsappLink(t("waHello"))} target="_blank" rel="noopener noreferrer">
            <span className={styles.contactIcon}>
              <WhatsAppIcon size={24} />
            </span>
            <span className={styles.contactText}>
              <span className={styles.contactKind}>{t("whatsapp")}</span>
              <bdi dir="ltr" className={styles.contactValue}>
                {WHATSAPP_DISPLAY}
              </bdi>
            </span>
            <span className={styles.contactGo}>{t("contactChat")}</span>
          </a>
          <a className={styles.contactCard} href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
            <span className={styles.contactIcon}>
              <InstagramIcon size={24} />
            </span>
            <span className={styles.contactText}>
              <span className={styles.contactKind}>{t("contactInstagram")}</span>
              <bdi dir="ltr" className={styles.contactValue}>
                {INSTAGRAM_HANDLE}
              </bdi>
            </span>
          </a>
          <div className={styles.contactCard}>
            <span className={styles.contactIcon}>
              <PinIcon size={24} />
            </span>
            <span className={styles.contactText}>
              <span className={styles.contactKind}>{t("contactShowroom")}</span>
              <span className={styles.contactValue}>{t("address")}</span>
            </span>
          </div>
        </div>

        <div className={styles.checkout}>
          <form className={styles.panel} noValidate onSubmit={submit}>
            <h2 className={styles.panelTitle}>{t("contactFormTitle")}</h2>

            <div role="radiogroup" aria-label={t("topicLabel")} className={styles.choiceRow}>
              {(["question", "quote"] as const).map((id) => (
                <label key={id} className={`${styles.choice} ${topic === id ? styles.choiceOn : ""}`}>
                  <input
                    type="radio"
                    name="topic"
                    className={styles.srOnly}
                    checked={topic === id}
                    onChange={() => {
                      setTopic(id);
                      setErrors({});
                    }}
                  />
                  <span>{t(id === "quote" ? "topicQuote" : "topicQuestion")}</span>
                </label>
              ))}
            </div>

            <div className={styles.formGrid}>
              {topic === "quote" ? (
                <fieldset className={`${styles.fieldBox} ${styles.fieldWide} ${styles.fieldSet}`}>
                  <legend className={styles.fieldLabel}>{t("fieldSystems")}</legend>
                  <div className={styles.searchChips}>
                    {QUOTE_SYSTEMS.map((id) => {
                      const on = systems.includes(id);
                      return (
                        <label key={id} className={`${styles.togglePill} ${on ? styles.togglePillOn : ""}`}>
                          <input
                            type="checkbox"
                            className={styles.srOnly}
                            checked={on}
                            onChange={() => {
                              setSystems((s) => (on ? s.filter((x) => x !== id) : [...s, id]));
                              setErrors((e) => ({ ...e, systems: undefined }));
                            }}
                          />
                          <span className={styles.toggleBox} aria-hidden="true">
                            {on ? <CheckIcon size={14} /> : null}
                          </span>
                          <span>{systemLabel(id)}</span>
                        </label>
                      );
                    })}
                  </div>
                  {errors.systems ? (
                    <span className={styles.fieldErr} role="alert">
                      {t(errors.systems)}
                    </span>
                  ) : null}
                </fieldset>
              ) : null}

              <label className={styles.fieldBox}>
                <span className={styles.fieldLabel}>{t("fieldName")}</span>
                <input
                  name="name"
                  className={styles.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  maxLength={80}
                />
              </label>

              {topic === "quote" ? (
                <label className={styles.fieldBox}>
                  <span className={styles.fieldLabel}>{t("fieldCity")}</span>
                  <span className={styles.selectBox}>
                    <select
                      name="city"
                      className={`${styles.input} ${styles.inputSelect}`}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    >
                      <option value="">{t("fieldCityPick")}</option>
                      {IRAQ_PROVINCES.map((p) => (
                        <option key={p.code} value={p.code}>
                          {locale === "ar" ? p.ar : p.en}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className={styles.selectCaret} />
                  </span>
                </label>
              ) : null}

              <label className={`${styles.fieldBox} ${styles.fieldWide}`}>
                <span className={styles.fieldLabel}>{t(topic === "quote" ? "fieldProject" : "fieldMessage")}</span>
                <textarea
                  name="message"
                  className={`${styles.input} ${styles.inputArea} ${errors.message ? styles.inputBad : ""}`}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    setErrors((x) => ({ ...x, message: undefined }));
                  }}
                  rows={4}
                  maxLength={800}
                  placeholder={topic === "quote" ? t("fieldProjectHint") : undefined}
                  aria-invalid={Boolean(errors.message)}
                />
                {errors.message ? (
                  <span className={styles.fieldErr} role="alert">
                    {t(errors.message)}
                  </span>
                ) : null}
              </label>
            </div>

            <button type="submit" className={`${styles.cartOrder} ${styles.sendBtn}`}>
              <WhatsAppIcon size={22} />
              <span>{t("sendWhatsApp")}</span>
            </button>
            {sentUrl ? (
              <a className={styles.againLink} href={sentUrl} target="_blank" rel="noopener noreferrer">
                {t("sentOpenAgain")}
              </a>
            ) : null}
          </form>

          <aside id="how-to-order" className={`${styles.panel} ${styles.summary}`}>
            <h2 className={styles.panelTitle}>{t("howTitle")}</h2>
            <ol className={styles.howList}>
              {steps.map((s, i) => (
                <li key={s.title} className={styles.howItem}>
                  <span className={styles.stepNum} dir="ltr">
                    {i + 1}
                  </span>
                  <span className={styles.howText}>
                    <span className={styles.howTitle}>{s.title}</span>
                    <span className={styles.emptyText}>{s.text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <RouterLink to={`/${locale}/products`} className={styles.pillBtn}>
              {t("showAll")}
            </RouterLink>
          </aside>
        </div>
      </div>
    </section>
  );
}
