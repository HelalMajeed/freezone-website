"use client";

import { useEffect, useState } from "react";
import type { UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { AdminProductFormSection } from "@/components/admin/products/AdminProductFormSection";
import type { ProductEditorValues } from "@/lib/admin/product-editor-schema";
import { freezoneApiUrl } from "@/lib/api-internal";
import { useDashboardAuth } from "@/lib/dashboard/auth-store";

export function PricingSection({
  register,
  watch,
  setValue,
}: {
  register: UseFormRegister<ProductEditorValues>;
  watch: UseFormWatch<ProductEditorValues>;
  setValue: UseFormSetValue<ProductEditorValues>;
}) {
  const [rate, setRate] = useState(1450);
  const price = watch("price");
  const hasRole = useDashboardAuth((s) => s.hasRole);
  const showCost = hasRole("admin");

  useEffect(() => {
    void fetch(freezoneApiUrl("/api/admin/catalog-config"), { credentials: "include" })
      .then((r) => r.json())
      .then((j: { data?: { exchangeRateIqdPerUsd?: number } }) => {
        if (j.data?.exchangeRateIqdPerUsd) setRate(j.data.exchangeRateIqdPerUsd);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (price > 0) setValue("priceUsd", Math.round((price / rate) * 100) / 100, { shouldDirty: false });
  }, [price, rate, setValue]);

  const margin =
    watch("costPrice") && watch("costPrice")! > 0 && price > 0
      ? Math.round(((price - watch("costPrice")!) / watch("costPrice")!) * 100)
      : null;

  return (
    <AdminProductFormSection title="التسعير" subtitle={`سعر الصرف: ${rate} د.ع / $`}>
      <label>
        السعر (د.ع) *
        <input type="number" {...register("price", { valueAsNumber: true })} style={{ width: "100%" }} />
      </label>
      <label>
        السعر ($) — مقترح
        <input type="number" step="0.01" {...register("priceUsd", { valueAsNumber: true })} style={{ width: "100%" }} />
      </label>
      {showCost ? (
        <label>
          سعر التكلفة (د.ع) — إداري
          <input type="number" {...register("costPrice", { valueAsNumber: true })} style={{ width: "100%" }} />
        </label>
      ) : null}
      {margin != null ? <p>هامش الربح التقريبي: {margin}%</p> : null}
      <label>
        سعر التخفيض (د.ع)
        <input type="number" {...register("salePrice", { valueAsNumber: true })} style={{ width: "100%" }} />
      </label>
      <label>
        بداية التخفيض
        <input type="datetime-local" {...register("saleStartAt")} style={{ width: "100%" }} />
      </label>
      <label>
        نهاية التخفيض
        <input type="datetime-local" {...register("saleEndAt")} style={{ width: "100%" }} />
      </label>
    </AdminProductFormSection>
  );
}
