import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acceptable Use Policy | DaroBooks",
  description:
    "Learn what you may and may not do when using DaroBooks accounting software and services.",
  alternates: {
    canonical: "https://darobooks.com/acceptable-use-policy",
  },
};

const policySections = [
  {
    title: "The basics",
    paragraphs: [
      "You may use DaroBooks only for lawful business and personal record keeping. You are responsible for what you and the people in your account do.",
    ],
  },
  {
    title: "You must not",
    paragraphs: [
      "You must not use DaroBooks, or allow anyone else to use it, to:",
    ],
    bullets: [
      "Commit or hide fraud, create false or misleading invoices or records, evade tax, launder money, or carry out any other unlawful financial activity.",
      "Enter or store content that is unlawful, infringes someone else's rights, or that you do not have the right to hold or use.",
      "Try to access accounts, systems or data that are not yours, or test our security without our written permission.",
      "Introduce malware or other harmful code, overload, disrupt or interfere with the service, or bypass its security or access controls.",
      "Copy, scrape, reverse engineer, resell, sublicense or make the service available to others except as allowed by your plan or by law.",
      "Send spam, phishing messages, or other unsolicited or deceptive communications using the service.",
      "Threaten, harass or abuse other users, our staff or our support team.",
    ],
  },
  {
    title: "Your responsibilities",
    paragraphs: [
      "Keep your account access secure and give access only to people who are authorised to use your workspace. Make sure your use of DaroBooks and the information you enter comply with applicable laws and any rights or permissions that apply to that information.",
      "You are responsible for reviewing your records and making sure they are accurate. DaroBooks is a record-keeping tool, not a substitute for professional accounting, legal or tax advice.",
    ],
  },
  {
    title: "If you think someone is misusing DaroBooks",
    paragraphs: [
      "If you believe someone is violating this policy or putting an account, data or the service at risk, contact us at support@darobooks.com. Please do not include passwords, authenticator codes, recovery codes or other sensitive information in your report.",
    ],
  },
  {
    title: "What happens if you break these rules",
    paragraphs: [
      "We may investigate suspected violations and take proportionate action, including removing content, limiting features, suspending or closing accounts, and reporting unlawful activity to the appropriate authorities. Where practical and lawful, we will give you notice and an opportunity to respond.",
    ],
  },
  {
    title: "Changes and contact",
    paragraphs: [
      "We may update this policy as DaroBooks or applicable law changes. We will post the current version here and update the date below.",
      "This policy was last updated on 25 October 2026. Questions? Contact Daroware Technologies Limited at support@darobooks.com.",
    ],
  },
];

const legalNavItems = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Cookie Policy", href: "/cookie-policy" },
  { label: "Security", href: "/security" },
  {
    label: "Acceptable Use Policy",
    href: "/acceptable-use-policy",
    isCurrent: true,
  },
  { label: "Refund and Cancellation", href: "/refund-and-cancellation" },
  {
    label: "Data Processing Agreement",
    href: "/data-processing-agreement",
  },
];

export default function AcceptableUsePolicyPage() {
  return (
    <main className="min-h-screen bg-white font-jakarta text-[#08172e]">
      <header className="border-b border-[#dce6f5] bg-gradient-to-b from-[#f1f6ff] to-white">
        <div className="mx-auto max-w-[1180px] px-6 py-10 sm:py-14 lg:px-0">
          <p className="font-sora text-[11px] font-bold uppercase tracking-[1.4px] text-[#0b7a75]">
            Legal
          </p>
          <h1 className="mt-2 font-jakarta text-[32px] font-extrabold tracking-[-0.8px] sm:text-[42px]">
            Acceptable Use Policy
          </h1>
          <p className="mt-2 max-w-[650px] font-sora text-[14px] leading-6 text-slate-600">
            What you may not do with DaroBooks.
          </p>
          <p className="mt-2 font-sora text-[11px] text-slate-500">
            Last updated: 25 October 2026
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
                {section.bullets && (
                  <ul className="list-disc space-y-1.5 pl-5">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ))}
        </article>
      </div>
    </main>
  );
}
