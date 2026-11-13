import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "Practice | DaroBooks",
  description: "Manage clients, tasks, and filings from your practice workspace.",
  robots: { index: false, follow: false },
};

export default function PracticePage() {
  return <Dashboard initialView="practice" />;
}
