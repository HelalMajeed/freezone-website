import { useStorefront } from "@/components/providers/StorefrontProvider";
import { DynamicHomeSections } from "@/components/storefront/DynamicHomeSections";
import { HomeLegacyContent } from "@/components/storefront/HomeLegacyContent";
import { Seo } from "@/components/seo/Seo";
import { useTranslations } from "@/i18n/hooks";
import { SolutionsDepartments } from "@/components/storefront/SolutionsDepartments";

export default function HomePage() {
  const { homeSections, site } = useStorefront();
  const tSeo = useTranslations("Seo");
  const seo = (
    <Seo
      title={site.metaTitle?.trim() || tSeo("homeTitle")}
      description={site.metaDescription?.trim() || tSeo("homeDesc")}
    />
  );
  if (homeSections?.length) {
    return (
      <>
        {seo}
        <DynamicHomeSections sections={homeSections} />
        <SolutionsDepartments />
      </>
    );
  }
  return (
    <>
      {seo}
      <HomeLegacyContent />
      <SolutionsDepartments />
    </>
  );
}
