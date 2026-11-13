"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { showToast } from "@/app/components/toast";
import { getTenantBaseDomain, slugifyTenantName } from "@/app/tenant-domain";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

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

async function getPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("The workspace service returned an invalid response.");
  }
}

function isWorkspaceResponse(
  value: unknown,
): value is {
  workspace: { companyName: string; tenantSlug: string; tenantUrl: string };
} {
  return (
    !!value &&
    typeof value === "object" &&
    "workspace" in value &&
    !!value.workspace &&
    typeof value.workspace === "object" &&
    "companyName" in value.workspace &&
    typeof value.workspace.companyName === "string" &&
    "tenantSlug" in value.workspace &&
    typeof value.workspace.tenantSlug === "string" &&
    "tenantUrl" in value.workspace &&
    typeof value.workspace.tenantUrl === "string"
  );
}

function getCurrentTenantSlug(hostname: string): string | null {
  const host = hostname.toLowerCase();
  const baseDomain = getTenantBaseDomain(host);
  if (host === baseDomain || !host.endsWith(`.${baseDomain}`)) return null;
  return host.slice(0, -(baseDomain.length + 1)) || null;
}

function createTenantLoginUrl(tenantUrl: string, handoffToken: string): string {
  const url = new URL("/login", tenantUrl);
  url.hash = new URLSearchParams({ "tenant-handoff": handoffToken }).toString();
  return url.toString();
}

