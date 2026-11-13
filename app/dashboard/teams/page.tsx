import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "Teams | DaroBooks",
  robots: { index: false, follow: false },
};

export default function TeamsPage() {
  return <Dashboard initialView="teams-admin" />;
}
