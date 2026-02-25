import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { AuthProvider } from "@/contexts/AuthContext";
import { LayoutShell } from "@/components/auth/LayoutShell";
import { GuestBanner } from "@/components/auth/GuestBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FaB Stats - Flesh and Blood Player Tracker",
  description: "Track your Flesh and Blood TCG match stats, win rates, and performance trends",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <Navbar />
          <main className="min-h-screen pb-20 md:pb-8 pt-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
              <GuestBanner />
              <LayoutShell>{children}</LayoutShell>
            </div>
          </main>
          <MobileNav />
        </AuthProvider>
      </body>
    </html>
  );
}
