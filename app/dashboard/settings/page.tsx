import type { Metadata } from "next";
import { Suspense } from "react";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "Settings | DaroBooks",
  description: "Manage your DaroBooks account and workspace settings.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  return (
    <Suspense fallback={<Dashboard initialView="settings" />}>
      <DashboardSettingsWithTab searchParams={searchParams} />
    </Suspense>
  );
}

async function DashboardSettingsWithTab({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  return (
    <Dashboard
      initialView="settings"
      initialSettingsTab={
        tab === "billing"
          ? "Plan and billing"
          : tab === "security"
            ? "Security"
            : tab === "e-invoicing"
              ? "e-Invoicing setup"
            : tab === "company-url"
              ? "Company URL"
            : undefined
      }
    />
  );
}
