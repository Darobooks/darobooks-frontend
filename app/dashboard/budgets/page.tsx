import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "Budgets | DaroBooks",
  description: "Plan budgets and compare them with actual workspace activity.",
  robots: { index: false, follow: false },
};

export default function BudgetsPage() {
  return <Dashboard initialView="budgets" />;
}
