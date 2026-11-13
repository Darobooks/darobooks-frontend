"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

function getErrorMessage(payload: unknown): string | undefined {
  return payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string"
    ? payload.message
    : undefined;
}

export default function UnsubscribeForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUnsubscribed, setIsUnsubscribed] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setStatus("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/email/unsubscribe${token ? "/confirm" : ""}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(token ? { token } : { email: email.trim() }),
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload) ??
            `Could not update email preferences (HTTP ${response.status}).`,
        );
      }
      if (token) {
        setIsUnsubscribed(true);
        setStatus(
          getErrorMessage(payload) ??
            "Optional product emails are turned off. Required account emails will continue.",
        );
      } else {
        setStatus(
          getErrorMessage(payload) ??
            "If a verified account exists for this address, a confirmation link will be sent.",
        );
      }
    } catch (error) {
      setStatus(
        error instanceof TypeError
          ? "Could not reach the email preferences service. Please try again."
          : error instanceof Error
            ? error.message
            : "Could not update email preferences. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-md">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0b7a75]">
        Email preferences
      </p>
      <h1 className="mt-2 text-[26px] font-bold leading-tight text-[#10213c]">
        {token
          ? isUnsubscribed
            ? "Preference updated"
            : "Confirm unsubscribe"
          : "Manage optional email"}
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
        {token
          ? "Confirm to stop optional DaroBooks product updates."
          : "Enter your account email and we’ll send a confirmation link if it matches a verified account."}
      </p>

      {!isUnsubscribed && (
        <form onSubmit={submit} className="mt-6 space-y-4">
          {!token && (
            <label className="block text-[11px] font-semibold text-slate-700">
              Account email
              <input
                required
                type="email"
                maxLength={254}
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2.5 text-[12px] outline-none focus:border-[#0b7a75] focus:ring-2 focus:ring-emerald-100"
              />
            </label>
          )}
          <button
            type="submit"
            disabled={isSubmitting || (Boolean(token) && token.length !== 43)}
            className="w-full rounded-lg bg-[#0b7a75] px-4 py-3 text-[12px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting
              ? "Updating..."
              : token
                ? "Confirm unsubscribe"
                : "Send confirmation link"}
          </button>
        </form>
      )}

      <p
        aria-live="polite"
        role={status && status.includes("Could not") ? "alert" : "status"}
        className="mt-4 min-h-5 text-[11px] text-slate-600"
      >
        {status}
      </p>
      <p className="mt-4 border-t border-slate-200 pt-4 text-[10px] leading-relaxed text-slate-500">
        Account verification, password reset, security, billing, and invoice
        messages are required service communications and are not disabled by
        this preference.
      </p>
      <Link
        href="/"
        className="mt-5 inline-block text-[11px] font-bold text-[#1e4fc1] hover:underline"
      >
        Return to DaroBooks
      </Link>
    </section>
  );
}