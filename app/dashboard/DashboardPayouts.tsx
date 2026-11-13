"use client";

import { Fragment, useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  RiArrowRightSLine,
  RiBankCardLine,
  RiCloseLine,
  RiEyeLine,
  RiMailLine,
  RiSettings3Line,
} from "@remixicon/react";
import ActionSpinner from "../components/ActionSpinner";

type PayoutRule =
  { type: "share"; value: number } | { type: "fixed"; value: number };

type PartnerPayout = {
  id: string;
  partner: string;
  service: string;
  email: string | null;
  rule: PayoutRule;
  sales: number;
  sessions: number;
  activityVat: number;
  activityWht: number;
  netPayable: number;
  withholdingRateBps: number;
  status: "pending" | "approved";
  activities: PayoutActivity[];
};

type PayoutActivity = {
  id: string;
  sales: number;
  sessions: number;
  description: string;
  createdAt: string;
  vatEnabled: boolean;
  vatRate: number;
  whtEnabled: boolean;
  whtRate: number;
};

type PayoutActivityPayload = Omit<PayoutActivity, "sales"> & {
  salesMinor: string;
};

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

type PayoutsPayload = {
  period: string;
  currency: string;
  payouts: {
    id: string;
    partner: string;
    service: string;
    email?: string | null;
    ruleType: "share" | "fixed";
    ruleValue: number;
    salesMinor: string;
    sessions: number;
    activityVatMinor: string;
    activityWhtMinor: string;
    netMinor: string;
    withholdingRateBps: number;
    status: "pending" | "approved";
    activities?: PayoutActivityPayload[];
  }[];
};

function currentPeriod() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(period: string) {
  const date = new Date(`${period}-01T00:00:00`);
  return Number.isNaN(date.getTime())
    ? period
    : new Intl.DateTimeFormat(undefined, {
        month: "long",
        year: "numeric",
      }).format(date);
}

function getErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || !("message" in payload)) {
    return null;
  }
  return typeof payload.message === "string" ? payload.message : null;
}

function isPayoutsPayload(payload: unknown): payload is PayoutsPayload {
  return (
    !!payload &&
    typeof payload === "object" &&
    "period" in payload &&
    typeof payload.period === "string" &&
    "currency" in payload &&
    typeof payload.currency === "string" &&
    "payouts" in payload &&
    Array.isArray(payload.payouts) &&
    payload.payouts.every(
      (payout) =>
        !!payout &&
        typeof payout === "object" &&
        "id" in payout &&
        typeof payout.id === "string" &&
        "partner" in payout &&
        typeof payout.partner === "string" &&
        "service" in payout &&
        typeof payout.service === "string" &&
        (!("email" in payout) ||
          payout.email === null ||
          typeof payout.email === "string") &&
        "ruleType" in payout &&
        (payout.ruleType === "share" || payout.ruleType === "fixed") &&
        "ruleValue" in payout &&
        typeof payout.ruleValue === "number" &&
        "salesMinor" in payout &&
        typeof payout.salesMinor === "string" &&
        "sessions" in payout &&
        typeof payout.sessions === "number" &&
        "activityVatMinor" in payout &&
        typeof payout.activityVatMinor === "string" &&
        "activityWhtMinor" in payout &&
        typeof payout.activityWhtMinor === "string" &&
        "netMinor" in payout &&
        typeof payout.netMinor === "string" &&
        "withholdingRateBps" in payout &&
        typeof payout.withholdingRateBps === "number" &&
        "status" in payout &&
        (payout.status === "pending" || payout.status === "approved") &&
        (!("activities" in payout) ||
          (Array.isArray(payout.activities) &&
            payout.activities.every(isPayoutActivityPayload))),
    )
  );
}

function isPayoutActivityPayload(
  value: unknown,
): value is PayoutActivityPayload {
  return (
    !!value &&
    typeof value === "object" &&
    "id" in value &&
    typeof value.id === "string" &&
    "salesMinor" in value &&
    typeof value.salesMinor === "string" &&
    "sessions" in value &&
    typeof value.sessions === "number" &&
    "description" in value &&
    typeof value.description === "string" &&
    "createdAt" in value &&
    typeof value.createdAt === "string" &&
    "vatEnabled" in value &&
    typeof value.vatEnabled === "boolean" &&
    "vatRate" in value &&
    typeof value.vatRate === "number" &&
    "whtEnabled" in value &&
    typeof value.whtEnabled === "boolean" &&
    "whtRate" in value &&
    typeof value.whtRate === "number"
  );
}

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "code",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

function getOwed(payout: PartnerPayout) {
  return payout.rule.type === "share"
    ? Math.round((payout.sales * payout.rule.value) / 100)
    : payout.rule.value * payout.sessions;
}

