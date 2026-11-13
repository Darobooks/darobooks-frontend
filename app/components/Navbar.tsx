"use client";

import logo from "@/app/logo-2.png";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { getLogoutRedirectUrl } from "@/app/tenant-domain";
import { AUTH_CHANGE_EVENT, notifyAuthChanged } from "./auth-state";
import type { PublicWebsiteInfo } from "./website-info";

const DASHBOARD_HOME_CACHE_PREFIX = "darobooksDashboardHome:";

function subscribeToAuthChanges(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(AUTH_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(AUTH_CHANGE_EVENT, onChange);
  };
}

function getLoggedInSnapshot() {
  return Boolean(window.sessionStorage.getItem("darobooksAccessToken"));
}

function getServerLoggedInSnapshot() {
  return false;
}

export default function Navbar({
  websiteInfo,
}: {
  websiteInfo: PublicWebsiteInfo;
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const isLoggedIn = useSyncExternalStore(
    subscribeToAuthChanges,
    getLoggedInSnapshot,
    getServerLoggedInSnapshot,
  );

  useEffect(() => {
    const updateScrollState = () => setIsScrolled(window.scrollY > 0);

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });

    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  const logOut = () => {
    window.sessionStorage.removeItem("darobooksAccessToken");
    Object.keys(window.sessionStorage)
      .filter((key) => key.startsWith(DASHBOARD_HOME_CACHE_PREFIX))
      .forEach((key) => window.sessionStorage.removeItem(key));
    setIsAccountMenuOpen(false);
    notifyAuthChanged();
    window.location.assign(getLogoutRedirectUrl());
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-colors duration-200 ${
        isScrolled ? "bg-white shadow-sm" : "bg-[#f0f7fb]"
      }`}
    >
      <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-y-4 px-6 py-5 lg:px-0">
        <Link href="/" className="flex items-center gap-2.5 lg:-translate-x-3">
          <Image
            src={websiteInfo.logoUrl ?? logo}
            alt={`${websiteInfo.siteName} logo`}
            width={300}
            height={80}
            unoptimized={Boolean(websiteInfo.logoUrl)}
            className="h-[56px] w-[200px] object-contain"
            priority
          />
        </Link>

        <nav className="order-3 flex basis-full flex-wrap items-center justify-center gap-x-5 gap-y-3 text-[13px] font-medium font-sora md:order-none md:basis-auto md:gap-7">
          <Link
            href="/features"
            className="text-black transition hover:text-blue-700"
          >
            Features
          </Link>
          <Link
            href="/pricing"
            className="text-black transition hover:text-blue-700"
          >
            Pricing
          </Link>
          <Link
            href="/who-its-for"
            className="text-black transition hover:text-blue-700"
          >
            Who it is for
          </Link>
          <Link
            href="/about"
            className="text-black transition hover:text-blue-700"
          >
            About us
          </Link>
          {!isLoggedIn && (
            <>
              <Link
                href="/login"
                className="font-semibold text-blue-700 hover:text-blue-900"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-800"
              >
                Start free
              </Link>
            </>
          )}
        </nav>

        {isLoggedIn && (
          <div className="relative font-sora">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={isAccountMenuOpen}
              onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20c.7-3.3 3.2-5 7-5s6.3 1.7 7 5" />
              </svg>
              Account
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="m7 10 5 5 5-5" />
              </svg>
            </button>
            {isAccountMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
              >
                <Link
                  href="/dashboard"
                  role="menuitem"
                  onClick={() => setIsAccountMenuOpen(false)}
                  className="block px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-blue-700"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={logOut}
                  className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3 text-left text-sm font-semibold text-red-700 transition hover:bg-red-50"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </header>
  );
}
