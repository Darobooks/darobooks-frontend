import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "e-Invoicing | DaroBooks",
  description: "Prepare invoices for electronic tax filing.",
  robots: { index: false, follow: false },
};

export default function EInvoicingPage() {
  return <Dashboard initialView="e-invoicing" />;
}
