import type { Metadata } from "next";
import GroupPage from "./GroupPage";

export async function generateStaticParams() {
  return [{ groupname: "_" }];
}

export const metadata: Metadata = {
  title: "Group Profile | FaB Stats",
  description:
    "View this group's combined stats and member roster on FaB Stats.",
  openGraph: {
    title: "Group Profile | FaB Stats",
    description:
      "View this group's combined stats and member roster on FaB Stats.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

export default async function GroupProfilePage() {
  return <GroupPage />;
}
