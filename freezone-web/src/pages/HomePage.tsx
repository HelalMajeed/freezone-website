import { lazy, Suspense } from "react";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { Seo } from "@/components/seo/Seo";
import { useTranslations } from "@/i18n/hooks";
import homeStyles from "@/components/home-v2/HomeV2.module.css";

/**
 * Home page v2 — a fixed design (layered hero banners, section cards, live
 * product rows, promo pictures, projects banner). It replaces the CMS-driven
 * home (DynamicHomeSections / HomeLegacyContent / SolutionsDepartments, still in
 * the repo): the admin's "home sections" no longer change this page.
 *
 * Loaded as its own chunk so the hero markup and motion CSS stay out of the
 * bundle every other page downloads.
 */
const HomeV2 = lazy(() => import("@/components/home-v2/HomeV2"));

export default function HomePage() {
  const { site } = useStorefront();
  const tSeo = useTranslations("Seo");
  const title = site.metaTitle?.trim() || tSeo("homeTitle");
  return (
    <>
      <Seo title={title} description={site.metaDescription?.trim() || tSeo("homeDesc")} />
      <h1 className={homeStyles.srOnly}>{title}</h1>
      {/* Same box as the hero, so nothing below it moves when the chunk arrives. */}
      <Suspense fallback={<div className={homeStyles.coverPlaceholder} aria-hidden="true" />}>
        <HomeV2 />
      </Suspense>
    </>
  );
}
