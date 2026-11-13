import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About DaroBooks",
  description:
    "Learn about DaroBooks, accounting software by Daroware Technologies Limited for businesses operating in any country.",
  alternates: {
    canonical: "https://darobooks.com/about",
  },
};

const principles = [
  {
    title: "Built for any country",
    description:
      "Choose your country and DaroBooks loads its tax names, rates, filing dates and invoice rules. Every business can keep its records in a way that fits where it operates.",
  },
  {
    title: "Accountable by design",
    description:
      "Every change is logged with who made it and when. Permissions can be locked, and every action follows your chain of approvals.",
  },
  {
    title: "Secure from the first minute",
    description:
      "Two-step verification is required on every account, from the moment you sign up through the rest of your work.",
  },
  {
    title: "Honest about limits",
    description:
      "DaroBooks does the bookkeeping and the calculations. Your accountant and your tax authority still have the final say, and we say so plainly.",
  },
];

export default function AboutPage() {
  return (
    <main className="font-jakarta text-[#08172e]">
      <section className="bg-gradient-to-b from-[#f1f6ff] to-[#f7faff]">
        <div className="mx-auto w-full max-w-[1180px] px-6 pb-12 pt-10 sm:pb-14 sm:pt-14 lg:px-0">
          <p className="font-sora text-[11px] font-bold uppercase tracking-[1.4px] text-[#0b7a75]">
            About us
          </p>
          <h1 className="mt-3 max-w-[770px] font-jakarta text-[34px] font-extrabold leading-[1.1] tracking-[-1px] sm:text-[44px]">
            Accounting that works for any business, anywhere.
          </h1>
          <p className="mt-4 max-w-[760px] font-sora text-[14px] leading-[1.7] text-slate-600 sm:text-[15px]">
            DaroBooks is accounting software from Daroware Technologies Limited.
            We build it so that a business can keep honest, tidy books, send
            invoices, pay people and file taxes without needing a different tool
            in every country.
          </p>
        </div>
      </section>

      <section aria-label="What guides DaroBooks">
        <div className="mx-auto grid w-full max-w-[1180px] gap-3 px-6 py-8 sm:grid-cols-2 sm:gap-4 sm:py-10 lg:grid-cols-4 lg:px-0">
          {principles.map((principle) => (
            <article
              key={principle.title}
              className="rounded-2xl border border-[#dce6f5] bg-white p-5 sm:p-6"
            >
              <h2 className="font-jakarta text-[15px] font-bold leading-[1.3] sm:text-[16px]">
                {principle.title}
              </h2>
              <p className="mt-2 font-sora text-[12px] leading-[1.65] text-slate-600">
                {principle.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#f1f6ff]">
        <div className="mx-auto grid w-full max-w-[1180px] gap-8 px-6 py-8 sm:grid-cols-2 sm:gap-12 sm:py-10 lg:px-0">
          <div>
            <h2 className="font-jakarta text-[21px] font-bold">
              Who is behind it
            </h2>
            <p className="mt-2 font-sora text-[12px] leading-[1.7] text-slate-600 sm:text-[13px]">
              Daroware Technologies Limited is a technology company that
              provides ICT infrastructure, software, cloud, security and
              engineering services. DaroBooks is our accounting product. You can
              learn more about the company at{" "}
              <a
                href="https://www.daroware.com"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[#1a4bb8] hover:underline"
              >
                www.daroware.com
              </a>
              .
            </p>
          </div>
          <div>
            <h2 className="font-jakarta text-[21px] font-bold">Talk to us</h2>
            <p className="mt-2 font-sora text-[12px] leading-[1.7] text-slate-600 sm:text-[13px]">
              Email{" "}
              <a
                href="mailto:support@darobooks.com"
                className="font-semibold text-[#1a4bb8] hover:underline"
              >
                support@darobooks.com
              </a>
              , or use the live chat button at the bottom right of any page. Our
              support agent answers first, and a member of our team joins
              whenever you need a person.
            </p>
            <Link
              href="/signup"
              className="mt-4 inline-flex rounded-lg bg-[#1a4bb8] px-4 py-2.5 font-sora text-[12px] font-bold text-white transition hover:bg-blue-800"
            >
              Get started
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
