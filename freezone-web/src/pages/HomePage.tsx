import { useStorefront } from "@/components/providers/StorefrontProvider";
import { DynamicHomeSections } from "@/components/storefront/DynamicHomeSections";
import { HomeLegacyContent } from "@/components/storefront/HomeLegacyContent";

export default function HomePage() {
  const { homeSections } = useStorefront();
  if (homeSections?.length) {
    return <DynamicHomeSections sections={homeSections} />;
  }
  return <HomeLegacyContent />;
}
