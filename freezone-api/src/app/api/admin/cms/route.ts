import { prisma, isDatabaseConfigured, getDatabaseBlockReason } from "@/lib/prisma";
import { DEFAULT_TOP_BAR_SOCIAL_COLOR } from "@/lib/site-public";
import { isAdminAuthenticatedFromRequest } from "@/lib/admin-session";
import type { AdminCmsDraft } from "@/lib/admin-draft-to-storefront";
import { getOfflineCmsPayload, getOfflineCmsPayloadDbUnreachable } from "@/lib/admin-offline-cms";
import { Prisma } from "@prisma/client";
import { revalidateStorefrontData } from "@/lib/revalidate-storefront";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";

function jsonSaveError(e: unknown): Response {
  const msg = e instanceof Error ? e.message : String(e);
  const prismaCode = typeof e === "object" && e !== null && "code" in e ? String((e as { code?: string }).code) : "";
  const missingColumn =
    prismaCode === "P2022" ||
    /does not exist|Unknown column|Unknown argument/i.test(msg) ||
    (/topBar/i.test(msg) && /column|field/i.test(msg));

  return Response.json(
    {
      error: "Save failed",
      code: missingColumn ? "SCHEMA_DRIFT" : "CMS_SAVE_FAILED",
      hint: missingColumn
        ? "قاعدة البيانات لا تزال بدون أعمدة الشريط العلوي الجديدة. من مجلد freezone-api نفّذ: npx prisma db push ثم npx prisma generate وأعد تشغيل خادم الـ API (المنفذ 4000)."
        : msg.length <= 400
          ? msg
          : `${msg.slice(0, 400)}…`,
    },
    { status: 500 },
  );
}

export async function GET(req: Request) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({
      ...getOfflineCmsPayload(),
      dbBlockReason: getDatabaseBlockReason(),
    });
  }

  try {
    const [siteConfig, socialLinks, trustBarItems, homeSpotlights, heroSlides, showroomMedia, promoBanners] =
      await Promise.all([
        prisma.siteConfig.findUnique({ where: { id: 1 } }),
        prisma.socialLink.findMany({ orderBy: { sortOrder: "asc" } }),
        prisma.trustBarItem.findMany({ orderBy: { sortOrder: "asc" } }),
        prisma.homeSpotlightItem.findMany({ orderBy: { sortOrder: "asc" } }),
        prisma.heroSlide.findMany({ orderBy: { sortOrder: "asc" } }),
        prisma.showroomMedia.findMany({ orderBy: { sortOrder: "asc" } }),
        prisma.promoBanner.findMany({ orderBy: { sortOrder: "asc" } }),
      ]);

    if (!siteConfig) {
      return Response.json({ error: "SiteConfig missing — run prisma db seed" }, { status: 500 });
    }

    return Response.json({
      siteConfig,
      socialLinks,
      trustBarItems,
      homeSpotlights,
      heroSlides,
      showroomMedia,
      promoBanners,
    });
  } catch (e) {
    console.error("[admin/cms GET] DB unreachable, serving offline draft:", e);
    return Response.json(getOfflineCmsPayloadDbUnreachable());
  }
}

