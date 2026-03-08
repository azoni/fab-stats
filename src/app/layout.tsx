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
import { FeedbackFab } from "@/components/feedback/FeedbackFab";
import { ChatProvider } from "@/contexts/ChatContext";
import { ChatFab } from "@/components/chat/ChatFab";
import { SonnerProvider } from "@/components/ui/sonner-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

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
            __html: `try{var t=localStorage.getItem('fab-theme');if(t){var m={arcana:'grimoire',ironheart:'grimoire',chromatic:'rosetta'};if(m[t]){t=m[t];localStorage.setItem('fab-theme',t)}document.documentElement.setAttribute('data-theme',t)}}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${nunito.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
        <AuthProvider>
        <ChatProvider>
        <TooltipProvider>
          <Navbar />
          <main className="min-h-screen pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-8 md:pt-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
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
              <a href="https://discord.com/oauth2/authorize?client_id=1478583612537573479&permissions=0&scope=bot+applications.commands" target="_blank" rel="noopener noreferrer" className="hover:text-fab-text transition-colors">Discord Bot</a>
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
          <ChatFab />
          <MobileNav />
          <SonnerProvider />
        </TooltipProvider>
        </ChatProvider>
        </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
