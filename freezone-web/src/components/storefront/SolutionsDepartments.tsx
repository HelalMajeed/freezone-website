"use client";

/**
 * "Shop by Department" — a premium, always-visible homepage section derived
 * entirely from the live catalog (top-level categories). No CMS dependency and
 * no hotlinked art (icon + brand-color accent), so it renders on BOTH the CMS
 * and legacy homepage paths and degrades to null when the catalog is empty.
 *
 * Distinct from the small CategoryIconStrip: larger cards with a one-line value
 * proposition per vertical, giving FreeZone a "complete store" department nav.
 */
import { Link } from "@/navigation";
import { ArrowRight } from "lucide-react";
import { LucideByName } from "@/lib/lucide-icon-map";
import { inferCategoryIconKey } from "@/lib/category-icon-auto";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { useLocale } from "@/i18n/hooks";
import styles from "./SolutionsDepartments.module.css";

/** Short bilingual value line for the core verticals; generic categories show name only. */
const BLURB: Record<string, { en: string; ar: string }> = {
  cctv: { en: "Cameras, NVR/DVR & monitoring", ar: "كاميرات وأنظمة تسجيل ومراقبة" },
  security: { en: "Alarms, access control & smart locks", ar: "إنذارات وتحكّم بالدخول وأقفال ذكية" },
  gaming: { en: "Consoles, gear & gaming PCs", ar: "أجهزة وملحقات وحواسيب ألعاب" },
  computers: { en: "Desktops, builds & all-in-ones", ar: "حواسيب مكتبية وتجميعات" },
  laptops: { en: "Business, study & gaming laptops", ar: "لابتوبات أعمال ودراسة وألعاب" },
  monitors: { en: "Gaming, office & 4K displays", ar: "شاشات ألعاب ومكتب ودقة 4K" },
  networking: { en: "Routers, switches & access points", ar: "راوترات وسويتشات ونقاط وصول" },
  "smart-home": { en: "Hubs, sensors & automation", ar: "وحدات تحكّم وحساسات وأتمتة" },
  "power-solutions": { en: "UPS, inverters & solar", ar: "أجهزة UPS وإنفرترات وطاقة شمسية" },
  printers: { en: "Printers, scanners & supplies", ar: "طابعات وماسحات ومستلزمات" },
  accessories: { en: "Cables, storage & peripherals", ar: "كوابل وتخزين وملحقات" },
  components: { en: "GPUs, CPUs, RAM & storage", ar: "كروت شاشة ومعالجات وذاكرة وتخزين" },
  electric: { en: "Power & electrical solutions", ar: "حلول الطاقة والكهرباء" },
  phones: { en: "Smartphones & accessories", ar: "هواتف ذكية وملحقاتها" },
};

export function SolutionsDepartments() {
  const { catalog } = useStorefront();
  const locale = useLocale() as "en" | "ar";
  const ar = locale === "ar";
  const cats = catalog.categories.filter((c) => !c.parent).slice(0, 8);
  if (cats.length === 0) return null;

  return (
    <section className={`container ${styles.section}`} aria-labelledby="fz-departments-title">
      <div className={styles.head}>
        <h2 id="fz-departments-title" className={styles.title}>
          {ar ? "تسوّق حسب القسم" : "Shop by Department"}
        </h2>
        <p className={styles.sub}>
          {ar ? "كل ما تحتاجه من تقنية في مكان واحد موثوق" : "Everything tech, organized for you"}
        </p>
      </div>
      <div className={styles.grid}>
        {cats.map((cat) => {
          const name = ar ? cat.nameAr?.trim() || cat.name : cat.name;
          const blurb = BLURB[cat.id];
          const sub = blurb ? (ar ? blurb.ar : blurb.en) : "";
          const accent = cat.color?.trim() || "var(--color-accent)";
          return (
            <Link
              key={cat.id}
              href={`/products?cat=${encodeURIComponent(cat.id)}`}
              className={styles.card}
              style={{ ["--dept-accent" as string]: accent }}
            >
              <span className={styles.iconWrap} aria-hidden>
                <LucideByName
                  name={inferCategoryIconKey(cat.id, cat.name, cat.nameAr ?? "")}
                  size={26}
                  strokeWidth={1.6}
                />
              </span>
              <span className={styles.cardBody}>
                <span className={styles.cardName}>{name}</span>
                {sub ? <span className={styles.cardSub}>{sub}</span> : null}
              </span>
              <ArrowRight size={18} className={styles.cardArrow} aria-hidden />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
