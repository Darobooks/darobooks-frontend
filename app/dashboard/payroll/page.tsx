import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "Payroll | DaroBooks",
  description: "Review payroll totals, deductions and employee pay.",
  robots: { index: false, follow: false },
};

export default function PayrollPage() {
  return <Dashboard initialView="payroll" />;
}