"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { draftToStorefrontValue, type AdminCmsDraft } from "@/lib/admin-draft-to-storefront";
import type { LocaleCode } from "@/lib/layout-cms";
import { uploadAdminImage, uploadAdminSiteLogo } from "@/lib/admin-upload-image";
import { freezoneApiUrl } from "@/lib/api-internal";
import { parseStoredNavItems, type StoredNavItem } from "@/lib/cms-types";

type DbBlock = "static_only" | "no_database_url" | null;

export type AdminCmsDraftContextValue = {
  draft: AdminCmsDraft | null;
  setDraft: React.Dispatch<React.SetStateAction<AdminCmsDraft | null>>;
  navItems: StoredNavItem[];
  setNavItems: React.Dispatch<React.SetStateAction<StoredNavItem[]>>;
  previewLocale: LocaleCode;
  setPreviewLocale: (v: LocaleCode) => void;
  previewValue: ReturnType<typeof draftToStorefrontValue> | null;
  load: () => Promise<void>;
  save: () => Promise<void>;
  msg: string;
  msgIsError: boolean;
  setMsg: (s: string) => void;
  setMsgIsError: (b: boolean) => void;
  loading: boolean;
  offlineMode: boolean;
  dbUnreachable: boolean;
  dbBlockReason: DbBlock;
  uploadLogo: (file: File) => Promise<void>;
  uploadSpotlightImage: (index: number, file: File) => Promise<void>;
  uploadPromoBannerImage: (index: number, file: File) => Promise<void>;
  uploadHeroSlideImage: (slideIndex: number, file: File) => Promise<void>;
  logout: () => Promise<void>;
};

const AdminCmsDraftContext = createContext<AdminCmsDraftContextValue | null>(null);

