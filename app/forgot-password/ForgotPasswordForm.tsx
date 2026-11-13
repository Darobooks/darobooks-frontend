"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setStatus("");
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!response.ok) {
        throw new Error(
          `Could not send a reset link (HTTP ${response.status}). Please try again.`,
        );
      }
      setIsSubmitted(true);
      setStatus(
        "If an account exists for that email, we’ll send a password reset link shortly.",
      );
    } catch (error) {
      setStatus(
        error instanceof TypeError
          ? "Could not reach the account service. Check your connection and try again."
          : error instanceof Error
            ? error.message
            : "Could not send a reset link. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[420px]">
      <h2 className="font-jakarta text-[24px] font-bold tracking-[-0.5px] text-[#111827] sm:text-[27px]">
        Reset your password
      </h2>
      <p className="mt-1.5 font-sora text-[12px] leading-[1.6] text-slate-600 sm:text-[13px]">
        Enter your email and we will send you a link to choose a new one.
      </p>

      <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="reset-email"
            className="mb-1.5 block text-[11px] font-bold text-[#08172e]"
          >
            Email
          </label>
          <input
            id="reset-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2.5 font-sora text-[12px] outline-none transition placeholder:text-slate-400 focus:border-[#1a4bb8] focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isSubmitted}
          className="w-full rounded-lg bg-[#1a4bb8] px-4 py-3 text-[12px] font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {isSubmitting
            ? "Sending..."
            : isSubmitted
              ? "Reset link requested"
              : "Send reset link"}
        </button>

        <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 font-sora text-[10px] leading-[1.55] text-slate-600">
          For your safety we show the same message whether or not an account
          exists for that email.
        </div>
        <p
          aria-live="polite"
          className="min-h-4 font-sora text-[10px] text-slate-600"
        >
          {status}
        </p>
      </form>

      <p className="mt-2 text-center font-sora text-[11px]">
        <Link
          href="/login"
          className="font-bold text-[#1a4bb8] hover:underline"
        >
          Back to log in
        </Link>
      </p>
    </div>
  );
}
