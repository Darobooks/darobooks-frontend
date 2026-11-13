import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "Roles | DaroBooks",
  description: "Manage dashboard role permissions.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardRolesPage() {
  return <Dashboard initialView="roles-admin" />;
}
