import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "Projects | DaroBooks",
  description: "Track project time, billable work, and profitability.",
  robots: { index: false, follow: false },
};

export default function ProjectsPage() {
  return <Dashboard initialView="projects" />;
}
