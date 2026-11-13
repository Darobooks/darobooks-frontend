"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");
const subscribeToLocation = () => () => {};
const getResetToken = () =>
  new URLSearchParams(window.location.search).get("token") ?? "";

function getErrorMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object" || !("message" in payload)) {
    return undefined;
  }
  const { message } = payload;
  if (typeof message === "string") return message;
  if (
    Array.isArray(message) &&
    message.every((item) => typeof item === "string")
  ) {
    return message.join(" ");
  }
  return undefined;
}

export default function ResetPasswordForm() {
  const router = useRouter();
  const token = useSyncExternalStore(
    subscribeToLocation,
    getResetToken,
    () => "",
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const isStrongPassword =
    password.length >= 12 && /[a-z]/i.test(password) && /\d/.test(password);
  const canSubmit =
    token.length > 0 && isStrongPassword && password === confirmPassword;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setStatus("");
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const text = await response.text();
      let payload: unknown;
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          throw new Error("The account service returned an invalid response.");
        }
      }
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload) ??
            `Could not reset your password (HTTP ${response.status}).`,
        );
      }
      setIsComplete(true);
      setStatus("Your password has been changed. You can now log in.");
      window.dispatchEvent(
        new CustomEvent("darobooks:toast", {
          detail: { tone: "success", message: "Password changed successfully." },
        }),
      );
      window.setTimeout(() => router.replace("/login"), 700);
    } catch (error) {
      setStatus(
        error instanceof TypeError
          ? "Could not reach the account service. Check your connection and try again."
          : error instanceof Error
            ? error.message
            : "Could not reset your password. Request a new reset link and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full max-w-[420px]">
        <h2 className="font-jakarta text-[25px] font-bold text-[#111827]">
          Reset link unavailable
        </h2>
        <p className="mt-2 font-sora text-[12px] leading-5 text-slate-600">
          This reset link is missing or invalid. Request a new one to continue.
        </p>
        <Link
          href="/forgot-password"
          className="mt-5 inline-block font-sora text-[12px] font-bold text-[#1a4bb8] hover:underline"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[420px]">
      <h2 className="font-jakarta text-[25px] font-bold text-[#111827]">
        Choose a new password
      </h2>
      <p className="mt-2 font-sora text-[12px] leading-5 text-slate-600">
        Use at least 12 characters, including letters and numbers.
      </p>
      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="new-password"
            className="mb-1.5 block text-[11px] font-bold text-[#08172e]"
          >
            New password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={256}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2.5 font-sora text-[12px] outline-none focus:border-[#1a4bb8] focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div>
          <label
            htmlFor="confirm-password"
            className="mb-1.5 block text-[11px] font-bold text-[#08172e]"
          >
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={256}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2.5 font-sora text-[12px] outline-none focus:border-[#1a4bb8] focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <button
          type="submit"
          disabled={!canSubmit || isSubmitting || isComplete}
          className="w-full rounded-lg bg-[#1a4bb8] px-4 py-3 font-sora text-[12px] font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {isSubmitting ? "Saving..." : "Reset password"}
        </button>
        <p
          aria-live="polite"
          className="min-h-5 font-sora text-[11px] text-slate-600"
        >
          {status}
        </p>
      </form>
      {isComplete && (
        <Link
          href="/login"
          className="mt-2 inline-block font-sora text-[12px] font-bold text-[#1a4bb8] hover:underline"
        >
          Back to log in
        </Link>
      )}
    </div>
  );
}
