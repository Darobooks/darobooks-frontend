import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "Items and stock | DaroBooks",
  description: "View product and service items, stock levels and reorder alerts.",
  robots: { index: false, follow: false },
};

export default function ItemsPage() {
  return <Dashboard initialView="items" />;
}
