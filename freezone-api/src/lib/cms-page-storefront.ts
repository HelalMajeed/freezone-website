import { prisma, isDatabaseConfigured, isDbConnectionError } from "./prisma";

export type StorefrontCmsSection = {
  id: number;
  type: string;
  payload: unknown;
};

type SectionRow = {
  id: number;
  type: string;
  publishedPayload: unknown | null;
};

/**
 * Published homepage sections — null means use legacy hardcoded layout.
 */
export async function getPublishedHomeSections(): Promise<StorefrontCmsSection[] | null> {
  if (!isDatabaseConfigured()) return null;
  try {
    const page = await prisma.cmsPage.findUnique({
      where: { slug: "home" },
      include: {
        sections: {
          where: { visible: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    if (!page?.sections.length) return null;
    const sections = page.sections as SectionRow[];
    const published = sections.filter((s) => s.publishedPayload != null);
    if (!published.length) return null;
    return published.map((s: SectionRow) => ({
      id: s.id,
      type: s.type,
      payload: s.publishedPayload as unknown,
    }));
  } catch (e) {
    if (!isDbConnectionError(e)) console.error("[getPublishedHomeSections]", e);
    return null;
  }
}
