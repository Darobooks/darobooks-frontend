import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "Website settings | DaroBooks",
  description: "Review DaroBooks payment gateway and email configuration.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardWebsiteSettingsPage() {
  return <Dashboard initialView="website-settings" />;
}
