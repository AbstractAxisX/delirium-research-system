import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  title: "سامانه ثبت داده‌های پژوهش پزشکی | مطالعه دلیریوم",
  description:
    "سامانه جمع‌آوری داده‌های مطالعه بالینی مقایسه اولانزاپین و هالوپریدول در درمان دلیریوم با استفاده از مقیاس MDAS",
  keywords: [
    "پژوهش پزشکی",
    "دلیریوم",
    "MDAS",
    "اولانزاپین",
    "هالوپریدول",
    "کارآزمایی بالینی",
  ],
  authors: [{ name: "Medical Research Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body
        className={`${vazirmatn.variable} font-sans antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
        <Toaster />
        <SonnerToaster position="top-center" richColors />
      </body>
    </html>
  );
}
