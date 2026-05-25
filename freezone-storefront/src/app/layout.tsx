import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Freezone Iraq",
  description: "متجر إلكترونيات — العراق",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
