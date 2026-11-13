import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = { title: "Knowledge base management | DaroBooks" };
export default function KnowledgeBaseAdminPage() {
  return <Dashboard initialView="knowledge-base-admin" />;
}
