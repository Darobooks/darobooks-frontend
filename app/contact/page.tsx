import type { Metadata } from "next";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact Us | DaroBooks",
  description:
    "Get in touch with the DaroBooks team for help with your account, billing, or product questions.",
  alternates: {
    canonical: "https://darobooks.com/contact",
  },
};

const contactOptions = [
  {
    title: "Email support",
    description: "For account, billing, or product questions.",
    value: "support@darobooks.com",
    href: "mailto:support@darobooks.com",
  },
  {
    title: "Live chat",
    description: "Chat with our support team from any page.",
  },
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white font-jakarta text-[#08172e]">
      <section className="border-b border-[#dce6f5] bg-gradient-to-b from-[#f1f6ff] to-white">
        <div className="mx-auto max-w-[1180px] px-6 py-10 sm:py-14 lg:px-0">
          <p className="font-sora text-[11px] font-bold uppercase tracking-[1.4px] text-[#0b7a75]">
            Contact us
          </p>
          <h1 className="mt-2 font-jakarta text-[32px] font-extrabold tracking-[-0.8px] sm:text-[42px]">
            How can we help?
          </h1>
          <p className="mt-2 max-w-[620px] font-sora text-[14px] leading-6 text-slate-600">
            Send our team a message and we’ll get back to you as soon as we can.
          </p>
        </div>
      </section>

      <section aria-label="Contact DaroBooks">
        <div className="mx-auto grid max-w-[1180px] gap-8 px-6 py-8 sm:py-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16 lg:px-0">
          <div>
            <h2 className="font-jakarta text-[21px] font-bold">
              Send us a message
            </h2>
            <p className="mt-2 max-w-[620px] font-sora text-[12px] leading-[1.7] text-slate-600">
              Tell us a little about what you need help with. Please don’t
              include passwords, authenticator codes, or recovery codes.
            </p>
            <ContactForm />
          </div>

          <aside className="h-fit rounded-2xl border border-[#dce6f5] bg-[#f1f6ff] p-5 sm:p-6">
            <h2 className="font-jakarta text-[17px] font-bold">
              Other ways to reach us
            </h2>
            <div className="mt-4 space-y-5">
              {contactOptions.map((option) => (
                <div key={option.title}>
                  <h3 className="font-sora text-[12px] font-bold text-[#16314e]">
                    {option.title}
                  </h3>
                  <p className="mt-1 font-sora text-[11px] leading-[1.6] text-slate-600">
                    {option.description}
                  </p>
                  {option.value && option.href && (
                    <a
                      href={option.href}
                      className="mt-1 inline-block font-sora text-[12px] font-semibold text-[#1a4bb8] hover:underline"
                    >
                      {option.value}
                    </a>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-6 border-t border-[#d5e1ee] pt-4 font-sora text-[11px] leading-[1.6] text-slate-600">
              DaroBooks is a product of Daroware Technologies Limited.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}
