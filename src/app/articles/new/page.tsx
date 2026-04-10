import type { Metadata } from "next";
import { ArticleComposerGate } from "@/components/articles/ArticleComposerGate";

export const metadata: Metadata = {
  title: "Write Article | FaB Stats",
  description: "Article composer beta access for FaB Stats publishing.",
};

export default function NewArticlePage() {
  return <ArticleComposerGate />;
}
