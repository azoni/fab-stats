import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FaB Trivia — FaB Stats",
  description: "Test your Flesh and Blood knowledge with 5 daily trivia questions.",
};

export default function TriviaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
