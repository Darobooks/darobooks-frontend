import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund and Cancellation Policy | DaroBooks",
  description:
    "Learn how to cancel a DaroBooks plan and when you may be eligible for a refund.",
  alternates: {
    canonical: "https://darobooks.com/refund-and-cancellation",
  },
};

const policySections = [
  {
    title: "Cancelling",
    paragraphs: [
      "You can cancel at any time from your account settings or by asking support. Monthly plans stop at the end of the month you have paid for. Yearly plans stop at the end of the year you have paid for, and you keep full access until then.",
    ],
  },
  {
    title: "The free plan",
    paragraphs: [
      "The free plan has no charge, so there is nothing to refund. You can close it whenever you like.",
    ],
  },
  {
    title: "Refunds",
    paragraphs: [
      "If you are on a paid plan and are not happy, ask for a refund within 14 days of your first payment, or within 14 days of a yearly renewal, and we will refund that payment in full.",
      "After those 14 days, we do not refund part-used periods. We will refund duplicate payments or charges made in error. If you cancel a plan at any time, any remaining paid time is not refunded.",
      "This policy does not limit any right to a refund or cancellation that the law of your country gives you.",
    ],
  },
  {
    title: "How to ask",
    paragraphs: [
      "Email support@darobooks.com or use live chat with the email address on your account. We will reply within a few working days. Approved refunds go back to the original payment method.",
    ],
  },
  {
    title: "After you cancel",
    paragraphs: [
      "You can export your data after cancelling for a limited period set out in our Privacy Policy. After that, it is deleted or anonymised.",
    ],
  },
];

const legalNavItems = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Cookie Policy", href: "/cookie-policy" },
  { label: "Security", href: "/security" },
  { label: "Acceptable Use Policy", href: "/acceptable-use-policy" },
  {
    label: "Refund and Cancellation",
    href: "/refund-and-cancellation",
    isCurrent: true,
  },
  {
    label: "Data Processing Agreement",
    href: "/data-processing-agreement",
  },
];

export default function RefundAndCancellationPage() {
  return (
    <main className="min-h-screen bg-white font-jakarta text-[#08172e]">
      <header className="border-b border-[#dce6f5] bg-gradient-to-b from-[#f1f6ff] to-white">
        <div className="mx-auto max-w-[1180px] px-6 py-10 sm:py-14 lg:px-0">
          <p className="font-sora text-[11px] font-bold uppercase tracking-[1.4px] text-[#0b7a75]">
            Legal
          </p>
          <h1 className="mt-2 font-jakarta text-[32px] font-extrabold tracking-[-0.8px] sm:text-[42px]">
            Refund and Cancellation Policy
          </h1>
          <p className="mt-2 max-w-[650px] font-sora text-[14px] leading-6 text-slate-600">
            How to cancel, and when you can get your money back.
          </p>
          <p className="mt-2 font-sora text-[11px] text-slate-500">
            Effective from the date of launch. Daroware Technologies Limited.
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1180px] gap-8 px-6 py-8 sm:py-10 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-12 lg:px-0">
        <nav
          aria-label="Legal"
          className="h-fit rounded-xl border border-[#dce6f5] bg-white p-3 lg:sticky lg:top-24"
        >
          <ul className="space-y-1 font-sora text-[13px] leading-[1.5] text-slate-600">
            {legalNavItems.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  aria-current={item.isCurrent ? "page" : undefined}
                  className={`block rounded-lg px-3 py-2 transition ${
                    item.isCurrent
                      ? "bg-[#e8efff] font-bold text-[#1a4bb8]"
                      : "hover:bg-[#f4f7fc] hover:text-[#1a4bb8]"
                  }`}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <article className="min-w-0 divide-y divide-[#e5ebf4]">
          {policySections.map((section, index) => (
            <section
              key={section.title}
              id={section.title.toLowerCase().replaceAll(" ", "-")}
              className="scroll-mt-28 py-5 first:pt-0 last:pb-0"
            >
              <h2 className="font-jakarta text-[17px] font-bold sm:text-[19px]">
                {index + 1}. {section.title}
              </h2>
              <div className="mt-2 space-y-3 font-sora text-[12px] leading-[1.8] text-slate-600 sm:text-[13px]">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </article>
      </div>
    </main>
  );
}
