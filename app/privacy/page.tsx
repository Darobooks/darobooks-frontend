import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | DaroBooks",
  description:
    "Learn what personal information DaroBooks collects, why it is used, and how you can exercise your privacy choices.",
  alternates: {
    canonical: "https://darobooks.com/privacy",
  },
};

const privacySections = [
  {
    title: "Who we are",
    paragraphs: [
      'DaroBooks is an accounting service provided by Daroware Technologies Limited ("Daroware", "we", "us" or "our"). This Privacy Policy explains how we handle personal information when you visit our website, create or use a DaroBooks account, or contact our support team.',
      "If you use DaroBooks on behalf of a business, that business may also decide why certain information about its staff, customers or suppliers is entered into the service. In those cases, the business is responsible for that information and we process it to provide the service under its instructions.",
    ],
  },
  {
    title: "What we collect",
    paragraphs: ["Depending on how you use DaroBooks, we may collect:"],
    bullets: [
      "Account details such as your name, email address, password hash, and the date you accepted the terms.",
      "Your date of birth during signup to verify the minimum age requirement. We use it for that check and do not store it.",
      "Your optional product-email preference, including the date an unsubscribe request is confirmed.",
      "Security and authentication information, including email verification details, encrypted authenticator secrets, failed sign-in counts, hashed session tokens, and hashed recovery or password-reset tokens.",
      "Business and accounting information that you or your organisation choose to enter into DaroBooks, including details about customers, suppliers, transactions, invoices, employees and records.",
      "Messages and information you provide when you contact us for support.",
      "Technical information that our hosting or security systems may record to operate and protect the website, such as request timestamps, browser or device details, and network identifiers.",
      "Your cookie preference choice. See our Cookie Policy for details about essential and optional cookies.",
    ],
  },
  {
    title: "How we use information",
    paragraphs: [
      "We use information to create and administer accounts, provide accounting features, verify email addresses, authenticate users, protect accounts, respond to support requests, send important service and security notices, and maintain or improve DaroBooks.",
      "We may also use information to prevent fraud and abuse, enforce our terms, resolve disputes, meet legal obligations, and protect the rights and safety of our users and our business.",
    ],
  },
  {
    title: "Legal grounds for processing",
    paragraphs: [
      "Where data protection law requires a legal ground, we process information as needed to provide a service you or your organisation requested, meet legal obligations, pursue legitimate interests such as maintaining security and improving the service, or with your consent where consent is required. You can withdraw consent for future processing where consent is the applicable ground.",
    ],
  },
  {
    title: "When we share information",
    paragraphs: [
      "We do not sell personal information. We share it only as needed to operate DaroBooks, follow your instructions, or meet legal requirements. This may include service providers that support our hosting, database, email delivery, security, customer support or payment operations. These providers may process information on our behalf under appropriate arrangements.",
      "We may also disclose information if required by law or valid legal process, to protect people or the service from harm or fraud, or in connection with a business reorganisation, subject to applicable law.",
    ],
  },
  {
    title: "International transfers",
    paragraphs: [
      "Daroware and its service providers may process information in countries other than the country where you live. Where required by applicable law, we use appropriate safeguards for cross-border transfers and take reasonable steps to protect information in those locations.",
    ],
  },
  {
    title: "How long we keep information",
    paragraphs: [
      "We keep information for as long as needed to provide the service, maintain account security, meet legal and accounting obligations, resolve disputes, and enforce agreements. Retention periods vary by type of information and the reason it was collected.",
      "If an account is closed, we will delete or de-identify information when it is no longer needed, unless we are required or permitted by law to keep it. Backups and security records may remain for a limited period as part of routine system operations.",
    ],
  },
  {
    title: "How we protect information",
    paragraphs: [
      "We use technical and organisational measures designed to protect information against unauthorised access, loss, alteration or disclosure. For example, account passwords are stored as password hashes, authenticator secrets are encrypted, and reset and session tokens are stored as hashes.",
      "No online service can guarantee absolute security. You can help protect your account by using a unique password, keeping your authenticator and recovery codes private, and contacting us promptly if you suspect unauthorised access.",
    ],
  },
  {
    title: "Cookies and similar technologies",
    paragraphs: [
      "We use essential technologies needed for core site functions and to remember your cookie preference. Our consent banner lets you accept all cookies, reject optional cookies, or choose preferences. Optional analytics and advertising integrations are not currently active in this application. For more information, read our Cookie Policy.",
    ],
  },
  {
    title: "Your privacy choices and rights",
    paragraphs: [
      "Depending on where you live, you may have rights to request access to, correction or deletion of personal information, object to or restrict certain processing, receive a portable copy, or withdraw consent. Some rights have exceptions, and we may need to verify your identity before responding.",
      "You can opt out of optional product emails from the Email Preferences page. We will continue to send account verification, security, billing, and invoice messages needed to provide the service.",
      "To make a request, contact us using the details below. If DaroBooks processes information on behalf of your organisation, please direct requests about that information to your organisation first. You may also have the right to complain to your local data protection authority.",
    ],
  },
  {
    title: "Children",
    paragraphs: [
      "DaroBooks is a business accounting service and is not intended for children. We do not knowingly collect personal information directly from children in connection with an individual account. If you believe a child has provided information to us, contact us so we can review and take appropriate steps.",
    ],
  },
  {
    title: "Changes and contact",
    paragraphs: [
      "We may update this Privacy Policy as DaroBooks or applicable law changes. We will post the current version here and update the date below. Where required, we will notify you of material changes.",
      "This policy was last updated on 25 October 2026. For privacy questions or requests, contact Daroware Technologies Limited at support@darobooks.com.",
    ],
  },
];

const legalNavItems = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy", isCurrent: true },
  { label: "Cookie Policy", href: "/cookie-policy" },
  { label: "Security", href: "/security" },
  { label: "Acceptable Use Policy", href: "/acceptable-use-policy" },
  { label: "Refund and Cancellation", href: "/refund-and-cancellation" },
  {
    label: "Data Processing Agreement",
    href: "/data-processing-agreement",
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white font-jakarta text-[#08172e]">
      <header className="border-b border-[#dce6f5] bg-gradient-to-b from-[#f1f6ff] to-white">
        <div className="mx-auto max-w-[1180px] px-6 py-10 sm:py-14 lg:px-0">
          <p className="font-sora text-[11px] font-bold uppercase tracking-[1.4px] text-[#0b7a75]">
            Legal
          </p>
          <h1 className="mt-2 font-jakarta text-[32px] font-extrabold tracking-[-0.8px] sm:text-[42px]">
            Privacy Policy
          </h1>
          <p className="mt-2 max-w-[650px] font-sora text-[14px] leading-6 text-slate-600">
            What we collect, why, and the choices you have.
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
          {privacySections.map((section, index) => (
            <section
              key={section.title}
              id={section.title
                .toLowerCase()
                .replaceAll(" ", "-")
                .replaceAll("&", "and")}
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
