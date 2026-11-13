import type { Metadata } from "next";
import PricingPlans from "./PricingPlans";
import PricingComparison from "./PricingComparison";
import PricingDetails from "./PricingDetails";

export const metadata: Metadata = {
  title: "DaroBooks Pricing",
  description:
    "Choose a DaroBooks plan for your business. Start free, then upgrade to Starter, Business, or Group as you grow.",
  alternates: {
    canonical: "https://darobooks.com/pricing",
  },
  openGraph: {
    title: "DaroBooks Pricing",
    description:
      "Simple accounting software pricing for businesses, from free to group plans.",
    url: "https://darobooks.com/pricing",
    siteName: "DaroBooks",
    type: "website",
  },
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white font-jakarta text-[#08172e]">
      <section className="bg-gradient-to-b from-[#f1f6ff] to-white">
        <div className="mx-auto w-full max-w-[1180px] px-6 pb-14 pt-10 text-center sm:pb-16 sm:pt-14 lg:px-0">
          <p className="font-sora text-[10px] font-bold uppercase tracking-[1.4px] text-[#0b7a75]">
            Pricing
          </p>
          <h1 className="mx-auto mt-3 max-w-[760px] font-sora text-[30px] font-bold leading-[1.1] tracking-[-0.8px] sm:text-[40px]">
            The lowest-priced paid accounting software we could find
          </h1>
          <p className="mx-auto mt-4 max-w-[650px] text-[12px] leading-[1.7] text-slate-600 sm:text-[14px]">
            Full accounting, bank reconciliation, payroll and approvals from a
            few dollars a month. Start free and upgrade whenever you are ready.
          </p>
          <PricingPlans />
        </div>
      </section>
      <PricingComparison />
      <PricingDetails />
    </main>
  );
}
