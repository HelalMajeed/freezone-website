"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, FolderTree, LayoutDashboard, PanelLeftClose, PanelLeft, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/store/ui-store";
import { useI18n } from "@/providers/i18n-provider";

function nav(locale: string) {
  return [
    { href: `/${locale}/dashboard`, key: "nav.dashboard", icon: LayoutDashboard },
    { href: `/${locale}/dashboard/categories`, key: "nav.categories", icon: FolderTree },
    { href: `/${locale}/dashboard/attributes`, key: "nav.attributes", icon: Boxes },
    { href: `/${locale}/dashboard/settings`, key: "nav.settings", icon: Settings2 },
  ] as const;
}

export function AdminSidebar({ locale }: { locale: string }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-col border-e border-border bg-white transition-[width] duration-200",
        collapsed ? "w-[72px]" : "w-[260px]",
      )}
    >
      <div className="flex h-14 items-center justify-between gap-2 border-b border-border px-3">
        {!collapsed && (
          <Link href={`/${locale}/dashboard`} className="truncate text-sm font-bold text-[#061c34]">
            {t("app.name")}
          </Link>
        )}
        <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={toggleSidebar} aria-label="Toggle sidebar">
          {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </Button>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {nav(locale).map((item) => {
          const on = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? t(item.key) : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                on ? "border-s-4 border-primary bg-surface text-primary" : "text-muted hover:bg-surface hover:text-[#061c34]",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{t(item.key)}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
