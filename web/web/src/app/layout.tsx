import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/cairo";
import "./globals.css";
import { Backdrop } from "@/components/Backdrop";
import { Fx } from "@/components/Fx";
import { I18nProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "مترجم لغة الإشارة العربية · Arabic Sign Language Translator",
  description:
    "ترجمة لغة الإشارة العربية إلى نص وصوت مباشرةً من الكاميرا، داخل المتصفح وبدون رفع أي فيديو. Arabic Sign Language recognition that runs entirely in your browser.",
  openGraph: {
    title: "مترجم لغة الإشارة العربية",
    description: "31 حرفًا و32 كلمة تُعرَف مباشرةً من الكاميرا — داخل المتصفح.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f5f2ff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>
        <Backdrop />
        <Fx />
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
