import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "Banking | DaroBooks",
  description: "Reconcile bank statements with DaroBooks records.",
  robots: { index: false, follow: false },
};

export default function BankingPage() {
  return <Dashboard initialView="banking" />;
}
