"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useToastOnChange } from "@/app/components/toast";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

function getApiErrorMessage(payload: unknown): string | undefined {
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

function hasEmailDeliveryFailure(payload: unknown): boolean {
  return (
    !!payload &&
    typeof payload === "object" &&
    "code" in payload &&
    payload.code === "EMAIL_DELIVERY_FAILED"
  );
}

export default function SignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [status, setStatus] = useState("");
  useToastOnChange(
    status,
    status.includes("successfully") ? "success" : "error",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordRules = useMemo(() => {
    const normalizedPassword = password.toLowerCase();
    const identityParts = [fullName, email.split("@")[0]]
      .map((part) => part.trim().toLowerCase())
      .filter((part) => part.length >= 3);

    return [
      {
        label: "At least 12 characters",
        passed: password.length >= 12,
      },
      {
        label: "Mix of letters and numbers",
        passed: /[a-z]/i.test(password) && /\d/.test(password),
      },
      {
        label: "Does not contain your name or email",
        passed:
          identityParts.length === 0 ||
          identityParts.every((part) => !normalizedPassword.includes(part)),
      },
    ];
  }, [email, fullName, password]);

  const passedRules = passwordRules.filter((rule) => rule.passed).length;
  const strengthLabel =
    password.length === 0
      ? "Not set"
      : passedRules === 3
        ? "Strong"
        : passedRules === 2
          ? "Good"
          : passedRules === 1
            ? "Fair"
            : "Weak";

  const canCreateAccount =
    fullName.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    dateOfBirth.length === 10 &&
    passwordRules.every((rule) => rule.passed) &&
    acceptedTerms;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canCreateAccount || isSubmitting) return;
    if (dateOfBirth > getLatestAdultBirthDate()) {
      setStatus("You must be at least 18 years old to create an account.");
      return;
    }

    setIsSubmitting(true);
    setStatus("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          dateOfBirth,
          password,
          acceptedTerms,
        }),
      });

      const responseText = await response.text();
      let payload: unknown;
      if (responseText) {
        try {
          payload = JSON.parse(responseText);
        } catch {
          throw new Error("The signup service returned an invalid response.");
        }
      }

      if (!response.ok) {
        if (hasEmailDeliveryFailure(payload)) {
          window.sessionStorage.setItem(
            "darobooksPendingVerificationEmail",
            email.trim().toLowerCase(),
          );
          router.push("/verify-email?emailDeliveryFailed=1");
          return;
        }
        throw new Error(
          getApiErrorMessage(payload) ??
            `Account creation failed (HTTP ${response.status}). Please try again.`,
        );
      }

      window.sessionStorage.setItem(
        "darobooksPendingVerificationEmail",
        email.trim().toLowerCase(),
      );
      router.push("/verify-email");
    } catch (error) {
      setStatus(
        error instanceof TypeError
          ? "Could not reach the signup service. Check your connection and try again."
          : error instanceof Error
            ? error.message
            : "Something went wrong while creating your account. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[450px]">
      <ol
        aria-label="Account setup steps"
        className="mb-7 grid grid-cols-4 gap-2"
      >
        {["Account", "Verify email", "Two-step", "Recovery"].map(
          (step, index) => (
            <li key={step} aria-current={index === 0 ? "step" : undefined}>
              <div
                className={`h-[3px] rounded-full ${
                  index === 0 ? "bg-[#0b7a75]" : "bg-[#dbe5f5]"
                }`}
              />
              <span
                className={`mt-2 block text-[9px] ${
                  index === 0 ? "font-bold text-[#08172e]" : "text-slate-500"
                }`}
              >
                {step}
              </span>
            </li>
          ),
        )}
      </ol>

      <h2 className="font-jakarta text-[27px] font-bold tracking-[-0.5px] text-[#111827]">
        Create your account
      </h2>
      <p className="mt-1.5 font-sora text-[12px] leading-[1.6] text-slate-600 sm:text-[13px]">
        Free to start. Two-step verification is required on every DaroBooks
        account, and you will set it up in a minute.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label
            htmlFor="full-name"
            className="mb-1.5 block text-[11px] font-bold text-[#08172e]"
          >
            Full name
          </label>
          <input
            id="full-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Your full name"
            className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2.5 font-sora text-[12px] outline-none transition placeholder:text-slate-400 focus:border-[#1a4bb8] focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label
            htmlFor="date-of-birth"
            className="mb-1.5 block text-[11px] font-bold text-[#08172e]"
          >
            Date of birth
          </label>
          <input
            id="date-of-birth"
            name="dateOfBirth"
            type="date"
            autoComplete="bday"
            min="1900-01-01"
            required
            value={dateOfBirth}
            onFocus={(event) => {
              event.currentTarget.max = getLatestAdultBirthDate();
            }}
            onChange={(event) => setDateOfBirth(event.target.value)}
            className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2.5 font-sora text-[12px] outline-none transition focus:border-[#1a4bb8] focus:ring-2 focus:ring-blue-100"
          />
          <p className="mt-1 text-[9px] text-slate-500">
            You must be 18 or older. We check this date for eligibility and do
            not store it.
          </p>
        </div>

        <div>
          <label
            htmlFor="work-email"
            className="mb-1.5 block text-[11px] font-bold text-[#08172e]"
          >
            Work email
          </label>
          <input
            id="work-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2.5 font-sora text-[12px] outline-none transition placeholder:text-slate-400 focus:border-[#1a4bb8] focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-[11px] font-bold text-[#08172e]"
          >
            Password
          </label>
          <div className="flex rounded-lg border border-[#cbd5e1] bg-white pr-2 focus-within:border-[#1a4bb8] focus-within:ring-2 focus-within:ring-blue-100">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 12 characters"
              className="min-w-0 flex-1 rounded-lg bg-transparent px-3 py-2.5 font-sora text-[12px] outline-none placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="my-auto rounded-md bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-[#1a4bb8] hover:bg-blue-100"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <div
            className="mt-2 grid grid-cols-4 gap-1"
            aria-label={`Password strength: ${strengthLabel}`}
          >
            {[0, 1, 2, 3].map((segment) => (
              <span
                key={segment}
                className={`h-[3px] rounded-full ${
                  passedRules > segment
                    ? passedRules === 3
                      ? "bg-emerald-500"
                      : "bg-amber-400"
                    : "bg-slate-200"
                }`}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between text-[9px]">
            <span className="font-semibold text-slate-600">
              Password strength
            </span>
            <span className="font-semibold text-slate-500">
              {strengthLabel}
            </span>
          </div>
          <ul className="mt-2 space-y-1 text-[10px] text-slate-500">
            {passwordRules.map((rule) => (
              <li key={rule.label} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 rounded-full border ${
                    rule.passed
                      ? "border-emerald-600 bg-emerald-500"
                      : "border-slate-400"
                  }`}
                />
                {rule.label}
              </li>
            ))}
          </ul>
        </div>

        <label className="flex cursor-pointer items-start gap-2 text-[10px] leading-relaxed text-slate-700">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#1a4bb8]"
          />
          <span>
            I confirm I am at least 18 years old and agree to the{" "}
            <Link
              href="/terms"
              className="font-bold text-[#1a4bb8] hover:underline"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="font-bold text-[#1a4bb8] hover:underline"
            >
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        <button
          type="submit"
          disabled={!canCreateAccount || isSubmitting}
          className="w-full rounded-lg bg-[#1a4bb8] px-4 py-3 text-[12px] font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
        <p
          aria-live="polite"
          role={status && status.includes("successfully") ? "status" : "alert"}
          className="min-h-4 text-[10px] text-slate-600"
        >
          {status}
        </p>
      </form>

      <p className="mt-1 text-center text-[11px] text-slate-600">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-bold text-[#1a4bb8] hover:underline"
        >
          Log in
        </Link>
      </p>
      <p className="mt-4 text-center text-[9px] text-slate-500">
        DaroBooks will never ask for your password by email, chat, or phone.
      </p>
    </div>
  );
}

function getLatestAdultBirthDate(): string {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - 18);
  return date.toISOString().slice(0, 10);
}
