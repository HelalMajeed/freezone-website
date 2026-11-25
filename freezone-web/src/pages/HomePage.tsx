import { lazy, Suspense } from "react";
import { useTranslations } from "@/i18n/hooks";
import { Seo } from "@/components/seo/Seo";
import homeStyles from "@/components/home-v2/HomeV2.module.css";

/** The hero carries about 90 kB of scenes and motion — its own chunk, off the first paint path. */
const HomeV2 = lazy(() => import("@/components/home-v2/HomeV2"));

export default function HomePage() {
  const t = useTranslations("Site");
  const title = t("seoHomeTitle");

  return (
    <>
      <Seo title={title} description={t("seoHomeDesc")} />
      <h1 className={homeStyles.srOnly}>{title}</h1>
      <Suspense fallback={<div className={homeStyles.coverPlaceholder} aria-hidden="true" />}>
        <HomeV2 />
      </Suspense>
    </>
  );
}
