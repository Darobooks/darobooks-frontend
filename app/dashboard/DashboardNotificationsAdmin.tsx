"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { RiArrowDownSLine } from "@remixicon/react";
import ActionSpinner from "../components/ActionSpinner";

const ruleLabels = {
  billing: "Billing updates",
  invoices: "Invoice activity",
  bills: "Bills and payments",
  projects: "Projects and time entries",
  inventory: "Inventory and purchase orders",
  contacts: "Customers and suppliers",
  budgets: "Budgets",
  requisitions: "Requisitions and approvals",
  payroll: "Payroll",
  payouts: "Partner payouts",
  banking: "Banking and reconciliation",
  ledger: "Ledger journals",
  assets: "Fixed assets",
  taxCenter: "Tax center",
  teams: "Teams and access",
  systemAlerts: "System alerts",
} as const;
const channelLabels = {
  "in-app": "In-app",
} as const;

type Settings = {
  rules: Record<keyof typeof ruleLabels, boolean>;
  channels: Record<keyof typeof channelLabels, boolean>;
};

const defaultSettings: Settings = {
  rules: {
    billing: true,
    invoices: true,
    bills: true,
    projects: true,
    inventory: true,
    contacts: true,
    budgets: true,
    requisitions: true,
    payroll: true,
    payouts: true,
    banking: true,
    ledger: true,
    assets: true,
    taxCenter: true,
    teams: true,
    systemAlerts: true,
  },
  channels: { "in-app": true },
};

function getErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || !("message" in payload)) {
    return null;
  }
  return typeof payload.message === "string" ? payload.message : null;
}

function isBooleanRecord(value: unknown, keys: readonly string[]): boolean {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every(
      (key) =>
        key in value &&
        typeof (value as Record<string, unknown>)[key] === "boolean",
    )
  );
}

function isSettings(value: unknown): value is Settings {
  return (
    !!value &&
    typeof value === "object" &&
    "rules" in value &&
    "channels" in value &&
    isBooleanRecord(value.rules, Object.keys(ruleLabels)) &&
    isBooleanRecord(value.channels, Object.keys(channelLabels))
  );
}

