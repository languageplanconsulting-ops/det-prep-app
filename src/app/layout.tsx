import type { Metadata } from "next";
import { Inter, JetBrains_Mono, IBM_Plex_Sans_Thai } from "next/font/google";
import { LoginWelcomeModalGate } from "@/components/auth/LoginWelcomeModalGate";
import { JulyAnnouncementModal } from "@/components/announcements/JulyAnnouncementModal";
import { WeeklyLimitRemovedModal } from "@/components/announcements/WeeklyLimitRemovedModal";
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

// Brand Thai/display face. IBM Plex Sans Thai is the font used consistently across all of
// English Plan's design work (landing previews, brand mockups) and pairs with the IBM
// Plex / JetBrains Mono logo aesthetic. It replaces the earlier rounded "Mitr" display
// face, which read as off-brand. Used both for headings (`font-display`, bold weights) and
// as the Thai glyph fallback for body text (Inter carries Latin, this carries Thai).
const ibmPlexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plexthai",
  weight: ["400", "500", "600", "700"],
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
        className={`${inter.variable} ${jetbrains.variable} ${ibmPlexThai.variable} min-h-screen font-sans text-neutral-900 antialiased`}
      >
        <NavigationProgress />
        <EffectiveTierProvider>
          <ActivityTracker />
          <AdminSoftSkin />
          <ContentBankHydrator />
          <PreviewBanner />
          <MainNav />
          <LoginWelcomeModalGate />
          <JulyAnnouncementModal />
          <WeeklyLimitRemovedModal />
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
