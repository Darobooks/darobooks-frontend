"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");
const RESEND_DELAY_SECONDS = 60;
const PENDING_EMAIL_KEY = "darobooksPendingVerificationEmail";

function subscribeToPendingEmail(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("darobooks:pending-verification-email", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("darobooks:pending-verification-email", callback);
  };
}

function getPendingEmailSnapshot() {
  return (
    new URLSearchParams(window.location.search).get("email") ??
    window.sessionStorage.getItem(PENDING_EMAIL_KEY) ??
    ""
  );
}

async function getResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("The verification service returned an invalid response.");
  }
}

function getErrorMessage(payload: unknown): string | undefined {
  if (payload && typeof payload === "object" && "message" in payload) {
    const { message } = payload;
    if (typeof message === "string") return message;
    if (
      Array.isArray(message) &&
      message.every((item) => typeof item === "string")
    ) {
      return message.join(" ");
    }
  }
  return undefined;
}

function getEmailVerifiedSuccess(payload: unknown): boolean {
  return (
    !!payload &&
    typeof payload === "object" &&
    "emailVerified" in payload &&
    payload.emailVerified === true
  );
}

function getTwoStepSetupToken(payload: unknown): string | undefined {
  if (
    payload &&
    typeof payload === "object" &&
    "setupToken" in payload &&
    typeof payload.setupToken === "string" &&
    /^[A-Za-z0-9_-]{43}$/.test(payload.setupToken)
  ) {
    return payload.setupToken;
  }
  return undefined;
}

export default function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";
  const email = useSyncExternalStore(
    subscribeToPendingEmail,
    getPendingEmailSnapshot,
    () => initialEmail,
  );
  const emailDeliveryFailed = searchParams.get("emailDeliveryFailed") === "1";
  const [code, setCode] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState(
    emailDeliveryFailed ? 0 : RESEND_DELAY_SECONDS,
  );
  const [status, setStatus] = useState(
    emailDeliveryFailed
      ? "Your account was created, but the email could not be sent. You can request another code now."
      : "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (secondsRemaining === 0) return;

    const timer = window.setTimeout(() => {
      setSecondsRemaining((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [secondsRemaining]);

  const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setStatus("");
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code }),
      });
      const payload = await getResponsePayload(response);
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload) ??
            `Verification failed (HTTP ${response.status}). Please try again.`,
        );
      }
      if (!getEmailVerifiedSuccess(payload)) {
        throw new Error(
          "The verification service returned an unexpected response.",
        );
      }
      const setupToken = getTwoStepSetupToken(payload);
      if (!setupToken) {
        throw new Error(
          "Your email is verified, but the two-step setup session was missing. Please contact support.",
        );
      }
      window.sessionStorage.setItem("twoStepSetupToken", setupToken);
      window.sessionStorage.removeItem(PENDING_EMAIL_KEY);
      router.push("/two-step");
    } catch (error) {
      setStatus(
        error instanceof TypeError
          ? "Could not reach the verification service. Check your connection and try again."
          : error instanceof Error
            ? error.message
            : "Could not verify the code. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (secondsRemaining > 0 || isSubmitting) return;
    setIsSubmitting(true);
    setStatus("");
    try {
      const response = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const payload = await getResponsePayload(response);
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload) ??
            `The request failed (HTTP ${response.status}). Please try again.`,
        );
      }
      setSecondsRemaining(RESEND_DELAY_SECONDS);
      setStatus(
        getErrorMessage(payload) ??
          "If your account is unverified, a new code has been sent.",
      );
    } catch (error) {
      setStatus(
        error instanceof TypeError
          ? "Could not reach the verification service. Check your connection and try again."
          : error instanceof Error
            ? error.message
            : "Could not resend the code. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[420px]">
      <ol
        aria-label="Account setup progress"
        className="mb-5 grid grid-cols-4 gap-1.5 font-sora text-[9px] text-slate-500"
      >
        <Step label="Account" />
        <Step label="Verify email" active />
        <Step label="Two-step" />
        <Step label="Recovery" />
      </ol>

      <h2 className="font-jakarta text-[27px] font-bold tracking-[-0.5px] text-[#111827]">
        Check your email
      </h2>
      <p className="mt-1.5 font-sora text-[12px] leading-[1.6] text-slate-600 sm:text-[13px]">
        {emailDeliveryFailed
          ? "We couldn't send a code to "
          : "If this email is linked to an unverified account, a code was sent to "}
        <strong className="break-all font-bold text-[#111827]">
          {email || "your email address"}
        </strong>
        {emailDeliveryFailed
          ? ". Request a new code below."
          : ". The code expires in 10 minutes."}
      </p>

      <form className="mt-5 space-y-3" onSubmit={handleVerify}>
        <div>
          <label
            htmlFor="verification-code"
            className="mb-1.5 block text-[11px] font-bold text-[#08172e]"
          >
            Verification code
          </label>
          <input
            id="verification-code"
            name="verification-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="0 0 0 0 0 0"
            aria-describedby="verification-help"
            className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2.5 text-center font-sora text-[20px] font-bold tracking-[0.45em] text-[#111827] outline-none transition placeholder:text-slate-500 focus:border-[#1a4bb8] focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <button
          type="submit"
          disabled={code.length !== 6 || isSubmitting || !email}
          className="w-full rounded-lg bg-[#1a4bb8] px-4 py-2.5 text-[12px] font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {isSubmitting ? "Checking..." : "Verify email"}
        </button>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 font-sora text-[10px] text-slate-600">
          <p>
            Did not get it?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={secondsRemaining > 0 || isSubmitting || !email}
              className="font-bold text-[#1a4bb8] hover:underline disabled:cursor-not-allowed disabled:text-slate-500 disabled:no-underline"
            >
              Send a new code
            </button>
            {secondsRemaining > 0 && (
              <> in 0:{String(secondsRemaining).padStart(2, "0")}</>
            )}
          </p>
        </div>

        <p
          id="verification-help"
          className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 font-sora text-[10px] leading-[1.5] text-slate-600"
        >
          Check your spam folder if it does not arrive within a minute. Only the
          newest code works.
        </p>
        <p
          aria-live="polite"
          className="min-h-4 font-sora text-[10px] text-slate-600"
        >
          {status}
        </p>
      </form>
      <p className="mt-2 text-center font-sora text-[10px] text-slate-600">
        Wrong email address?{" "}
        <Link
          href="/signup"
          className="font-bold text-[#1a4bb8] hover:underline"
        >
          Start signup again
        </Link>
      </p>
      <p className="mt-2 text-center font-sora text-[10px] text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-[#1a4bb8] hover:underline">
          Log in
        </Link>
        {" or "}
        <Link
          href="/forgot-password"
          className="font-bold text-[#1a4bb8] hover:underline"
        >
          reset your password
        </Link>
        .
      </p>
    </div>
  );
}

function Step({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <li
      aria-current={active ? "step" : undefined}
      className={`border-t-[3px] pt-1 ${
        active
          ? "border-[#0b7a75] font-bold text-[#111827]"
          : "border-[#dbe5f7] text-slate-500"
      }`}
    >
      {label}
    </li>
  );
}
