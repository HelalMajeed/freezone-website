import { useEffect } from "react";
import { Link as RouterLink, useLocation, useParams } from "react-router-dom";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { Seo, canonicalSitePath, publicSiteBaseUrl } from "@/components/seo/Seo";
import { safeJsonLd } from "@/components/seo/jsonLd";
import { trackViewItem } from "@/lib/analytics";
import { useSiteCart } from "./cart";
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
import { BackArrowIcon, CartIcon } from "./icons";
import { ProductCard } from "./ProductCard";
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

function ProductView({ p, catalog }: { p: SiteProduct; catalog: SiteCatalog }) {
  const t = useTranslations("Site");
  const locale = useLocale();
  const location = useLocation();
  const add = useSiteCart((s) => s.add);
  const openCart = useSiteCart((s) => s.setOpen);
  const { data: features } = useFeatures(locale);

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

  useEffect(() => {
    trackViewItem({ id: p.id, name: plainName, price: p.price, brand: p.brand || undefined, category: p.cat });
  }, [p.id, plainName, p.price, p.brand, p.cat]);

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
            <img
              src={productImage(p.id)}
              alt={plainName}
              width={640}
              height={640}
              fetchPriority="high"
              decoding="async"
              className={styles.detailImg}
            />
            {isOut ? (
              <span className={`${styles.detailBadge} ${styles.detailBadgeOut}`}>{t("badgeOut")}</span>
            ) : p.flag === "new" ? (
              <span className={`${styles.detailBadge} ${styles.detailBadgeNew}`}>{t("badgeNew")}</span>
            ) : null}
          </div>
          <div className={styles.detailInfo}>
            <span className={styles.detailMeta}>
              {brandLabel} · {labelOf(cat, locale)}
            </span>
            <h1 className={styles.detailName}>{name}</h1>
            {p.model ? (
              <span className={styles.detailModel}>
                {t("model")} <bdi dir="ltr">{p.model}</bdi>
              </span>
            ) : null}
            <div className={styles.detailPrice}>
              <span className={styles.detailAmount} dir="ltr">
                {formatMoney(p.price)}
              </span>
              <span className={styles.detailCur}>{t("currency")}</span>
            </div>
            <div className={styles.detailActions}>
              <button
                type="button"
                className={styles.addBtn}
                disabled={isOut}
                onClick={() => {
                  if (isOut) return;
                  add(p.id);
                  openCart(true);
                }}
              >
                <CartIcon size={20} />
                <span>{isOut ? t("badgeOut") : t("addToCart")}</span>
              </button>
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
      </div>
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
