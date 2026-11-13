import type { Metadata } from "next";
import Dashboard from "../../Dashboard";

export const instant = false;

export const metadata: Metadata = {
  title: "Item details | DaroBooks",
  robots: { index: false, follow: false },
};

export default async function ItemDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Dashboard initialView="items" initialItemId={id} />;
}
