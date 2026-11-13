"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { showToast } from "@/app/components/toast";
import { storeAccessToken } from "@/app/components/auth-state";
import { getTenantBaseDomain as resolveTenantBaseDomain } from "@/app/tenant-domain";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");
const RESERVED_HOST_LABELS = new Set([
  "admin",
  "api",
  "app",
  "assets",
  "blog",
  "cdn",
  "dashboard",
  "docs",
  "help",
  "mail",
  "status",
  "support",
  "www",
]);

function getTenantSlug(hostname: string): string | undefined {
  const host = hostname.toLowerCase();
  const baseDomain = getTenantBaseDomain(host);
  if (host === baseDomain || !host.endsWith(`.${baseDomain}`)) {
    return undefined;
  }
  const tenantSlug = host.slice(0, -(baseDomain.length + 1));
  if (!tenantSlug || RESERVED_HOST_LABELS.has(tenantSlug)) {
    return undefined;
  }
  return tenantSlug;
}

function getTenantBaseDomain(hostname: string): string {
  return resolveTenantBaseDomain(hostname);
}

async function getResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("The login service returned an invalid response.");
  }
}

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

function isLoginResponse(
  payload: unknown,
): payload is {
  accessToken: string;
  user: {
    id: string;
    tenantSlug?: string | null;
    supportRole?: "support" | "support_lead" | null;
  };
} {
  return (
    !!payload &&
    typeof payload === "object" &&
    "accessToken" in payload &&
    typeof payload.accessToken === "string" &&
    "user" in payload &&
    !!payload.user &&
    typeof payload.user === "object" &&
    "id" in payload.user &&
    typeof payload.user.id === "string"
  );
}

function getTenantLoginUrl(tenantSlug: string, handoffToken: string): string {
  const hostname = window.location.hostname.toLowerCase();
  const baseDomain = getTenantBaseDomain(hostname);
  const url = new URL("/login", window.location.origin);
  url.hostname = `${tenantSlug}.${baseDomain}`;
  url.hash = new URLSearchParams({ "tenant-handoff": handoffToken }).toString();
  return url.toString();
}

function isTenantHandoffResponse(
  payload: unknown,
): payload is { handoffToken: string; tenantSlug: string } {
  return (
    !!payload &&
    typeof payload === "object" &&
    "handoffToken" in payload &&
    typeof payload.handoffToken === "string" &&
    /^[A-Za-z0-9_-]{43}$/.test(payload.handoffToken) &&
    "tenantSlug" in payload &&
    typeof payload.tenantSlug === "string" &&
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(payload.tenantSlug)
  );
}

function isTenantHandoffConsumeResponse(
  payload: unknown,
): payload is { accessToken: string; tenantSlug: string } {
  return (
    !!payload &&
    typeof payload === "object" &&
    "accessToken" in payload &&
    typeof payload.accessToken === "string" &&
    /^[A-Za-z0-9_-]{43}$/.test(payload.accessToken) &&
    "tenantSlug" in payload &&
    typeof payload.tenantSlug === "string" &&
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(payload.tenantSlug)
  );
}

const tenantHandoffRequests = new Map<string, Promise<unknown>>();

