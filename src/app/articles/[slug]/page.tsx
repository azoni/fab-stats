import type { Metadata } from "next";
import { ArticleDetailClient } from "@/components/articles/ArticleDetailClient";

export async function generateStaticParams() {
  return [{ slug: "_" }];
}

export const metadata: Metadata = {
  title: "Article | FaB Stats",
  description: "Read and discuss Flesh and Blood articles on FaB Stats.",
};

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const resolvedParams = await Promise.resolve(params);
  return <ArticleDetailClient initialSlug={resolvedParams.slug} />;
}
