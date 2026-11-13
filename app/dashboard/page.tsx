import type { Metadata } from "next";
import Dashboard from "./Dashboard";

export const metadata: Metadata = {
  title: "Dashboard | DaroBooks",
  description: "Your DaroBooks business accounting dashboard.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardPage() {
  return <Dashboard />;
}
