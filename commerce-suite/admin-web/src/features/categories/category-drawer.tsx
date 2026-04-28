"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiJson, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useI18n } from "@/providers/i18n-provider";
import type { AttributeRow, CategoryFlat } from "./types";
import { collectDescendantIds } from "./tree-utils";

const schema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "kebab-case" }),
  nameEn: z.string().min(1),
  nameAr: z.string().min(1),
  parentId: z.string().nullable(),
  imageUrl: z.union([z.string().url(), z.literal("")]).optional(),
  attributeIds: z.array(z.string()),
  active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  category?: CategoryFlat | null;
  flat: CategoryFlat[];
};

async function fetchAttributes(): Promise<AttributeRow[]> {
  return apiJson<AttributeRow[]>("/attributes");
}

export function CategoryDrawer({ open, onOpenChange, mode, category, flat }: Props) {
  const { t } = useI18n();
  const qc = useQueryClient();

  const excluded = useMemo(() => {
    if (!category) return new Set<string>();
    return collectDescendantIds(category.id, flat);
  }, [category, flat]);

  const parentOptions = useMemo(() => {
    return flat.filter((c) => !excluded.has(c.id) || (category != null && c.id === category.parentId));
  }, [flat, excluded, category]);

  const attrQ = useQuery({
    queryKey: ["attributes"],
    queryFn: fetchAttributes,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      slug: "",
      nameEn: "",
      nameAr: "",
      parentId: null,
      imageUrl: "",
      attributeIds: [],
      active: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && category) {
      form.reset({
        slug: category.slug,
        nameEn: category.nameEn,
        nameAr: category.nameAr,
        parentId: category.parentId,
        imageUrl: category.imageUrl ?? "",
        attributeIds: [...category.attributeIds],
        active: category.active,
      });
    } else {
      form.reset({
        slug: "",
        nameEn: "",
        nameAr: "",
        parentId: null,
        imageUrl: "",
        attributeIds: [],
        active: true,
      });
    }
  }, [open, mode, category, form]);

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        slug: values.slug,
        nameEn: values.nameEn,
        nameAr: values.nameAr,
        parentId: values.parentId,
        imageUrl: values.imageUrl?.trim() ? values.imageUrl.trim() : null,
        attributeIds: values.attributeIds,
        active: values.active,
      };
      if (mode === "create") {
        return apiJson<CategoryFlat>("/categories", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      if (!category) throw new Error("missing category");
      return apiJson<CategoryFlat>(`/categories/${category.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Saved");
      onOpenChange(false);
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.body : String(e);
      toast.error(msg);
    },
  });

  const del = useMutation({
    mutationFn: async () => {
      if (!category) return;
      await apiJson(`/categories/${category.id}`, { method: "DELETE" });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Deleted");
      onOpenChange(false);
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.body : String(e);
      toast.error(msg);
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="max-w-md">
        <SheetHeader>
          <SheetTitle>{mode === "create" ? t("categories.drawerCreate") : t("categories.drawerEdit")}</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <form
            id="category-form"
            className="flex flex-col gap-4"
            onSubmit={form.handleSubmit((v) => save.mutate(v))}
          >
            <div className="grid gap-2">
              <Label htmlFor="slug">{t("categories.slug")}</Label>
              <Input id="slug" dir="ltr" {...form.register("slug")} />
              {form.formState.errors.slug && (
                <p className="text-xs text-red-600">{form.formState.errors.slug.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nameEn">{t("categories.nameEn")}</Label>
              <Input id="nameEn" {...form.register("nameEn")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nameAr">{t("categories.nameAr")}</Label>
              <Input id="nameAr" {...form.register("nameAr")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="parentId">{t("categories.parent")}</Label>
              <select
                id="parentId"
                className="h-9 w-full rounded-md border border-border bg-white px-2 text-sm"
                value={form.watch("parentId") ?? ""}
                onChange={(e) => form.setValue("parentId", e.target.value === "" ? null : e.target.value)}
              >
                <option value="">{t("categories.root")}</option>
                {parentOptions
                  .filter((c) => mode === "create" || c.id !== category?.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameEn} ({c.slug})
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="imageUrl">{t("categories.imageUrl")}</Label>
              <Input id="imageUrl" dir="ltr" {...form.register("imageUrl")} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="active"
                checked={form.watch("active")}
                onCheckedChange={(v) => form.setValue("active", v === true)}
              />
              <Label htmlFor="active" className="!normal-case">
                {t("categories.active")}
              </Label>
            </div>
            <div className="grid gap-2">
              <Label>{t("categories.attributes")}</Label>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border p-2">
                {attrQ.isLoading && <p className="text-sm text-muted">…</p>}
                {attrQ.data?.map((a) => {
                  const checked = form.watch("attributeIds").includes(a.id);
                  return (
                    <label key={a.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          const next = new Set(form.getValues("attributeIds"));
                          if (v === true) next.add(a.id);
                          else next.delete(a.id);
                          form.setValue("attributeIds", [...next]);
                        }}
                      />
                      <span>
                        {a.nameEn} <span className="text-muted">({a.key})</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </form>
        </SheetBody>
        <SheetFooter className="justify-between">
          <div className="flex gap-2">
            {mode === "edit" && category && (
              <Button
                type="button"
                variant="destructive"
                disabled={del.isPending}
                onClick={() => {
                  if (confirm("Delete this category and its children?")) del.mutate();
                }}
              >
                {t("categories.delete")}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              {t("categories.cancel")}
            </Button>
            <Button type="submit" form="category-form" disabled={save.isPending}>
              {t("categories.save")}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
