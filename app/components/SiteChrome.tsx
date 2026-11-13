"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Footer from "./Footer";
import Navbar from "./Navbar";
import CookieConsent from "./CookieConsent";
import ToastViewport from "./ToastViewport";
import ProcessingViewport from "./ProcessingViewport";
import { showToast } from "./toast";
import { storeAccessToken } from "./auth-state";
import { getTenantSlug } from "@/app/tenant-domain";
import {
  defaultWebsiteInfo,
  isWebsiteInfoResponse,
  type PublicWebsiteInfo,
} from "./website-info";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

export default function SiteChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [websiteInfo, setWebsiteInfo] =
    useState<PublicWebsiteInfo>(defaultWebsiteInfo);
  const [websiteInfoLoad, setWebsiteInfoLoad] = useState(0);
  const isAuthPage =
    pathname === "/signup" ||
    pathname === "/login" ||
    pathname === "/verify-email" ||
    pathname === "/two-step" ||
    pathname === "/recovery" ||
    pathname === "/workspace-setup" ||
    pathname === "/unsubscribe" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/");

  useEffect(() => {
    if (isAuthPage) return;
    let isCurrent = true;
    async function loadWebsiteInfo() {
      try {
        const response = await fetch(`${API_BASE_URL}/website-info`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(
            `Website information could not be loaded (HTTP ${response.status}).`,
          );
        }
        const payload: unknown = await response.json();
        if (!isWebsiteInfoResponse(payload)) {
          throw new Error(
            "The website information service returned invalid data.",
          );
        }
        if (isCurrent) {
          setWebsiteInfo({
            siteName: payload.siteName,
            tagline: payload.tagline,
            supportEmail: payload.supportEmail,
            contactEmail: payload.contactEmail,
            contactPhone: payload.contactPhone,
            contactAddress: payload.contactAddress,
            websiteUrl: payload.websiteUrl,
            facebookUrl: payload.facebookUrl,
            linkedinUrl: payload.linkedinUrl,
            xUrl: payload.xUrl,
            logoUrl: payload.logoUploaded
              ? `${API_BASE_URL}/website-info/logo?v=${websiteInfoLoad}`
              : null,
          });
        }
      } catch (error) {
        if (isCurrent) {
          showToast(
            error instanceof Error
              ? `${error.message} Showing default site details.`
              : "Website information could not be loaded. Showing default site details.",
            "info",
          );
        }
      }
    }
    void loadWebsiteInfo();
    const refreshWebsiteInfo = () => setWebsiteInfoLoad((count) => count + 1);
    window.addEventListener(
      "darobooks:website-info-updated",
      refreshWebsiteInfo,
    );
    return () => {
      isCurrent = false;
      window.removeEventListener(
        "darobooks:website-info-updated",
        refreshWebsiteInfo,
      );
    };
  }, [isAuthPage, websiteInfoLoad]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("loggedOut") !== "1") return;
    url.searchParams.delete("loggedOut");
    const timer = window.setTimeout(() => {
      showToast("You’ve been logged out.");
      window.history.replaceState(
        null,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isAuthPage) return;
    const handoffToken = new URLSearchParams(
      window.location.hash.slice(1),
    ).get("tenant-handoff");
    if (!handoffToken) return;

    const expectedTenantSlug = getTenantSlug(window.location.hostname);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
    async function consumeTenantHandoff() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/auth/tenant-handoff/consume`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ handoffToken }),
            cache: "no-store",
          },
        );
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            getApiErrorMessage(payload) ??
              `Tenant sign-in failed (HTTP ${response.status}).`,
          );
        }
        if (
          !isTenantHandoffConsumeResponse(payload) ||
          !expectedTenantSlug ||
          payload.tenantSlug !== expectedTenantSlug
        ) {
          throw new Error("The tenant sign-in response was invalid.");
        }
        storeAccessToken(payload.accessToken);
        Object.keys(window.sessionStorage)
          .filter((key) => key.startsWith("darobooksDashboardHome:"))
          .forEach((key) => window.sessionStorage.removeItem(key));
        showToast("You’re signed in. Welcome back.");
      } catch (error) {
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

    void consumeTenantHandoff();
  }, [isAuthPage]);

  return (
    <>
      {!isAuthPage && <Navbar websiteInfo={websiteInfo} />}
      {children}
      {!isAuthPage && <Footer websiteInfo={websiteInfo} />}
      <CookieConsent />
      <ProcessingViewport />
      <ToastViewport />
    </>
  );
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

function isTenantHandoffConsumeResponse(
  value: unknown,
): value is { accessToken: string; tenantSlug: string } {
  return (
    !!value &&
    typeof value === "object" &&
    "accessToken" in value &&
    typeof value.accessToken === "string" &&
    /^[A-Za-z0-9_-]{43}$/.test(value.accessToken) &&
    "tenantSlug" in value &&
    typeof value.tenantSlug === "string" &&
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value.tenantSlug)
  );
}