function redeemTenantLoginHandoff(handoffToken: string): Promise<unknown> {
  const pendingRequest = tenantHandoffRequests.get(handoffToken);
  if (pendingRequest) return pendingRequest;

  const request = fetch(`${API_BASE_URL}/auth/tenant-handoff/consume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handoffToken }),
    cache: "no-store",
  }).then(async (response) => {
    const payload = await getResponsePayload(response);
    if (!response.ok) {
      throw new Error(
        getApiErrorMessage(payload) ??
          `Tenant sign-in failed (HTTP ${response.status}).`,
      );
    }
    return payload;
  });
  tenantHandoffRequests.set(handoffToken, request);
  void request.then(
    () => tenantHandoffRequests.delete(handoffToken),
    () => tenantHandoffRequests.delete(handoffToken),
  );
  return request;
}

function requiresTwoStep(payload: unknown): boolean {
  return (
    !!payload &&
    typeof payload === "object" &&
    "requiresTwoStep" in payload &&
    payload.requiresTwoStep === true
  );
}

function getTwoStepSetupToken(payload: unknown): string | undefined {
  if (
    payload &&
    typeof payload === "object" &&
    "requiresTwoStepSetup" in payload &&
    payload.requiresTwoStepSetup === true &&
    "setupToken" in payload &&
    typeof payload.setupToken === "string" &&
    /^[A-Za-z0-9_-]{43}$/.test(payload.setupToken)
  ) {
    return payload.setupToken;
  }
  return undefined;
}

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [isTwoStepRequired, setIsTwoStepRequired] = useState(false);
  const [, setMissedAttempts] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handoffToken = new URLSearchParams(
      window.location.hash.slice(1),
    ).get("tenant-handoff");
    if (handoffToken === null || handoffToken.length === 0) return;

    let isCurrent = true;
    const clearHandoffHash = () =>
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );

    async function consumeHandoff(token: string) {
      try {
        const payload = await redeemTenantLoginHandoff(token);
        const expectedTenantSlug = getTenantSlug(window.location.hostname);
        if (
          !isTenantHandoffConsumeResponse(payload) ||
          !expectedTenantSlug ||
          payload.tenantSlug !== expectedTenantSlug
        ) {
          throw new Error("The tenant sign-in response was invalid.");
        }
        if (!isCurrent) return;

        storeAccessToken(payload.accessToken);
        Object.keys(window.sessionStorage)
          .filter((key) => key.startsWith("darobooksDashboardHome:"))
          .forEach((key) => window.sessionStorage.removeItem(key));
        clearHandoffHash();
        showToast("You’re signed in. Welcome back.");
        router.replace("/dashboard");
      } catch (error) {
        if (!isCurrent) return;
        clearHandoffHash();
        showToast(
          error instanceof TypeError
            ? "Could not reach the sign-in service. Please try again."
            : error instanceof Error
              ? error.message
              : "Tenant sign-in failed. Please sign in again.",
          "error",
        );
      }
    }

    void consumeHandoff(handoffToken);
    return () => {
      isCurrent = false;
    };
  }, [router]);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canLogIn =
    isValidEmail &&
    password.length > 0 &&
    (!isTwoStepRequired || /^\d{6}$/.test(code));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canLogIn || isSubmitting) return;

    setIsSubmitting(true);
    setStatus("");
    try {
      const tenantSlug = getTenantSlug(window.location.hostname);
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          ...(isTwoStepRequired ? { code } : {}),
          ...(tenantSlug ? { tenantSlug } : {}),
        }),
      });
      const payload = await getResponsePayload(response);
      if (!response.ok) {
        if (response.status === 401) {
          setMissedAttempts((attempts) => {
            const nextAttempts = attempts + 1;
            if (nextAttempts >= 3) setIsTwoStepRequired(true);
            return nextAttempts;
          });
        }
        throw new Error(
          getApiErrorMessage(payload) ??
            `Login failed (HTTP ${response.status}). Please try again.`,
        );
      }
      if (
        payload &&
        typeof payload === "object" &&
        "requiresTwoStepSetup" in payload &&
        payload.requiresTwoStepSetup === true
      ) {
        const setupToken = getTwoStepSetupToken(payload);
        if (!setupToken) {
          throw new Error(
            "The security service returned an invalid setup session.",
          );
        }
        window.sessionStorage.removeItem("darobooksAccessToken");
        window.sessionStorage.setItem("twoStepSetupToken", setupToken);
        router.push("/two-step");
        return;
      }
      if (requiresTwoStep(payload)) {
        setIsTwoStepRequired(true);
        setStatus("Enter the code from your authenticator app to continue.");
        return;
      }
      if (!isLoginResponse(payload)) {
        throw new Error("The login service returned an unexpected response.");
      }

      const currentTenantSlug = getTenantSlug(window.location.hostname);
      const workspaceTenantSlug =
        typeof payload.user.tenantSlug === "string"
          ? payload.user.tenantSlug
          : "";
      const currentHost = window.location.hostname.toLowerCase();
      const tenantBaseDomain = getTenantBaseDomain(currentHost);
      if (
        workspaceTenantSlug.length > 0 &&
        workspaceTenantSlug !== currentTenantSlug &&
        (currentHost === tenantBaseDomain ||
          currentHost.endsWith(`.${tenantBaseDomain}`)) &&
        /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(workspaceTenantSlug)
      ) {
        const handoffResponse = await fetch(
          `${API_BASE_URL}/auth/tenant-handoff`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${payload.accessToken}` },
            cache: "no-store",
          },
        );
        const handoffPayload: unknown =
          await getResponsePayload(handoffResponse);
        if (!handoffResponse.ok || !isTenantHandoffResponse(handoffPayload)) {
          throw new Error(
            getApiErrorMessage(handoffPayload) ??
              "Your tenant sign-in could not be prepared. Please try again.",
          );
        }
        if (handoffPayload.tenantSlug !== workspaceTenantSlug) {
          throw new Error("The tenant sign-in response was invalid.");
        }
        window.sessionStorage.removeItem("darobooksAccessToken");
        Object.keys(window.sessionStorage)
          .filter((key) => key.startsWith("darobooksDashboardHome:"))
          .forEach((key) => window.sessionStorage.removeItem(key));
        window.location.assign(
          getTenantLoginUrl(
            workspaceTenantSlug,
            handoffPayload.handoffToken,
          ),
        );
        return;
      }

      storeAccessToken(payload.accessToken);
      Object.keys(window.sessionStorage)
        .filter((key) => key.startsWith("darobooksDashboardHome:"))
        .forEach((key) => window.sessionStorage.removeItem(key));
      showToast("You’re signed in. Welcome back.");
      const supportStaff =
        "supportRole" in payload.user &&
        (payload.user.supportRole === "support" ||
          payload.user.supportRole === "support_lead");
      router.push(supportStaff ? "/dashboard/support-console" : "/dashboard");
    } catch (error) {
      showToast(
        error instanceof TypeError
          ? "Could not reach the login service. Please try again later."
          : error instanceof Error
            ? error.message
            : "Something went wrong while signing in. Please try again.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[420px]">
      <h2 className="font-jakarta text-[27px] font-bold tracking-[-0.5px] text-[#111827]">
        Welcome back
      </h2>
      <p className="mt-1.5 font-sora text-[12px] text-slate-600 sm:text-[13px]">
        Log in to your DaroBooks account.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label
            htmlFor="login-email"
            className="mb-1.5 block text-[11px] font-bold text-[#08172e]"
          >
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2.5 font-sora text-[12px] outline-none transition placeholder:text-slate-400 focus:border-[#1a4bb8] focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label
              htmlFor="login-password"
              className="block text-[11px] font-bold text-[#08172e]"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-[10px] font-bold text-[#1a4bb8] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="flex rounded-lg border border-[#cbd5e1] bg-white pr-2 focus-within:border-[#1a4bb8] focus-within:ring-2 focus-within:ring-blue-100">
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
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
        </div>

        {isTwoStepRequired && (
          <div>
            <label
              htmlFor="login-code"
              className="mb-1.5 block text-[11px] font-bold text-[#08172e]"
            >
              Authenticator code
            </label>
            <input
              id="login-code"
              name="code"
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
              placeholder="6-digit code"
              className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2.5 font-sora text-[12px] tracking-[0.2em] outline-none transition placeholder:tracking-normal placeholder:text-slate-400 focus:border-[#1a4bb8] focus:ring-2 focus:ring-blue-100"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={!canLogIn || isSubmitting}
          className="w-full rounded-lg bg-[#1a4bb8] px-4 py-3 text-[12px] font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {isSubmitting ? "Signing in..." : "Log in"}
        </button>

        <p aria-live="polite" className="min-h-4 text-[10px] text-slate-600">
          {status}
        </p>
      </form>

      <p className="mt-1 text-center text-[11px] text-slate-600">
        New to DaroBooks?{" "}
        <Link
          href="/signup"
          className="font-bold text-[#1a4bb8] hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
