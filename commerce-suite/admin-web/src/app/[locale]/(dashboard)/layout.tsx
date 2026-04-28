import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminTopbar } from "@/components/layout/admin-topbar";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="flex min-h-screen">
      <AdminSidebar locale={locale} />
      <div className="flex min-h-0 flex-1 flex-col">
        <AdminTopbar locale={locale} />
        <main className="flex-1 overflow-auto bg-surface p-6">{children}</main>
      </div>
    </div>
  );
}
