"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, User } from "lucide-react";
import { apiJson } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/providers/i18n-provider";

type Hit = { id: string; slug: string; nameEn: string; nameAr: string; parentId: string | null };

export function AdminTopbar({ locale }: { locale: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      setHits([]);
      return;
    }
    const tmr = setTimeout(() => {
      void (async () => {
        try {
          const data = await apiJson<Hit[]>(`/categories/search?q=${encodeURIComponent(q.trim())}`);
          setHits(data);
          setOpen(true);
        } catch {
          setHits([]);
        }
      })();
    }, 280);
    return () => clearTimeout(tmr);
  }, [q]);

  const switchLocale = (next: "en" | "ar") => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts[0] === "en" || parts[0] === "ar") {
      parts[0] = next;
    } else {
      parts.unshift(next);
    }
    router.push(`/${parts.join("/")}`);
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-border bg-white/95 px-4 backdrop-blur">
      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          className="ps-9"
          placeholder={t("topbar.searchPlaceholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => q && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {open && hits.length > 0 && (
          <div className="absolute start-0 top-full z-30 mt-1 w-full rounded-md border border-border bg-white py-1 shadow-lg">
            {hits.map((h) => (
              <button
                key={h.id}
                type="button"
                className="flex w-full flex-col items-start px-3 py-2 text-start text-sm hover:bg-surface"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  router.push(`/${locale}/dashboard/categories`);
                  setOpen(false);
                  setQ("");
                }}
              >
                <span className="font-medium text-[#061c34]">{h.nameEn}</span>
                <span className="text-xs text-muted">/{h.slug}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="ms-auto flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon" aria-label={t("topbar.notifications")}>
          <Bell className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="gap-2">
              <span className="text-xs font-semibold uppercase">{locale}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("topbar.language")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => switchLocale("en")}>English (LTR)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => switchLocale("ar")}>العربية (RTL)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" aria-label={t("topbar.profile")}>
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Admin</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/${locale}/dashboard/settings`} className="cursor-pointer">
                Settings
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
