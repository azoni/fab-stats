import type { Metadata } from "next";
import SocialPageContent from "./SocialPageContent";

export const metadata: Metadata = {
  title: "Social",
  description: "Join the FaB Stats Discord, add the Discord bot, and follow FaB Stats updates.",
};

export default function SocialPage() {
  return <SocialPageContent />;
}
