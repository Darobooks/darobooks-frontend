import type { Metadata } from "next";
import Dashboard from "../../Dashboard";

export const metadata: Metadata = {
  title: "New invoice | DaroBooks",
  description: "Create and send a customer invoice.",
  robots: { index: false, follow: false },
};

export default function NewInvoicePage() {
  return <Dashboard initialView="invoice-new" />;
}
