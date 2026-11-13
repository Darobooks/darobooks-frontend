import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | DaroBooks",
  description:
    "Read the terms that apply when you use DaroBooks accounting software and services.",
  alternates: {
    canonical: "https://darobooks.com/terms",
  },
};

const termsSections = [
  {
    id: "about-these-terms",
    title: "About these terms",
    paragraphs: [
      'These terms are an agreement between you and Daroware Technologies Limited ("Daroware", "we", "us" or "our") when you access or use DaroBooks and related services. By creating an account or using the service, you agree to these terms. If you use DaroBooks for an organisation, you confirm that you are authorised to accept these terms for it.',
      "If you do not agree to these terms, do not create an account or use DaroBooks. Additional terms may apply to particular plans or features; where they conflict with these terms, the additional terms apply only to that plan or feature.",
      "You must be at least 18 years old to create an individual DaroBooks account. During signup, we check your date of birth for eligibility and do not store it.",
    ],
  },
  {
    id: "your-account",
    title: "Your account",
    paragraphs: [
      "You must provide accurate account information and keep it up to date. You are responsible for protecting your sign-in details, keeping access to your registered email address and authenticator, and activity carried out through your account.",
      "Tell us promptly if you suspect unauthorised access. Do not share an individual account in a way that bypasses your organisation's access controls. You are responsible for ensuring that people you invite to your workspace are authorised and have appropriate permissions.",
    ],
  },
  {
    id: "service-scope",
    title: "What DaroBooks does and does not do",
    paragraphs: [
      "DaroBooks provides bookkeeping, invoicing, record-keeping and related business tools. Features and country-specific settings may vary, and we may update or improve the service over time.",
      "DaroBooks is a software tool, not your accountant, auditor, lawyer or tax authority. Calculations, reports and tax information are provided to help you manage your records; they are not professional advice and do not guarantee that a filing or transaction meets your legal obligations. You remain responsible for reviewing your records, choosing the correct settings and obtaining qualified advice where needed.",
    ],
  },
  {
    id: "plans-and-payment",
    title: "Plans, fees and payment",
    paragraphs: [
      "Plan features and prices are shown on our pricing page or at checkout. The plan, billing interval, applicable taxes and payment terms presented when you subscribe form part of your purchase.",
      "You authorise the applicable payment provider to charge the payment method you provide for fees due. If a payment fails, we may ask you to update your payment details or restrict paid features until the balance is settled, subject to applicable law and any additional plan terms.",
      "You can manage or cancel a paid plan using the account options made available to you or by contacting support. Cancellation and refund eligibility are subject to the terms shown at purchase and applicable law.",
    ],
  },
  {
    id: "your-data",
    title: "Your data",
    paragraphs: [
      "You retain your rights to the business and personal information you submit to DaroBooks. You give us permission to host, process, transmit and use that information only as reasonably needed to provide, secure and support the service, comply with law, and carry out your instructions.",
      "You are responsible for having the rights and permissions needed to upload and use the information you provide, and for checking that it is accurate. Our Privacy Policy explains how we handle personal information. If you use DaroBooks to process personal data for others, you must also comply with the data protection obligations that apply to you.",
      "Keep your own copies of important records. If you close your account, access to your workspace may end; download or otherwise retain records you need before closure. We may retain or delete information as described in our Privacy Policy and as required by law.",
    ],
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    paragraphs: [
      "You must use DaroBooks lawfully and only for its intended business purposes. You must not:",
    ],
    bullets: [
      "Use the service to commit fraud, break the law or infringe another person's rights.",
      "Upload malicious code, interfere with the service or attempt to access accounts, systems or data without permission.",
      "Misuse, copy, resell or make the service available to others except as permitted by your plan or by us in writing.",
      "Use the service in a way that could impair its security, availability or use by other customers.",
    ],
  },
  {
    id: "availability-and-support",
    title: "Availability and support",
    paragraphs: [
      "We work to keep DaroBooks available and secure, but we do not promise uninterrupted or error-free service. We may temporarily suspend or change parts of the service for maintenance, security, legal or operational reasons.",
      "Support is available through the channels shown on our website or in the product. Any response times or service levels apply only if we have separately agreed to them in writing.",
    ],
  },
  {
    id: "ending-your-account",
    title: "Ending your account",
    paragraphs: [
      "You may stop using DaroBooks and close your account using the available account settings or by contacting support. We may suspend or end access if you materially breach these terms, create a security or legal risk, or if we are required to do so by law. Where practical and lawful, we will give you notice and an opportunity to address the issue.",
      "When access ends, your right to use the service stops. Terms that by their nature should continue, including provisions about data, payment obligations, disclaimers and liability, will continue to apply. Ending an account does not remove fees already due.",
    ],
  },
  {
    id: "our-responsibility",
    title: "Our responsibility",
    paragraphs: [
      "We provide DaroBooks with reasonable care, but the service is provided on an as-available basis. To the extent permitted by law, we are not responsible for indirect or consequential loss, lost profits, or losses arising from information you entered incorrectly, your failure to keep appropriate records, or your reliance on software output as professional advice.",
      "Nothing in these terms excludes or limits liability that cannot lawfully be excluded or limited, including any mandatory consumer rights that apply to you. Where the law permits a limit, our liability is limited to the direct loss reasonably foreseeable from the circumstances.",
    ],
  },
  {
    id: "changes-to-these-terms",
    title: "Changes to these terms",
    paragraphs: [
      "We may update these terms to reflect changes to DaroBooks, our business or applicable law. We will post the updated terms and revise the date on this page. If a change materially affects your rights, we will take reasonable steps to notify you in advance. If you continue using the service after the updated terms take effect, the updated terms apply. If you do not agree, you must stop using DaroBooks.",
    ],
  },
  {
    id: "governing-law",
    title: "Governing law and contact",
    paragraphs: [
      "These terms are governed by the laws of the Federal Republic of Nigeria, without limiting any mandatory consumer protections that apply where you live. Subject to those protections, the courts of Nigeria have jurisdiction over disputes relating to these terms or DaroBooks.",
      "Questions about these terms? Contact Daroware Technologies Limited at support@darobooks.com.",
    ],
  },
];

const legalNavItems = [
  { label: "Terms of Service", href: "/terms", isCurrent: true },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Cookie Policy", href: "/cookie-policy" },
  { label: "Security", href: "/security" },
  { label: "Acceptable Use Policy", href: "/acceptable-use-policy" },
  { label: "Refund and Cancellation", href: "/refund-and-cancellation" },
  { label: "Data Processing Agreement", href: "/data-processing-agreement" },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white font-jakarta text-[#08172e]">
      <header className="border-b border-[#dce6f5] bg-gradient-to-b from-[#f1f6ff] to-white">
        <div className="mx-auto max-w-[1180px] px-6 py-10 sm:py-14 lg:px-0">
          <p className="font-sora text-[11px] font-bold uppercase tracking-[1.4px] text-[#0b7a75]">
            Legal
          </p>
          <h1 className="mt-2 font-jakarta text-[32px] font-extrabold tracking-[-0.8px] sm:text-[42px]">
            Terms of Service
          </h1>
          <p className="mt-2 max-w-[650px] font-sora text-[14px] leading-6 text-slate-600">
            The rules for using DaroBooks, in plain language.
          </p>
          <p className="mt-2 font-sora text-[11px] text-slate-500">
            Last updated: 25 October 2026
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1180px] gap-8 px-6 py-8 sm:py-10 lg:grid-cols-[185px_minmax(0,1fr)] lg:gap-12 lg:px-0">
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
          {termsSections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
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