export function AdminCmsDraftProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<AdminCmsDraft | null>(null);
  const [navItems, setNavItems] = useState<StoredNavItem[]>([]);
  const [previewLocale, setPreviewLocale] = useState<LocaleCode>("en");
  const [msg, setMsg] = useState("");
  const [msgIsError, setMsgIsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [dbUnreachable, setDbUnreachable] = useState(false);
  const [dbBlockReason, setDbBlockReason] = useState<DbBlock>(null);

  const load = useCallback(async () => {
    const res = await fetch(freezoneApiUrl("/api/admin/cms"), { credentials: "include" });
    if (res.status === 401) {
      navigate("/admin/login", { replace: true });
      return;
    }
    if (!res.ok) {
      let hint = "تحقق من تسجيل الدخول أو من سجلات الخادم.";
      try {
        const err = (await res.json()) as { code?: string; hint?: string; error?: string };
        const errText = String(err.error ?? "");
        if (res.status === 503 && (err.code === "NO_DATABASE" || errText.includes("DATABASE_URL"))) {
          hint =
            "أضف DATABASE_URL في .env ثم نفّذ npx prisma db push و npx prisma db seed، وأعد تشغيل الخادم.";
        } else if (res.status === 500 && (errText.includes("SiteConfig") || errText.includes("seed"))) {
          hint = "قاعدة البيانات غير مهيأة بالكامل — نفّذ npx prisma db push ثم npx prisma db seed.";
        } else if (res.status === 500 && errText.includes("DB")) {
          hint =
            "فشل الاتصال بقاعدة البيانات — تحقق من DATABASE_URL وأن الخادم يصل إلى PostgreSQL، ثم أعد المحاولة.";
        } else if (err.hint) {
          hint = err.hint;
        }
      } catch {
        /* keep */
      }
      setMsg(`تعذر التحميل — ${hint}`);
      setMsgIsError(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setOfflineMode(data.mode === "offline");
    setDbUnreachable(Boolean(data.dbUnavailable));
    const br = (data as { dbBlockReason?: string }).dbBlockReason;
    setDbBlockReason(data.mode === "offline" && (br === "static_only" || br === "no_database_url") ? br : null);
    setMsg("");
    setMsgIsError(false);
    const sc = data.siteConfig as AdminCmsDraft["siteConfig"];
    const d: AdminCmsDraft = {
      siteConfig: {
        ...sc,
        maintenanceMode: Boolean(sc.maintenanceMode),
        promoBarEnabled: sc.promoBarEnabled !== false,
      },
      socialLinks: data.socialLinks ?? [],
      trustBarItems: data.trustBarItems ?? [],
      homeSpotlights: data.homeSpotlights ?? [],
      heroSlides: data.heroSlides ?? [],
      showroomMedia: data.showroomMedia ?? [],
      promoBanners: data.promoBanners ?? [],
    };
    setDraft(d);
    const parsedNav = parseStoredNavItems(data.siteConfig?.navItemsJson);
    setNavItems(parsedNav ?? []);
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const previewValue = useMemo(() => {
    if (!draft) return null;
    const navItemsJson: unknown = navItems.length ? navItems : null;
    const merged: AdminCmsDraft = {
      ...draft,
      siteConfig: { ...draft.siteConfig, navItemsJson },
      heroSlides: draft.heroSlides,
    };
    return draftToStorefrontValue(merged, previewLocale);
  }, [draft, navItems, previewLocale]);

  const save = useCallback(async () => {
    if (!draft) return;
    setMsg("");
    setMsgIsError(false);
    const navItemsJson: unknown = navItems.length ? navItems : null;
    const body: AdminCmsDraft = {
      ...draft,
      siteConfig: { ...draft.siteConfig, navItemsJson },
      heroSlides: draft.heroSlides,
    };
    const res = await fetch(freezoneApiUrl("/api/admin/cms"), {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { code?: string; hint?: string; error?: string };
      setMsgIsError(true);
      if (j.code === "NO_DATABASE") {
        setMsg(
          "لا يمكن الحفظ بدون قاعدة بيانات. نفّذ من جذر المشروع: npm run env:init ثم npm run db:local ثم أعد تشغيل npm run dev",
        );
      } else {
        setMsg(j.hint || j.error || "فشل الحفظ");
      }
      return;
    }
    setMsg("تم الحفظ");
    setMsgIsError(false);
    load();
  }, [draft, navItems, load]);

  async function uploadLogo(file: File) {
    try {
      const url = await uploadAdminSiteLogo(file);
      setDraft((d) => (d ? { ...d, siteConfig: { ...d.siteConfig, logoUrl: url } } : d));
      setMsg("");
      setMsgIsError(false);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "فشل رفع الشعار");
      setMsgIsError(true);
    }
  }

  async function uploadSpotlightImage(index: number, file: File) {
    try {
      const url = await uploadAdminImage(file);
      setDraft((d) => {
        if (!d) return d;
        const next = [...d.homeSpotlights];
        const cur = next[index];
        if (!cur) return d;
        next[index] = { ...cur, imageUrl: url };
        return { ...d, homeSpotlights: next };
      });
      setMsg("");
      setMsgIsError(false);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "فشل رفع الصورة");
      setMsgIsError(true);
    }
  }

  async function uploadPromoBannerImage(index: number, file: File) {
    try {
      const url = await uploadAdminImage(file);
      setDraft((d) => {
        if (!d) return d;
        const next = [...d.promoBanners];
        const cur = next[index];
        if (!cur) return d;
        next[index] = { ...cur, imageUrl: url };
        return { ...d, promoBanners: next };
      });
      setMsg("");
      setMsgIsError(false);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "فشل رفع صورة البانر");
      setMsgIsError(true);
    }
  }

  async function uploadHeroSlideImage(slideIndex: number, file: File) {
    if (!draft) return;
    const slides = draft.heroSlides;
    if (!slides[slideIndex]) {
      setMsg("لا توجد شريحة في هذا الموضع.");
      setMsgIsError(true);
      return;
    }
    try {
      const url = await uploadAdminImage(file);
      const next = [...slides];
      next[slideIndex] = { ...next[slideIndex], imageUrl: url };
      setDraft({ ...draft, heroSlides: next });
      setMsg("تم تحديث صورة الشريحة — اضغط «حفظ التغييرات» لحفظها على الخادم.");
      setMsgIsError(false);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "فشل الرفع");
      setMsgIsError(true);
    }
  }

  async function logout() {
    await fetch(freezoneApiUrl("/api/admin/logout"), { method: "POST", credentials: "include" });
    navigate("/admin/login", { replace: true });
  }

  const value: AdminCmsDraftContextValue = {
    draft,
    setDraft,
    navItems,
    setNavItems,
    previewLocale,
    setPreviewLocale,
    previewValue,
    load,
    save,
    msg,
    msgIsError,
    setMsg,
    setMsgIsError,
    loading,
    offlineMode,
    dbUnreachable,
    dbBlockReason,
    uploadLogo,
    uploadSpotlightImage,
    uploadPromoBannerImage,
    uploadHeroSlideImage,
    logout,
  };

  return <AdminCmsDraftContext.Provider value={value}>{children}</AdminCmsDraftContext.Provider>;
}

export function useAdminCmsDraft(): AdminCmsDraftContextValue {
  const v = useContext(AdminCmsDraftContext);
  if (!v) throw new Error("useAdminCmsDraft must be used within AdminCmsDraftProvider");
  return v;
}
