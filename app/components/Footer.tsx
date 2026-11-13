import Image from "next/image";
import Link from "next/link";
import logo from "@/app/logo-2.png";
import type { PublicWebsiteInfo } from "./website-info";

const productLinks = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Log in", href: "/login" },
  { label: "Start free", href: "/signup" },
];

const companyLinks = [
  { label: "About us", href: "/about" },
  { label: "Contact us", href: "/contact" },
  { label: "Security", href: "/security" },
];

const legalLinks = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Email preferences", href: "/unsubscribe" },
  { label: "Cookie Policy", href: "/cookie-policy" },
  { label: "Acceptable Use Policy", href: "/acceptable-use-policy" },
  { label: "Refund and Cancellation", href: "/refund-and-cancellation" },
  {
    label: "Data Processing Agreement",
    href: "/data-processing-agreement",
  },
];

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const className =
    "rounded-sm transition hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

  if (href.startsWith("http") || href.startsWith("mailto:")) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export default function Footer({
  websiteInfo,
}: {
  websiteInfo: PublicWebsiteInfo;
}) {
  return (
    <footer className="w-full border-t border-[#dce6f5] bg-[#f1f6ff] font-jakarta text-[#16314e]">
      <div className="mx-auto w-full max-w-[1180px] px-6 pb-5 pt-8 sm:pt-10 lg:px-0">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(100px,0.55fr)_minmax(120px,0.65fr)_minmax(170px,0.9fr)] lg:gap-12">
          <div>
            <Link
              href="/"
              aria-label="DaroBooks home"
              className="inline-flex rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              <Image
                src={websiteInfo.logoUrl ?? logo}
                alt={`${websiteInfo.siteName} logo`}
                width={300}
                height={80}
                unoptimized={Boolean(websiteInfo.logoUrl)}
                className="-ml-2 h-[40px] w-[150px] object-contain"
              />
            </Link>
            <p className="mt-2 max-w-[280px] font-sora text-[12px] leading-[1.6] text-slate-600">
              {websiteInfo.tagline}
            </p>

            <div className="mt-3 font-sora text-[12px] leading-[1.6] text-slate-600">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#16314e]">
                Support
              </h3>
              <a
                href={`mailto:${websiteInfo.supportEmail}`}
                className="mt-1 inline-block transition hover:text-blue-700 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                {websiteInfo.supportEmail}
              </a>
              {websiteInfo.contactEmail && (
                <a
                  href={`mailto:${websiteInfo.contactEmail}`}
                  className="mt-1 block transition hover:text-blue-700"
                >
                  {websiteInfo.contactEmail}
                </a>
              )}
              {websiteInfo.contactPhone && (
                <a
                  href={`tel:${websiteInfo.contactPhone}`}
                  className="mt-1 block transition hover:text-blue-700"
                >
                  {websiteInfo.contactPhone}
                </a>
              )}
              {websiteInfo.contactAddress && (
                <p className="mt-1 max-w-[280px]">
                  {websiteInfo.contactAddress}
                </p>
              )}
              <p className="mt-1 max-w-[280px]">
                Live chat: use the chat button at the bottom right of any page.
              </p>
              {(websiteInfo.facebookUrl ||
                websiteInfo.linkedinUrl ||
                websiteInfo.xUrl) && (
                <div className="mt-2 flex flex-wrap gap-3">
                  {websiteInfo.facebookUrl && (
                    <a
                      href={websiteInfo.facebookUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Facebook
                    </a>
                  )}
                  {websiteInfo.linkedinUrl && (
                    <a
                      href={websiteInfo.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      LinkedIn
                    </a>
                  )}
                  {websiteInfo.xUrl && (
                    <a href={websiteInfo.xUrl} target="_blank" rel="noreferrer">
                      X
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          <FooterLinkList title="Product" links={productLinks} />
          <FooterLinkList title="Company" links={companyLinks} />

          <FooterLinkList title="Legal" links={legalLinks} />
        </div>

        <div className="mt-7 flex flex-col gap-2 border-t border-[#d5e1ee] pt-4 font-sora text-[11px] text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Daroware Technologies Limited. All rights reserved.</p>
          <p>
            {websiteInfo.siteName} is a product of Daroware Technologies
            Limited.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLinkList({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <nav aria-label={title}>
      <h3 className="font-sora text-[11px] font-bold uppercase tracking-[0.12em] text-[#16314e]">
        {title}
      </h3>
      <ul className="mt-2.5 space-y-1.5 font-sora text-[12px] leading-[1.5] text-slate-600">
        {links.map((item) => (
          <li key={item.label}>
            <FooterLink href={item.href}>{item.label}</FooterLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
