import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = { title: "Knowledge base | DaroBooks", description: "DaroBooks product guides.", robots: { index: false, follow: false } };
export default function KnowledgeBasePage() { return <Dashboard initialView="knowledge-base" />; }
