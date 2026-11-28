import { useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { Seo } from "@/components/seo/Seo";
import { trackBeginCheckout } from "@/lib/analytics";
import { IRAQ_PROVINCES } from "@/lib/iraq-provinces";
import { cartCount, useSiteCart } from "./cart";
import { formatMoney, plainText, productImage, productName, useCatalog } from "./catalog";
import { whatsappLink } from "./contact";
import {
  CheckIcon,
  ChevronDownIcon,
  MinusIcon,
  PlusIcon,
  StoreIcon,
  TrashIcon,
  TruckIcon,
  WhatsAppIcon,
} from "./icons";
import { buildOrderMessage, checkCustomer, orderTotal, type OrderErrors, type OrderRow } from "./order";
import { useSitePrefs, type ReceiveMethod } from "./prefs";
import { toast } from "./ui";
import styles from "./site.module.css";

type Step = "form" | "sent" | "done";

/**
 * The order page. The visitor reviews the cart, enters name, phone and where to
 * receive the order, and sends it to the store as a WhatsApp message — there is
 * no online payment and nothing is posted to a server. After the message opens,
 * the page asks them to press send there, then confirms and empties the cart.
 */
export default function CheckoutPage() {
  const t = useTranslations("Site");
  const locale = useLocale();
  const { data: catalog } = useCatalog();
  const items = useSiteCart((s) => s.items);
  const setQty = useSiteCart((s) => s.setQty);
  const remove = useSiteCart((s) => s.remove);
  const clear = useSiteCart((s) => s.clear);
  const customer = useSitePrefs((s) => s.customer);
  const setCustomer = useSitePrefs((s) => s.setCustomer);

  const [step, setStep] = useState<Step>("form");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<OrderErrors>({});
  const [sent, setSent] = useState<{ url: string; message: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  /** Only products the catalogue still has (a saved cart can outlive a product). */
  const rows: OrderRow[] = catalog
    ? Object.entries(items).flatMap(([id, qty]) => {
        const p = catalog.byId.get(id);
        return p ? [{ p, qty }] : [];
      })
    : [];
  const total = orderTotal(rows);
  const currency = t("currency");
  const list = `/${locale}/products`;

  /** Each step starts at the top of the page. */
  useEffect(() => {
    if (step !== "form") window.scrollTo(0, 0);
  }, [step]);

  const set = (patch: Parameters<typeof setCustomer>[0]) => {
    setCustomer(patch);
    /** A field being corrected stops showing its error. */
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k as keyof OrderErrors];
      if ("method" in patch) {
        delete next.city;
        delete next.address;
      }
      return next;
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rows.length === 0) return;
    const found = checkCustomer(customer);
    setErrors(found);
    const first = (["name", "phone", "city", "address"] as const).find((k) => found[k]);
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    const message = buildOrderMessage({ t, locale, rows, customer, note });
    const url = whatsappLink(message);
    trackBeginCheckout(
      rows.map((r) => ({
        id: r.p.id,
        name: plainText(productName(r.p, locale)),
        price: r.p.price,
        quantity: r.qty,
        brand: r.p.brand || undefined,
        category: r.p.cat,
      })),
    );
    setSent({ url, message });
    setStep("sent");
    /** Opened from the click itself, so the browser allows the new tab. The link stays on the next screen as well. */
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copyMessage = async () => {
    if (!sent) return;
    try {
      await navigator.clipboard.writeText(sent.message);
      toast(t("toastTextCopied"));
    } catch {
      /* Clipboard refused (old browser or no permission): the text is on screen to select by hand. */
    }
  };

  const head = (
    <>
      <Seo title={t("checkoutTitle")} noindex />
      <nav className={styles.crumbs} aria-label={t("breadcrumb")}>
        <RouterLink to={`/${locale}`}>{t("home")}</RouterLink>
        <span aria-hidden="true">/</span>
        <RouterLink to={list}>{t("products")}</RouterLink>
        <span aria-hidden="true">/</span>
        <span className={styles.crumbNow} aria-current="page">
          {t("checkoutTitle")}
        </span>
      </nav>
    </>
  );

  if (step === "done") {
    return (
      <section className={styles.page}>
        <div className={`${styles.wrap} ${styles.pageStack}`}>
          {head}
          <div className={styles.doneBox}>
            <span className={styles.doneMark}>
              <CheckIcon size={30} />
            </span>
            <h1 className={styles.h1}>{t("doneTitle")}</h1>
            <p className={styles.lead}>{t("doneText")}</p>
            <RouterLink to={list} className={styles.darkBtn}>
              {t("doneShop")}
            </RouterLink>
          </div>
        </div>
      </section>
    );
  }

  if (step === "sent" && sent) {
    return (
      <section className={styles.page}>
        <div className={`${styles.wrap} ${styles.pageStack}`}>
          {head}
          <div className={styles.doneBox}>
            <span className={`${styles.doneMark} ${styles.doneMarkDark}`}>
              <WhatsAppIcon size={30} />
            </span>
            <h1 className={styles.h1}>{t("sentTitle")}</h1>
            <p className={styles.lead}>{t("sentText")}</p>
            <div className={styles.doneActions}>
              <a className={styles.cartOrder} href={sent.url} target="_blank" rel="noopener noreferrer">
                {t("sentOpenAgain")}
              </a>
              <button type="button" className={styles.pillBtn} onClick={copyMessage}>
                {t("sentCopy")}
              </button>
            </div>
            <pre className={styles.sentMessage} dir="auto">
              {sent.message}
            </pre>
            <div className={styles.doneActions}>
              <button
                type="button"
                className={styles.darkBtn}
                onClick={() => {
                  clear();
                  setStep("done");
                }}
              >
                {t("sentDone")}
              </button>
              <button type="button" className={styles.clearBtn} onClick={() => setStep("form")}>
                {t("sentEdit")}
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const pickup = customer.method === "pickup";
  const methods: { id: ReceiveMethod; label: string; icon: React.ReactNode }[] = [
    { id: "delivery", label: t("receiveDelivery"), icon: <TruckIcon /> },
    { id: "pickup", label: t("receivePickup"), icon: <StoreIcon /> },
  ];

  return (
    <section className={styles.page}>
      <div className={`${styles.wrap} ${styles.pageStack}`}>
        {head}
        <div className={styles.listTitleBox}>
          <h1 className={styles.h1}>{t("checkoutTitle")}</h1>
          <p className={styles.lead}>{t("checkoutLead")}</p>
        </div>

        {!catalog ? (
          <div className={styles.empty} aria-busy="true">
            <span className={styles.emptyTitle}>{t("loading")}</span>
          </div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyTitle}>{t("cartEmpty")}</span>
            <span className={styles.emptyText}>{t("cartEmptyText")}</span>
            <RouterLink to={list} className={styles.darkBtn}>
              {t("showAll")}
            </RouterLink>
          </div>
        ) : (
          <div className={styles.checkout}>
            <form ref={formRef} className={styles.panel} noValidate onSubmit={submit}>
              <h2 className={styles.panelTitle}>
                {t("stepDetails")}
              </h2>

              <div role="radiogroup" aria-label={t("receiveTitle")} className={styles.choiceRow}>
                {methods.map((m) => (
                  <label key={m.id} className={`${styles.choice} ${customer.method === m.id ? styles.choiceOn : ""}`}>
                    <input
                      type="radio"
                      name="receive"
                      className={styles.srOnly}
                      checked={customer.method === m.id}
                      onChange={() => set({ method: m.id })}
                    />
                    {m.icon}
                    <span>{m.label}</span>
                  </label>
                ))}
              </div>

              <div className={styles.formGrid}>
                <label className={styles.fieldBox}>
                  <span className={styles.fieldLabel}>{t("fieldName")}</span>
                  <input
                    name="name"
                    className={`${styles.input} ${errors.name ? styles.inputBad : ""}`}
                    value={customer.name}
                    onChange={(e) => set({ name: e.target.value })}
                    autoComplete="name"
                    maxLength={80}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? "co-err-name" : undefined}
                  />
                  {errors.name ? (
                    <span id="co-err-name" className={styles.fieldErr}>
                      {t(errors.name)}
                    </span>
                  ) : null}
                </label>
                <label className={styles.fieldBox}>
                  <span className={styles.fieldLabel}>{t("fieldPhone")}</span>
                  <input
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    dir="ltr"
                    className={`${styles.input} ${styles.inputPhone} ${errors.phone ? styles.inputBad : ""}`}
                    value={customer.phone}
                    onChange={(e) => set({ phone: e.target.value })}
                    autoComplete="tel"
                    placeholder="07XX XXX XXXX"
                    maxLength={20}
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? "co-err-phone" : undefined}
                  />
                  {errors.phone ? (
                    <span id="co-err-phone" className={styles.fieldErr}>
                      {t(errors.phone)}
                    </span>
                  ) : null}
                </label>

                {pickup ? (
                  <div className={`${styles.fieldBox} ${styles.fieldWide} ${styles.pickupNote}`}>
                    <StoreIcon />
                    <span>
                      {t("receivePickupAt")} <strong>{t("address")}</strong>
                    </span>
                  </div>
                ) : (
                  <>
                    <label className={styles.fieldBox}>
                      <span className={styles.fieldLabel}>{t("fieldCity")}</span>
                      <span className={styles.selectBox}>
                        <select
                          name="city"
                          className={`${styles.input} ${styles.inputSelect} ${errors.city ? styles.inputBad : ""}`}
                          value={customer.city}
                          onChange={(e) => set({ city: e.target.value })}
                          autoComplete="address-level1"
                          aria-invalid={Boolean(errors.city)}
                          aria-describedby={errors.city ? "co-err-city" : undefined}
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
                      {errors.city ? (
                        <span id="co-err-city" className={styles.fieldErr}>
                          {t(errors.city)}
                        </span>
                      ) : null}
                    </label>
                    <label className={styles.fieldBox}>
                      <span className={styles.fieldLabel}>{t("fieldAddress")}</span>
                      <input
                        name="address"
                        className={`${styles.input} ${errors.address ? styles.inputBad : ""}`}
                        value={customer.address}
                        onChange={(e) => set({ address: e.target.value })}
                        autoComplete="street-address"
                        placeholder={t("fieldAddressHint")}
                        maxLength={200}
                        aria-invalid={Boolean(errors.address)}
                        aria-describedby={errors.address ? "co-err-address" : undefined}
                      />
                      {errors.address ? (
                        <span id="co-err-address" className={styles.fieldErr}>
                          {t(errors.address)}
                        </span>
                      ) : null}
                    </label>
                  </>
                )}

                <label className={`${styles.fieldBox} ${styles.fieldWide}`}>
                  <span className={styles.fieldLabel}>{t("fieldNote")}</span>
                  <textarea
                    name="note"
                    className={`${styles.input} ${styles.inputArea}`}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                </label>
              </div>

              {Object.keys(errors).length > 0 ? (
                <p className={styles.formErr} role="alert">
                  {t("errSummary")}
                </p>
              ) : null}

              <button type="submit" className={`${styles.cartOrder} ${styles.sendBtn}`}>
                <WhatsAppIcon size={22} />
                <span>{t("cartOrder")}</span>
              </button>
              <span className={styles.cartNote}>{t("savedNote")}</span>
            </form>

            <aside className={`${styles.panel} ${styles.summary}`} aria-label={t("orderSummary")}>
              <h2 className={styles.panelTitle}>
                {t("orderSummary")}
                <span className={styles.h2Count}>{t("itemsCount", { count: cartCount(items) })}</span>
              </h2>
              <ul className={styles.sumList}>
                {rows.map(({ p, qty }) => {
                  const name = plainText(productName(p, locale));
                  return (
                    <li key={p.id} className={styles.cartItem}>
                      <RouterLink to={`/${locale}/product/${p.id}`} className={styles.cartThumb} tabIndex={-1} aria-hidden="true">
                        <img src={productImage(p.id, "small")} alt="" width={320} height={320} loading="lazy" decoding="async" />
                      </RouterLink>
                      <div className={styles.cartInfo}>
                        <RouterLink to={`/${locale}/product/${p.id}`} className={styles.cartName}>
                          {productName(p, locale)}
                        </RouterLink>
                        <div className={styles.cartRow}>
                          <div className={styles.qty} role="group" aria-label={t("cartQty")}>
                            <button type="button" className={styles.qtyBtn} aria-label={t("cartLess")} onClick={() => setQty(p.id, qty - 1)}>
                              <MinusIcon />
                            </button>
                            <span className={styles.qtyNum} dir="ltr" aria-live="polite">
                              {qty}
                            </span>
                            <button type="button" className={styles.qtyBtn} aria-label={t("cartMore")} onClick={() => setQty(p.id, qty + 1)}>
                              <PlusIcon />
                            </button>
                          </div>
                          <span className={styles.cartPrice}>
                            <span dir="ltr">{formatMoney(p.price * qty)}</span>
                            <span className={styles.cartCur}>{currency}</span>
                          </span>
                        </div>
                      </div>
                      <button type="button" className={styles.cartRemove} aria-label={t("cartRemove", { name })} onClick={() => remove(p.id)}>
                        <TrashIcon />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className={styles.sumRows}>
                <div className={styles.sumRow}>
                  <span>{t("deliveryLine")}</span>
                  <span>{pickup ? t("receivePickup") : t("deliveryLineNote")}</span>
                </div>
                <div className={styles.cartTotal}>
                  <span>{t("cartTotal")}</span>
                  <span className={styles.cartTotalNum}>
                    <span dir="ltr">{formatMoney(total)}</span>
                    <span className={styles.cartCur}>{currency}</span>
                  </span>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
