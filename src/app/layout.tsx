import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { PreviewBanner } from "@/components/admin/PreviewBanner";
import { ContentBankHydrator } from "@/components/content/ContentBankHydrator";
import { MainNav } from "@/components/layout/MainNav";
import { NavigationProgress } from "@/components/layout/NavigationProgress";
import { PageTransition } from "@/components/layout/PageTransition";
import { VipApiCreditNotebookNotice } from "@/components/vip/VipApiCreditNotebookNotice";
import { EffectiveTierProvider } from "@/hooks/useEffectiveTier";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ENGLISH PLAN",
  description: "DET-style English training and practice hub.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrains.variable} min-h-screen font-sans text-neutral-900 antialiased`}
      >
        <NavigationProgress />
        <EffectiveTierProvider>
          <ContentBankHydrator />
          <PreviewBanner />
          <MainNav />
          <VipApiCreditNotebookNotice />
          <PageTransition>{children}</PageTransition>
        </EffectiveTierProvider>
      </body>
    </html>
  );
}
