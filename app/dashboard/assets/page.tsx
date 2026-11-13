import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "Assets | DaroBooks",
  description: "Track fixed assets and depreciation.",
  robots: { index: false, follow: false },
};

export default function AssetsPage() {
  return <Dashboard initialView="assets" />;
}