export default function DashboardNotificationsAdmin() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(true);
  const [isChannelsOpen, setIsChannelsOpen] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError("");
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) {
      setError("Sign in to manage notifications.");
      setIsLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/admin/notifications/settings", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload) ??
            `Could not load notification settings (HTTP ${response.status}).`,
        );
      }
      if (!isSettings(payload)) {
        throw new Error("The notification service returned invalid settings.");
      }
      setSettings(payload);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load notification settings. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadSettings(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSettings]);

  const saveSettings = async () => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || isSaving) return;
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/notifications/settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload) ??
            `Could not save notification settings (HTTP ${response.status}).`,
        );
      }
      setMessage(getErrorMessage(payload) ?? "Notification settings saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save notification settings. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const sendBroadcast = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || isSending) return;
    setIsSending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload) ??
            `Could not send notification (HTTP ${response.status}).`,
        );
      }
      setMessage(getErrorMessage(payload) ?? "Notification sent to users.");
      setTitle("");
      setBody("");
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Could not send notification. Please try again.",
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-[#dfe8f6] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1e4fc1]">
              Super admin
            </p>
            <h2 className="mt-1 text-[18px] font-bold text-[#10213c]">
              Notification management
            </h2>
            <p className="mt-1 text-[10px] text-slate-600">
              Configure delivery preferences and send in-app notices to users.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void saveSettings()}
            disabled={isLoading || isSaving}
            className="inline-flex h-9 items-center justify-center rounded-md bg-[#1e4fc1] px-4 text-[10px] font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? (
              <span className="inline-flex items-center gap-2">
                <ActionSpinner label="Saving preferences" /> Saving…
              </span>
            ) : (
              "Save preferences"
            )}
          </button>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-800"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadSettings()}
            className="shrink-0 font-bold underline"
          >
            Retry
          </button>
        </div>
      ) : null}
      {message ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] text-emerald-800"
        >
          {message}
        </p>
      ) : null}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
        <div className="space-y-3">
          <section className="overflow-hidden rounded-2xl border border-[#dfe8f6] bg-white shadow-sm">
            <button
              type="button"
              aria-expanded={isRulesOpen}
              aria-controls="notification-rules-panel"
              onClick={() => setIsRulesOpen((open) => !open)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left sm:px-5"
            >
              <span>
                <span className="block text-[12px] font-bold text-[#10213c]">
                  Notification rules
                </span>
                <span className="mt-0.5 block text-[9px] text-slate-500">
                  Choose which events create notifications.
                </span>
              </span>
              <RiArrowDownSLine
                aria-hidden="true"
                className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
                  isRulesOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {isRulesOpen ? (
              <div
                id="notification-rules-panel"
                className="space-y-2 border-t border-[#edf2ff] px-4 py-3 sm:px-5"
              >
                {(Object.keys(ruleLabels) as (keyof typeof ruleLabels)[]).map(
                  (key) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#edf2ff] bg-[#f9fbff] px-3 py-2.5 transition hover:bg-[#f4f7ff]"
                    >
                      <span>
                        <span className="block text-[10px] font-semibold text-[#10213c]">
                          {ruleLabels[key]}
                        </span>
                        <span className="mt-0.5 block text-[8px] text-slate-500">
                          {key === "billing"
                            ? "Plan and subscription events"
                            : key === "invoices"
                              ? "Invoice activity and status changes"
                              : key === "bills"
                                ? "Bill status and payment activity"
                                : key === "projects"
                                  ? "Project creation and time tracking"
                                  : key === "inventory"
                                    ? "Stock and purchase order activity"
                                    : key === "contacts"
                                      ? "Customer and supplier changes"
                                      : key === "budgets"
                                        ? "Budget creation and changes"
                                        : key === "requisitions"
                                          ? "Spend requests and approval decisions"
                                          : key === "payroll"
                                            ? "Payroll review and approval stages"
                                            : key === "payouts"
                                              ? "Partner sales and payout approvals"
                                              : key === "banking"
                                                ? "Statements and reconciliation changes"
                                                : key === "ledger"
                                                  ? "Journal activity"
                                                  : key === "assets"
                                                    ? "Fixed asset activity"
                                                    : key === "taxCenter"
                                                      ? "Tax settings and filing readiness"
                                                      : key === "teams"
                                                        ? "Member and role changes"
                                                        : "Important service announcements"}
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.rules[key]}
                        disabled={isLoading}
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            rules: {
                              ...current.rules,
                              [key]: event.target.checked,
                            },
                          }))
                        }
                        className="h-4 w-4 shrink-0 accent-[#1e4fc1]"
                      />
                    </label>
                  ),
                )}
              </div>
            ) : null}
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#dfe8f6] bg-white shadow-sm">
            <button
              type="button"
              aria-expanded={isChannelsOpen}
              aria-controls="notification-channels-panel"
              onClick={() => setIsChannelsOpen((open) => !open)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left sm:px-5"
            >
              <span>
                <span className="block text-[12px] font-bold text-[#10213c]">
                  Delivery channels
                </span>
                <span className="mt-0.5 block text-[9px] text-slate-500">
                  Select where notifications are delivered.
                </span>
              </span>
              <RiArrowDownSLine
                aria-hidden="true"
                className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
                  isChannelsOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {isChannelsOpen ? (
              <div
                id="notification-channels-panel"
                className="space-y-2 border-t border-[#edf2ff] px-4 py-3 sm:px-5"
              >
                {(
                  Object.keys(channelLabels) as (keyof typeof channelLabels)[]
                ).map((key) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#edf2ff] bg-[#f9fbff] px-3 py-2.5 transition hover:bg-[#f4f7ff]"
                  >
                    <span>
                      <span className="block text-[10px] font-semibold text-[#10213c]">
                        {channelLabels[key]}
                      </span>
                      <span className="mt-0.5 block text-[8px] text-slate-500">
                        Deliver notifications to the in-app inbox.
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.channels[key]}
                      disabled={isLoading}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          channels: {
                            ...current.channels,
                            [key]: event.target.checked,
                          },
                        }))
                      }
                      className="h-4 w-4 shrink-0 accent-[#1e4fc1]"
                    />
                  </label>
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <form
          onSubmit={sendBroadcast}
          className="rounded-2xl border border-[#dfe8f6] bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="flex flex-col gap-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#1e4fc1]">
              Broadcast
            </p>
            <h3 className="text-[13px] font-bold text-[#10213c]">
              Send an announcement
            </h3>
            <p className="text-[9px] leading-relaxed text-slate-600">
              This message will appear in the notification inbox of verified
              users.
            </p>
          </div>
          <div className="mt-4 space-y-3">
            <label className="block text-[9px] font-semibold text-slate-600">
              Announcement title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                minLength={2}
                maxLength={120}
                required
                aria-label="Announcement title"
                placeholder="Give your announcement a title"
                className="mt-1 h-9 w-full rounded-lg border border-[#d9e3f4] bg-[#f9fbff] px-3 text-[10px] text-[#10213c] outline-none transition focus:border-[#1e4fc1] focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="block text-[9px] font-semibold text-slate-600">
              Message
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                minLength={2}
                maxLength={2000}
                required
                aria-label="Announcement message"
                placeholder="Write a clear message for your users…"
                rows={10}
                className="mt-1 min-h-56 w-full resize-y rounded-lg border border-[#d9e3f4] bg-[#f9fbff] px-3 py-3 text-[10px] font-normal leading-relaxed text-[#10213c] outline-none transition placeholder:text-slate-400 focus:border-[#1e4fc1] focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <div className="flex flex-col-reverse gap-3 border-t border-[#edf1f7] pt-3 sm:flex-row sm:items-center sm:justify-between">
              <span aria-live="polite" className="text-[8px] text-slate-500">
                {body.length}/2000 characters
              </span>
              <button
                type="submit"
                disabled={isSending || isLoading}
                className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-md bg-[#1e4fc1] px-4 text-[10px] font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
              >
                {isSending ? (
                  <>
                    <ActionSpinner label="Sending notification" /> Sending…
                  </>
                ) : (
                  "Send to users"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
