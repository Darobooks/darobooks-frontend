import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "Tax centre | DaroBooks",
  description: "Review tax calculations and filing obligations.",
  robots: { index: false, follow: false },
};

export default function TaxCenterPage() {
  return <Dashboard initialView="tax-center" />;
}
