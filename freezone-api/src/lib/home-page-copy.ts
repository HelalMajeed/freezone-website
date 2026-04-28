/** Parsed from SiteConfig.homePageCopyJson — optional homepage text overrides (EN/AR). */

export type HomeFaqItemCopy = {
  qEn: string;
  qAr: string;
  aEn: string;
  aAr: string;
};

export type HomePageCopy = {
  discoverEyebrowEn?: string;
  discoverEyebrowAr?: string;
  discoverTitleEn?: string;
  discoverTitleAr?: string;
  newArrivalsTitleEn?: string;
  newArrivalsTitleAr?: string;
  showroomTitleEn?: string;
  showroomTitleAr?: string;
  showroomDescEn?: string;
  showroomDescAr?: string;
  faqTitleEn?: string;
  faqTitleAr?: string;
  faqDescEn?: string;
  faqDescAr?: string;
  faqContactBtnEn?: string;
  faqContactBtnAr?: string;
  faqItems?: HomeFaqItemCopy[];
};

export function parseHomePageCopy(raw: unknown): HomePageCopy | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const str = (k: string) => (typeof o[k] === "string" ? (o[k] as string) : undefined);
  let faqItems: HomeFaqItemCopy[] | undefined;
  if (Array.isArray(o.faqItems)) {
    faqItems = [];
    for (const row of o.faqItems) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      faqItems.push({
        qEn: String(r.qEn ?? ""),
        qAr: String(r.qAr ?? ""),
        aEn: String(r.aEn ?? ""),
        aAr: String(r.aAr ?? ""),
      });
    }
    if (faqItems.length === 0) faqItems = undefined;
  }
  const hasAny =
    str("discoverEyebrowEn") ||
    str("discoverEyebrowAr") ||
    str("discoverTitleEn") ||
    str("discoverTitleAr") ||
    str("newArrivalsTitleEn") ||
    str("newArrivalsTitleAr") ||
    str("showroomTitleEn") ||
    str("showroomTitleAr") ||
    str("showroomDescEn") ||
    str("showroomDescAr") ||
    str("faqTitleEn") ||
    str("faqTitleAr") ||
    str("faqDescEn") ||
    str("faqDescAr") ||
    str("faqContactBtnEn") ||
    str("faqContactBtnAr") ||
    (faqItems && faqItems.length > 0);
  if (!hasAny) return null;
  return {
    discoverEyebrowEn: str("discoverEyebrowEn"),
    discoverEyebrowAr: str("discoverEyebrowAr"),
    discoverTitleEn: str("discoverTitleEn"),
    discoverTitleAr: str("discoverTitleAr"),
    newArrivalsTitleEn: str("newArrivalsTitleEn"),
    newArrivalsTitleAr: str("newArrivalsTitleAr"),
    showroomTitleEn: str("showroomTitleEn"),
    showroomTitleAr: str("showroomTitleAr"),
    showroomDescEn: str("showroomDescEn"),
    showroomDescAr: str("showroomDescAr"),
    faqTitleEn: str("faqTitleEn"),
    faqTitleAr: str("faqTitleAr"),
    faqDescEn: str("faqDescEn"),
    faqDescAr: str("faqDescAr"),
    faqContactBtnEn: str("faqContactBtnEn"),
    faqContactBtnAr: str("faqContactBtnAr"),
    faqItems,
  };
}
