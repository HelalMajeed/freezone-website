"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useI18n } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";

export function DashboardHome() {
  const { t } = useI18n();
  const params = useParams();
  const locale = String(params.locale ?? "ar");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#061c34]">{t("dashboard.title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t("dashboard.subtitle")}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Products", value: "—", hint: "Wire to /products KPI" },
          { label: "Orders", value: "—", hint: "Wire to /orders KPI" },
          { label: "Low stock", value: "—", hint: "Inventory rules" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{k.label}</p>
            <p className="mt-2 text-3xl font-bold text-[#061c34]">{k.value}</p>
            <p className="mt-1 text-xs text-muted">{k.hint}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={`/${locale}/dashboard/categories`}>{t("nav.categories")}</Link>
        </Button>
      </div>
    </div>
  );
}
