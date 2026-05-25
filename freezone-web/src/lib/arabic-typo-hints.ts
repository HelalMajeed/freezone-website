/** Common Arabic typos → suggested correction (warn only, do not block). */
export const ARABIC_TYPO_FIXES: { from: string; to: string }[] = [
  { from: "الالعاب", to: "الألعاب" },
  { from: "الاسلامي", to: "الإسلامي" },
  { from: "الالكترونيات", to: "الإلكترونيات" },
  { from: "الادوات", to: "الأدوات" },
  { from: "الاحذية", to: "الأحذية" },
  { from: "الاطفال", to: "الأطفال" },
  { from: "الالعاب", to: "الألعاب" },
  { from: "الانارة", to: "الإنارة" },
  { from: "الانترنت", to: "الإنترنت" },
  { from: "الاواني", to: "الأواني" },
  { from: "الابواب", to: "الأبواب" },
  { from: "الاثاث", to: "الأثاث" },
  { from: "الاجهزة", to: "الأجهزة" },
  { from: "الاحذيه", to: "الأحذية" },
  { from: "الاكسسوارات", to: "الإكسسوارات" },
  { from: "الالمنيوم", to: "الألمنيوم" },
  { from: "الامن", to: "الأمن" },
  { from: "الانجليزية", to: "الإنجليزية" },
  { from: "الايفون", to: "الآيفون" },
  { from: "الايباد", to: "الآيباد" },
  { from: "موبايلات", to: "موبايلات" },
  { from: "تلفون", to: "تلفون" },
];

export function findArabicTypoHints(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  const hints: string[] = [];
  for (const { from, to } of ARABIC_TYPO_FIXES) {
    if (t.includes(from)) hints.push(`هل تقصد «${to}» بدلاً من «${from}»؟`);
  }
  return hints;
}
