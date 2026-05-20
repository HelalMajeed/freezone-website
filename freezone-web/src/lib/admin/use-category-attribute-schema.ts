"use client";

import { useCallback, useEffect, useState } from "react";
import type { FacetAttributeDef } from "@/lib/data";
import { parseFacetAttributesFromUnknown } from "@/lib/facet-attributes";
import { freezoneApiUrl } from "@/lib/api-internal";

type CategoryLike = {
  id: number;
  facetKeys?: unknown;
  categoryAttributes?: FacetAttributeDef[];
};

/** Load full CategoryAttribute schema for admin product forms (filterable + extended). */
export function useCategoryAttributeSchema(
  categoryId: number | null | undefined,
  categories: CategoryLike[],
) {
  const [attributes, setAttributes] = useState<FacetAttributeDef[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (cid: number, fallback?: FacetAttributeDef[]) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(freezoneApiUrl(`/api/admin/categories/${cid}/attributes`), {
        credentials: "include",
      });
      if (res.ok) {
        const j = (await res.json()) as { categoryAttributes?: FacetAttributeDef[] };
        const list = j.categoryAttributes ?? [];
        if (list.length) {
          setAttributes(list);
        } else {
          const cat = categories.find((c) => c.id === cid);
          const parsed =
            fallback?.length
              ? fallback
              : parseFacetAttributesFromUnknown(cat?.categoryAttributes ?? cat?.facetKeys);
          setAttributes(parsed);
        }
        return;
      }
      setError(`تعذّر تحميل السمات (${res.status})`);
    } catch {
      setError("تعذّر الاتصال بخادم السمات");
    }
    const cat = categories.find((c) => c.id === cid);
    const parsed =
      fallback?.length
        ? fallback
        : parseFacetAttributesFromUnknown(cat?.categoryAttributes ?? cat?.facetKeys);
    setAttributes(parsed);
  }, [categories]);

  useEffect(() => {
    if (!categoryId || !Number.isFinite(categoryId)) {
      setAttributes([]);
      setLoading(false);
      setError(null);
      return;
    }
    void (async () => {
      await load(categoryId);
      setLoading(false);
    })();
  }, [categoryId, load]);

  const reload = useCallback(
    (fallback?: FacetAttributeDef[]) => {
      if (categoryId && Number.isFinite(categoryId)) void load(categoryId, fallback);
    },
    [categoryId, load],
  );

  return { attributes, loading, error, reload, setAttributes };
}
