import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "مترجم لغة الإشارة العربية · Arabic Sign Language Translator",
  description:
    "Interactive demo of an Arabic Sign Language recognizer. Letters and words are recognised live in the browser — no video leaves your device.",
};

export const viewport: Viewport = {
  themeColor: "#fff8ec",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
