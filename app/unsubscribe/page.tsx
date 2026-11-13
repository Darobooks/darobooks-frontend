import type { Metadata } from "next";
import { Suspense } from "react";
import UnsubscribeForm from "./UnsubscribeForm";

export const metadata: Metadata = {
  title: "Email preferences | DaroBooks",
  description: "Manage optional DaroBooks product email preferences.",
  robots: { index: false, follow: false },
};

export default function UnsubscribePage() {
  return (
    <main className="min-h-screen bg-white px-6 py-14 font-jakarta text-[#08172e] sm:py-20">
      <Suspense fallback={<div className="mx-auto min-h-64 max-w-md" />}>
        <UnsubscribeForm />
      </Suspense>
    </main>
  );
}