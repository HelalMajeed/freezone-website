export type Achievement = {
  id: string;
  minProducts: number;
  titleAr: string;
  descAr: string;
  icon: string;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: "p10", minProducts: 10, titleAr: "بداية قوية", descAr: "10 منتجات", icon: "🌱" },
  { id: "p100", minProducts: 100, titleAr: "محترف", descAr: "100 منتج", icon: "⭐" },
  { id: "p500", minProducts: 500, titleAr: "خبير الكتالوج", descAr: "500 منتج", icon: "🏆" },
];
