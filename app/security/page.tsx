import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security | DaroBooks",
  description:
    "Learn about the account security protections built into DaroBooks and how to report a security concern.",
  alternates: {
    canonical: "https://darobooks.com/security",
  },
};

const securitySections = [
  {
    title: "Our approach",
    paragraphs: [
      "Accounting records are sensitive. We design DaroBooks so that account access is protected, authentication secrets are not stored as plain text, and important account actions can be limited to authorised users.",
      "Security is an ongoing responsibility. We work to improve our safeguards as the service develops, and we encourage customers to protect their own devices, credentials and records too.",
    ],
  },
  {
    title: "Protecting access",
    paragraphs: [
      "DaroBooks accounts use email and password sign-in. Email verification helps confirm account ownership, and two-step verification is set up for accounts. After repeated missed sign-in attempts, the sign-in flow asks for an authenticator code. Repeated incorrect attempts can temporarily pause sign-in.",
      "Authenticator secrets are encrypted before they are stored. Recovery codes are designed for one-time use, and their stored values are hashed. Keep your authenticator and recovery codes private and store recovery codes somewhere safe.",
    ],
  },
  {
    title: "Passwords and sessions",
    paragraphs: [
      "Passwords are stored as scrypt hashes rather than readable passwords. Password reset links are single-use, expire after 30 minutes, and are stored as hashes. Changing a password revokes existing application sessions and triggers a password-change email notice.",
      "Session tokens are generated with cryptographic randomness; the backend stores a hash of each token rather than the token itself. Sign out of shared devices and contact support if you suspect someone else has accessed your account.",
    ],
  },
  {
    title: "Your records",
    paragraphs: [
      "Access to accounting information should be limited to people who need it. Use the workspace access and role settings available in your account, and review who can view or change your organisation's records.",
      "You are responsible for the accuracy and lawful use of information you enter. Keep your own copies of important records and avoid sending passwords, authenticator codes or recovery codes through email or chat.",
    ],
  },
  {
    title: "Reporting a security concern",
    paragraphs: [
      "If you discover a suspected vulnerability, unauthorised access or other security issue affecting DaroBooks, please email support@darobooks.com with “Security” in the subject line. Include enough detail for us to understand and reproduce the issue, but do not include real customer records, passwords, authenticator codes or other sensitive data.",
      "Please give us a reasonable opportunity to investigate and address a report before sharing technical details publicly. We will acknowledge reports and follow up as we assess the issue.",
    ],
  },
  {
    title: "What to do if your account may be at risk",
    paragraphs: [
      "Change your password from a trusted device, secure your email account, and check that your authenticator and recovery codes are still under your control. Contact support promptly if you cannot regain access or believe your records were accessed without permission.",
    ],
  },
];

const legalNavItems = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Cookie Policy", href: "/cookie-policy" },
  { label: "Security", href: "/security", isCurrent: true },
  { label: "Acceptable Use Policy", href: "/acceptable-use-policy" },
  { label: "Refund and Cancellation", href: "/refund-and-cancellation" },
  {
    label: "Data Processing Agreement",
    href: "/data-processing-agreement",
  },
];

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-white font-jakarta text-[#08172e]">
      <header className="border-b border-[#dce6f5] bg-gradient-to-b from-[#f1f6ff] to-white">
        <div className="mx-auto max-w-[1180px] px-6 py-10 sm:py-14 lg:px-0">
          <p className="font-sora text-[11px] font-bold uppercase tracking-[1.4px] text-[#0b7a75]">
            Legal
          </p>
          <h1 className="mt-2 font-jakarta text-[32px] font-extrabold tracking-[-0.8px] sm:text-[42px]">
            Security
          </h1>
          <p className="mt-2 max-w-[650px] font-sora text-[14px] leading-6 text-slate-600">
            How we protect your accounts and your books.
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
          {securitySections.map((section, index) => (
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