function subscribeToLocation(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

function getBaseDomainSnapshot(): string {
  const hostname = window.location.hostname.toLowerCase();
  const domain = getTenantBaseDomain(hostname);
  return `${domain}${window.location.port ? `:${window.location.port}` : ""}`;
}

function getServerBaseDomainSnapshot(): string {
  return (
    process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN?.trim().toLowerCase() ||
    "darobooks.com"
  );
}

export default function WorkspaceSetupForm() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const baseDomain = useSyncExternalStore(
    subscribeToLocation,
    getBaseDomainSnapshot,
    getServerBaseDomainSnapshot,
  );

  useEffect(() => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) {
      router.replace("/login");
      return;
    }
  }, [router]);

  const previewSlug = companyName.trim()
    ? slugifyTenantName(companyName)
    : "your-company";
  const previewUrl = `${previewSlug}.${baseDomain}`;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) {
      router.replace("/login");
      return;
    }

    setIsSubmitting(true);
    setStatus("");
    try {
      const response = await fetch(`${API_BASE_URL}/auth/workspace-setup`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ companyName }),
        cache: "no-store",
      });
      const payload = await getPayload(response);
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload) ??
            `Could not save your company details (HTTP ${response.status}).`,
        );
      }
      if (!isWorkspaceResponse(payload)) {
        throw new Error("The workspace service returned an invalid response.");
      }

      const currentTenantSlug = getCurrentTenantSlug(window.location.hostname);
      if (currentTenantSlug !== payload.workspace.tenantSlug) {
        const handoffResponse = await fetch(
          `${API_BASE_URL}/auth/tenant-handoff`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          },
        );
        const handoffPayload = await getPayload(handoffResponse);
        if (
          !handoffResponse.ok ||
          !handoffPayload ||
          typeof handoffPayload !== "object" ||
          !("handoffToken" in handoffPayload) ||
          typeof handoffPayload.handoffToken !== "string" ||
          !/^[A-Za-z0-9_-]{43}$/.test(handoffPayload.handoffToken) ||
          !("tenantSlug" in handoffPayload) ||
          handoffPayload.tenantSlug !== payload.workspace.tenantSlug
        ) {
          throw new Error(
            getErrorMessage(handoffPayload) ??
              "Your workspace was saved, but sign-in could not be transferred. Please log in again.",
          );
        }
        window.sessionStorage.removeItem("darobooksAccessToken");
        window.location.assign(
          createTenantLoginUrl(
            payload.workspace.tenantUrl,
            handoffPayload.handoffToken,
          ),
        );
        return;
      }

      showToast("Your company workspace is ready.");
      router.replace("/dashboard");
    } catch (error) {
      setStatus(
        error instanceof TypeError
          ? "Could not reach the workspace service. Check your connection and try again."
          : error instanceof Error
            ? error.message
            : "Could not save your company details. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[480px]">
      <ol
        aria-label="Account setup progress"
        className="mb-7 grid grid-cols-5 gap-2 font-sora text-[9px] text-slate-500"
      >
        {["Account", "Verify email", "Two-step", "Recovery", "Workspace"].map(
          (step, index) => (
            <li key={step} aria-current={index === 4 ? "step" : undefined}>
              <div
                className={`h-[3px] rounded-full ${
                  index === 4 ? "bg-[#0b7a75]" : "bg-[#c8eee8]"
                }`}
              />
              <span
                className={`mt-2 block ${
                  index === 4 ? "font-bold text-[#08172e]" : "text-slate-500"
                }`}
              >
                {step}
              </span>
            </li>
          ),
        )}
      </ol>

      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden="true"
        >
          <path d="M3.5 20.5h17M5 20V8l7-4 7 4v12M9 10h.01M15 10h.01M9 14h.01M15 14h.01M10 20v-3h4v3" />
        </svg>
      </div>
      <h2 className="mt-5 font-jakarta text-[27px] font-bold tracking-[-0.5px] text-[#111827]">
        Set up your company
      </h2>
      <p className="mt-1.5 font-sora text-[12px] leading-[1.6] text-slate-600 sm:text-[13px]">
        Choose your company name and personalize the workspace address.
      </p>

      <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="company-name"
            className="mb-1.5 block font-sora text-[11px] font-bold text-[#08172e]"
          >
            Company name
          </label>
          <input
            id="company-name"
            name="companyName"
            type="text"
            autoComplete="organization"
            required
            minLength={2}
            maxLength={160}
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            placeholder="e.g. Northstar Consulting"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-sora text-[13px] outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-50"
          />
        </div>

        <div>
          <p className="mb-1.5 font-sora text-[11px] font-bold text-[#08172e]">
            Company URL
          </p>
          <div className="flex min-w-0 items-center rounded-xl border border-slate-300 bg-slate-50 shadow-sm">
            <span className="max-w-[48%] shrink-0 truncate pl-3 font-sora text-[11px] text-slate-500 sm:pl-4">
              https://
            </span>
            <span className="min-w-0 flex-1 truncate px-1 py-3 font-sora text-[12px] font-semibold text-slate-800">
              {previewSlug}
            </span>
            <span className="max-w-[55%] shrink-0 truncate pr-3 font-sora text-[11px] text-slate-500 sm:pr-4">
              .{baseDomain}
            </span>
          </div>
          <p
            id="company-url-preview"
            className="mt-2 flex items-center gap-1.5 font-sora text-[10px] text-slate-500"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="h-3.5 w-3.5 shrink-0 text-emerald-600"
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
            Your URL is generated from your company name:{" "}
            <span className="truncate font-semibold text-slate-700">
              {previewUrl}
            </span>
          </p>
          <p className="mt-1 font-sora text-[10px] text-slate-500">
            If the name is already in use, we’ll add a unique suffix. You can
            change your URL later with a paid plan.
          </p>
        </div>

        {status && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 font-sora text-[11px] leading-relaxed text-red-800"
          >
            {status}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !companyName.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a4bb8] px-4 py-3 font-sora text-[12px] font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSubmitting ? "Setting up your workspace..." : "Create my workspace"}
          {!isSubmitting && (
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                d="M4 10h12m-5-5 5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </form>

      <p className="mt-4 text-center font-sora text-[10px] leading-relaxed text-slate-500">
        This address becomes your company’s sign-in URL. Pick one your team can
        easily recognize.
      </p>
    </div>
  );
}
