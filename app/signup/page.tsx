import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import logo from "@/app/logo-2.png";
import SignupForm from "./SignupForm";

export const metadata: Metadata = {
  title: "Create your DaroBooks account",
  description:
    "Create a DaroBooks account to manage your business books, invoices, taxes, and reports.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-white font-jakarta text-[#111827]">
      <div className="grid min-h-screen lg:grid-cols-[36%_64%]">
        <aside
          className="relative flex min-h-[470px] flex-col overflow-hidden bg-[#f1f6ff] px-6 py-8 sm:px-10 lg:min-h-screen lg:px-12"
          style={{
            backgroundImage:
              "radial-gradient(rgba(26,75,184,0.14) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        >
          <Link href="/" aria-label="DaroBooks home" className="w-fit">
            <Image
              src={logo}
              alt="DaroBooks by Daroware"
              width={300}
              height={80}
              className="h-auto w-[165px]"
            />
          </Link>

          <div className="my-auto max-w-[440px] py-14">
            <h1 className="font-jakarta text-[32px] font-extrabold leading-[1.12] tracking-[-0.8px] sm:text-[38px]">
              Books you can trust start with an account that is locked down.
            </h1>
            <p className="mt-5 font-sora text-[14px] leading-[1.7] text-slate-600 sm:text-[15px]">
              Create your account in a few minutes. Two-step verification is
              part of setup, not an afterthought.
            </p>
            <ul className="mt-6 space-y-4 font-sora text-[13px] leading-[1.5] text-slate-700">
              <TrustPoint>
                Two-step verification is required for every account
              </TrustPoint>
              <TrustPoint>
                Recovery codes, so a lost phone never locks you out for good
              </TrustPoint>
              <TrustPoint>
                Sign-in alerts when a new device gets into your books
              </TrustPoint>
            </ul>
          </div>
        </aside>

        <section className="relative flex min-h-[650px] items-center justify-center px-6 py-12 sm:px-10 lg:min-h-screen">
          <Link
            href="/"
            className="absolute right-6 top-6 inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:text-[#1a4bb8] sm:right-10 sm:top-8"
          >
            <span aria-hidden="true">←</span>
            Back
          </Link>
          <SignupForm />
        </section>
      </div>
    </main>
  );
}

function TrustPoint({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="mt-0.5 h-4 w-4 shrink-0 text-[#0b7a75]"
        aria-hidden="true"
      >
        <path
          d="M10 2.5 16 5v4.2c0 3.7-2.5 6.3-6 8.3-3.5-2-6-4.6-6-8.3V5l6-2.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="m7.5 9.8 1.7 1.7 3.5-3.7"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{children}</span>
    </li>
  );
}
