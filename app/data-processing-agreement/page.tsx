import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Processing Agreement | DaroBooks",
  description:
    "Understand how DaroBooks processes personal data on your behalf when you use the service.",
  alternates: {
    canonical: "https://darobooks.com/data-processing-agreement",
  },
};

const agreementSections = [
  {
    title: "Roles",
    paragraphs: [
      "For the personal data in the records you put into DaroBooks, such as customer, supplier and employee details, you are the controller and Daroware Technologies Limited is your processor. This agreement forms part of our Terms of Service.",
    ],
  },
  {
    title: "What we process and why",
    paragraphs: [
      "We process the data only to provide DaroBooks to you, following your documented instructions, which include your use of the service and these terms. If the law requires us to process it differently, we will tell you first unless the law forbids it.",
    ],
  },
  {
    title: "Confidentiality and security",
    paragraphs: [
      "We limit access to the data to people who need it confidentially. We apply the measures described in our Security page to help keep the appropriate safeguards in place.",
    ],
  },
  {
    title: "Subprocessors",
    paragraphs: [
      "We may use service providers for hosting, email and message delivery, payments, and support where needed to operate the service. We require them to protect the data, restrict access to people who need it, and process it only as needed to provide their services. We remain responsible for their processing under this agreement.",
    ],
  },
  {
    title: "Helping you meet your duties",
    paragraphs: [
      "We will help you respond to requests from people about their data, carry out data protection assessments and handle regulator enquiries, as far as reasonably needed and taking account of how DaroBooks works.",
    ],
  },
  {
    title: "Breaches",
    paragraphs: [
      "We will tell you without undue delay after we become aware of a personal data breach affecting your data, with the information we have to help you meet any reporting deadline.",
    ],
  },
  {
    title: "International transfers",
    paragraphs: [
      "Where we transfer personal data across borders, we use safeguards required by applicable data protection law.",
    ],
  },
  {
    title: "Return and deletion",
    paragraphs: [
      "When your account ends, you can export your data for the period available through the service. After that period, we delete or anonymise it, unless the law requires us to keep it.",
    ],
  },
  {
    title: "Audits",
    paragraphs: [
      "We will give you the information we need to show we follow this agreement, and allow reasonable audits on notice, no more than once a year unless there has been a breach.",
    ],
  },
  {
    title: "Contact",
    paragraphs: ["Questions? Contact support@darobooks.com."],
  },
];

const legalNavItems = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Cookie Policy", href: "/cookie-policy" },
  { label: "Security", href: "/security" },
  { label: "Acceptable Use Policy", href: "/acceptable-use-policy" },
  { label: "Refund and Cancellation", href: "/refund-and-cancellation" },
  {
    label: "Data Processing Agreement",
    href: "/data-processing-agreement",
    isCurrent: true,
  },
];

export default function DataProcessingAgreementPage() {
  return (
    <main className="min-h-screen bg-white font-jakarta text-[#08172e]">
      <header className="border-b border-[#dce6f5] bg-gradient-to-b from-[#f1f6ff] to-white">
        <div className="mx-auto max-w-[1180px] px-6 py-10 sm:py-14 lg:px-0">
          <p className="font-sora text-[11px] font-bold uppercase tracking-[1.4px] text-[#0b7a75]">
            Legal
          </p>
          <h1 className="mt-2 font-jakarta text-[32px] font-extrabold tracking-[-0.8px] sm:text-[42px]">
            Data Processing Agreement
          </h1>
          <p className="mt-2 max-w-[650px] font-sora text-[14px] leading-6 text-slate-600">
            The terms that apply when DaroBooks processes personal data on your
            behalf.
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
          {agreementSections.map((section, index) => (
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
