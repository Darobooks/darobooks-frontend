import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "Users | DaroBooks",
  description: "Manage users and role-based access.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardUsersPage() {
  return <Dashboard initialView="users-admin" />;
}
