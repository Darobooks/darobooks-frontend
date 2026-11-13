import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "Group view | DaroBooks",
  description: "See revenue, profit, and cash across your companies.",
  robots: { index: false, follow: false },
};

export default function GroupViewPage() {
  return <Dashboard initialView="group-view" />;
}
