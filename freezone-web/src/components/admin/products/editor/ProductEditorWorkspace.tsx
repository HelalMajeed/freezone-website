"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { productEditorSchema, type ProductEditorValues } from "@/lib/admin/product-editor-schema";
import {
  fetchProductForEditor,
  patchProductEditor,
  type LoadedProduct,
} from "@/lib/admin/product-editor-api";
import { freezoneApiUrl } from "@/lib/api-internal";
import { useDashboardAuth } from "@/lib/dashboard/auth-store";
import { BasicInfoSection } from "@/components/admin/products/editor/BasicInfoSection";
import { DescriptionSection } from "@/components/admin/products/editor/DescriptionSection";
import { ImagesSection } from "@/components/admin/products/editor/ImagesSection";
import { PricingSection } from "@/components/admin/products/editor/PricingSection";
import { InventorySection } from "@/components/admin/products/editor/InventorySection";
import { AttributesSection } from "@/components/admin/products/editor/AttributesSection";
import { VariantsSection } from "@/components/admin/products/editor/VariantsSection";
import { SEOSection } from "@/components/admin/products/editor/SEOSection";
import { ShippingSection } from "@/components/admin/products/editor/ShippingSection";
import { InternalNotesSection } from "@/components/admin/products/editor/InternalNotesSection";
import { ProductCommentsSection } from "@/components/admin/products/editor/ProductCommentsSection";
import { duplicateAdminProduct } from "@/lib/admin/admin-products-api";
import { ProductReadinessPanel } from "@/components/admin/products/editor/ProductReadinessPanel";
import { KeyboardShortcutsModal } from "@/components/admin/KeyboardShortcutsModal";
import editorStyles from "./ProductEditorWorkspace.module.css";

type TabId =
  | "basic"
  | "description"
  | "images"
  | "pricing"
  | "inventory"
  | "attributes"
  | "variants"
  | "seo"
  | "shipping"
  | "notes";

const TABS: { id: TabId; label: string }[] = [
  { id: "basic", label: "أساسي" },
  { id: "description", label: "الوصف" },
  { id: "images", label: "الصور" },
  { id: "pricing", label: "التسعير" },
  { id: "inventory", label: "المخزون" },
  { id: "attributes", label: "السمات" },
  { id: "variants", label: "متغيرات" },
  { id: "seo", label: "SEO" },
  { id: "shipping", label: "الشحن" },
  { id: "notes", label: "داخلي" },
];

