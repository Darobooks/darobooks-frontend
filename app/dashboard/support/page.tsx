import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = { title: "Support | DaroBooks", description: "Contact support and manage tickets.", robots: { index: false, follow: false } };
export default function SupportPage() { return <Dashboard initialView="support" />; }
