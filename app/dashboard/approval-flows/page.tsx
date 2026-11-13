import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "Approval flows | DaroBooks",
  description: "Configure ordered team approval workflows.",
  robots: { index: false, follow: false },
};

export default function ApprovalFlowsPage() {
  return <Dashboard initialView="approval-flows" />;
}