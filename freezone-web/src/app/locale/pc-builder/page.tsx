import { PcBuilderWizard } from "@/components/pc-build/PcBuilderWizard";
import { Seo } from "@/components/seo/Seo";
import { useTranslations } from "@/i18n/hooks";

export default function PcBuilderPage() {
  const tSeo = useTranslations("Seo");
  return (
    <>
      <Seo title={tSeo("pcBuilderTitle")} description={tSeo("pcBuilderDesc")} />
      <PcBuilderWizard />
    </>
  );
}
