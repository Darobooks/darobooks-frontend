import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "Assist | DaroBooks",
  description: "Review helpful suggestions for your DaroBooks workspace.",
  robots: { index: false, follow: false },
};

export default function AssistPage() {
  return <Dashboard initialView="assist" />;
}
