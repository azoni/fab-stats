import type { Metadata } from "next";
import SupportPageContent from "./SupportPageContent";

export const metadata: Metadata = {
  title: "Support FaB Stats",
  description: "Join the FaB Stats community, add the Discord bot, follow updates, or support the site directly and through affiliate links.",
};

export default function SupportPage() {
  return <SupportPageContent />;
}
