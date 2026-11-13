import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "Partner payouts | DaroBooks",
  description: "Review partner earnings and payout statements.",
  robots: { index: false, follow: false },
};

export default function PayoutsPage() {
  return <Dashboard initialView="payouts" />;
}
