import { useCallback, useEffect, useRef, useState } from "react";
import { Link as RouterLink, useLocation, useParams } from "react-router-dom";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { Seo, canonicalSitePath, publicSiteBaseUrl } from "@/components/seo/Seo";
import { safeJsonLd } from "@/components/seo/jsonLd";
import { trackViewItem } from "@/lib/analytics";
import { useAddToCart, useFavorite } from "./actions";
import { MAX_QTY, useSiteCart } from "./cart";
import {
  filtersQuery,
  formatMoney,
  labelOf,
  normalizeProductId,
  plainText,
  productImage,
  productName,
  relatedProducts,
  useCatalog,
  useFeatures,
  type SiteCatalog,
  type SiteProduct,
} from "./catalog";
import { whatsappLink } from "./contact";
import {
  BackArrowIcon,
  CartIcon,
  CheckIcon,
  CloseIcon,
  HeartIcon,
  MinusIcon,
  PlusIcon,
  ShareIcon,
  WhatsAppIcon,
  ZoomIcon,
} from "./icons";
import { InLayer } from "./layer";
import { useOverlay } from "./overlay";
import { useSitePrefs } from "./prefs";
import { ProductCard } from "./ProductCard";
import { Rail } from "./Rail";
import { toast, useSiteUi } from "./ui";
import { SiteNotFound } from "./SiteNotFound";
import styles from "./site.module.css";

function ProductJsonLd({ p, name, locale, crumbs }: { p: SiteProduct; name: string; locale: "ar" | "en"; crumbs: { name: string; path: string }[] }) {
  const base = publicSiteBaseUrl();
  const url = `${base}${canonicalSitePath(`/${locale}/product/${p.id}`)}`;
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name,
      image: [`${base}${productImage(p.id)}`],
      sku: p.id,
      ...(p.model ? { mpn: p.model } : {}),
      ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
      offers: {
        "@type": "Offer",
        url,
        price: p.price,
        priceCurrency: "IQD",
        availability: p.flag === "out" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
        itemCondition: "https://schema.org/NewCondition",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        item: `${base}${canonicalSitePath(c.path)}`,
      })),
    },
  ];
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }} />;
}