export async function PUT(req: Request) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json(
      {
        error: "DATABASE_URL not set",
        code: "NO_DATABASE",
        hint: "Add DATABASE_URL to .env, then run: npx prisma db push && npx prisma db seed",
      },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as AdminCmsDraft | null;
  if (!body?.siteConfig) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const s = body.siteConfig;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.siteConfig.update({
        where: { id: 1 },
        data: {
          storeNameEn: s.storeNameEn,
          storeNameAr: s.storeNameAr,
          taglineEn: s.taglineEn,
          taglineAr: s.taglineAr,
          logoUrl: s.logoUrl,
          headerLogoHeightPx: Math.min(160, Math.max(20, s.headerLogoHeightPx ?? 48)),
          phone: s.phone,
          email: s.email,
          addressEn: s.addressEn,
          addressAr: s.addressAr,
          whatsapp: s.whatsapp,
          zainCashWallet: s.zainCashWallet,
          qiCardMerchantId: s.qiCardMerchantId,
          freeDeliveryThreshold: s.freeDeliveryThreshold,
          standardShippingFee: s.standardShippingFee,
          promoBarTextEn: s.promoBarTextEn,
          promoBarTextAr: s.promoBarTextAr,
          promoBarEnabled: s.promoBarEnabled,
          topBarBgColor: s.topBarBgColor ?? "#0a0e1a",
          topBarContactColor: s.topBarContactColor ?? "rgba(255,255,255,0.65)",
          topBarPhoneLabelEn: s.topBarPhoneLabelEn ?? "",
          topBarPhoneLabelAr: s.topBarPhoneLabelAr ?? "",
          topBarWhatsappLabelEn: s.topBarWhatsappLabelEn ?? "WhatsApp",
          topBarWhatsappLabelAr: s.topBarWhatsappLabelAr ?? "واتساب",
          topBarPhoneIconKey: s.topBarPhoneIconKey ?? "phone",
          topBarWhatsappIconKey: s.topBarWhatsappIconKey ?? "message-circle",
          topBarPromoIconKey: s.topBarPromoIconKey ?? "zap",
          topBarPromoColor: s.topBarPromoColor ?? "#10b981",
          topBarPromoHref: s.topBarPromoHref?.trim() || null,
          topBarPhoneHref: s.topBarPhoneHref?.trim() || null,
          topBarWhatsappHref: s.topBarWhatsappHref?.trim() || null,
          topBarSocialEnabled: s.topBarSocialEnabled !== false,
          topBarSocialIconSizePx: Math.min(
            36,
            Math.max(12, Math.round(Number(s.topBarSocialIconSizePx ?? 20))),
          ),
          topBarSocialGapPx: Math.min(32, Math.max(4, Math.round(Number(s.topBarSocialGapPx ?? 14)))),
          topBarSocialColor: (s.topBarSocialColor?.trim() || DEFAULT_TOP_BAR_SOCIAL_COLOR).slice(0, 64),
          maintenanceMode: s.maintenanceMode,
          heroAutoplayMs: s.heroAutoplayMs ?? 7000,
          heroScrimOpacityPct: Math.min(
            100,
            Math.max(0, Math.round(Number(s.heroScrimOpacityPct ?? 25))),
          ),
          heroNavArrowColor: (s.heroNavArrowColor?.trim() || "#ffffff").slice(0, 32),
          heroNavArrowOpacityPct: Math.min(
            100,
            Math.max(0, Math.round(Number(s.heroNavArrowOpacityPct ?? 80))),
          ),
          heroNavBoxColor: (s.heroNavBoxColor?.trim() || "#ffffff").slice(0, 32),
          heroNavBoxOpacityPct: Math.min(
            100,
            Math.max(0, Math.round(Number(s.heroNavBoxOpacityPct ?? 8))),
          ),
          trustBarBgColor: (s.trustBarBgColor?.trim() || "#030712").slice(0, 32),
          trustBarBgOpacityPct: Math.min(
            100,
            Math.max(0, Math.round(Number(s.trustBarBgOpacityPct ?? 100))),
          ),
          trustBarTextColor: (s.trustBarTextColor?.trim() || "#f8fafc").slice(0, 64),
          trustBarIconColor: (s.trustBarIconColor?.trim() ?? "").slice(0, 64),
          navItemsJson:
            s.navItemsJson === null
              ? Prisma.JsonNull
              : s.navItemsJson === undefined
                ? undefined
                : (s.navItemsJson as Prisma.InputJsonValue),
          metaTitleEn: s.metaTitleEn,
          metaTitleAr: s.metaTitleAr,
          metaDescriptionEn: s.metaDescriptionEn,
          metaDescriptionAr: s.metaDescriptionAr,
          seoKeywords: s.seoKeywords,
          homePageCopyJson:
            s.homePageCopyJson === null
              ? Prisma.JsonNull
              : s.homePageCopyJson === undefined
                ? undefined
                : (s.homePageCopyJson as Prisma.InputJsonValue),
        },
      });

      await tx.socialLink.deleteMany();
      if (body.socialLinks?.length) {
        await tx.socialLink.createMany({
          data: body.socialLinks.map((l, i) => ({
            platform: l.platform,
            url: l.url,
            sortOrder: l.sortOrder ?? i,
            showInTopBar: l.showInTopBar !== false,
          })),
        });
      }

      await tx.trustBarItem.deleteMany();
      if (body.trustBarItems?.length) {
        await tx.trustBarItem.createMany({
          data: body.trustBarItems.map((t, i) => ({
            textEn: t.textEn,
            textAr: t.textAr,
            iconKey: t.iconKey || "truck",
            sortOrder: t.sortOrder ?? i,
          })),
        });
      }

      await tx.homeSpotlightItem.deleteMany();
      if (body.homeSpotlights?.length) {
        await tx.homeSpotlightItem.createMany({
          data: body.homeSpotlights.map((p, i) => ({
            labelEn: p.labelEn,
            labelAr: p.labelAr,
            href: p.href,
            imageUrl: p.imageUrl,
            iconKey: p.iconKey,
            sortOrder: p.sortOrder ?? i,
            active: p.active,
          })),
        });
      }

      await tx.heroSlide.deleteMany();
      if (body.heroSlides?.length) {
        for (let i = 0; i < body.heroSlides.length; i++) {
          const h = body.heroSlides[i];
          await tx.heroSlide.create({
            data: {
              sortOrder: i,
              layoutMode: h.layoutMode === "freeform" ? "freeform" : "structured",
              freeformLayers: (h.freeformLayers ?? undefined) as Prisma.InputJsonValue | undefined,
              badgeEn: h.badgeEn,
              badgeAr: h.badgeAr,
              titleLine1En: h.titleLine1En,
              titleLine1Ar: h.titleLine1Ar,
              titleLine2En: h.titleLine2En,
              titleLine2Ar: h.titleLine2Ar,
              descEn: h.descEn,
              descAr: h.descAr,
              imageUrl: h.imageUrl,
              primaryLabelEn: h.primaryLabelEn,
              primaryLabelAr: h.primaryLabelAr,
              primaryHref: h.primaryHref,
              primaryLink:
                (h as { primaryLink?: unknown | null }).primaryLink != null
                  ? ((h as { primaryLink?: unknown }).primaryLink as Prisma.InputJsonValue)
                  : null,
              secondaryLabelEn: h.secondaryLabelEn,
              secondaryLabelAr: h.secondaryLabelAr,
              secondaryHref: h.secondaryHref,
              secondaryLink:
                (h as { secondaryLink?: unknown | null }).secondaryLink != null
                  ? ((h as { secondaryLink?: unknown }).secondaryLink as Prisma.InputJsonValue)
                  : null,
              active: h.active,
              stats: (h.stats ?? undefined) as Prisma.InputJsonValue | undefined,
            },
          });
        }
      }

      await tx.showroomMedia.deleteMany();
      if (body.showroomMedia?.length) {
        await tx.showroomMedia.createMany({
          data: body.showroomMedia.map((s, i) => ({
            kind: s.kind?.trim() || "image",
            url: s.url.trim(),
            titleEn: s.titleEn?.trim() || null,
            titleAr: s.titleAr?.trim() || null,
            sortOrder: typeof s.sortOrder === "number" ? s.sortOrder : i,
          })),
        });
      }

      await tx.promoBanner.deleteMany();
      if (body.promoBanners?.length) {
        await tx.promoBanner.createMany({
          data: body.promoBanners.map((p, i) => ({
            titleEn: p.titleEn?.trim() || "Promo",
            titleAr: p.titleAr?.trim() || p.titleEn?.trim() || "عرض",
            subEn: p.subEn ?? "",
            subAr: p.subAr ?? "",
            imageUrl: p.imageUrl.trim(),
            href: (p.href ?? "/products").trim() || "/products",
            catSlug: p.catSlug?.trim() || null,
            sortOrder: typeof p.sortOrder === "number" ? p.sortOrder : i,
            active: p.active !== false,
          })),
        });
      }
    });

    revalidateStorefrontData();
    await logAdminAction("cms.save", "SiteConfig", { entityId: 1 });
    return Response.json({ ok: true });
  } catch (e) {
    try {
      return handleRouteDbError(e);
    } catch (err) {
      console.error(err);
      return jsonSaveError(err);
    }
  }
}
