"use client";

import { useEffect, useState, type FormEvent } from "react";
import { RiArrowDownSLine, RiDeleteBinLine } from "@remixicon/react";
import { useConfirmDialog } from "@/app/components/ConfirmDialog";
import ActionSpinner from "@/app/components/ActionSpinner";
import { useToastOnChange } from "@/app/components/toast";
import DashboardLoading from "./DashboardLoading";
import { PlanDescriptionEditor } from "../pricing/PlanDescription";
import { roleAccessSections } from "./role-access-features";

type CatalogPlanKey = string;
type Currency = "USD" | "NGN" | "INR";
type PriceBookKey =
  "nigeria" | "rest_of_africa" | "india_south_asia" | "global";
type Price = {
  plan: CatalogPlanKey;
  priceBook: PriceBookKey;
  currency: Currency;
  monthlyAmount: number | null;
};
type PlanDetails = {
  key: CatalogPlanKey;
  name: string;
  audience: string;
  features: string[];
  accessFeatures: string[];
  discountPercent: number;
  usersLimit: number | null;
  companyLimit: number | null;
  monthlyInvoiceLimit: number | null;
  active: boolean;
  isCustom: boolean;
};

const priceBooks: {
  key: PriceBookKey;
  label: string;
  currency: Currency;
}[] = [
  { key: "nigeria", label: "Nigeria", currency: "NGN" },
  { key: "rest_of_africa", label: "Rest of Africa", currency: "USD" },
  { key: "india_south_asia", label: "India and South Asia", currency: "INR" },
  {
    key: "global",
    label: "US, Europe and the rest of the world",
    currency: "USD",
  },
];
export default function DashboardPricingAdmin() {
  const { confirm, dialog } = useConfirmDialog();
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [generalDiscountPercent, setGeneralDiscountPercent] = useState("0");
  const [planDetails, setPlanDetails] = useState<PlanDetails[]>([]);
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanAudience, setNewPlanAudience] = useState("");
  const [newPlanFeatures, setNewPlanFeatures] = useState("");
  const [newPlanAccessFeatures, setNewPlanAccessFeatures] = useState([
    "dashboard",
    "settings",
  ]);
  const [newPlanUsersLimit, setNewPlanUsersLimit] = useState("2");
  const [newPlanCompanyLimit, setNewPlanCompanyLimit] = useState("5");
  const [newPlanMonthlyInvoiceLimit, setNewPlanMonthlyInvoiceLimit] =
    useState("");
  const [newPlanPrices, setNewPlanPrices] = useState<Record<string, string>>(
    {},
  );
  const [isAddPlanOpen, setIsAddPlanOpen] = useState(false);
  const [expandedPlanKey, setExpandedPlanKey] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPlans, setIsSavingPlans] = useState(false);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [deletingPlanKeys, setDeletingPlanKeys] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isForbidden, setIsForbidden] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  useToastOnChange(error);
  useToastOnChange(message, "success");

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 10_000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    let isCurrent = true;
    async function loadPrices() {
      setError("");
      if (loadAttempt === 0) setIsLoading(true);
      else setIsRefreshing(true);
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) {
        setError(
          "Sign in with a super-admin account to manage plan pricing and details.",
        );
        if (loadAttempt === 0) setIsLoading(false);
        else setIsRefreshing(false);
        return;
      }
      try {
        const response = await fetch("/api/admin/pricing", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload: unknown = await response.json();
        if (response.status === 403) {
          setIsForbidden(true);
          throw new Error("Super-admin access is required to manage prices.");
        }
        if (!response.ok) {
          throw new Error(
            getApiErrorMessage(payload) ??
              `Could not load prices (HTTP ${response.status}).`,
          );
        }
        if (!isPriceResponse(payload)) {
          throw new Error("The pricing service returned an invalid response.");
        }
        const plansResponse = await fetch("/api/admin/plans", {
          headers: { Authorization: "Bearer " + token },
        });
        const plansPayload: unknown = await plansResponse.json();
        if (plansResponse.status === 403) {
          setIsForbidden(true);
          throw new Error(
            "Super-admin access is required to manage plan details.",
          );
        }
        if (!plansResponse.ok) {
          throw new Error(
            getApiErrorMessage(plansPayload) ??
              `Could not load plan details (HTTP ${plansResponse.status}).`,
          );
        }
        if (!isPlanDetailsResponse(plansPayload)) {
          throw new Error(
            "The plan details service returned an invalid response.",
          );
        }
        if (!hasCompletePlanPrices(payload.prices, plansPayload.plans)) {
          throw new Error(
            "The pricing service returned an incomplete set of plan prices.",
          );
        }
        if (isCurrent) {
          setPrices(
            Object.fromEntries(
              payload.prices.map(({ plan, priceBook, monthlyAmount }) => [
                `${plan}:${priceBook}`,
                monthlyAmount === null ? "" : String(monthlyAmount),
              ]),
            ),
          );
          setGeneralDiscountPercent(String(payload.generalDiscountPercent));
          setPlanDetails(plansPayload.plans);
        }
      } catch (loadError) {
        if (isCurrent) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load prices. Please try again.",
          );
        }
      } finally {
        if (isCurrent) {
          if (loadAttempt === 0) setIsLoading(false);
          else setIsRefreshing(false);
        }
      }
    }
    void loadPrices();
    return () => {
      isCurrent = false;
    };
  }, [loadAttempt]);

  async function savePrices(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || isSaving) return;
    const parsedGeneralDiscount = Number(generalDiscountPercent);
    if (
      !Number.isFinite(parsedGeneralDiscount) ||
      parsedGeneralDiscount < 0 ||
      parsedGeneralDiscount >= 100 ||
      Math.round(parsedGeneralDiscount * 100) !== parsedGeneralDiscount * 100
    ) {
      setError(
        "Enter a general discount between 0 and 99.99, with up to two decimal places.",
      );
      setMessage("");
      return;
    }

    const submittedPrices: Price[] = [];
    for (const plan of planDetails.filter((item) => item.key !== "free")) {
      for (const priceBook of priceBooks) {
        const rawAmount = prices[`${plan.key}:${priceBook.key}`]?.trim() ?? "";
        const monthlyAmount = Number(rawAmount);
        if (
          rawAmount === "" ||
          !Number.isFinite(monthlyAmount) ||
          monthlyAmount <= 0 ||
          Math.round(monthlyAmount * 100) !== monthlyAmount * 100
        ) {
          setError(
            `Enter a positive price with up to two decimal places for ${plan.name} (${priceBook.label}, ${priceBook.currency}).`,
          );
          setMessage("");
          return;
        }
        submittedPrices.push({
          plan: plan.key,
          priceBook: priceBook.key,
          currency: priceBook.currency,
          monthlyAmount,
        });
      }
    }

    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prices: submittedPrices,
          generalDiscountPercent: parsedGeneralDiscount,
        }),
      });
      const payload: unknown = await response.json();
      if (response.status === 403) {
        setIsForbidden(true);
        throw new Error("Super-admin access is required to manage prices.");
      }
      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(payload) ??
            `Could not save prices (HTTP ${response.status}).`,
        );
      }
      setMessage(
        getApiErrorMessage(payload) ?? "Plan prices were updated successfully.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save prices. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function savePlanDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || isSavingPlans) return;

    const submittedPlans = planDetails.map((details) => ({
      key: details.key,
      name: details.name,
      active: details.active,
      discountPercent: details.discountPercent,
      audience: details.audience.trim(),
      features: details.features
        .map((feature) => feature.trim())
        .filter(Boolean),
      accessFeatures: details.accessFeatures,
      usersLimit: details.usersLimit,
      companyLimit: details.companyLimit,
      monthlyInvoiceLimit: details.monthlyInvoiceLimit,
    }));
    for (const plan of submittedPlans) {
      if (
        plan.audience.length < 2 ||
        plan.audience.length > 250 ||
        !Number.isFinite(plan.discountPercent) ||
        plan.discountPercent < 0 ||
        plan.discountPercent >= 100 ||
        Math.round(plan.discountPercent * 100) !== plan.discountPercent * 100 ||
        plan.features.length < 1 ||
        plan.features.length > 20 ||
        plan.features.some((feature) => feature.length > 200) ||
        !hasRequiredPlanFeatures(plan.accessFeatures) ||
        (plan.usersLimit !== null &&
          (!Number.isInteger(plan.usersLimit) || plan.usersLimit < 1)) ||
        (plan.companyLimit !== null &&
          (!Number.isInteger(plan.companyLimit) || plan.companyLimit < 1)) ||
        (plan.monthlyInvoiceLimit !== null &&
          (!Number.isInteger(plan.monthlyInvoiceLimit) ||
            plan.monthlyInvoiceLimit < 1))
      ) {
        setError(
          `Add a valid audience and between 1 and 20 feature items for ${plan.name}.`,
        );
        setMessage("");
        return;
      }
    }

    setIsSavingPlans(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/plans", {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plans: submittedPlans.map(
            ({
              key,
              name,
              active,
              discountPercent,
              audience,
              features,
              accessFeatures,
              usersLimit,
              companyLimit,
              monthlyInvoiceLimit,
            }) => ({
              key,
              name,
              active,
              discountPercent,
              audience,
              features,
              accessFeatures,
              usersLimit,
              companyLimit,
              monthlyInvoiceLimit,
            }),
          ),
        }),
      });
      const payload: unknown = await response.json();
      if (response.status === 403) {
        setIsForbidden(true);
        throw new Error(
          "Super-admin access is required to manage plan details.",
        );
      }
      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(payload) ??
            `Could not save plan details (HTTP ${response.status}).`,
        );
      }
      setMessage(
        getApiErrorMessage(payload) ??
          "Plan details were updated successfully.",
      );
      setPlanDetails(
        submittedPlans.map((plan) => ({
          ...plan,
          isCustom:
            planDetails.find((entry) => entry.key === plan.key)?.isCustom ??
            false,
        })),
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save plan details. Please try again.",
      );
    } finally {
      setIsSavingPlans(false);
    }
  }

  async function createPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || isCreatingPlan) return;

    const features = newPlanFeatures
      .split("\n")
      .map((feature) => feature.trim())
      .filter(Boolean);
    const accessFeatures = newPlanAccessFeatures;
    const prices = priceBooks.map((priceBook) => ({
      priceBook: priceBook.key,
      currency: priceBook.currency,
      monthlyAmount: Number(newPlanPrices[priceBook.key]),
    }));
    const usersLimit =
      newPlanUsersLimit.trim() === "" ? null : Number(newPlanUsersLimit);
    const companyLimit =
      newPlanCompanyLimit.trim() === "" ? null : Number(newPlanCompanyLimit);
    const monthlyInvoiceLimit =
      newPlanMonthlyInvoiceLimit.trim() === ""
        ? null
        : Number(newPlanMonthlyInvoiceLimit);
    if (
      features.length < 1 ||
      features.length > 20 ||
      features.some((feature) => feature.length > 200) ||
      !hasRequiredPlanFeatures(accessFeatures) ||
      prices.some(
        ({ monthlyAmount }) =>
          !Number.isFinite(monthlyAmount) ||
          monthlyAmount <= 0 ||
          Math.round(monthlyAmount * 100) !== monthlyAmount * 100,
      ) ||
      (usersLimit !== null &&
        (!Number.isInteger(usersLimit) || usersLimit < 1)) ||
      (companyLimit !== null &&
        (!Number.isInteger(companyLimit) || companyLimit < 1)) ||
      (monthlyInvoiceLimit !== null &&
        (!Number.isInteger(monthlyInvoiceLimit) ||
          monthlyInvoiceLimit < 1))
    ) {
      setError(
        "Enter valid features and a positive monthly price for each regional price book.",
      );
      setMessage("");
      return;
    }

    setIsCreatingPlan(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/plans", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newPlanName,
          audience: newPlanAudience,
          features,
          accessFeatures,
          usersLimit,
          companyLimit,
          monthlyInvoiceLimit,
          prices,
        }),
      });
      const payload: unknown = await response.json();
      if (response.status === 403) {
        setIsForbidden(true);
        throw new Error("Super-admin access is required to add plans.");
      }
      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(payload) ??
            `Could not add the plan (HTTP ${response.status}).`,
        );
      }
      if (
        !payload ||
        typeof payload !== "object" ||
        !("plan" in payload) ||
        !isPlanDetails(payload.plan)
      ) {
        throw new Error("The plan service returned invalid plan details.");
      }
      const createdPlan = payload.plan;
      setPlanDetails((current) => [...current, createdPlan]);
      setPrices((current) => ({
        ...current,
        ...Object.fromEntries(
          priceBooks.map((book) => [
            `${createdPlan.key}:${book.key}`,
            String(newPlanPrices[book.key]),
          ]),
        ),
      }));
      setNewPlanName("");
      setNewPlanAudience("");
      setNewPlanFeatures("");
      setNewPlanAccessFeatures(["dashboard", "settings"]);
      setNewPlanUsersLimit("2");
      setNewPlanCompanyLimit("5");
      setNewPlanMonthlyInvoiceLimit("");
      setNewPlanPrices({});
      setIsAddPlanOpen(false);
      setMessage("The plan was added.");
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not add the plan. Please try again.",
      );
    } finally {
      setIsCreatingPlan(false);
    }
  }

  async function deletePlan(plan: PlanDetails) {
    if (plan.key === "free" || deletingPlanKeys.includes(plan.key)) return;
    const confirmed = await confirm({
      title: `Delete ${plan.name}?`,
      message:
        "A plan with subscribers who still have access or a checkout in progress cannot be deleted. Deactivate it instead; current subscribers keep their plan until it expires.",
      confirmLabel: "Delete plan",
      destructive: true,
    });
    if (!confirmed) return;
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) {
      setError("Sign in with a super-admin account to delete plans.");
      return;
    }
    setDeletingPlanKeys((current) => [...current, plan.key]);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/plans/${encodeURIComponent(plan.key)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const payload: unknown = await response.json();
      if (response.status === 403) {
        setIsForbidden(true);
        throw new Error("Super-admin access is required to delete plans.");
      }
      if (!response.ok) {
        throw new Error(
          getApiErrorMessage(payload) ??
            `Could not delete the plan (HTTP ${response.status}).`,
        );
      }
      setPlanDetails((current) =>
        current.filter((item) => item.key !== plan.key),
      );
      setPrices((current) =>
        Object.fromEntries(
          Object.entries(current).filter(
            ([key]) => !key.startsWith(`${plan.key}:`),
          ),
        ),
      );
      setMessage(
        getApiErrorMessage(payload) ?? `Plan "${plan.name}" was deleted.`,
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete the plan. Please try again.",
      );
    } finally {
      setDeletingPlanKeys((current) =>
        current.filter((key) => key !== plan.key),
      );
    }
  }

  return (
    <section aria-labelledby="pricing-admin-heading">
      {dialog}
      <header className="mb-4">
        <h1
          id="pricing-admin-heading"
          className="font-jakarta text-[21px] font-bold tracking-[-0.35px] text-[#10213c]"
        >
          Plan pricing
        </h1>
        <p className="mt-1 max-w-[650px] text-[10px] leading-relaxed text-slate-600"        >
          Manage regional price books, plan-specific discounts, and a general
          discount.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-800"
        >
          <span>{error}</span>
          {!isForbidden && (
            <button
              type="button"
              disabled={isLoading || isRefreshing}
              aria-busy={isRefreshing}
              onClick={() => setLoadAttempt((attempt) => attempt + 1)}
              className="rounded-md border border-red-300 px-2.5 py-1 font-bold text-red-800 hover:bg-red-100 disabled:opacity-60"
            >
              {isRefreshing ? (
                <>
                  <ActionSpinner label="Refreshing pricing" />
                  Refreshing…
                </>
              ) : (
                "Try again"
              )}
            </button>
          )}
        </div>
      )}
      {message && (
        <p
          role="status"
          className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] text-emerald-800"
        >
          {message}
        </p>
      )}
      {isForbidden && (
        <p className="mb-3 text-[9px] text-slate-600">
          An administrator must grant access by adding your account email to the
          backend <code>SUPER_ADMIN_EMAILS</code> configuration.
        </p>
      )}
      {isLoading ? (
        <DashboardLoading />
      ) : !isForbidden ? (
        <>
          <form
            onSubmit={savePrices}
            aria-busy={isSaving}
            className="max-w-[1100px] rounded-xl border border-[#e1e8f4] bg-white p-4 sm:p-5"
          >
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                <div className="mb-4 grid grid-cols-[minmax(120px,0.7fr)_repeat(4,minmax(150px,1fr))] gap-3 text-[9px] font-semibold text-slate-600">
                  <span>Plan</span>
                  {priceBooks.map((book) => (
                    <span key={book.key}>
                      {book.label} ({book.currency}) / month
                    </span>
                  ))}
                </div>
                <div className="space-y-4">
                  {planDetails
                    .filter((plan) => plan.key !== "free")
                    .map((plan) => (
                      <div
                        key={plan.key}
                        className="grid grid-cols-[minmax(120px,0.7fr)_repeat(4,minmax(150px,1fr))] items-center gap-3"
                      >
                        <span className="text-[10px] font-semibold text-slate-800">
                          {plan.name}
                        </span>
                        {priceBooks.map((priceBook) => {
                          const inputId = `price-${plan.key}-${priceBook.key}`;
                          const priceKey = `${plan.key}:${priceBook.key}`;
                          return (
                            <label key={priceBook.key} htmlFor={inputId}>
                              <span className="sr-only">
                                {plan.name} monthly price for {priceBook.label}{" "}
                                in {priceBook.currency}
                              </span>
                              <input
                                id={inputId}
                                type="number"
                                min="0.01"
                                step="0.01"
                                inputMode="decimal"
                                required
                                value={prices[priceKey] ?? ""}
                                onChange={(event) => {
                                  setPrices((current) => ({
                                    ...current,
                                    [priceKey]: event.target.value,
                                  }));
                                }}
                                placeholder="Set price"
                                className="w-full rounded-lg border border-[#c7d3ec] bg-white px-3 py-2 text-[10px] outline-none focus:border-[#1e4fc1] focus:ring-2 focus:ring-blue-100"
                              />
                            </label>
                          );
                        })}
                      </div>
                    ))}
                </div>
              </div>
            </div>
            <label
              htmlFor="general-discount"
              className="mt-4 block max-w-[260px] text-[9px] font-semibold text-slate-600"
            >
              General discount (%)
              <input
                id="general-discount"
                type="number"
                min="0"
                max="99.99"
                step="0.01"
                inputMode="decimal"
                value={generalDiscountPercent}
                onChange={(event) =>
                  setGeneralDiscountPercent(event.target.value)
                }
                className="mt-1 w-full rounded-lg border border-[#c7d3ec] bg-white px-3 py-2 text-[10px] outline-none focus:border-[#1e4fc1] focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <button
              type="submit"
              disabled={isSaving || isLoading}
              aria-busy={isSaving}
              className="mt-5 rounded-md bg-[#1e4fc1] px-4 py-2 text-[10px] font-bold text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-70"
            >
              {isSaving ? (
                <span className="inline-flex items-center gap-2">
                  <ActionSpinner label="Saving prices" />
                  Saving prices…
                </span>
              ) : (
                "Save prices"
              )}
            </button>
          </form>
          <form
            onSubmit={savePlanDetails}
            aria-busy={isSavingPlans}
            className="mt-5 max-w-[1000px] rounded-xl border border-[#e1e8f4] bg-white p-4 sm:p-5"
          >
            <h2 className="font-jakarta text-[14px] font-bold text-[#10213c]">
              Plan details
            </h2>
            <p className="mb-4 mt-1 text-[9px] leading-relaxed text-slate-600">
              Edit each plan&apos;s audience, user, company, and monthly invoice
              limits, and its feature list. Put one feature per line; changes
              are shown on the public pricing page and billing plans.
              Deactivating a plan stops new sales, but
              existing subscribers keep their plan features until it expires.
              Plans with current subscribers or checkouts in progress cannot be
              deleted.
            </p>
            <div className="space-y-2">
              {planDetails.map((details) => {
                const plan = details;
                return (
                  <div
                    key={plan.key}
                    aria-busy={deletingPlanKeys.includes(plan.key)}
                    className="overflow-hidden rounded-lg border border-[#e1e8f4]"
                  >
                    <div className="flex items-center gap-2 px-3 py-2">
                      <button
                        type="button"
                        aria-expanded={expandedPlanKey === plan.key}
                        aria-controls={`plan-details-${plan.key}`}
                        onClick={() =>
                          setExpandedPlanKey((current) =>
                            current === plan.key ? "" : plan.key,
                          )
                        }
                        className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                      >
                        <span className="truncate text-[10px] font-bold text-slate-800">
                          {plan.name}
                          {plan.isCustom && (
                            <span className="ml-2 font-normal text-slate-500">
                              Custom plan
                            </span>
                          )}
                        </span>
                        <RiArrowDownSLine
                          aria-hidden="true"
                          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
                            expandedPlanKey === plan.key ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {plan.key !== "free" && (
                        <button
                          type="button"
                          disabled={deletingPlanKeys.includes(plan.key)}
                          onClick={() => void deletePlan(plan)}
                          aria-label={
                            deletingPlanKeys.includes(plan.key)
                              ? `Deleting ${plan.name} plan`
                              : `Delete ${plan.name} plan`
                          }
                          title={
                            deletingPlanKeys.includes(plan.key)
                              ? "Deleting plan"
                              : "Delete plan"
                          }
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-red-700 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
                        >
                          {deletingPlanKeys.includes(plan.key) ? (
                            <ActionSpinner label={`Deleting ${plan.name} plan`} />
                          ) : (
                            <RiDeleteBinLine className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                    <fieldset
                      id={`plan-details-${plan.key}`}
                      hidden={expandedPlanKey !== plan.key}
                      className="border-t border-[#e1e8f4] p-3"
                    >
                      {plan.key !== "free" && (
                        <label className="mb-3 block max-w-[220px] text-[9px] font-semibold text-slate-600">
                          Plan discount (%)
                          <input
                            type="number"
                            min="0"
                            max="99.99"
                            step="0.01"
                            inputMode="decimal"
                            value={details.discountPercent}
                            onChange={(event) => {
                              const discountPercent = Number(
                                event.target.value,
                              );
                              setPlanDetails((current) =>
                                current.map((item) =>
                                  item.key === plan.key
                                    ? { ...item, discountPercent }
                                    : item,
                                ),
                              );
                            }}
                            className="mt-1 w-full rounded-lg border border-[#c7d3ec] px-3 py-2 text-[10px]"
                          />
                        </label>
                      )}
                      <label
                        htmlFor={`plan-${plan.key}-users-limit`}
                        className="mb-3 block text-[9px] font-semibold text-slate-600"
                      >
                        Maximum users (leave blank for unlimited)
                        <input
                          id={`plan-${plan.key}-users-limit`}
                          type="number"
                          min="1"
                          step="1"
                          value={details.usersLimit ?? ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            setPlanDetails((current) =>
                              current.map((item) =>
                                item.key === plan.key
                                  ? {
                                      ...item,
                                      usersLimit:
                                        value === "" ? null : Number(value),
                                    }
                                  : item,
                              ),
                            );
                          }}
                          className="mt-1 w-full rounded-lg border border-[#c7d3ec] px-3 py-2 text-[10px] outline-none focus:border-[#1e4fc1] focus:ring-2 focus:ring-blue-100"
                        />
                      </label>
                      <label
                        htmlFor={`plan-${plan.key}-company-limit`}
                        className="mb-3 block text-[9px] font-semibold text-slate-600"
                      >
                        Maximum companies (leave blank for unlimited)
                        <input
                          id={`plan-${plan.key}-company-limit`}
                          type="number"
                          min="1"
                          step="1"
                          value={details.companyLimit ?? ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            setPlanDetails((current) =>
                              current.map((item) =>
                                item.key === plan.key
                                  ? {
                                      ...item,
                                      companyLimit:
                                        value === "" ? null : Number(value),
                                    }
                                  : item,
                              ),
                            );
                          }}
                          className="mt-1 w-full rounded-lg border border-[#c7d3ec] px-3 py-2 text-[10px] outline-none focus:border-[#1e4fc1] focus:ring-2 focus:ring-blue-100"
                        />
                      </label>
                      <label
                        htmlFor={`plan-${plan.key}-monthly-invoice-limit`}
                        className="mb-3 block text-[9px] font-semibold text-slate-600"
                      >
                        Maximum invoices per calendar month (leave blank for unlimited)
                        <input
                          id={`plan-${plan.key}-monthly-invoice-limit`}
                          type="number"
                          min="1"
                          step="1"
                          value={details.monthlyInvoiceLimit ?? ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            setPlanDetails((current) =>
                              current.map((item) =>
                                item.key === plan.key
                                  ? {
                                      ...item,
                                      monthlyInvoiceLimit:
                                        value === "" ? null : Number(value),
                                    }
                                  : item,
                              ),
                            );
                          }}
                          className="mt-1 w-full rounded-lg border border-[#c7d3ec] px-3 py-2 text-[10px] outline-none focus:border-[#1e4fc1] focus:ring-2 focus:ring-blue-100"
                        />
                      </label>
                      {plan.key !== "free" && (
                        <label className="mb-3 flex items-center gap-2 text-[9px] font-semibold text-slate-600">
                          <input
                            type="checkbox"
                            checked={details.active}
                            onChange={(event) =>
                              setPlanDetails((current) =>
                                current.map((item) =>
                                  item.key === plan.key
                                    ? { ...item, active: event.target.checked }
                                    : item,
                                ),
                              )
                            }
                          />
                          Active for new sales
                        </label>
                      )}
                      <label
                        htmlFor={`plan-${plan.key}-audience`}
                        className="mb-1 block text-[9px] font-semibold text-slate-600"
                      >
                        Description
                      </label>
                      <PlanDescriptionEditor
                        id={`plan-${plan.key}-audience`}
                        required
                        value={details.audience}
                        onChange={(audience) =>
                          setPlanDetails((current) =>
                            current.map((item) =>
                              item.key === plan.key
                                ? { ...item, audience }
                                : item,
                            ),
                          )
                        }
                      />
                      <label
                        htmlFor={`plan-${plan.key}-features`}
                        className="mb-1 block text-[9px] font-semibold text-slate-600"
                      >
                        Key limits and features (one per line)
                      </label>
                      <textarea
                        id={`plan-${plan.key}-features`}
                        required
                        rows={6}
                        value={details?.features.join("\n") ?? ""}
                        onChange={(event) =>
                          setPlanDetails((current) =>
                            current.map((item) =>
                              item.key === plan.key
                                ? {
                                    ...item,
                                    features: event.target.value.split("\n"),
                                  }
                                : item,
                            ),
                          )
                        }
                        className="w-full resize-y rounded-lg border border-[#c7d3ec] px-3 py-2 text-[10px] outline-none focus:border-[#1e4fc1] focus:ring-2 focus:ring-blue-100"
                      />
                      <PlanAccessFeaturePicker
                        features={details.accessFeatures}
                        onChange={(accessFeatures) =>
                          setPlanDetails((current) =>
                            current.map((item) =>
                              item.key === plan.key
                                ? { ...item, accessFeatures }
                                : item,
                            ),
                          )
                        }
                      />
                    </fieldset>
                  </div>
                );
              })}
            </div>
            <button
              type="submit"
              disabled={isSavingPlans || isLoading}
              aria-busy={isSavingPlans}
              className="mt-4 rounded-md bg-[#1e4fc1] px-4 py-2 text-[10px] font-bold text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-70"
            >
              {isSavingPlans ? (
                <span className="inline-flex items-center gap-2">
                  <ActionSpinner label="Saving plan details" />
                  Saving plan details…
                </span>
              ) : (
                "Save plan details"
              )}
            </button>
          </form>
          <button
            type="button"
            aria-expanded={isAddPlanOpen}
            aria-controls="add-paid-plan-form"
            onClick={() => setIsAddPlanOpen((open) => !open)}
            className="mt-5 rounded-md border border-[#1e4fc1] bg-white px-4 py-2 text-[10px] font-bold text-[#1e4fc1] transition hover:bg-blue-50"
          >
            {isAddPlanOpen ? "Cancel adding plan" : "Add plan"}
          </button>
          {isAddPlanOpen && (
            <form
              id="add-paid-plan-form"
              onSubmit={createPlan}
              aria-busy={isCreatingPlan}
              className="mt-3 max-w-[1000px] rounded-xl border border-[#e1e8f4] bg-white p-4 sm:p-5"
            >
              <h2 className="font-jakarta text-[14px] font-bold text-[#10213c]">
                Add a paid plan
              </h2>
              <p className="mb-4 mt-1 text-[9px] leading-relaxed text-slate-600">
                New plans require a monthly price for each of the four regional
                price books.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-[9px] font-semibold text-slate-600">
                  Plan name
                  <input
                    required
                    minLength={2}
                    maxLength={60}
                    value={newPlanName}
                    onChange={(event) => setNewPlanName(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#c7d3ec] px-3 py-2 text-[10px]"
                  />
                </label>
                <div>
                  <label
                    htmlFor="new-plan-audience"
                    className="mb-1 block text-[9px] font-semibold text-slate-600"
                  >
                    Description
                  </label>
                  <PlanDescriptionEditor
                    id="new-plan-audience"
                    required
                    value={newPlanAudience}
                    onChange={setNewPlanAudience}
                  />
                </div>
              </div>
              <label className="mt-3 block max-w-[260px] text-[9px] font-semibold text-slate-600">
                Maximum users (leave blank for unlimited)
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={newPlanUsersLimit}
                  onChange={(event) => setNewPlanUsersLimit(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#c7d3ec] px-3 py-2 text-[10px]"
                />
              </label>
              <label className="mt-3 block max-w-[260px] text-[9px] font-semibold text-slate-600">
                Maximum companies (leave blank for unlimited)
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={newPlanCompanyLimit}
                  onChange={(event) =>
                    setNewPlanCompanyLimit(event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-[#c7d3ec] px-3 py-2 text-[10px]"
                />
              </label>
              <label className="mt-3 block max-w-[260px] text-[9px] font-semibold text-slate-600">
                Maximum invoices per calendar month (leave blank for unlimited)
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={newPlanMonthlyInvoiceLimit}
                  onChange={(event) =>
                    setNewPlanMonthlyInvoiceLimit(event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-[#c7d3ec] px-3 py-2 text-[10px]"
                />
              </label>
              <label className="mt-3 block text-[9px] font-semibold text-slate-600">
                Key limits and features (one per line)
                <textarea
                  required
                  rows={5}
                  value={newPlanFeatures}
                  onChange={(event) => setNewPlanFeatures(event.target.value)}
                  className="mt-1 w-full resize-y rounded-lg border border-[#c7d3ec] px-3 py-2 text-[10px]"
                />
              </label>
              <PlanAccessFeaturePicker
                features={newPlanAccessFeatures}
                onChange={setNewPlanAccessFeatures}
              />
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {priceBooks.map((book) => (
                  <label
                    key={book.key}
                    className="text-[9px] font-semibold text-slate-600"
                  >
                    {book.label} monthly price ({book.currency})
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      value={newPlanPrices[book.key] ?? ""}
                      onChange={(event) =>
                        setNewPlanPrices((current) => ({
                          ...current,
                          [book.key]: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-[#c7d3ec] px-3 py-2 text-[10px]"
                    />
                  </label>
                ))}
              </div>
              <button
                type="submit"
                disabled={isCreatingPlan}
                aria-busy={isCreatingPlan}
                className="mt-4 rounded-md bg-[#1e4fc1] px-4 py-2 text-[10px] font-bold text-white disabled:cursor-wait disabled:opacity-70"
              >
                {isCreatingPlan ? (
                  <span className="inline-flex items-center gap-2">
                    <ActionSpinner label="Adding plan" />
                    Adding plan…
                  </span>
                ) : (
                  "Add plan"
                )}
              </button>
            </form>
          )}
        </>
      ) : null}
      <p className="mt-3 max-w-[700px] text-[9px] leading-relaxed text-slate-500">
        Changes affect new checkouts. Existing payments and subscriptions are
        not repriced. Regional prices are stored as monthly amounts. For yearly
        checkout, the plan discount is applied to the 12-month price first,
        followed by the general discount.
      </p>
    </section>
  );
}

function isPlanDetailsResponse(
  value: unknown,
): value is { plans: PlanDetails[] } {
  return (
    !!value &&
    typeof value === "object" &&
    "plans" in value &&
    Array.isArray(value.plans) &&
    value.plans.length >= 1 &&
    value.plans.every(isPlanDetails) &&
    value.plans.some((plan) => plan.key === "free")
  );
}

function isPlanDetails(value: unknown): value is PlanDetails {
  const validAccessFeatures = new Set<string>(
    roleAccessSections.flatMap((section) =>
      section.features.map((feature) => feature.key),
    ),
  );
  return (
    !!value &&
    typeof value === "object" &&
    "key" in value &&
    typeof value.key === "string" &&
    /^[a-z0-9][a-z0-9_-]{1,39}$/.test(value.key) &&
    "name" in value &&
    typeof value.name === "string" &&
    "audience" in value &&
    typeof value.audience === "string" &&
    "features" in value &&
    Array.isArray(value.features) &&
    value.features.every((feature: unknown) => typeof feature === "string") &&
    "accessFeatures" in value &&
    Array.isArray(value.accessFeatures) &&
    value.accessFeatures.every(
      (feature: unknown) =>
        typeof feature === "string" && validAccessFeatures.has(feature),
    ) &&
    "discountPercent" in value &&
    typeof value.discountPercent === "number" &&
    Number.isFinite(value.discountPercent) &&
    value.discountPercent >= 0 &&
    value.discountPercent < 100 &&
    "usersLimit" in value &&
    (value.usersLimit === null ||
      (typeof value.usersLimit === "number" &&
        Number.isInteger(value.usersLimit) &&
        value.usersLimit >= 1)) &&
    "companyLimit" in value &&
    (value.companyLimit === null ||
      (typeof value.companyLimit === "number" &&
        Number.isInteger(value.companyLimit) &&
        value.companyLimit >= 1)) &&
    "monthlyInvoiceLimit" in value &&
    (value.monthlyInvoiceLimit === null ||
      (typeof value.monthlyInvoiceLimit === "number" &&
        Number.isInteger(value.monthlyInvoiceLimit) &&
        value.monthlyInvoiceLimit >= 1)) &&
    "active" in value &&
    typeof value.active === "boolean" &&
    "isCustom" in value &&
    typeof value.isCustom === "boolean"
  );
}

function hasRequiredPlanFeatures(features: string[]): boolean {
  const validFeatures = new Set<string>(
    roleAccessSections.flatMap((section) =>
      section.features.map((feature) => feature.key),
    ),
  );
  return (
    features.includes("dashboard") &&
    features.includes("settings") &&
    new Set(features).size === features.length &&
    features.every((feature) => validFeatures.has(feature))
  );
}

function PlanAccessFeaturePicker({
  features,
  onChange,
}: {
  features: string[];
  onChange: (features: string[]) => void;
}) {
  return (
    <fieldset className="mt-4 rounded-lg border border-[#d5e1ee] p-3">
      <legend className="px-1 text-[9px] font-semibold text-slate-700">
        Features included with this plan
      </legend>
      <p className="mb-3 text-[8px] leading-relaxed text-slate-500">
        These switches control both dashboard access and API access. Dashboard
        and Settings are always included.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {roleAccessSections.map((section) => (
          <div key={section.label}>
            <p className="mb-1 text-[8px] font-bold uppercase tracking-wide text-slate-500">
              {section.label}
            </p>
            <div className="space-y-1">
              {section.features.map((feature) => {
                const required =
                  feature.key === "dashboard" || feature.key === "settings";
                return (
                  <label
                    key={feature.key}
                    className="flex items-center gap-1.5 text-[8px] text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={features.includes(feature.key)}
                      disabled={required}
                      onChange={(event) =>
                        onChange(
                          event.target.checked
                            ? [...features, feature.key]
                            : features.filter((item) => item !== feature.key),
                        )
                      }
                    />
                    {feature.label}
                    {required && (
                      <span className="text-slate-400">(required)</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function isPriceResponse(
  value: unknown,
): value is { prices: Price[]; generalDiscountPercent: number } {
  return (
    !!value &&
    typeof value === "object" &&
    "prices" in value &&
    "generalDiscountPercent" in value &&
    typeof value.generalDiscountPercent === "number" &&
    Number.isFinite(value.generalDiscountPercent) &&
    value.generalDiscountPercent >= 0 &&
    value.generalDiscountPercent < 100 &&
    Array.isArray(value.prices) &&
    value.prices.every(
      (price) =>
        !!price &&
        typeof price === "object" &&
        "plan" in price &&
        typeof price.plan === "string" &&
        /^[a-z0-9][a-z0-9_-]{0,39}$/.test(price.plan) &&
        "priceBook" in price &&
        (price.priceBook === "nigeria" ||
          price.priceBook === "rest_of_africa" ||
          price.priceBook === "india_south_asia" ||
          price.priceBook === "global") &&
        "currency" in price &&
        (price.currency === "USD" ||
          price.currency === "NGN" ||
          price.currency === "INR") &&
        "monthlyAmount" in price &&
        (price.monthlyAmount === null ||
          (typeof price.monthlyAmount === "number" &&
            Number.isFinite(price.monthlyAmount) &&
            price.monthlyAmount > 0)),
    )
  );
}

function hasCompletePlanPrices(prices: Price[], plans: PlanDetails[]) {
  const expectedPrices = new Set(
    plans
      .filter((plan) => plan.key !== "free")
      .flatMap((plan) =>
        priceBooks.map((priceBook) => `${plan.key}:${priceBook.key}`),
      ),
  );
  return (
    prices.length === expectedPrices.size &&
    prices.every((price) =>
      expectedPrices.delete(`${price.plan}:${price.priceBook}`),
    ) &&
    expectedPrices.size === 0
  );
}


function getApiErrorMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object" || !("message" in payload)) {
    return undefined;
  }
  if (typeof payload.message === "string") return payload.message;
  if (
    Array.isArray(payload.message) &&
    payload.message.every((item) => typeof item === "string")
  ) {
    return payload.message.join(" ");
  }
  return undefined;
}
