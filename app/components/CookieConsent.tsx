"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

const CONSENT_COOKIE = "darobooks-cookie-consent";
const CONSENT_MAX_AGE = 60 * 60 * 24 * 365;
const subscribeToConsent = () => () => {};

type CookieChoices = {
  necessary: true;
  analytics: boolean;
  advertising: boolean;
};

const defaultChoices: CookieChoices = {
  necessary: true,
  analytics: false,
  advertising: false,
};

function hasSavedConsent(): boolean {
  return document.cookie
    .split("; ")
    .some((cookie) => cookie.startsWith(`${CONSENT_COOKIE}=`));
}

export default function CookieConsent() {
  const isVisible = useSyncExternalStore(
    subscribeToConsent,
    () => !hasSavedConsent(),
    () => false,
  );
  const [isDismissed, setIsDismissed] = useState(false);
  const [isChoosing, setIsChoosing] = useState(false);
  const [choices, setChoices] = useState(defaultChoices);

  const saveChoices = (selected: CookieChoices) => {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(
      JSON.stringify(selected),
    )}; Max-Age=${CONSENT_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
    setChoices(selected);
    setIsChoosing(false);
    setIsDismissed(true);
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[70] sm:inset-x-auto sm:left-5 sm:bottom-5">
      {isChoosing ? (
        <section
          aria-labelledby="cookie-settings-title"
          className="mx-auto w-full max-w-[430px] rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.18)] sm:mx-0"
          role="dialog"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="cookie-settings-title"
                className="font-jakarta text-[15px] font-bold text-[#111827]"
              >
                Cookie preferences
              </h2>
              <p className="mt-1 font-sora text-[11px] leading-5 text-slate-600">
                Choose which optional cookies you allow. You can change this
                choice at any time.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsChoosing(false)}
              aria-label="Close cookie preferences"
              className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
            >
              ×
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <CookieToggle label="Essential cookies" checked disabled />
            <CookieToggle
              label="Analytics cookies"
              checked={choices.analytics}
              onChange={(checked) =>
                setChoices((current) => ({ ...current, analytics: checked }))
              }
            />
            <CookieToggle
              label="Advertising cookies"
              checked={choices.advertising}
              onChange={(checked) =>
                setChoices((current) => ({ ...current, advertising: checked }))
              }
            />
          </div>

          <button
            type="button"
            onClick={() => saveChoices(choices)}
            className="mt-5 w-full rounded-lg bg-[#1a4bb8] px-4 py-2.5 font-sora text-[12px] font-bold text-white hover:bg-blue-800"
          >
            Save my choices
          </button>
        </section>
      ) : (
        <section
          aria-labelledby="cookie-consent-title"
          className="mx-auto w-full max-w-[370px] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_55px_rgba(15,23,42,0.18)] sm:mx-0 sm:p-5"
        >
          <h2
            id="cookie-consent-title"
            className="font-jakarta text-[13px] font-bold text-[#111827]"
          >
            Your cookie choices
          </h2>
          <p className="mt-1 font-sora text-[10px] leading-[1.6] text-slate-600">
            We use essential cookies to make DaroBooks work. With your
            permission, analytics and advertising cookies can help us understand
            site use and improve relevant ads.{" "}
            <Link
              href="/cookie-policy"
              className="font-bold text-[#1a4bb8] hover:underline"
            >
              Read the Cookie Policy
            </Link>
          </p>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() =>
                saveChoices({
                  necessary: true,
                  analytics: true,
                  advertising: true,
                })
              }
              className="rounded-lg bg-[#1a4bb8] px-2 py-2 font-sora text-[10px] font-bold text-white hover:bg-blue-800"
            >
              Accept all
            </button>
            <button
              type="button"
              onClick={() => saveChoices(defaultChoices)}
              className="rounded-lg border border-[#1a4bb8] bg-white px-2 py-2 font-sora text-[10px] font-bold text-[#1a4bb8] hover:bg-blue-50"
            >
              Reject optional
            </button>
            <button
              type="button"
              onClick={() => setIsChoosing(true)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-2 font-sora text-[10px] font-bold text-[#111827] hover:bg-slate-50"
            >
              Choose
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function CookieToggle({
  label,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 font-sora text-[11px] font-medium text-slate-700">
      {label}
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
        className="h-4 w-4 accent-[#1a4bb8] disabled:cursor-not-allowed"
      />
    </label>
  );
}
