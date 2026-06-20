import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { LoginWelcomeModalGate } from "@/components/auth/LoginWelcomeModalGate";
import { RevampAnnouncementModal } from "@/components/announcements/RevampAnnouncementModal";
import { AdminSoftSkin } from "@/components/admin/AdminSoftSkin";
import { ActivityTracker } from "@/components/analytics/ActivityTracker";
import { PreviewBanner } from "@/components/admin/PreviewBanner";
import { ContentBankHydrator } from "@/components/content/ContentBankHydrator";
import { MainNav } from "@/components/layout/MainNav";
import { NavigationProgress } from "@/components/layout/NavigationProgress";
import { PageTransition } from "@/components/layout/PageTransition";
import { PlanExpiryNotice } from "@/components/billing/PlanExpiryNotice";
import { BugReportWidget } from "@/components/support/BugReportWidget";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { VipApiCreditNotebookNotice } from "@/components/vip/VipApiCreditNotebookNotice";
import { EffectiveTierProvider } from "@/hooks/useEffectiveTier";
import { buildDefaultMetadata } from "@/lib/site-metadata";
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

export const metadata: Metadata = buildDefaultMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body
        className={`${inter.variable} ${jetbrains.variable} min-h-screen font-sans text-neutral-900 antialiased`}
      >
        <NavigationProgress />
        <EffectiveTierProvider>
          <ActivityTracker />
          <AdminSoftSkin />
          <ContentBankHydrator />
          <PreviewBanner />
          <MainNav />
          <LoginWelcomeModalGate />
          <RevampAnnouncementModal />
          <VipApiCreditNotebookNotice />
          <PlanExpiryNotice />
          <BugReportWidget />
          <SoundToggle />
          <PageTransition>{children}</PageTransition>
        </EffectiveTierProvider>
      </body>
    </html>
  );
}
