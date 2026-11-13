import type { Metadata } from "next";
import Dashboard from "../Dashboard";

export const metadata: Metadata = {
  title: "Team roles | DaroBooks",
  robots: { index: false, follow: false },
};

export default function TeamRolesPage() {
  return <Dashboard initialView="team-roles-admin" />;
}
