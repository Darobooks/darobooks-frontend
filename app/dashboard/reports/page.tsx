import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "Reports | DaroBooks",
  description: "Review live financial reports for your workspace.",
  robots: { index: false, follow: false },
};

export default function ReportsPage() {
  return <Dashboard initialView="reports" />;
}