function getWithholding(owed: number, payout: PartnerPayout) {
  return Math.round((owed * payout.withholdingRateBps) / 10000);
}

function getActivityTax(sales: number, rate: number) {
  return Math.round(sales * 100 * (rate / 100)) / 100;
}

function formatRule(rule: PayoutRule) {
  return rule.type === "share" ? `Share ${rule.value}%` : "Fixed fee";
}

export default function DashboardPayouts({
  search = "",
  currency = "USD",
  vatRate,
  whtRate,
  onNotice,
}: {
  search?: string;
  currency?: string;
  vatRate: number;
  whtRate: number;
  onNotice: (message: string) => void;
}) {
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [expandedPartnerId, setExpandedPartnerId] = useState("");
  const [period, setPeriod] = useState(currentPeriod);
  const [payouts, setPayouts] = useState<PartnerPayout[]>([]);
  const [apiCurrency, setApiCurrency] = useState(currency);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"rules" | "partner" | "sales" | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState("");
  const [ruleDrafts, setRuleDrafts] = useState<
    Record<string, { type: "share" | "fixed"; value: string }>
  >({});
  const [newPartner, setNewPartner] = useState({
    name: "",
    service: "",
    email: "",
    ruleType: "share" as "share" | "fixed",
    ruleValue: "60",
  });
  const [salesEntry, setSalesEntry] = useState({
    sales: "",
    sessions: "",
    description: "",
    vatEnabled: false,
    whtEnabled: false,
  });

  const loadPayouts = useCallback(
    async (showLoading = true) => {
      if (showLoading) setIsLoading(true);
      setError("");
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) {
        setError("Sign in to view partner payouts.");
        if (showLoading) setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/dashboard/payouts?period=${encodeURIComponent(period)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          },
        );
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            getErrorMessage(payload) ??
              `Could not load payouts (HTTP ${response.status}).`,
          );
        }
        if (!isPayoutsPayload(payload)) {
          throw new Error("The payout service returned invalid data.");
        }
        const nextPayouts = payload.payouts.map((payout) => ({
          id: payout.id,
          partner: payout.partner,
          service: payout.service,
          email: payout.email ?? null,
          rule: { type: payout.ruleType, value: payout.ruleValue } as PayoutRule,
          sales: Number(payout.salesMinor) / 100,
          sessions: payout.sessions,
          activityVat: Number(payout.activityVatMinor) / 100,
          activityWht: Number(payout.activityWhtMinor) / 100,
          netPayable: Number(payout.netMinor) / 100,
          withholdingRateBps: payout.withholdingRateBps,
          status: payout.status,
          activities: (payout.activities ?? []).map((activity) => ({
            id: activity.id,
            sales: Number(activity.salesMinor) / 100,
            sessions: activity.sessions,
            description: activity.description,
            createdAt: activity.createdAt,
            vatEnabled: activity.vatEnabled,
            vatRate: activity.vatRate,
            whtEnabled: activity.whtEnabled,
            whtRate: activity.whtRate,
          })),
        }));
        setPayouts(nextPayouts);
        setApiCurrency(payload.currency);
        setSelectedPartnerId((current) =>
          nextPayouts.some((payout) => payout.id === current)
            ? current
            : (nextPayouts[0]?.id ?? ""),
        );
        setRuleDrafts(
          Object.fromEntries(
            nextPayouts.map((payout) => [
              payout.id,
              { type: payout.rule.type, value: String(payout.rule.value) },
            ]),
          ),
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load payouts. Please try again.",
        );
      } finally {
        if (showLoading) setIsLoading(false);
      }
    },
    [period],
  );

  useEffect(() => {
    void loadPayouts();
  }, [loadPayouts]);

  const visiblePayouts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return payouts.filter(
      (payout) =>
        !query ||
        `${payout.partner} ${payout.service} ${formatRule(payout.rule)}`
          .toLowerCase()
          .includes(query),
    );
  }, [payouts, search]);

  const selectedPayout =
    payouts.find((payout) => payout.id === selectedPartnerId) ??
    visiblePayouts[0];
  const totals = payouts.reduce(
    (summary, payout) => {
      const owed = getOwed(payout);
      const withholding = getWithholding(owed, payout);
      return {
        sales: summary.sales + payout.sales,
        owed: summary.owed + owed,
        withholding: summary.withholding + withholding,
        net: summary.net + payout.netPayable,
      };
    },
    { sales: 0, owed: 0, withholding: 0, net: 0 },
  );
  const allActivityWht = payouts.reduce(
    (total, payout) => total + payout.activityWht,
    0,
  );
  const payoutCurrency = apiCurrency || currency;
  const payoutMonth = monthLabel(period);
  const salesEntryAmount = Number(salesEntry.sales);
  const previewSales = Number.isFinite(salesEntryAmount) ? salesEntryAmount : 0;
  const previewVat =
    salesEntry.vatEnabled && previewSales > 0
      ? getActivityTax(previewSales, vatRate)
      : 0;
  const previewWht =
    salesEntry.whtEnabled && previewSales > 0
      ? getActivityTax(previewSales, whtRate)
      : 0;

  const focusPayout = (partnerId: string) => {
    setSelectedPartnerId(partnerId);
  };

  const togglePartner = (partnerId: string) => {
    focusPayout(partnerId);
    setExpandedPartnerId((current) =>
      current === partnerId ? "" : partnerId,
    );
  };

  const emailStatement = async () => {
    if (!selectedPayout?.email) {
      setError("Add an email address to this partner before emailing a statement.");
      return;
    }
    const sent = await submitPayoutAction(
      `/dashboard/payouts/partners/${encodeURIComponent(selectedPayout.id)}/statement-email`,
      { period },
      "email-statement",
    );
    if (sent) onNotice(`Payout statement emailed to ${selectedPayout.email}.`);
  };

  const submitPayoutAction = async (
    url: string,
    body: Record<string, unknown>,
    actionKey: string,
  ) => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || isSaving) {
      if (!token) setError("Sign in again to manage partner payouts.");
      return false;
    }
    setIsSaving(actionKey);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload) ??
            `Payout action failed (HTTP ${response.status}).`,
        );
      }
      return true;
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Payout action failed. Please try again.",
      );
      return false;
    } finally {
      setIsSaving("");
    }
  };

  const createPartner = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const created = await submitPayoutAction(
      "/dashboard/payouts/partners",
      {
        name: newPartner.name,
        service: newPartner.service,
        email: newPartner.email,
        ruleType: newPartner.ruleType,
        ruleValue: Number(newPartner.ruleValue),
      },
      "create-partner",
    );
    if (!created) return;
    setModal(null);
    setNewPartner({
      name: "",
      service: "",
      email: "",
      ruleType: "share",
      ruleValue: "60",
    });
    onNotice("Partner added.");
    await loadPayouts(false);
  };

  const recordSales = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const partnerId = selectedPartnerId || payouts[0]?.id || "";
    if (!partnerId) {
      setError("Add a partner before recording activity.");
      return;
    }
    const salesValue = Number(salesEntry.sales);
    const sessionsValue = Number(salesEntry.sessions);
    if (
      (!salesEntry.sales || Number.isNaN(salesValue) || salesValue < 0) &&
      (!salesEntry.sessions || Number.isNaN(sessionsValue) || sessionsValue < 0)
    ) {
      setError("Enter either a sales amount or session count before saving.");
      return;
    }
    const recorded = await submitPayoutAction(
      "/dashboard/payouts/sales",
      {
        partnerId,
        period,
        sales: salesValue || 0,
        sessions: sessionsValue || 0,
        vatEnabled: salesEntry.vatEnabled,
        whtEnabled: salesEntry.whtEnabled,
        description: salesEntry.description,
      },
      "record-sales",
    );
    if (!recorded) return;
    setModal(null);
    setSalesEntry({
      sales: "",
      sessions: "",
      description: "",
      vatEnabled: false,
      whtEnabled: false,
    });
    onNotice("Partner sales recorded.");
    await loadPayouts(false);
  };

  const saveRule = async (payout: PartnerPayout) => {
    const draft = ruleDrafts[payout.id];
    if (!draft) return;
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || isSaving) {
      if (!token) setError("Sign in again to update payout rules.");
      return;
    }
    setIsSaving(`rule-${payout.id}`);
    setError("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/dashboard/payouts/partners/${encodeURIComponent(payout.id)}/rule`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ruleType: draft.type,
            ruleValue: Number(draft.value),
          }),
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload) ??
            `Could not save payout rule (HTTP ${response.status}).`,
        );
      }
      onNotice("Payout rule saved.");
      await loadPayouts(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save payout rule. Please try again.",
      );
    } finally {
      setIsSaving("");
    }
  };

  const approvePayouts = async () => {
    const approved = await submitPayoutAction(
      "/dashboard/payouts/approve",
      { period },
      "approve",
    );
    if (!approved) return;
    onNotice("Payouts approved. No funds were transferred.");
    await loadPayouts(false);
  };

  return (
    <section aria-labelledby="payouts-heading" className="space-y-3">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1
              id="payouts-heading"
              className="font-jakarta text-[19px] font-bold tracking-[-0.35px] text-[#10213c] sm:text-[21px]"
            >
              Partner payouts
            </h1>
          </div>
          <p className="mt-1 text-[10px] text-slate-600">
            Revenue-share and per-session fees for facilitators, agents and
            partners.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-9 items-center gap-2 rounded-lg border border-[#dbe4f3] bg-white px-2.5 text-[9px] font-semibold text-slate-600">
            Month
            <input
              type="month"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="min-w-0 bg-transparent text-[10px] text-[#10213c] outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => setModal("partner")}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dbe4f3] bg-white px-3 text-[10px] font-bold text-[#10213c] transition hover:bg-slate-50"
          >
            Add partner
          </button>
          <button
            type="button"
            onClick={() => setModal("rules")}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dbe4f3] bg-white px-3 text-[10px] font-bold text-[#10213c] transition hover:bg-slate-50"
          >
            <RiSettings3Line className="h-3.5 w-3.5" />
            Manage rules
          </button>
          <button
            type="button"
            onClick={() => void approvePayouts()}
            disabled={
              isLoading ||
              isSaving !== "" ||
              !payouts.some((payout) => payout.status === "pending")
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1e4fc1] px-3 text-[10px] font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RiBankCardLine className="h-3.5 w-3.5" />
            {isSaving === "approve" ? "Approving…" : "Approve payouts"}
          </button>
        </div>
      </header>

      <div
        role="note"
        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[9px] leading-relaxed text-blue-900"
      >
        Amounts use recorded partner sales and saved payout rules for {payoutMonth}.
        Approval records the payout snapshot; it does not transfer funds.
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-700"
        >
          {error}
        </p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Partner sales this month"
          value={formatMoney(totals.sales, payoutCurrency)}
          icon={<RiBankCardLine className="h-3.5 w-3.5" />}
        />
        <SummaryCard
          label="Owed to partners"
          value={formatMoney(totals.owed, payoutCurrency)}
          icon={<RiArrowRightSLine className="h-3.5 w-3.5" />}
        />
        <SummaryCard
          label="WHT to remit"
          value={formatMoney(totals.withholding, payoutCurrency)}
          icon={<span className="text-[9px] font-bold">WHT</span>}
        />
        <SummaryCard
          label="Activity WHT"
          value={formatMoney(allActivityWht, payoutCurrency)}
          icon={<span className="text-[9px] font-bold">WHT</span>}
        />
        <SummaryCard
          label="Net to pay out"
          value={formatMoney(totals.net, payoutCurrency)}
          icon={<RiBankCardLine className="h-3.5 w-3.5" />}
          emphasized
        />
      </div>

      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.8fr)_minmax(240px,0.8fr)]">
        <section
          aria-label="Partner payout summary"
          className="min-w-0 overflow-hidden rounded-xl border border-[#dfe7f4] bg-white"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf1f7] px-3 py-2.5">
            <div>
              <h2 className="text-[10px] font-bold text-[#10213c]">
                Payouts by partner
              </h2>
              <p className="mt-0.5 text-[8px] text-slate-500">
                {visiblePayouts.length} of {payouts.length} partners ·{" "}
                {payoutMonth}
              </p>
            </div>
            <span className="rounded-full bg-[#e8f7f5] px-2 py-1 text-[8px] font-semibold text-[#087e75]">
              WHT
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[730px] border-collapse text-left">
              <thead className="bg-[#f8faff]">
                <tr className="text-[8px] font-semibold text-slate-500">
                  <th scope="col" className="px-3 py-2.5">
                    Partner
                  </th>
                  <th scope="col" className="px-2 py-2.5">
                    Rule
                  </th>
                  <th scope="col" className="px-2 py-2.5 text-right">
                    Sales or sessions
                  </th>
                  <th scope="col" className="px-2 py-2.5 text-right">
                    Activity WHT
                  </th>
                  <th scope="col" className="px-2 py-2.5 text-right">
                    Owed
                  </th>
                  <th scope="col" className="px-2 py-2.5 text-right">
                    Payout WHT
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right">
                    Net payable
                  </th>
                </tr>
              </thead>
              <tbody>
                {visiblePayouts.map((payout) => {
                  const owed = getOwed(payout);
                  const withholding = getWithholding(owed, payout);
                  const isSelected = selectedPayout?.id === payout.id;
                  const isExpanded = expandedPartnerId === payout.id;
                  return (
                    <Fragment key={payout.id}>
                      <tr
                        className={`border-t border-[#edf1f7] text-[9px] transition ${
                          isSelected ? "bg-[#f5f8ff]" : "hover:bg-slate-50/70"
                        }`}
                      >
                        <th scope="row" className="px-3 py-2.5 font-normal">
                          <button
                            type="button"
                            aria-pressed={isSelected}
                            aria-expanded={isExpanded}
                            aria-controls={`payout-activities-${payout.id}`}
                            onClick={() => togglePartner(payout.id)}
                            className="flex items-start gap-1 text-left"
                          >
                            <RiArrowRightSLine
                              className={`mt-0.5 h-3.5 w-3.5 shrink-0 transition-transform ${
                                isExpanded ? "rotate-90" : ""
                              }`}
                            />
                            <span>
                              <span className="block font-bold text-[#10213c]">
                                {payout.partner}
                              </span>
                              <span className="mt-0.5 block max-w-[150px] text-[8px] leading-tight text-slate-500">
                                {payout.service}
                              </span>
                            </span>
                          </button>
                        </th>
                        <td className="px-2 py-2.5">
                          <span className="rounded bg-[#e8f7f5] px-1.5 py-1 text-[8px] font-bold text-[#087e74]">
                            {formatRule(payout.rule)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2.5 text-right text-slate-600">
                          {payout.rule.type === "share"
                            ? formatMoney(payout.sales, payoutCurrency)
                            : `${payout.sessions} sessions`}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2.5 text-right text-slate-700">
                          {formatMoney(payout.activityWht, payoutCurrency)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2.5 text-right text-slate-700">
                          {formatMoney(owed, payoutCurrency)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2.5 text-right text-slate-500">
                          −{formatMoney(withholding, payoutCurrency)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold text-[#10213c]">
                          {formatMoney(owed - withholding, payoutCurrency)}
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr>
                          <td
                            id={`payout-activities-${payout.id}`}
                            colSpan={7}
                            className="border-t border-[#edf1f7] bg-[#f8fafc] px-4 py-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h3 className="text-[9px] font-bold text-[#10213c]">
                                Recorded activities · {payoutMonth}
                              </h3>
                              <button
                                type="button"
                                onClick={() => {
                                  focusPayout(payout.id);
                                  setModal("sales");
                                }}
                                disabled={payout.status === "approved"}
                                className="rounded-md bg-[#1e4fc1] px-2.5 py-1.5 text-[8px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Record activity
                              </button>
                            </div>
                            {payout.activities.length ? (
                              <ul className="mt-2 divide-y divide-[#e7edf5]">
                                {payout.activities.map((activity) => (
                                  <li
                                    key={activity.id}
                                    className="grid gap-1 py-2 text-[8px] text-slate-600 sm:grid-cols-[1fr_auto] sm:items-center"
                                  >
                                    <div>
                                      <p className="font-semibold text-[#10213c]">
                                        {activity.description || "Partner activity"}
                                      </p>
                                      <p className="mt-0.5">
                                        {new Date(activity.createdAt).toLocaleString()} · {activity.sessions} sessions
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 sm:justify-end">
                                      <span>
                                        Sales {formatMoney(activity.sales, payoutCurrency)}
                                      </span>
                                      {activity.vatEnabled ? (
                                        <span>
                                          VAT {activity.vatRate}% · {formatMoney(getActivityTax(activity.sales, activity.vatRate), payoutCurrency)}
                                        </span>
                                      ) : null}
                                      {activity.whtEnabled ? (
                                        <span>
                                          WHT {activity.whtRate}% · {formatMoney(getActivityTax(activity.sales, activity.whtRate), payoutCurrency)}
                                        </span>
                                      ) : null}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="mt-2 text-[8px] text-slate-500">
                                No activity has been recorded for this partner this month.
                              </p>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
                {visiblePayouts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-[9px] text-slate-500"
                    >
                      {isLoading
                        ? "Loading partner payouts…"
                        : payouts.length
                          ? "No partner payouts match your search."
                          : "No payout partners yet. Add a partner to start recording payouts."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-3">
          <section
            aria-labelledby="payout-statement-heading"
            className="rounded-xl border border-[#dfe7f4] bg-white p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h2
                id="payout-statement-heading"
                className="text-[10px] font-bold text-[#10213c]"
              >
                Payout statement
              </h2>
              <span className="inline-flex items-center gap-1 text-[8px] font-semibold text-[#087e75]">
                <RiEyeLine className="h-3 w-3" />
                Statement
              </span>
            </div>
            {selectedPayout ? (
              <>
                <p className="mt-2 text-[9px] font-bold text-[#10213c]">
                  {selectedPayout.partner}
                </p>
                <p className="mt-0.5 text-[8px] text-slate-500">
                  {selectedPayout.service} · {payoutMonth}
                </p>
                <p className="mt-1 break-all text-[8px] text-slate-500">
                  {selectedPayout.email || "No partner email on file"}
                </p>
                <div className="mt-3 space-y-1.5 border-y border-dashed border-[#dbe4f3] py-2 text-[8px]">
                  <StatementLine
                    label="Partner sales"
                    value={formatMoney(selectedPayout.sales, payoutCurrency)}
                  />
                  <StatementLine
                    label="Activity VAT"
                    value={formatMoney(selectedPayout.activityVat, payoutCurrency)}
                    muted
                  />
                  <StatementLine
                    label="Activity WHT"
                    value={formatMoney(selectedPayout.activityWht, payoutCurrency)}
                    muted
                  />
                  <StatementLine
                    label={
                      selectedPayout.rule.type === "share"
                        ? `Partner share (${selectedPayout.rule.value}%)`
                        : `Session fee (${selectedPayout.sessions} sessions)`
                    }
                    value={formatMoney(
                      getOwed(selectedPayout),
                      payoutCurrency,
                    )}
                  />
                  <StatementLine
                    label={`WHT ${selectedPayout.withholdingRateBps / 100}%`}
                    value={`−${formatMoney(
                      getWithholding(getOwed(selectedPayout), selectedPayout),
                      payoutCurrency,
                    )}`}
                    muted
                  />
                  <StatementLine
                    label="Net payable"
                    value={formatMoney(selectedPayout.netPayable, payoutCurrency)}
                    strong
                  />
                </div>
                <p className="mt-2 text-[8px] font-semibold capitalize text-slate-500">
                  Status: {selectedPayout.status}
                </p>
                <button
                  type="button"
                  disabled={selectedPayout.status === "approved" || isSaving !== ""}
                  onClick={() => setModal("sales")}
                  className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-[#1e4fc1] px-3 text-[9px] font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RiBankCardLine className="h-3.5 w-3.5" />
                  Record sales or sessions
                </button>
                <button
                  type="button"
                  onClick={() => void emailStatement()}
                  disabled={!selectedPayout.email || isSaving !== ""}
                  className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-[#dbe4f3] bg-white px-3 text-[9px] font-bold text-[#10213c] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving === "email-statement" ? (
                    <>
                      <ActionSpinner label="Sending payout statement" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <RiMailLine className="h-3.5 w-3.5" />
                      Send statement by email
                    </>
                  )}
                </button>
              </>
            ) : (
              <p className="mt-3 rounded-lg bg-[#f7f9fd] px-3 py-5 text-center text-[9px] text-slate-500">
                Choose a partner to preview their statement.
              </p>
            )}
          </section>

          <div className="rounded-xl border border-[#bfe7e2] bg-[#e8f7f5] p-3 text-[8px] leading-relaxed text-[#176b66]">
            Rules are calculated as a percentage of recorded sales or as a
            fixed amount per recorded session. Approval stores an auditable
            payout snapshot; payment transfer is not connected.
          </div>
        </aside>
      </div>

      {modal ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving) setModal(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="payout-dialog-heading"
            className="w-full max-w-lg rounded-2xl border border-[#dfe8f6] bg-white p-4 shadow-2xl sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#1e4fc1]">
                  Partner settings
                </p>
                <h2
                  id="payout-dialog-heading"
                  className="mt-1 text-[15px] font-bold text-[#10213c]"
                >
                  {modal === "rules"
                    ? "Payout rules"
                    : modal === "partner"
                      ? "Add payout partner"
                      : "Record partner activity"}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close payout dialog"
                onClick={() => setModal(null)}
                disabled={isSaving !== ""}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
              >
                <RiCloseLine className="h-4 w-4" />
              </button>
            </div>
            {modal === "rules" ? (
              <>
                <p className="mt-2 text-[9px] leading-relaxed text-slate-500">
                  Rules apply to future approvals. Existing approved payout
                  statements keep their saved calculation.
                </p>
                <div className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto">
                  {payouts.length ? (
                    payouts.map((payout) => {
                      const draft = ruleDrafts[payout.id] ?? {
                        type: payout.rule.type,
                        value: String(payout.rule.value),
                      };
                      return (
                        <div
                          key={payout.id}
                          className="rounded-lg border border-[#edf2ff] bg-[#f9fbff] px-3 py-2"
                        >
                          <div className="mb-2 min-w-0">
                            <p className="truncate text-[9px] font-bold text-[#10213c]">
                              {payout.partner}
                            </p>
                            <p className="mt-0.5 truncate text-[8px] text-slate-500">
                              {payout.service}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-end gap-2">
                            <label className="flex flex-1 flex-col gap-1 text-[8px] font-semibold text-slate-500">
                              Calculation
                              <select
                                value={draft.type}
                                onChange={(event) =>
                                  setRuleDrafts((current) => ({
                                    ...current,
                                    [payout.id]: {
                                      ...draft,
                                      type: event.target.value as
                                        | "share"
                                        | "fixed",
                                    },
                                  }))
                                }
                                className="h-8 rounded-md border border-[#dfe8f6] bg-white px-2 text-[9px] text-[#10213c]"
                              >
                                <option value="share">Share of sales (%)</option>
                                <option value="fixed">Fee per session</option>
                              </select>
                            </label>
                            <label className="flex flex-1 flex-col gap-1 text-[8px] font-semibold text-slate-500">
                              {draft.type === "share"
                                ? "Share percent"
                                : `Fee (${payoutCurrency})`}
                              <input
                                type="number"
                                min="0.01"
                                max={draft.type === "share" ? "100" : undefined}
                                step="0.01"
                                value={draft.value}
                                onChange={(event) =>
                                  setRuleDrafts((current) => ({
                                    ...current,
                                    [payout.id]: {
                                      ...draft,
                                      value: event.target.value,
                                    },
                                  }))
                                }
                                className="h-8 rounded-md border border-[#dfe8f6] bg-white px-2 text-[9px] text-[#10213c]"
                              />
                            </label>
                            <button
                              type="button"
                              disabled={
                                isSaving !== "" ||
                                payout.status === "approved" ||
                                (draft.type === payout.rule.type &&
                                  Number(draft.value) === payout.rule.value)
                              }
                              onClick={() => void saveRule(payout)}
                              className="h-8 rounded-md bg-[#1e4fc1] px-3 text-[9px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isSaving === `rule-${payout.id}`
                                ? "Saving…"
                                : payout.status === "approved"
                                  ? "Approved"
                                  : "Save rule"}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="rounded-lg bg-[#f7f9fd] px-3 py-6 text-center text-[9px] text-slate-500">
                      Add a partner before configuring payout rules.
                    </p>
                  )}
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="h-8 rounded-lg bg-[#1e4fc1] px-4 text-[9px] font-bold text-white hover:bg-blue-800"
                  >
                    Done
                  </button>
                </div>
              </>
            ) : modal === "partner" ? (
              <form onSubmit={createPartner} className="mt-4 space-y-3">
                <label className="block text-[9px] font-semibold text-slate-600">
                  Partner name
                  <input
                    required
                    maxLength={120}
                    value={newPartner.name}
                    onChange={(event) =>
                      setNewPartner((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className="mt-1 h-9 w-full rounded-lg border border-[#dfe8f6] px-3 text-[10px] text-[#10213c]"
                  />
                </label>
                <label className="block text-[9px] font-semibold text-slate-600">
                  Service or offering
                  <input
                    required
                    maxLength={180}
                    value={newPartner.service}
                    onChange={(event) =>
                      setNewPartner((current) => ({
                        ...current,
                        service: event.target.value,
                      }))
                    }
                    className="mt-1 h-9 w-full rounded-lg border border-[#dfe8f6] px-3 text-[10px] text-[#10213c]"
                  />
                </label>
                <label className="block text-[9px] font-semibold text-slate-600">
                  Email (optional)
                  <input
                    type="email"
                    maxLength={254}
                    value={newPartner.email}
                    onChange={(event) =>
                      setNewPartner((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    className="mt-1 h-9 w-full rounded-lg border border-[#dfe8f6] px-3 text-[10px] text-[#10213c]"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-[9px] font-semibold text-slate-600">
                    Rule
                    <select
                      value={newPartner.ruleType}
                      onChange={(event) =>
                        setNewPartner((current) => ({
                          ...current,
                          ruleType: event.target.value as "share" | "fixed",
                        }))
                      }
                      className="mt-1 h-9 w-full rounded-lg border border-[#dfe8f6] bg-white px-3 text-[10px] text-[#10213c]"
                    >
                      <option value="share">Share of sales</option>
                      <option value="fixed">Fee per session</option>
                    </select>
                  </label>
                  <label className="text-[9px] font-semibold text-slate-600">
                    {newPartner.ruleType === "share"
                      ? "Share percent"
                      : `Fee (${payoutCurrency})`}
                    <input
                      required
                      type="number"
                      min="0.01"
                      max={newPartner.ruleType === "share" ? "100" : undefined}
                      step="0.01"
                      value={newPartner.ruleValue}
                      onChange={(event) =>
                        setNewPartner((current) => ({
                          ...current,
                          ruleValue: event.target.value,
                        }))
                      }
                      className="mt-1 h-9 w-full rounded-lg border border-[#dfe8f6] px-3 text-[10px] text-[#10213c]"
                    />
                  </label>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="h-9 rounded-lg border border-[#dbe4f3] px-4 text-[9px] font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving !== ""}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#1e4fc1] px-4 text-[9px] font-bold text-white disabled:opacity-50"
                  >
                    {isSaving === "create-partner" ? "Adding…" : "Add partner"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={recordSales} className="mt-4 space-y-3">
                <p className="rounded-lg bg-[#f7f9fd] px-3 py-2 text-[9px] text-slate-600">
                  {payoutMonth}
                </p>
                <label className="block text-[9px] font-semibold text-slate-600">
                  Partner
                  <select
                    value={selectedPartnerId || payouts[0]?.id || ""}
                    onChange={(event) => setSelectedPartnerId(event.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-[#dfe8f6] bg-white px-3 text-[10px] text-[#10213c]"
                  >
                    {payouts.length ? (
                      payouts.map((payout) => (
                        <option key={payout.id} value={payout.id}>
                          {payout.partner} · {payout.service}
                        </option>
                      ))
                    ) : (
                      <option value="">No partners available</option>
                    )}
                  </select>
                </label>
                <label className="block text-[9px] font-semibold text-slate-600">
                  Sales amount ({payoutCurrency})
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={salesEntry.sales}
                    onChange={(event) =>
                      setSalesEntry((current) => ({
                        ...current,
                        sales: event.target.value,
                      }))
                    }
                    className="mt-1 h-9 w-full rounded-lg border border-[#dfe8f6] px-3 text-[10px] text-[#10213c]"
                  />
                </label>
                <label className="block text-[9px] font-semibold text-slate-600">
                  Session count
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={salesEntry.sessions}
                    onChange={(event) =>
                      setSalesEntry((current) => ({
                        ...current,
                        sessions: event.target.value,
                      }))
                    }
                    className="mt-1 h-9 w-full rounded-lg border border-[#dfe8f6] px-3 text-[10px] text-[#10213c]"
                  />
                </label>
                <fieldset className="grid gap-2 rounded-lg border border-[#e5ebf5] p-3 sm:grid-cols-2">
                  <legend className="px-1 text-[9px] font-semibold text-slate-600">
                    Activity taxes
                  </legend>
                  <label className="flex items-center gap-2 text-[9px] text-slate-700">
                    <input
                      type="checkbox"
                      checked={salesEntry.vatEnabled}
                      onChange={(event) =>
                        setSalesEntry((current) => ({
                          ...current,
                          vatEnabled: event.target.checked,
                        }))
                      }
                      className="h-3.5 w-3.5 accent-[#1e4fc1]"
                    />
                    Add VAT ({vatRate}%)
                  </label>
                  <label className="flex items-center gap-2 text-[9px] text-slate-700">
                    <input
                      type="checkbox"
                      checked={salesEntry.whtEnabled}
                      onChange={(event) =>
                        setSalesEntry((current) => ({
                          ...current,
                          whtEnabled: event.target.checked,
                        }))
                      }
                      className="h-3.5 w-3.5 accent-[#1e4fc1]"
                    />
                    Apply WHT ({whtRate}%)
                  </label>
                  <p className="text-[8px] leading-relaxed text-slate-500 sm:col-span-2">
                    Rates are taken from your tax settings and saved with this activity.
                  </p>
                  <p className="text-[8px] font-semibold text-[#10213c] sm:col-span-2">
                    Estimated tax: VAT {formatMoney(previewVat, payoutCurrency)} · WHT {formatMoney(previewWht, payoutCurrency)}
                  </p>
                </fieldset>
                <label className="block text-[9px] font-semibold text-slate-600">
                  Note (optional)
                  <input
                    maxLength={240}
                    value={salesEntry.description}
                    onChange={(event) =>
                      setSalesEntry((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    className="mt-1 h-9 w-full rounded-lg border border-[#dfe8f6] px-3 text-[10px] text-[#10213c]"
                  />
                </label>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="h-9 rounded-lg border border-[#dbe4f3] px-4 text-[9px] font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving !== "" || !payouts.length}
                    className="h-9 rounded-lg bg-[#1e4fc1] px-4 text-[9px] font-bold text-white disabled:opacity-50"
                  >
                    {isSaving === "record-sales"
                      ? "Recording…"
                      : "Record activity"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  emphasized = false,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  emphasized?: boolean;
}) {
  return (
    <article
      className={`rounded-xl border bg-white px-3 py-2.5 ${
        emphasized ? "border-blue-200" : "border-[#dfe7f4]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[8px] font-semibold text-slate-500">{label}</p>
        <span className="text-[#1e4fc1]">{icon}</span>
      </div>
      <p className="mt-1 truncate text-[13px] font-bold text-[#10213c]">
        {value}
      </p>
    </article>
  );
}

function StatementLine({
  label,
  value,
  muted = false,
  strong = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 ${
        strong
          ? "font-bold text-[#10213c]"
          : muted
            ? "text-slate-500"
            : "text-slate-700"
      }`}
    >
      <span>{label}</span>
      <span className="whitespace-nowrap">{value}</span>
    </div>
  );
}
