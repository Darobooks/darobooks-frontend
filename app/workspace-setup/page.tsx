import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import logo from "@/app/logo-2.png";
import WorkspaceSetupForm from "./WorkspaceSetupForm";

export const metadata: Metadata = {
  title: "Set up your company | DaroBooks",
  description: "Choose your company name and DaroBooks workspace URL.",
  robots: { index: false, follow: false },
};

export default function WorkspaceSetupPage() {
  return (
    <main className="min-h-screen bg-white font-jakarta text-[#111827]">
      <div className="grid min-h-screen lg:grid-cols-[36%_64%]">
        <aside
          className="relative flex min-h-[360px] flex-col overflow-hidden bg-[#f1f6ff] px-6 py-8 sm:px-10 lg:min-h-screen lg:px-12"
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
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1.5 font-sora text-[10px] font-semibold text-blue-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              One last step
            </span>
            <h1 className="mt-5 font-jakarta text-[32px] font-extrabold leading-[1.12] tracking-[-0.8px] sm:text-[38px]">
              Make this workspace yours.
            </h1>
            <p className="mt-5 font-sora text-[14px] leading-[1.7] text-slate-600 sm:text-[15px]">
              Set the company name your team will see and choose a memorable
              address for your workspace.
            </p>
            <div className="mt-7 rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-sm">
              <p className="font-sora text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Your private workspace
              </p>
              <p className="mt-2 font-sora text-[12px] leading-[1.6] text-slate-700">
                Your URL is unique to your company. You can edit the suggested
                address before continuing.
              </p>
            </div>
          </div>
          <p className="font-sora text-[10px] text-slate-500">
            DaroBooks by Daroware Technologies Limited
          </p>
        </aside>

        <section className="flex min-h-[640px] items-center justify-center px-5 py-12 sm:px-10 lg:min-h-screen">
          <WorkspaceSetupForm />
        </section>
      </div>
    </main>
  );
}
