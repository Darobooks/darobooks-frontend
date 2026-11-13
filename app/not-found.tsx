import Link from "next/link";
import { RiArrowLeftLine, RiSearchEyeLine } from "@remixicon/react";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-5 py-16">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-[#1e4fc1]">
          <RiSearchEyeLine className="h-8 w-8" />
        </div>
        <p className="mt-6 text-sm font-bold text-[#1e4fc1]">404 ERROR</p>
        <h1 className="mt-2 text-3xl font-bold text-[#10213c] sm:text-4xl">
          Page not found
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-500">
          The page you requested does not exist or may have moved.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex items-center gap-2 rounded-lg bg-[#1e4fc1] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#173fa1]"
        >
          <RiArrowLeftLine className="h-4 w-4" />
          Back to home
        </Link>
      </div>
    </main>
  );
}
