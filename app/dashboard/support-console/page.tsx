import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "Support console | DaroBooks",
  description: "DaroBooks customer-support workspace.",
  robots: { index: false, follow: false },
};

export default function SupportConsolePage() {
  return <Dashboard initialView="support-console" />;
}
