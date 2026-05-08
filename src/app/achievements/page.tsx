import type { Metadata } from "next";
import { AchievementsClient } from "./AchievementsClient";

export const metadata: Metadata = {
  title: "Achievements",
  description:
    "Track your FaB Stats achievement progress — match milestones, hero mastery, daily games, kudos, and community badges.",
};

export default function AchievementsPage() {
  return <AchievementsClient />;
}
