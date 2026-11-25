import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag } from "lucide-react";
import { Link } from "@/navigation";
import { useLocale, useTranslations } from "@/i18n/hooks";
import type { Category, Product } from "@/lib/data";
import { useCart } from "@/lib/store";
import { fetchCatalogProducts } from "@/lib/catalog-products-api";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { ResponsiveImage } from "@/components/ui/ResponsiveImage";
import { ForwardArrow } from "./HomeSections";
import styles from "./HomeV2.module.css";

/** Products shown per row (one line on desktop, a swipe rail on phones). */
const ROW_SIZE = 5;

/** A row shows the first of its categories that exists in the store. */
const ROWS: readonly { key: string; title: string; slugs: readonly string[] }[] = [
  { key: "laptops", title: "rowLaptops", slugs: ["laptops"] },
  { key: "routers", title: "rowRouters", slugs: ["routers", "networking"] },
  { key: "cctv", title: "rowCctv", slugs: ["cctv"] },
];

function formatMoney(n: number) {
  return new Intl.NumberFormat("en").format(n);
}

/** Largest price size that still fits beside the cart button in a narrow card. */
function priceFontSize(money: string): string {
  const digits = money.replace(/,/g, "").length;
  const em = digits * 0.63 + (money.length - digits) * 0.31;
  return `clamp(12px, calc((100cqi - 108px) / ${em.toFixed(2)}), 18px)`;
}

function HomeProductCard({ product, categories }: { product: Product; categories: Category[] }) {
  const t = useTranslations("HomeV2");
  const locale = useLocale();
  const { addItem } = useCart();
  const category = categories.find((c) => c.id === product.cat);
  const categoryName = category ? (locale === "ar" ? category.nameAr?.trim() || category.name : category.name) : "";
  const meta = [product.brand, categoryName].filter(Boolean).join(" · ");
  const model = product.model?.trim() || product.sku?.trim() || "";
  const money = formatMoney(product.price);
  const onSale = product.oldPrice != null && product.oldPrice > product.price;

  return (
    <article className={styles.prod}>
      <Link href={`/product/${product.id}`} className={styles.prodLink} aria-label={t("viewProduct", { name: product.name })}>
        <span className={styles.prodMedia}>
          {product.images?.[0] ? (
            <ResponsiveImage
              src={product.images[0]}
              alt=""
              width={640}
              height={640}
              className={styles.prodImg}
              sizes="(max-width: 640px) 45vw, 260px"
            />
          ) : (
            <span className={styles.prodIcon} aria-hidden="true">
              {product.icon}
            </span>
          )}
        </span>
        <span className={styles.prodText}>
          <span className={styles.prodMeta}>{meta}</span>
          <span className={styles.prodName}>{product.name}</span>
          <span className={styles.prodModel} dir="ltr">
            {model}
          </span>
        </span>
      </Link>
      <div className={styles.prodFoot}>
        <span className={styles.prodPrices}>
          {onSale ? (
            <span className={styles.prodOld} dir="ltr">
              {formatMoney(product.oldPrice as number)}
            </span>
          ) : null}
          <span className={styles.prodPrice}>
            <span className={styles.prodAmount} dir="ltr" style={{ fontSize: priceFontSize(money) }}>
              {money}
            </span>
            <span className={styles.prodCurrency}>{t("currency")}</span>
          </span>
        </span>
        <button
          type="button"
          className={styles.prodCart}
          disabled={!product.inStock}
          aria-label={t("addToCart", { name: product.name })}
          onClick={() => {
            if (product.inStock) addItem(product);
          }}
        >
          <ShoppingBag size={20} strokeWidth={1.75} aria-hidden />
        </button>
      </div>
      {!product.inStock ? (
        <span className={`${styles.badge} ${styles.badgeOut}`}>{t("badgeOut")}</span>
      ) : product.isNew ? (
        <span className={`${styles.badge} ${styles.badgeNew}`}>{t("badgeNew")}</span>
      ) : null}
    </article>
  );
}

/** Same boxes as a product card, in grey, while the row loads. */
function GhostCard() {
  return (
    <div className={`${styles.prod} ${styles.prodGhost}`} aria-hidden="true">
      <span className={styles.prodMedia} />
      <span className={styles.prodText}>
        <span className={styles.ghostBar} style={{ width: "55%", marginBlock: 3 }} />
        <span className={styles.prodName}>
          <span className={styles.ghostBar} style={{ width: "90%", marginTop: 6 }} />
        </span>
        <span className={styles.prodModel} />
      </span>
      <div className={styles.prodFoot}>
        <span className={styles.ghostBar} style={{ width: "45%", height: 16 }} />
        <span className={styles.prodCart} style={{ background: "#f0efed" }} />
      </div>
    </div>
  );
}

function ProductRow({ slug, title }: { slug: string; title: string }) {
  const t = useTranslations("HomeV2");
  const locale = useLocale();
  const { catalog } = useStorefront();
  const { data, isPending, isError } = useQuery({
    queryKey: ["home-v2-row", locale, slug],
    queryFn: async () =>
      (await fetchCatalogProducts({ locale, cat: slug, inStock: true, pageSize: ROW_SIZE })).products.slice(0, ROW_SIZE),
    staleTime: 60_000,
  });

  /** Nothing to show (empty category or the request failed): leave the row out rather than an empty heading. */
  if (isError || (!isPending && (!data || data.length === 0))) return null;

  return (
    <div className={styles.row}>
      <div className={styles.rowHead}>
        <h2 className={styles.rowTitle}>{title}</h2>
        <Link href={`/category/${encodeURIComponent(slug)}`} className={styles.moreLink}>
          {t("viewAll")}
          <ForwardArrow />
        </Link>
      </div>
      <div className={styles.rail}>
        {isPending
          ? Array.from({ length: ROW_SIZE }, (_, i) => <GhostCard key={i} />)
          : (data ?? []).map((p) => <HomeProductCard key={p.id} product={p} categories={catalog.categories} />)}
      </div>
    </div>
  );
}

/** Three rows fed by the live catalogue: laptops, routers, CCTV. */
export function ProductRows() {
  const t = useTranslations("HomeV2");
  const { catalog } = useStorefront();
  const rows = useMemo(() => {
    const known = new Set(catalog.categories.map((c) => c.id));
    return ROWS.flatMap((r) => {
      const slug = r.slugs.find((s) => known.has(s));
      return slug ? [{ key: r.key, title: r.title, slug }] : [];
    });
  }, [catalog.categories]);

  if (rows.length === 0) return null;

  return (
    <section className={styles.rows}>
      <div className={`${styles.wrap} ${styles.rowsStack}`}>
        {rows.map((r) => (
          <ProductRow key={r.key} slug={r.slug} title={t(r.title)} />
        ))}
      </div>
    </section>
  );
}