export function ProductEditorWorkspace({ productId }: { productId: number }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reviewMode = searchParams.get("review") === "1";
  const hasRole = useDashboardAuth((s) => s.hasRole);
  const [tab, setTab] = useState<TabId>("basic");
  const [images, setImages] = useState<LoadedProduct["images"]>([]);
  const [categories, setCategories] = useState<Array<{ id: number; nameAr: string; nameEn: string; slug: string; facetKeys?: unknown }>>([]);
  const [brands, setBrands] = useState<Array<{ id: number; nameAr: string; nameEn: string }>>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [loading, setLoading] = useState(true);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [publishBlocked, setPublishBlocked] = useState(false);

  const form = useForm<ProductEditorValues>({
    resolver: zodResolver(productEditorSchema),
    defaultValues: {
      nameAr: "",
      nameEn: "",
      slug: null,
      sku: "",
      categoryId: 0,
      secondaryCategoryIds: [],
      brandId: null,
      brand: "",
      catalogStatus: "DRAFT",
      shortDescAr: "",
      shortDescEn: "",
      descAr: "",
      descEn: "",
      keyFeatures: [],
      whatsInBox: [],
      price: 0,
      priceUsd: null,
      costPrice: null,
      salePrice: null,
      saleStartAt: null,
      saleEndAt: null,
      quantity: 0,
      lowStockThreshold: 5,
      availability: "IN_STOCK",
      prepTimeDays: 0,
      specs: {},
      metaTitleAr: null,
      metaTitleEn: null,
      metaDescAr: null,
      metaDescEn: null,
      seoKeywords: [],
      weightKg: null,
      dimLengthCm: null,
      dimWidthCm: null,
      dimHeightCm: null,
      requiresSpecialHandling: false,
      excludedProvinces: [],
      internalNotes: null,
      sourceSupplier: null,
      purchaseInvoiceRef: null,
      published: false,
    },
  });

  const { register, control, watch, setValue, handleSubmit, reset, formState } = form;
  const dirtyRef = useRef(false);
  dirtyRef.current = formState.isDirty;

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [product, cats, brs] = await Promise.all([
          fetchProductForEditor(productId),
          fetch(freezoneApiUrl("/api/admin/categories"), { credentials: "include" }).then((r) => r.json()),
          fetch(freezoneApiUrl("/api/admin/brands"), { credentials: "include" }).then((r) => r.json()),
        ]);
        if (cancelled) return;
        const { images: imgs, variants: _v, id: _id, ...values } = product;
        reset(values);
        setImages(imgs);
        setCategories(Array.isArray(cats) ? cats : []);
        setBrands(Array.isArray(brs) ? brs : []);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "فشل التحميل");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId, reset]);

  const persist = useCallback(
    async (extra?: Partial<ProductEditorValues> & { submitForReview?: boolean }) => {
      setSaveState("saving");
      try {
        const values = form.getValues();
        await patchProductEditor(productId, {
          ...values,
          specs: values.specs,
          secondaryCategoryIds: values.secondaryCategoryIds,
          ...extra,
        });
        setSaveState("saved");
        form.reset(values);
        toast.success("تم الحفظ");
      } catch (e) {
        setSaveState("error");
        toast.error(e instanceof Error ? e.message : "فشل الحفظ");
      }
    },
    [form, productId],
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      if (formState.isDirty) void persist();
    }, 10_000);
    return () => window.clearInterval(id);
  }, [formState.isDirty, persist]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        void persist();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "p" && hasRole("admin")) {
        e.preventDefault();
        void persist({ catalogStatus: "PUBLISHED" });
      }
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShortcutsOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        void (async () => {
          try {
            const newId = await duplicateAdminProduct(productId);
            toast.success(`نسخة جديدة #${newId}`);
            navigate(`/admin/products/edit/${newId}`);
          } catch {
            toast.error("تعذّر النسخ");
          }
        })();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [persist, hasRole, productId, navigate]);

  if (loading) return <p>جارٍ التحميل…</p>;

  const saveLabel =
    saveState === "saving" ? "جارٍ الحفظ…" : saveState === "saved" ? "تم الحفظ" : formState.isDirty ? "غير محفوظ" : "";

  const missingFields = Object.entries(formState.errors).map(([k]) => k);

  return (
    <div
      dir="rtl"
      className={editorStyles.workspace}
      style={{ maxWidth: 960, margin: "0 auto", padding: "0 16px 80px", marginInlineStart: reviewMode ? 300 : 0 }}
    >
      <KeyboardShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ProductReadinessPanel
        values={watch()}
        imageCount={images.length}
        requiredAttrCount={0}
        filledAttrCount={Object.keys(watch("specs") ?? {}).length}
        onPublishBlocked={setPublishBlocked}
      />
      <ProductCommentsSection productId={productId} readOnly={reviewMode && !hasRole("admin")} />
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <Link to="/admin/products">← المنتجات</Link>
          <h1 style={{ margin: "8px 0 0" }}>تعديل منتج #{productId}</h1>
          <span style={{ fontSize: 13, color: "#94a3b8" }}>{saveLabel}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" disabled={!formState.isValid} onClick={() => void persist()}>
            حفظ مسودة
          </button>
          <button
            type="button"
            onClick={async () => {
              await persist();
              navigate("/admin/products/new");
            }}
          >
            حفظ ومنتج جديد
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                const newId = await duplicateAdminProduct(productId);
                navigate(`/admin/products/edit/${newId}`);
              } catch {
                toast.error("تعذّر النسخ كقالب");
              }
            }}
          >
            نسخ كقالب
          </button>
          {!reviewMode ? (
            <button type="button" onClick={() => void persist({ submitForReview: true })}>
              إرسال للمراجعة
            </button>
          ) : null}
          {hasRole("admin") && !reviewMode ? (
            <button
              type="button"
              disabled={publishBlocked}
              title={publishBlocked ? "أكمل جاهزية المنتج 100%" : undefined}
              onClick={() => void persist({ catalogStatus: "PUBLISHED" })}
            >
              نشر
            </button>
          ) : null}
          <button type="button" onClick={() => setShortcutsOpen(true)}>
            ?
          </button>
        </div>
      </header>

      {missingFields.length > 0 ? (
        <div
          role="alert"
          style={{
            marginBottom: 12,
            padding: 12,
            borderRadius: 8,
            background: "#422006",
            color: "#fde68a",
            fontSize: 13,
          }}
        >
          <strong>ينقص للحفظ الكامل:</strong> {missingFields.join("، ")}
        </div>
      ) : null}

      <nav style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: tab === t.id ? "2px solid #10b981" : "1px solid #334155",
              background: tab === t.id ? "#0f172a" : "transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <form
        onSubmit={handleSubmit(() => {
          void persist();
        })}
      >
        {tab === "basic" ? (
          <BasicInfoSection
            register={register}
            watch={watch}
            setValue={setValue}
            control={control}
            categories={categories}
            brands={brands}
            productId={productId}
          />
        ) : null}
        {tab === "description" ? (
          <DescriptionSection register={register} control={control} watch={watch} setValue={setValue} />
        ) : null}
        {tab === "images" ? (
          <ImagesSection productId={productId} images={images} onImagesChange={setImages} />
        ) : null}
        {tab === "pricing" ? <PricingSection register={register} watch={watch} setValue={setValue} /> : null}
        {tab === "inventory" ? <InventorySection register={register} /> : null}
        {tab === "attributes" ? (
          <AttributesSection watch={watch} setValue={setValue} categories={categories} />
        ) : null}
        {tab === "variants" ? <VariantsSection productId={productId} /> : null}
        {tab === "seo" ? <SEOSection register={register} watch={watch} setValue={setValue} /> : null}
        {tab === "shipping" ? <ShippingSection register={register} watch={watch} setValue={setValue} /> : null}
        {tab === "notes" ? <InternalNotesSection register={register} /> : null}
      </form>
    </div>
  );
}
