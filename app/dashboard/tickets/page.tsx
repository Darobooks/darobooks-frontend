import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = { title: "Support tickets | DaroBooks", description: "Manage support tickets.", robots: { index: false, follow: false } };
export default function TicketsPage() { return <Dashboard initialView="tickets-admin" />; }
