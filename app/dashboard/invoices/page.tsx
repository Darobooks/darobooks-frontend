import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "Invoices | DaroBooks",
  description: "Create and manage customer invoices.",
  robots: { index: false, follow: false },
};

export default function InvoicesPage() {
  return <Dashboard initialView="invoices" />;
}
