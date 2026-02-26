import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { AuthProvider } from "@/contexts/AuthContext";
import { LayoutShell } from "@/components/auth/LayoutShell";
import { GuestBanner } from "@/components/auth/GuestBanner";
import { FeedbackFab } from "@/components/feedback/FeedbackFab";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://www.fabstats.net";
const SITE_NAME = "FaB Stats";
const SITE_DESCRIPTION =
  "Track your Flesh and Blood TCG match history, win rates, hero matchups, opponent records, and event performance. Import from GEM in one click.";

export const metadata: Metadata = {
  title: {
    default: "FaB Stats - Flesh and Blood Match Tracker",
    template: "%s | FaB Stats",
  },
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "FaB Stats - Flesh and Blood Match Tracker",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "FaB Stats - Track your Flesh and Blood match history",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FaB Stats - Flesh and Blood Match Tracker",
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
  keywords: [
    "Flesh and Blood",
    "FaB",
    "TCG",
    "match tracker",
    "win rate",
    "hero matchups",
    "opponent stats",
    "GEM",
    "tournament",
    "ProQuest",
    "Battle Hardened",
    "Road to Nationals",
    "Classic Constructed",
    "Blitz",
  ],
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: SITE_URL,
  },
  manifest: "/manifest.json",
  other: {
    "theme-color": "#c9a84c",
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <Navbar />
          <main className="min-h-screen pb-20 md:pb-8 pt-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
              <GuestBanner />
              <LayoutShell>{children}</LayoutShell>
            </div>
          </main>
          <footer className="hidden md:block text-center py-4 text-[11px] text-fab-dim space-y-1">
            <p className="text-fab-gold/40">
              Beta — Stats and data may be inaccurate. Always verify with official sources.
            </p>
            <p>
              Built by{" "}
              <a href="https://azoni.ai/" target="_blank" rel="noopener noreferrer" className="text-fab-gold/60 hover:text-fab-gold transition-colors">
                azoni
              </a>
              {" "}&middot;{" "}
              <a href="/terms" className="hover:text-fab-text transition-colors">Terms</a>
              {" "}&middot;{" "}
              <a href="/privacy" className="hover:text-fab-text transition-colors">Privacy</a>
            </p>
            <p>
              Flesh and Blood is a trademark of Legend Story Studios. Not affiliated with or endorsed by LSS.
            </p>
          </footer>
          <FeedbackFab />
          <MobileNav />
        </AuthProvider>
      </body>
    </html>
  );
}
