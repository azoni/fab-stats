import type { Metadata } from "next";
import SupportPageContent from "./SupportPageContent";

export const metadata: Metadata = {
  title: "Support FaB Stats",
  description:
    "Help keep FaB Stats running — sponsor, donate, or shop through our affiliate links.",
};

export default function SupportPage() {
  return <SupportPageContent />;
}
