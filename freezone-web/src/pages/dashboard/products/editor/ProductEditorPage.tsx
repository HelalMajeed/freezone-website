/**
 * Full-page tabbed product editor — /dashboard/products/new and
 * /dashboard/products/:id. Replaces the old ProductFormModal.
 *
 * Save flow (edit): PATCH product → PUT images (only when the gallery
 * changed). A PATCH failure leaves everything dirty; an images failure keeps
 * the form open with an explicit bilingual toast (fields are already saved,
 * the gallery is not).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MessageSquareText } from "lucide-react";
import {
  Badge,
  Button,
  Tabs,
  useToast,
} from "@/components/dashboard/ui";
import { useDashboardLocale } from "@/lib/dashboard/i18n";
import { useDashboardAuth } from "@/lib/dashboard/auth-store";
import {
  categoryAttributesApi,
  dashboardApi,
  DashboardApiError,
  type Brand,
  type CategoryAttributeDef,
  type CategoryOption,
} from "@/lib/dashboard/api";
import {
  productEditorApi,
  type ProductEditorDetail,
} from "@/lib/dashboard/api-extra";
import { CATALOG_STATUS_TONE, catalogStatusKey, isRawApiMessage } from "../shared";
import {
  EMPTY_FORM,
  FIELD_TAB,
  buildPatch,
  detailToForm,
  formSnapshot,
  imagesToWritePayload,
  validateForm,
  type EditorForm,
  type EditorTabKey,
  type FieldErrors,
} from "./form";
import { useGuardedNavigate, useUnsavedGuard } from "../../useUnsavedGuard";
import { BasicTab, PricingTab, InventoryTab, ContentTab, SeoTab, ShippingTab, AdvancedTab } from "./tabs";
import { SpecsTab } from "./SpecsTab";
import { ImagesTab } from "./ImagesTab";
import { VariantsTab, type VariantsTabHandle } from "./VariantsTab";
import { CommentsDrawer } from "./CommentsDrawer";
import s from "./editor.module.css";

const TAB_KEYS: EditorTabKey[] = [
  "basic",
  "pricing",
  "inventory",
  "specs",
  "variants",
  "images",
  "content",
  "seo",
  "shipping",
  "advanced",
];

const TAB_LABEL_KEY = {
  basic: "editor.tabBasic",
  pricing: "editor.tabPricing",
  inventory: "editor.tabInventory",
  specs: "editor.tabSpecs",
  variants: "editor.tabVariants",
  images: "editor.tabImages",
  content: "editor.tabContent",
  seo: "editor.tabSeo",
  shipping: "editor.tabShipping",
  advanced: "editor.tabAdvanced",
} as const;

export function DashboardProductEditorPage() {
  const { t, lang, formatError } = useDashboardLocale();
  const toast = useToast();
  const params = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const role = useDashboardAuth((state) => state.user?.role ?? null);

  const idParam = params.id;
  const routeId = idParam !== undefined ? parseInt(idParam, 10) : null;
  const badId = idParam !== undefined && !Number.isFinite(routeId);
  /** Set when a /new save created the row but the gallery write failed. */
  const [createdId, setCreatedId] = useState<number | null>(null);
  const productId = routeId ?? createdId;
  const isCreate = productId == null;

  const [form, setForm] = useState<EditorForm>(EMPTY_FORM);
  const [detail, setDetail] = useState<ProductEditorDetail | null>(null);
  const [attributes, setAttributes] = useState<CategoryAttributeDef[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(routeId != null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<EditorTabKey>("basic");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState<number | null>(null);
  const [variantsDirty, setVariantsDirty] = useState(false);

  const variantsRef = useRef<VariantsTabHandle>(null);
  const baselineRef = useRef(formSnapshot(EMPTY_FORM));
  const baselineImagesRef = useRef(JSON.stringify(imagesToWritePayload(EMPTY_FORM.images)));

  // VariantsTab persists separately, but its unsaved edits must still arm the
  // navigation guard so they aren't lost silently.
  const dirty = formSnapshot(form) !== baselineRef.current || variantsDirty;
  useUnsavedGuard(dirty);
  const guardedNavigate = useGuardedNavigate(dirty);

  // Locale helpers behind a ref so data-loading callbacks don't re-fire (and
  // clobber in-progress edits) on a language switch.
  const localeRef = useRef({ t, formatError, toast });
  localeRef.current = { t, formatError, toast };

  const setField = useCallback(
    <K extends keyof EditorForm>(key: K, value: EditorForm[K]) =>
      setForm((f) => ({ ...f, [key]: value })),
    [],
  );

  // Categories + brands for the selects.
  useEffect(() => {
    dashboardApi.get<CategoryOption[]>("/api/admin/categories").then(setCategories).catch(() => {});
    dashboardApi.get<Brand[]>("/api/admin/brands").then(setBrands).catch(() => {});
  }, []);

  // Load the product (edit mode).
  const loadDetail = useCallback(async () => {
    if (productId == null || !Number.isFinite(productId)) return;
    setLoading(true);
    setLoadFailed(false);
    setNotFound(false);
    try {
      const p = await productEditorApi.detail(productId);
      setDetail(p);
      setAttributes(p.categoryAttributes ?? []);
      const next = detailToForm(p);
      setForm(next);
      baselineRef.current = formSnapshot(next);
      baselineImagesRef.current = JSON.stringify(imagesToWritePayload(next.images));
    } catch (e) {
      const is404 = e instanceof DashboardApiError && e.status === 404;
      setLoadFailed(true);
      setNotFound(is404);
      localeRef.current.toast.error(
        is404 ? localeRef.current.t("editor.notFound") : localeRef.current.t("editor.loadFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    // Only a route id triggers the initial load — `createdId` (set when a /new
    // save partially failed) must NOT reload and clobber the dirty form.
    if (routeId != null && !badId) void loadDetail();
  }, [routeId, badId, loadDetail]);

  // Refresh the attribute schema when the category changes.
  const categoryIdNum = form.categoryId ? parseInt(form.categoryId, 10) : null;
  useEffect(() => {
    if (categoryIdNum == null) {
      setAttributes([]);
      return;
    }
    if (detail && categoryIdNum === detail.categoryId) {
      setAttributes(detail.categoryAttributes ?? []);
      return;
    }
    let cancelled = false;
    categoryAttributesApi
      .get(categoryIdNum)
      .then((res) => {
        if (!cancelled) setAttributes(res.categoryAttributes ?? []);
      })
      .catch(() => {
        if (!cancelled) setAttributes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryIdNum, detail]);

  const tabErrorCounts = useMemo(() => {
    const counts = new Map<EditorTabKey, number>();
    for (const field of Object.keys(errors)) {
      const tabKey = FIELD_TAB[field];
      if (tabKey) counts.set(tabKey, (counts.get(tabKey) ?? 0) + 1);
    }
    return counts;
  }, [errors]);

  const showApiError = (e: unknown) => {
    if (e instanceof DashboardApiError && isRawApiMessage(e.code)) {
      setServerError(e.code);
      toast.error(e.code);
    } else {
      setServerError(null);
      toast.error(formatError(e));
    }
  };

  const save = async () => {
    setServerError(null);
    const nextErrors = validateForm(form, attributes, t);
    setErrors(nextErrors);
    const errorFields = Object.keys(nextErrors);
    if (errorFields.length > 0) {
      toast.error(t("editor.validationToast"));
      const firstTab = FIELD_TAB[errorFields[0]];
      if (firstTab) setTab(firstTab);
      return;
    }

    const brandIdNum = form.brandId ? parseInt(form.brandId, 10) : null;
    const brandLabel = brandIdNum
      ? brands.find((b) => b.id === brandIdNum)?.nameEn ?? "—"
      : "—";
    const patch = buildPatch(form, attributes, brandLabel);

    // costPrice is manager-only on the API — only send it when it changed.
    const baseline = baselineRef.current ? (JSON.parse(baselineRef.current) as EditorForm) : null;
    if (baseline && baseline.costPrice === form.costPrice) delete patch.costPrice;
    if (role === "CATALOG_EDITOR") delete patch.costPrice;

    const imagesPayload = imagesToWritePayload(form.images);
    const imagesChanged = JSON.stringify(imagesPayload) !== baselineImagesRef.current;

    setSaving(true);
    try {
      let id = productId;
      if (isCreate) {
        const created = await productEditorApi.create({
          categoryId: patch.categoryId!,
          nameEn: patch.nameEn!,
          nameAr: patch.nameAr,
          price: patch.price!,
          published: false,
        });
        id = created.id;
        // Record the new id immediately so any later failure (PATCH or images)
        // reuses this row on retry via the edit path instead of creating a
        // duplicate draft.
        setCreatedId(id);
        // The create endpoint only takes the basics — PATCH the rest. New rows
        // start as DRAFT; only send a status when the user picked another one.
        if (patch.catalogStatus === "DRAFT") delete patch.catalogStatus;
        await productEditorApi.update(id, patch);
      } else {
        if (detail && patch.catalogStatus === detail.catalogStatus) delete patch.catalogStatus;
        await productEditorApi.update(id!, patch);
      }

      if (imagesChanged || (isCreate && imagesPayload.length > 0)) {
        try {
          await productEditorApi.replaceImages(id!, imagesPayload);
        } catch (imgErr) {
          // PATCH succeeded, the gallery write didn't — keep the form open
          // (still dirty) and say exactly what happened.
          toast.error(t("editor.savedImagesFailed"));
          if (imgErr instanceof DashboardApiError && isRawApiMessage(imgErr.code)) {
            setServerError(imgErr.code);
          }
          if (isCreate && id != null) setCreatedId(id);
          return;
        }
      }

      if (routeId == null && id != null) {
        baselineRef.current = formSnapshot(form); // clean — the guard lets this through
        toast.success(t("editor.created"));
        navigate(`/admin/products/${id}`, { replace: true });
        return;
      }

      // One Save persists the whole product, variants included. The tab keeps
      // its own Save too; flushing here is silent so we can surface a single,
      // accurate result. A failed/invalid flush leaves the variant rows dirty
      // (the guard stays armed) while the product fields are already saved.
      const variantResult = variantsRef.current ? await variantsRef.current.flush() : "ok";
      if (variantResult === "invalid") {
        toast.error(t("editor.savedVariantsInvalid"));
      } else if (variantResult === "error") {
        toast.error(t("editor.savedVariantsFailed"));
      } else {
        toast.success(t("editor.saved"));
      }
      await loadDetail();
    } catch (e) {
      showApiError(e);
    } finally {
      setSaving(false);
    }
  };

  if (badId || loadFailed) {
    const isDeadEnd = badId || notFound;
    return (
      <div className={s.page}>
        <Link className={s.backLink} to="/admin/products">
          <ArrowLeft size={14} className={s.dirIcon} aria-hidden />
          {t("editor.backToList")}
        </Link>
        <div className={s.inlineError}>{isDeadEnd ? t("editor.notFound") : t("editor.loadFailed")}</div>
        {!isDeadEnd && (
          <div className={s.headerActions}>
            <Button type="button" onClick={() => void loadDetail()}>
              {t("common.retry")}
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className={s.centerLoader}>
        <div className="dashboard-loader" />
      </div>
    );
  }

  const tabItems = TAB_KEYS.map((key) => ({
    key,
    label: (
      <>
        {t(TAB_LABEL_KEY[key])}
        {tabErrorCounts.get(key) ? <span className={s.tabErrorDot} aria-hidden /> : null}
      </>
    ),
  }));

  const title = isCreate
    ? t("editor.titleNew")
    : lang === "ar"
      ? form.nameAr || form.nameEn || t("editor.titleEdit")
      : form.nameEn || t("editor.titleEdit");

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div className={s.headerInfo}>
          <button
            type="button"
            className={s.backLink}
            onClick={() => guardedNavigate("/admin/products")}
          >
            <ArrowLeft size={14} className={s.dirIcon} aria-hidden />
            {t("editor.backToList")}
          </button>
          <div className={s.titleRow}>
            <h1 className={s.title}>{title}</h1>
            {!isCreate && (
              <Badge tone={CATALOG_STATUS_TONE[form.catalogStatus]}>
                {t(catalogStatusKey(form.catalogStatus))}
              </Badge>
            )}
          </div>
          {!isCreate && detail && (
            <span className={s.subMeta}>
              #{detail.id}
              {detail.sku && detail.sku !== "—" ? ` · SKU ${detail.sku}` : ""}
            </span>
          )}
        </div>
        <div className={s.headerActions}>
          {!isCreate && productId != null && (
            <Button variant="secondary" type="button" onClick={() => setCommentsOpen(true)}>
              <MessageSquareText size={15} aria-hidden />{" "}
              {t("editor.comments")}
              {commentCount != null ? ` (${commentCount})` : ""}
            </Button>
          )}
          <Button type="button" loading={saving} onClick={() => void save()}>
            {t("editor.save")}
          </Button>
        </div>
      </div>

      {serverError && <div className={s.inlineError}>{serverError}</div>}

      <div className={s.tabsCard}>
        <div className={s.tabsBar}>
          <Tabs
            items={tabItems}
            value={tab}
            onChange={(key) => setTab(key as EditorTabKey)}
            ariaLabel={t("editor.titleEdit")}
          />
        </div>
        <div className={s.tabBody}>
          {tab === "basic" && (
            <BasicTab
              form={form}
              set={setField}
              errors={errors}
              categories={categories}
              brands={brands}
            />
          )}
          {tab === "pricing" && (
            <PricingTab
              form={form}
              set={setField}
              errors={errors}
              showCostPrice={role !== "CATALOG_EDITOR"}
            />
          )}
          {tab === "inventory" && <InventoryTab form={form} set={setField} errors={errors} />}
          {tab === "specs" && (
            <SpecsTab form={form} set={setField} errors={errors} attributes={attributes} />
          )}
          {tab === "variants" && (
            <VariantsTab ref={variantsRef} productId={productId} onDirtyChange={setVariantsDirty} />
          )}
          {tab === "images" && (
            <ImagesTab
              images={form.images}
              onChange={(next) => setField("images", next)}
              onError={(message) => toast.error(message)}
            />
          )}
          {tab === "content" && <ContentTab form={form} set={setField} errors={errors} />}
          {tab === "seo" && <SeoTab form={form} set={setField} errors={errors} />}
          {tab === "shipping" && <ShippingTab form={form} set={setField} errors={errors} />}
          {tab === "advanced" && (
            <AdvancedTab
              form={form}
              set={setField}
              errors={errors}
              categories={categories}
              baselineStatus={detail?.catalogStatus ?? "DRAFT"}
              role={role}
              reviewNotes={detail?.reviewNotes ?? null}
            />
          )}
        </div>
      </div>

      {!isCreate && productId != null && (
        <CommentsDrawer
          productId={productId}
          open={commentsOpen}
          onClose={() => setCommentsOpen(false)}
          onCountChange={setCommentCount}
        />
      )}
    </div>
  );
}

export default DashboardProductEditorPage;