/** The product picture on its own, as large as the screen allows. */
function PictureViewer({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const t = useTranslations("Site");
  const closeRef = useRef<HTMLButtonElement>(null);
  useOverlay(true, onClose, closeRef);
  return (
    <div className={styles.viewer} role="dialog" aria-modal="true" aria-label={alt}>
      <button type="button" className={styles.cartScrim} aria-label={t("zoomClose")} tabIndex={-1} onClick={onClose} />
      <div className={styles.viewerBox}>
        <img src={src} alt={alt} width={640} height={640} className={styles.viewerImg} />
        <button ref={closeRef} type="button" className={`${styles.iconBtn} ${styles.viewerClose}`} aria-label={t("zoomClose")} onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}

function ProductView({ p, catalog }: { p: SiteProduct; catalog: SiteCatalog }) {
  const t = useTranslations("Site");
  const locale = useLocale();
  const location = useLocation();
  const add = useAddToCart();
  const openCart = useSiteCart((s) => s.setOpen);
  const inCart = useSiteCart((s) => s.items[p.id] ?? 0);
  const fav = useFavorite(p.id);
  const seen = useSitePrefs((s) => s.seen);
  const recentIds = useSitePrefs((s) => s.recent);
  const setBottomBar = useSiteUi((s) => s.setBottomBar);
  const { data: features } = useFeatures(locale);
  const [qty, setQty] = useState(1);
  const [viewing, setViewing] = useState(false);
  /** The phone bar with price + add shows whenever the main button is off screen (above or below). */
  const [barOn, setBarOn] = useState(false);
  const mediaRef = useRef<HTMLButtonElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  const name = productName(p, locale);
  const plainName = plainText(name);
  const cat = catalog.catById.get(p.cat);
  const sub = catalog.subById.get(p.sub);
  const brandLabel = p.brand || t("otherBrands");
  const isOut = p.flag === "out";
  const list = `/${locale}/products`;
  const from = (location.state as { from?: string } | null)?.from;
  const backTo = from && from.startsWith(list) ? from : list;
  const related = relatedProducts(catalog, p);
  const lines = features?.[p.id];
  const pageUrl = `${publicSiteBaseUrl()}${canonicalSitePath(`/${locale}/product/${p.id}`)}`;
  const recent = recentIds
    .filter((id) => id !== p.id && !related.some((r) => r.id === id))
    .flatMap((id) => catalog.byId.get(id) ?? [])
    .slice(0, 10);

  useEffect(() => {
    trackViewItem({ id: p.id, name: plainName, price: p.price, brand: p.brand || undefined, category: p.cat });
  }, [p.id, plainName, p.price, p.brand, p.cat]);

  /** Remember this page for "recently viewed" (after the list above was read, so it never lists itself). */
  useEffect(() => {
    seen(p.id);
  }, [seen, p.id]);

  useEffect(() => {
    const el = actionsRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => setBarOn(!entries[entries.length - 1].isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /** Tell the shell how tall the bar is, so the floating buttons and messages sit above it (phones only). */
  useEffect(() => {
    const phone = window.matchMedia("(max-width: 640px)").matches;
    setBottomBar(barOn && phone ? 72 : 0);
    return () => setBottomBar(0);
  }, [barOn, setBottomBar]);

  /** With a mouse, the picture magnifies around the pointer. */
  const onZoomMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = mediaRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--zx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
    el.style.setProperty("--zy", `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
    el.dataset.zoom = "1";
  };
  const onZoomEnd = () => {
    if (mediaRef.current) delete mediaRef.current.dataset.zoom;
  };

  const share = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: plainName, url: pageUrl });
        return;
      }
      await navigator.clipboard.writeText(pageUrl);
      toast(t("toastLinkCopied"));
    } catch {
      /* The visitor closed the share sheet, or the browser refused the clipboard: nothing to report. */
    }
  }, [plainName, pageUrl, t]);

  const addNow = () => {
    if (isOut) return;
    add(p, qty);
    setQty(1);
  };

  return (
    <section className={styles.page}>
      <Seo
        title={plainName}
        description={t("seoProductDesc", { name: plainName, price: formatMoney(p.price) })}
        image={productImage(p.id)}
        ogType="product"
        canonicalPath={`/${locale}/product/${p.id}`}
      />
      <ProductJsonLd
        p={p}
        name={plainName}
        locale={locale}
        crumbs={[
          { name: t("home"), path: `/${locale}` },
          { name: t("products"), path: list },
          { name: plainName, path: `/${locale}/product/${p.id}` },
        ]}
      />
      <div className={`${styles.wrap} ${styles.detailStack}`}>
        <nav className={styles.crumbs} aria-label={t("breadcrumb")}>
          <RouterLink to={`/${locale}`}>{t("home")}</RouterLink>
          <span aria-hidden="true">/</span>
          <RouterLink to={list}>{t("products")}</RouterLink>
          <span aria-hidden="true">/</span>
          <RouterLink to={`${list}${filtersQuery({ brand: p.brand })}`}>{brandLabel}</RouterLink>
          <span aria-hidden="true">/</span>
          <RouterLink to={`${list}${filtersQuery({ brand: p.brand, cat: p.cat })}`}>{labelOf(cat, locale)}</RouterLink>
          <span aria-hidden="true">/</span>
          <RouterLink to={`${list}${filtersQuery({ brand: p.brand, cat: p.cat, sub: p.sub })}`} className={styles.crumbNow}>
            {labelOf(sub, locale)}
          </RouterLink>
        </nav>

        <div className={styles.detail}>
          <div className={styles.detailMedia}>
            <button
              ref={mediaRef}
              type="button"
              className={styles.zoomBtn}
              aria-label={t("zoom")}
              onClick={() => setViewing(true)}
              onPointerMove={onZoomMove}
              onPointerLeave={onZoomEnd}
            >
              <img
                src={productImage(p.id)}
                alt={plainName}
                width={640}
                height={640}
                fetchPriority="high"
                decoding="async"
                className={styles.detailImg}
              />
            </button>
            {isOut ? (
              <span className={`${styles.detailBadge} ${styles.detailBadgeOut}`}>{t("badgeOut")}</span>
            ) : p.flag === "new" ? (
              <span className={`${styles.detailBadge} ${styles.detailBadgeNew}`}>{t("badgeNew")}</span>
            ) : null}
            <span className={styles.zoomHint} aria-hidden="true">
              <ZoomIcon size={18} />
            </span>
          </div>
          <div className={styles.detailInfo}>
            <div className={styles.detailTop}>
              <span className={styles.detailMeta}>
                {brandLabel} · {labelOf(cat, locale)}
              </span>
              <div className={styles.detailTools}>
                <button
                  type="button"
                  className={`${styles.roundBtn} ${fav.on ? styles.roundBtnOn : ""}`}
                  aria-pressed={fav.on}
                  aria-label={t(fav.on ? "favRemove" : "favAdd", { name: plainName })}
                  onClick={fav.toggle}
                >
                  <HeartIcon filled={fav.on} />
                </button>
                <button type="button" className={styles.roundBtn} aria-label={t("share")} onClick={share}>
                  <ShareIcon />
                </button>
              </div>
            </div>
            <h1 className={styles.detailName}>{name}</h1>
            <div className={styles.detailFacts}>
              {p.model ? (
                <span className={styles.detailModel}>
                  {t("model")} <bdi dir="ltr">{p.model}</bdi>
                </span>
              ) : null}
              <span className={styles.detailModel}>
                {t("productCode")} <bdi dir="ltr">{p.id}</bdi>
              </span>
              <span className={`${styles.stock} ${isOut ? styles.stockOut : ""}`}>
                {isOut ? null : <CheckIcon size={14} />}
                {isOut ? t("badgeOut") : t("available")}
              </span>
            </div>
            <div className={styles.detailPrice}>
              <span className={styles.detailAmount} dir="ltr">
                {formatMoney(p.price)}
              </span>
              <span className={styles.detailCur}>{t("currency")}</span>
            </div>
            <div ref={actionsRef} className={styles.detailActions}>
              {isOut ? null : (
                <div className={`${styles.qty} ${styles.qtyLarge}`} role="group" aria-label={t("cartQty")}>
                  <button
                    type="button"
                    className={styles.qtyBtn}
                    aria-label={t("cartLess")}
                    disabled={qty <= 1}
                    onClick={() => setQty((n) => Math.max(1, n - 1))}
                  >
                    <MinusIcon />
                  </button>
                  <span className={styles.qtyNum} dir="ltr" aria-live="polite">
                    {qty}
                  </span>
                  <button
                    type="button"
                    className={styles.qtyBtn}
                    aria-label={t("cartMore")}
                    disabled={qty >= MAX_QTY}
                    onClick={() => setQty((n) => Math.min(MAX_QTY, n + 1))}
                  >
                    <PlusIcon />
                  </button>
                </div>
              )}
              <button type="button" className={styles.addBtn} disabled={isOut} onClick={addNow}>
                <CartIcon size={20} />
                <span>{isOut ? t("badgeOut") : t("addToCart")}</span>
              </button>
            </div>
            {inCart > 0 && !isOut ? (
              <button type="button" className={styles.inCartLine} onClick={() => openCart(true)}>
                <CheckIcon size={16} />
                <span>{t("cartCount", { count: inCart })}</span>
                <span className={styles.inCartLink}>{t("toastViewCart")}</span>
              </button>
            ) : null}
            <div className={styles.detailLinks}>
              <a
                className={styles.backBtn}
                href={whatsappLink(`${t("waAskProduct", { name: plainName, id: p.id })}\n${pageUrl}`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon size={20} />
                <span>{t("askWhatsApp")}</span>
              </a>
              <RouterLink to={backTo} className={styles.backBtn}>
                <BackArrowIcon className={styles.flipLtr} />
                <span>{t("backToProducts")}</span>
              </RouterLink>
            </div>
            {lines && lines.length > 0 ? (
              <div className={styles.specs}>
                <h2 className={styles.specsTitle}>{t("specs")}</h2>
                <ul className={styles.specList}>
                  {lines.map((line, i) => (
                    <li key={i} className={styles.specItem}>
                      <span className={styles.specDot} aria-hidden="true" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        {related.length > 0 ? (
          <div className={styles.related}>
            <h2 className={styles.relatedTitle}>{t("related")}</h2>
            <div className={styles.grid}>
              {related.map((r) => (
                <ProductCard key={r.id} product={r} catalog={catalog} />
              ))}
            </div>
          </div>
        ) : null}

        {recent.length > 0 ? (
          <div className={styles.related}>
            <h2 className={styles.relatedTitle}>{t("recentTitle")}</h2>
            <Rail>
              {recent.map((r) => (
                <ProductCard key={r.id} product={r} catalog={catalog} />
              ))}
            </Rail>
          </div>
        ) : null}
      </div>

      <InLayer>
        {viewing ? <PictureViewer src={productImage(p.id)} alt={plainName} onClose={() => setViewing(false)} /> : null}
        {barOn && !isOut ? (
          <div className={styles.buyBar}>
            <span className={styles.buyBarPrice}>
              <span dir="ltr">{formatMoney(p.price)}</span>
              <span className={styles.cartCur}>{t("currency")}</span>
            </span>
            <button type="button" className={`${styles.addBtn} ${styles.buyBarBtn}`} onClick={addNow}>
              <CartIcon size={20} />
              <span>{t("addToCart")}</span>
            </button>
          </div>
        ) : null}
      </InLayer>
    </section>
  );
}

export default function ProductPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { data: catalog } = useCatalog();

  if (!catalog) {
    return (
      <section className={styles.page} aria-busy="true">
        <div className={`${styles.wrap} ${styles.detailStack}`}>
          <div className={styles.detail}>
            <div className={`${styles.detailMedia} ${styles.ghostBlock}`} />
            <div className={styles.detailInfo}>
              <span className={styles.ghostLine} style={{ width: "30%" }} />
              <span className={styles.ghostLine} style={{ width: "85%", height: 28 }} />
              <span className={styles.ghostLine} style={{ width: "40%" }} />
            </div>
          </div>
        </div>
      </section>
    );
  }

  const product = catalog.byId.get(normalizeProductId(id));
  if (!product) return <SiteNotFound />;
  return <ProductView key={product.id} p={product} catalog={catalog} />;
}
