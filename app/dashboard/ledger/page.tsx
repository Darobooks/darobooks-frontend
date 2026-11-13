import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "Ledger | DaroBooks",
  description: "Review the chart of accounts, journals, and period close.",
  robots: { index: false, follow: false },
};

export default function LedgerPage() {
  return <Dashboard initialView="ledger" />;
}
