import type { Metadata } from "next";
import { ArticlesIndexClient } from "@/components/articles/ArticlesIndexClient";

export const metadata: Metadata = {
  title: "Articles | FaB Stats",
  description: "Read community-written Flesh and Blood articles, filter by author or hero, and share the good ones.",
};

export default function ArticlesPage() {
  return <ArticlesIndexClient />;
}
