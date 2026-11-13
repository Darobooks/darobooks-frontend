import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "Contacts | DaroBooks",
  description: "Manage customers and suppliers in your dashboard.",
  robots: { index: false, follow: false },
};

export default function ContactsPage() {
  return <Dashboard initialView="contacts" />;
}
