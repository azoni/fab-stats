import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Nunito } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LayoutShell } from "@/components/auth/LayoutShell";
import { GuestBanner } from "@/components/auth/GuestBanner";
import { SiteBanner } from "@/components/layout/SiteBanner";
import { ProfileBackgroundController } from "@/components/layout/ProfileBackgroundController";
import { SupportFab } from "@/components/support/SupportFab";
import { SonnerProvider } from "@/components/ui/sonner-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PageVisitTracker } from "@/components/PageVisitTracker";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { AutoSyncRecompute } from "@/components/AutoSyncRecompute";
import { AprilFoolsProvider, FoolsBanner } from "@/contexts/AprilFoolsContext";
import { FoolsScrambler } from "@/components/april-fools/FoolsScrambler";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#c9a84c",
};

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
        url: "/og-preview.png",
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
    images: ["/og-preview.png"],
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('fab-theme');if(t){var m={arcana:'grimoire',ironheart:'grimoire',chromatic:'rosetta'};if(m[t]){t=m[t];localStorage.setItem('fab-theme',t)}document.documentElement.setAttribute('data-theme',t)}else{document.documentElement.setAttribute('data-theme','rosetta')}}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${nunito.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
        <AuthProvider>
        <AprilFoolsProvider>
        <TooltipProvider>
          <ScrollProgress />
          <p className="hidden">Impact-Site-Verification: 9c661e6e-9cd9-451b-acbf-247741498db4</p>
          <div id="fab-bg-layer" aria-hidden="true" />
          <ProfileBackgroundController />
          <Navbar />
          <main className="min-h-screen pt-[calc(3.5rem+env(safe-area-inset-top))] md:pt-16 pb-8">
            <FoolsBanner />
            <FoolsScrambler />
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 transparent-cards">
              <SiteBanner />
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
              <a href="https://discord.gg/WPP5aqCUHY" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-fab-text transition-colors"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>Discord</a>
              {" "}&middot;{" "}
              <a href="https://x.com/FabStats" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-fab-text transition-colors"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>@FabStats</a>
              {" "}&middot;{" "}
              <a href="/support" className="text-fab-gold/60 hover:text-fab-gold transition-colors">Support</a>
              {" "}&middot;{" "}
              <a href="/terms" className="hover:text-fab-text transition-colors">Terms</a>
              {" "}&middot;{" "}
              <a href="/privacy" className="hover:text-fab-text transition-colors">Privacy</a>
            </p>
            <p>
              Flesh and Blood is a trademark of Legend Story Studios. &copy; Legend Story Studios. Not affiliated with or endorsed by LSS.
            </p>
          </footer>
          <SupportFab />
          <MobileNav />
          <PageVisitTracker />
          <AutoSyncRecompute />
          <SonnerProvider />
        </TooltipProvider>
        </AprilFoolsProvider>
        </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
