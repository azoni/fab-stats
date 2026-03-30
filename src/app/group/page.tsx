import type { Metadata } from "next";
import GroupHub from "./GroupHub";

export const metadata: Metadata = {
  title: "Groups | FaB Stats",
  description: "Groups are a casual way to play together. Create a group, join one, or browse public groups on FaB Stats.",
};

export default function GroupHubPage() {
  return <GroupHub />;
}
