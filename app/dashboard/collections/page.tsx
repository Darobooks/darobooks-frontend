import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "Collections | DaroBooks",
  description: "Review invoice payments and recurring invoices.",
  robots: { index: false, follow: false },
};

export default function CollectionsPage() {
  return <Dashboard initialView="collections" />;
}
