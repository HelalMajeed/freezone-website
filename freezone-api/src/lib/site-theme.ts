import { prisma, isDatabaseConfigured } from "./prisma";
import { mergeThemeTokens, DEFAULT_THEME, type ThemeTokens } from "./theme-tokens";

export async function getCachedSiteTheme(): Promise<ThemeTokens> {
  if (!isDatabaseConfigured()) {
    return DEFAULT_THEME;
  }
  try {
    const cfg = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: { themeTokens: true },
    });
    return mergeThemeTokens(cfg?.themeTokens);
  } catch {
    return DEFAULT_THEME;
  }
}
