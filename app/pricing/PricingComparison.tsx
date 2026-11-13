"use client";

import { useEffect, useState } from "react";
import { useToastOnChange } from "@/app/components/toast";
import { isPlanLimitFeature, PlanDescription } from "./PlanDescription";
import { roleAccessSections } from "../dashboard/role-access-features";

type Plan = {
  key: string;
  name: string;
  audience: string;
  features: string[];
  accessFeatures: string[];
  usersLimit: number | null;
  companyLimit: number | null;
  monthlyInvoiceLimit: number | null;
};

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

export default function PricingComparison() {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [error, setError] = useState("");
  useToastOnChange(error);

  useEffect(() => {
    let isCurrent = true;
    async function loadPlans() {
      try {
        const response = await fetch(`${API_BASE_URL}/billing/plan-catalog`);
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            `Could not load plan details (HTTP ${response.status}).`,
          );
        }
        if (!isPlanCatalog(payload)) {
          throw new Error("The plan catalog returned invalid details.");
        }
        if (isCurrent) setPlans(payload.plans);
      } catch (loadError) {
        if (isCurrent) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load plan details. Please try again.",
          );
        }
      }
    }
    void loadPlans();
    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <section
      aria-labelledby="compare-plans-heading"
      className="scroll-mt-20 bg-[#f1f6ff] py-12 sm:py-16"
    >
      <div className="mx-auto w-full max-w-[1180px] px-6 lg:px-0">
        <h2
          id="compare-plans-heading"
          className="mb-5 font-sora text-[22px] font-bold text-[#08172e]"
        >
          Compare plans
        </h2>
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-800"
          >
            {error}
          </p>
        ) : plans === null ? (
          <p role="status" className="text-[10px] text-slate-600">
            Loading plan details…
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#c7d3ec] bg-white">
            <table className="w-full min-w-[760px] table-fixed border-collapse text-left text-[10px] leading-[1.45] sm:text-[11px]">
              <thead className="bg-[#0b1323] text-white">
                <tr>
                  <th scope="col" className="w-[16%] px-3 py-3 font-semibold">
                    Plan
                  </th>
                  <th scope="col" className="w-[24%] px-3 py-3 font-semibold">
                    For
                  </th>
                  <th scope="col" className="w-[60%] px-3 py-3 font-semibold">
                    Key limits and features
                  </th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr
                    key={plan.key}
                    className="border-t border-[#d5e1ee] text-slate-700"
                  >
                    <th
                      scope="row"
                      className="px-3 py-3 align-top font-semibold text-[#08172e]"
                    >
                      {plan.name}
                    </th>
                    <td className="px-3 py-3 align-top">
                      <PlanDescription value={plan.audience} />
                    </td>
                    <td className="px-3 py-3 align-top">
                      <ul className="space-y-1">
                        <li>
                          {plan.usersLimit === null
                            ? "Unlimited users"
                            : `Up to ${plan.usersLimit} users`}
                        </li>
                        <li>
                          {plan.companyLimit === null
                            ? "Unlimited companies"
                            : `${plan.companyLimit} ${plan.companyLimit === 1 ? "company" : "companies"}`}
                        </li>
                        <li>
                          {plan.monthlyInvoiceLimit === null
                            ? "Unlimited invoices per month"
                            : `Up to ${plan.monthlyInvoiceLimit} invoices per month`}
                        </li>
                        {plan.features
                          .filter((feature) => !isPlanLimitFeature(feature))
                          .map((feature) => (
                          <li key={feature}>{feature}</li>
                        ))}
                        <li>
                          <span className="font-semibold">
                            Included modules:{" "}
                          </span>
                          {getFeatureLabels(plan.accessFeatures).join(", ")}
                        </li>
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function isPlanCatalog(value: unknown): value is { plans: Plan[] } {
  return (
    !!value &&
    typeof value === "object" &&
    "plans" in value &&
    Array.isArray(value.plans) &&
    value.plans.length >= 4 &&
    value.plans.every(
      (plan) =>
        !!plan &&
        typeof plan === "object" &&
        "key" in plan &&
        typeof plan.key === "string" &&
        /^[a-z0-9][a-z0-9_-]{1,39}$/.test(plan.key) &&
        "name" in plan &&
        typeof plan.name === "string" &&
        "audience" in plan &&
        typeof plan.audience === "string" &&
        "features" in plan &&
        Array.isArray(plan.features) &&
        plan.features.every(
          (feature: unknown) => typeof feature === "string",
        ) &&
        "accessFeatures" in plan &&
        Array.isArray(plan.accessFeatures) &&
        plan.accessFeatures.every((feature: unknown) =>
          isKnownFeature(feature),
        ) &&
        "usersLimit" in plan &&
        (plan.usersLimit === null ||
          (typeof plan.usersLimit === "number" &&
            Number.isInteger(plan.usersLimit) &&
            plan.usersLimit > 0)) &&
        "companyLimit" in plan &&
        (plan.companyLimit === null ||
          (typeof plan.companyLimit === "number" &&
            Number.isInteger(plan.companyLimit) &&
            plan.companyLimit > 0)) &&
        "monthlyInvoiceLimit" in plan &&
        (plan.monthlyInvoiceLimit === null ||
          (typeof plan.monthlyInvoiceLimit === "number" &&
            Number.isInteger(plan.monthlyInvoiceLimit) &&
            plan.monthlyInvoiceLimit > 0)),
    )
  );
}

function isKnownFeature(value: unknown): value is string {
  return (
    typeof value === "string" &&
    roleAccessSections.some((section) =>
      section.features.some((feature) => feature.key === value),
    )
  );
}

function getFeatureLabels(features: string[]): string[] {
  return features.map((key) => {
    for (const section of roleAccessSections) {
      const feature = section.features.find((item) => item.key === key);
      if (feature) return feature.label;
    }
    return key;
  });
}
