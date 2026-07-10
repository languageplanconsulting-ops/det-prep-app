import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Mitr } from "next/font/google";
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
import { DailyQueueBanner } from "@/components/practice/DailyQueueBanner";
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

// Rounded display face for the Duolingo-style daily-practice calendar/runner
// (headings only — body text stays on Inter). "Mitr" (lit. "friend") is a genuinely
// rounded, Thai-native Google Font — the earlier "Baloo Thai 2" name from a design
// preview doesn't exist in the Google Fonts catalog (Baloo has no Thai-script variant).
const mitr = Mitr({
  variable: "--font-baloo",
  weight: ["500", "600", "700"],
  subsets: ["thai", "latin"],
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
        className={`${inter.variable} ${jetbrains.variable} ${mitr.variable} min-h-screen font-sans text-neutral-900 antialiased`}
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
          <DailyQueueBanner />
          <PageTransition>{children}</PageTransition>
        </EffectiveTierProvider>
      </body>
    </html>
  );
}
