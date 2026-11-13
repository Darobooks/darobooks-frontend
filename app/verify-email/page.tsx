import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import logo from "@/app/logo-2.png";
import VerifyEmailForm from "./VerifyEmailForm";

export const metadata: Metadata = {
  title: "Verify your email | DaroBooks",
  description: "Verify the email address for your DaroBooks account.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function VerifyEmailPage() {
  return (
    <main className="min-h-screen bg-white font-jakarta text-[#111827]">
      <div className="grid min-h-screen lg:grid-cols-[36%_64%]">
        <aside
          className="relative flex min-h-[440px] flex-col overflow-hidden bg-[#f1f6ff] px-6 py-8 sm:px-10 lg:min-h-screen lg:px-12"
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
              One quick check that this email is really yours.
            </h1>
            <p className="mt-5 font-sora text-[14px] leading-[1.7] text-slate-600 sm:text-[15px]">
              We verify your email before anything else, so that password
              resets and security alerts reach the right person.
            </p>
            <ul className="mt-6 space-y-4 font-sora text-[13px] leading-[1.5] text-slate-700">
              <TrustPoint>
                The code works once and expires in 10 minutes
              </TrustPoint>
              <TrustPoint>
                Reset links and sign-in alerts go to this address
              </TrustPoint>
              <TrustPoint>
                You can change your email in Settings, with a fresh check
              </TrustPoint>
            </ul>
          </div>

          <p className="font-sora text-[10px] text-slate-500">
            DaroBooks by Daroware Technologies Limited
          </p>
        </aside>

        <section className="flex min-h-[600px] items-center justify-center px-6 py-12 sm:px-10 lg:min-h-screen">
          <Suspense fallback={<div className="w-full max-w-[420px]" />}>
            <VerifyEmailForm />
          </Suspense>
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
