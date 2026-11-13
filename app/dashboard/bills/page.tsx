import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "Bills and expenses | DaroBooks",
  description: "Create, approve and pay supplier bills.",
  robots: { index: false, follow: false },
};

export default function BillsPage() {
  return <Dashboard initialView="bills" />;
}
