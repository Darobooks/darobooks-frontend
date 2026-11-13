import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "Notification management | DaroBooks",
  description: "Manage central notification settings and delivery rules.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardNotificationsPage() {
  return <Dashboard initialView="notifications" />;
}
