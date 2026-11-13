import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import logo from "@/app/logo-2.png";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Choose a new password | DaroBooks",
  description: "Securely choose a new password for your DaroBooks account.",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
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
              Protect your account with a new password.
            </h1>
            <p className="mt-5 font-sora text-[14px] leading-[1.7] text-slate-600 sm:text-[15px]">
              Your reset link can only be used once. Your authenticator and
              recovery codes remain in place.
            </p>
          </div>
        </aside>
        <section className="flex min-h-[600px] items-center justify-center px-6 py-12 sm:px-10 lg:min-h-screen">
          <ResetPasswordForm />
        </section>
      </div>
    </main>
  );
}
