import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "Clients | DaroBooks",
  description: "Review registered DaroBooks client accounts.",
  robots: { index: false, follow: false },
};

export default function DashboardClientsPage() {
  return <Dashboard initialView="clients-admin" />;
}
