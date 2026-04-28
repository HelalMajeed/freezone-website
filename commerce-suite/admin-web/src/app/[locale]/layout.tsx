import { Toaster } from "sonner";
import { DocumentAttributes } from "@/components/document-attributes";
import { I18nProvider } from "@/providers/i18n-provider";
import { QueryProvider } from "@/providers/query-provider";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <QueryProvider>
      <I18nProvider locale={locale}>
        <DocumentAttributes />
        {children}
        <Toaster richColors position="top-center" />
      </I18nProvider>
    </QueryProvider>
  );
}
