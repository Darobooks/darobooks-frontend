import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "Requisitions | DaroBooks",
  description: "Create and review team spending requisitions.",
  robots: { index: false, follow: false },
};

export default function RequisitionsPage() {
  return <Dashboard initialView="requisitions" />;
}
