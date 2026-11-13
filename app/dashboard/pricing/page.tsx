import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "Plan pricing | DaroBooks",
  description: "Manage DaroBooks plan pricing.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardPricingPage() {
  return <Dashboard initialView="pricing-admin" />;
}
