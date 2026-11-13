"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiBankCardLine,
  RiCheckLine,
  RiDownload2Line,
  RiDeleteBinLine,
  RiEditLine,
  RiPrinterLine,
  RiSendPlaneLine,
} from "@remixicon/react";
import ActionSpinner from "../components/ActionSpinner";

type Employee = {
  id: string;
  name: string;
  role: string;
  gross: number | null;
  employeePension: number | null;
  employerPension: number | null;
  nhf: number | null;
  paye: number | null;
  nsitf: number | null;
  netPay: number | null;
  totalCost: number | null;
  vatEnabled: boolean;
  vatRate: number;
  vat: number;
  whtEnabled: boolean;
  whtRate: number;
  wht: number;
};

type PayrollStage = "inputs" | "review" | "approve" | "remit";
type PayrollStatus =
  | "draft"
  | "review-needed"
  | "pending"
  | "approved"
  | "rejected"
  | "paid";
type PayrollApprovalFlow = {
  configured: boolean;
  approvers: { id: string; name: string }[];
};
type PreviousPayrollEmployee = {
  name: string;
  role: string;
  gross: number;
  employeePension: number;
  employerPension: number;
  nhf: number;
  paye: number;
  nsitf: number;
  netPay: number;
  totalCost: number;
  vatEnabled: boolean;
  vatRate: number;
  vat: number;
  whtEnabled: boolean;
  whtRate: number;
  wht: number;
};
type PreviousPayroll = {
  id: string;
  period: string;
  status: "approved" | "paid";
  payDate: string;
  employeeCount: number;
  netPay: number;
  totalCost: number;
  employees: PreviousPayrollEmployee[];
};
type PayrollData = {
  period: string;
  currency: string;
  taxRates: {
    employeePension: number;
    employerPension: number;
    nhf: number;
    nhfEligiblePay: number;
    nsitf: number;
    vat: number;
    wht: number;
  };
  run: {
    id: string;
    status: PayrollStatus;
    payDate: string;
    currentApprovalStep: number;
    canReview: boolean;
    canApprove: boolean;
    approvals: {
      step: number;
      approverId: string;
      approverName: string;
      status: "pending" | "approved" | "rejected" | "skipped";
      actor: string | null;
      decidedAt: string | null;
    }[];
  } | null;
  employees: Employee[];
  totals: {
    gross: number;
    employeePension: number;
    employerPension: number;
    nhf: number;
    paye: number;
    nsitf: number;
    netPay: number;
    totalCost: number;
  };
  roster: {
    id: string;
    name: string;
    role: string;
    previousGross: number | null;
    previousPaye: number | null;
  }[];
  previousApprovedPayrolls: PreviousPayroll[];
};

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function isPayrollData(value: unknown): value is PayrollData {
  return (
    !!value &&
    typeof value === "object" &&
    "period" in value &&
    typeof value.period === "string" &&
    "currency" in value &&
    typeof value.currency === "string" &&
    "taxRates" in value &&
    !!value.taxRates &&
    typeof value.taxRates === "object" &&
    "run" in value &&
    (value.run === null ||
      (!!value.run &&
        typeof value.run === "object" &&
        "id" in value.run &&
        typeof value.run.id === "string" &&
        "status" in value.run &&
        (value.run.status === "draft" ||
          value.run.status === "review-needed" ||
          value.run.status === "pending" ||
          value.run.status === "approved" ||
          value.run.status === "rejected" ||
          value.run.status === "paid") &&
        "canReview" in value.run &&
        typeof value.run.canReview === "boolean" &&
        "canApprove" in value.run &&
        typeof value.run.canApprove === "boolean" &&
        "currentApprovalStep" in value.run &&
        typeof value.run.currentApprovalStep === "number" &&
        "approvals" in value.run &&
        Array.isArray(value.run.approvals))) &&
    "employees" in value &&
    Array.isArray(value.employees) &&
    value.employees.every(
      (employee) =>
        !!employee &&
        typeof employee === "object" &&
        "id" in employee &&
        typeof employee.id === "string" &&
        "name" in employee &&
        typeof employee.name === "string" &&
        "role" in employee &&
        typeof employee.role === "string" &&
        ("gross" in employee &&
          (employee.gross === null || typeof employee.gross === "number")) &&
        ("paye" in employee &&
          (employee.paye === null || typeof employee.paye === "number")) &&
        "vatEnabled" in employee &&
        typeof employee.vatEnabled === "boolean" &&
        "vatRate" in employee &&
        typeof employee.vatRate === "number" &&
        "vat" in employee &&
        typeof employee.vat === "number" &&
        "whtEnabled" in employee &&
        typeof employee.whtEnabled === "boolean" &&
        "whtRate" in employee &&
        typeof employee.whtRate === "number" &&
        "wht" in employee &&
        typeof employee.wht === "number",
    ) &&
    "roster" in value &&
    Array.isArray(value.roster) &&
    value.roster.every(
      (member) =>
        !!member &&
        typeof member === "object" &&
        "id" in member &&
        typeof member.id === "string" &&
        "name" in member &&
        typeof member.name === "string" &&
        "role" in member &&
        typeof member.role === "string" &&
        "previousGross" in member &&
        (member.previousGross === null || typeof member.previousGross === "number") &&
        "previousPaye" in member &&
        (member.previousPaye === null || typeof member.previousPaye === "number"),
    ) &&
    "previousApprovedPayrolls" in value &&
    Array.isArray(value.previousApprovedPayrolls) &&
    value.previousApprovedPayrolls.every(
      (payroll: unknown) =>
        isRecord(payroll) &&
        typeof payroll.id === "string" &&
        typeof payroll.period === "string" &&
        (payroll.status === "approved" || payroll.status === "paid") &&
        typeof payroll.payDate === "string" &&
        typeof payroll.employeeCount === "number" &&
        typeof payroll.netPay === "number" &&
        typeof payroll.totalCost === "number" &&
        Array.isArray(payroll.employees) &&
        payroll.employees.every(
          (employee: unknown) =>
            isRecord(employee) &&
            typeof employee.name === "string" &&
            typeof employee.role === "string" &&
            typeof employee.gross === "number" &&
            typeof employee.employeePension === "number" &&
            typeof employee.employerPension === "number" &&
            typeof employee.nhf === "number" &&
            typeof employee.paye === "number" &&
            typeof employee.vatEnabled === "boolean" &&
            typeof employee.vatRate === "number" &&
            typeof employee.vat === "number" &&
            typeof employee.whtEnabled === "boolean" &&
            typeof employee.whtRate === "number" &&
            typeof employee.wht === "number" &&
            typeof employee.nsitf === "number" &&
            typeof employee.netPay === "number" &&
            typeof employee.totalCost === "number",
        ),
    ) &&
    "totals" in value &&
    !!value.totals &&
    typeof value.totals === "object"
  );
}

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "code",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${Math.round(value).toLocaleString()}`;
  }
}

function csvCell(value: string | number | null) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function formatPayrollMonth(period: string) {
  const date = new Date(`${period}-01T00:00:00`);
  return Number.isNaN(date.getTime())
    ? period
    : date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function isPayrollPeriod(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value.trim());
}

export default function DashboardPayroll({
  search = "",
  currency = "USD",
  onNotice,
}: {
  search?: string;
  currency?: string;
  onNotice: (message: string) => void;
}) {
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [payDate, setPayDate] = useState("");
  const [payrollData, setPayrollData] = useState<PayrollData | null>(null);
  const [isLoadingPayroll, setIsLoadingPayroll] = useState(true);
  const [isSavingPayroll, setIsSavingPayroll] = useState(false);
  const [payrollError, setPayrollError] = useState("");
  const [payrollReloadKey, setPayrollReloadKey] = useState(0);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [entryType, setEntryType] = useState<"workspace" | "other">("workspace");
  const [selectedRosterId, setSelectedRosterId] = useState("");
  const [otherEmployeeName, setOtherEmployeeName] = useState("");
  const [otherEmployeeRole, setOtherEmployeeRole] = useState("");
  const [openPreviousPeriod, setOpenPreviousPeriod] = useState<string | null>(null);
  const [stage, setStage] = useState<PayrollStage>("inputs");
  const employees = payrollData?.employees ?? [];
  const availableRoster = (payrollData?.roster ?? []).filter(
    (member) => !employees.some((employee) => employee.id === member.id),
  );
  const status = payrollData?.run?.status ?? "draft";
  const approvalIndex = Math.max(
    (payrollData?.run?.currentApprovalStep ?? 1) - 1,
    0,
  );
  const [approvalFlow, setApprovalFlow] = useState<PayrollApprovalFlow>({
    configured: false,
    approvers: [],
  });
  const [approvalFlowError, setApprovalFlowError] = useState("");
  const [isLoadingApprovalFlow, setIsLoadingApprovalFlow] = useState(true);
  const [workflowError, setWorkflowError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const loadPayroll = async () => {
      setIsLoadingPayroll(true);
      setPayrollError("");
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) {
        setPayrollError("Sign in again to view payroll.");
        setIsLoadingPayroll(false);
        return;
      }
      try {
        const response = await fetch(
          `${API_BASE_URL}/dashboard/payroll?period=${encodeURIComponent(period)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            payload &&
              typeof payload === "object" &&
              "message" in payload &&
              typeof payload.message === "string"
              ? payload.message
              : `Could not load payroll (HTTP ${response.status}).`,
          );
        }
        if (!isPayrollData(payload)) {
          throw new Error("The payroll service returned invalid payroll data.");
        }
        setPayrollData(payload);
        setPeriod(payload.period);
        setPayDate(payload.run?.payDate ?? `${period}-28`);
        setStage(
          !payload.run || payload.run.status === "draft"
            ? "inputs"
            : payload.run.status === "review-needed"
              ? "review"
              : payload.run.status === "pending"
                ? "approve"
                : payload.run.status === "approved" || payload.run.status === "paid"
                  ? "remit"
                  : "review",
        );
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setPayrollError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load payroll.",
          );
          setPayrollData(null);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingPayroll(false);
      }
    };
    void loadPayroll();
    return () => controller.abort();
  }, [period, payrollReloadKey]);

  useEffect(() => {
    const controller = new AbortController();
    const loadApprovalFlow = async () => {
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) {
        setApprovalFlowError("Sign in again to load the payroll approval route.");
        setIsLoadingApprovalFlow(false);
        return;
      }
      try {
        const response = await fetch(
          `${API_BASE_URL}/dashboard/payroll/approval-flow`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            payload &&
              typeof payload === "object" &&
              "message" in payload &&
              typeof payload.message === "string"
              ? payload.message
              : `Could not load payroll approval route (HTTP ${response.status}).`,
          );
        }
        if (
          !payload ||
          typeof payload !== "object" ||
          !("configured" in payload) ||
          typeof payload.configured !== "boolean" ||
          !("approvers" in payload) ||
          !Array.isArray(payload.approvers) ||
          !payload.approvers.every(
            (approver) =>
              !!approver &&
              typeof approver === "object" &&
              "id" in approver &&
              typeof approver.id === "string" &&
              "name" in approver &&
              typeof approver.name === "string",
          )
        ) {
          throw new Error("The payroll service returned an invalid approval route.");
        }
        setApprovalFlow({
          configured: payload.configured,
          approvers: payload.approvers,
        });
        setApprovalFlowError("");
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setApprovalFlowError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load payroll approval route.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingApprovalFlow(false);
      }
    };
    void loadApprovalFlow();
    return () => controller.abort();
  }, []);

  const rates = payrollData?.taxRates;
  const rows = employees.map((employee) => {
    if (employee.gross === null || employee.paye === null || !rates) {
      return employee;
    }
    const employeePension = Math.round((employee.gross * rates.employeePension) / 100);
    const nhf = Math.round(
      (employee.gross * rates.nhfEligiblePay * rates.nhf) / 10000,
    );
    const employerPension = Math.round((employee.gross * rates.employerPension) / 100);
    const nsitf = Math.round((employee.gross * rates.nsitf) / 100);
    const vat = employee.vatEnabled
      ? Math.round((employee.gross * rates.vat) / 100)
      : 0;
    const wht = employee.whtEnabled
      ? Math.round((employee.gross * rates.wht) / 100)
      : 0;
    const netPay = Math.max(
      employee.gross - employeePension - nhf - employee.paye - wht,
      0,
    );
    return {
      ...employee,
      employeePension,
      nhf,
      employerPension,
      nsitf,
      vat,
      wht,
      netPay,
      totalCost: employee.gross + employerPension + nsitf + vat,
    };
  });
  const totals = rows.reduce(
    (current, row) => ({
      gross: current.gross + (row.gross ?? 0),
      employeePension: current.employeePension + (row.employeePension ?? 0),
      employerPension: current.employerPension + (row.employerPension ?? 0),
      nhf: current.nhf + (row.nhf ?? 0),
      paye: current.paye + (row.paye ?? 0),
      nsitf: current.nsitf + (row.nsitf ?? 0),
      vat: current.vat + row.vat,
      wht: current.wht + row.wht,
      netPay: current.netPay + (row.netPay ?? 0),
      totalCost: current.totalCost + (row.totalCost ?? 0),
    }),
    {
      gross: 0,
      employeePension: 0,
      employerPension: 0,
      nhf: 0,
      paye: 0,
      nsitf: 0,
      netPay: 0,
      totalCost: 0,
      vat: 0,
      wht: 0,
    },
  );
  const filteredRows = rows.filter((row) =>
    `${row.name} ${row.role}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const monthLabel = new Date(`${period}-01T00:00:00`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const stageNames = ["Inputs", "Review", "Approval", "Pay and remit"];
  const stageLabels: PayrollStage[] = ["inputs", "review", "approve", "remit"];
  const stageIndex = stageLabels.indexOf(stage);
  const hasCompleteInputs =
    employees.length > 0 &&
    employees.every(
      (employee) =>
        employee.gross !== null &&
        employee.gross > 0 &&
        employee.paye !== null &&
        employee.paye >= 0,
    );
  const displayApprovers = payrollData?.run?.approvals.length
    ? payrollData.run.approvals.map((approval) => ({
        id: approval.approverId,
        name: approval.approverName,
      }))
    : approvalFlow.approvers;

  const updateEmployee = (
    id: string,
    field: "gross" | "paye",
    value: string,
  ) => {
    const amount = value === "" ? null : Number(value);
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) return;
    setPayrollData((current) =>
      current
        ? {
            ...current,
            employees: current.employees.map((employee) =>
              employee.id === id ? { ...employee, [field]: amount } : employee,
            ),
          }
        : current,
    );
  };

  const updateEmployeeTax = (
    id: string,
    tax: "vatEnabled" | "whtEnabled",
    enabled: boolean,
  ) => {
    setPayrollData((current) =>
      current
        ? {
            ...current,
            employees: current.employees.map((employee) =>
              employee.id === id ? { ...employee, [tax]: enabled } : employee,
            ),
          }
        : current,
    );
  };

  const addPayrollEntry = () => {
    const member = availableRoster.find(
      (candidate) => candidate.id === selectedRosterId,
    );
    if (!member) return;
    setPayrollData((current) =>
      current
        ? {
            ...current,
            employees: [
              ...current.employees,
              {
                id: member.id,
                name: member.name,
                role: member.role,
                gross: member.previousGross,
                employeePension: null,
                employerPension: null,
                nhf: null,
                paye: member.previousPaye,
                nsitf: null,
                netPay: null,
                totalCost: null,
                vatEnabled: false,
                vatRate: rates?.vat ?? 7.5,
                vat: 0,
                whtEnabled: false,
                whtRate: rates?.wht ?? 5,
                wht: 0,
              },
            ],
          }
        : current,
    );
    setSelectedRosterId("");
    setIsAddEntryOpen(false);
    setStage("inputs");
  };

  const addOtherPayrollEntry = () => {
    const name = otherEmployeeName.trim();
    const role = otherEmployeeRole.trim();
    if (!name || !role) return;
    setPayrollData((current) =>
      current
        ? {
            ...current,
            run:
              current.run?.status === "paid"
                ? {
                    ...current.run,
                    status: "draft",
                    currentApprovalStep: 0,
                    approvals: [],
                  }
                : current.run,
            employees: [
              ...current.employees,
              {
                id: `manual-${Date.now()}`,
                name,
                role,
                gross: null,
                employeePension: null,
                employerPension: null,
                nhf: null,
                paye: null,
                nsitf: null,
                netPay: null,
                totalCost: null,
                vatEnabled: false,
                vatRate: rates?.vat ?? 7.5,
                vat: 0,
                whtEnabled: false,
                whtRate: rates?.wht ?? 5,
                wht: 0,
              },
            ],
          }
        : current,
    );
    setOtherEmployeeName("");
    setOtherEmployeeRole("");
    setIsAddEntryOpen(false);
    setStage("inputs");
  };

  const removePayrollEntry = (employeeId: string) => {
    setPayrollData((current) =>
      current
        ? {
            ...current,
            employees: current.employees.filter(
              (employee) => employee.id !== employeeId,
            ),
          }
        : current,
    );
  };

  const downloadPayslips = () => {
    const header = [
      "Employee",
      "Role",
      "Gross",
      "Employee pension",
      "NHF",
      "PAYE",
      "Net pay",
      "Employer pension",
      "NSITF",
      "Total employer cost",
    ];
    const content = [
      header,
      ...rows.map((row) => [
        row.name,
        row.role,
        row.gross,
        row.employeePension,
        row.nhf,
        row.paye,
        row.netPay,
        row.employerPension,
        row.nsitf,
        row.totalCost,
      ]),
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `payroll-payslips-${period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onNotice("Payslip summary downloaded as CSV.");
  };

  const savePayrollDraft = async (showNotice = true) => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || !payrollData || isSavingPayroll) return null;
    const selectedPeriod = period.trim();
    if (!isPayrollPeriod(selectedPeriod)) {
      setWorkflowError("Choose a payroll month before sending it for review.");
      return null;
    }
    if (
      !employees.length ||
      employees.some(
        (employee) =>
          employee.gross === null ||
          employee.gross <= 0 ||
          employee.paye === null ||
          employee.paye < 0,
      )
    ) {
      setWorkflowError("Enter gross pay and PAYE for every employee before saving.");
      return null;
    }
    setIsSavingPayroll(true);
    setWorkflowError("");
    setPayrollError("");
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/payroll/runs`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          period: selectedPeriod,
          payDate,
          employees: employees.map((employee) => ({
            userId: /^\d+$/.test(employee.id) ? employee.id : null,
            name: employee.name,
            role: employee.role,
            gross: employee.gross,
            paye: employee.paye,
            vatEnabled: employee.vatEnabled,
            whtEnabled: employee.whtEnabled,
          })),
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          payload &&
            typeof payload === "object" &&
            "message" in payload &&
            typeof payload.message === "string"
            ? payload.message
            : `Could not save payroll (HTTP ${response.status}).`,
        );
      }
      if (
        !payload ||
        typeof payload !== "object" ||
        !("payroll" in payload) ||
        !isPayrollData(payload.payroll)
      ) {
        throw new Error("The payroll service returned invalid saved data.");
      }
      setPayrollData(payload.payroll);
      if (showNotice) onNotice("Payroll draft saved.");
      return payload.payroll;
    } catch (saveError) {
      setPayrollError(
        saveError instanceof Error ? saveError.message : "Could not save payroll.",
      );
      return null;
    } finally {
      setIsSavingPayroll(false);
    }
  };

  const runPayrollAction = async (
    action: "review" | "submit" | "approve" | "paid" | "return-for-correction",
    requestedRunId?: string,
  ) => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    const runId = requestedRunId ?? payrollData?.run?.id;
    if (!token || !runId || isSavingPayroll) return false;
    setIsSavingPayroll(true);
    setPayrollError("");
    setWorkflowError("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/dashboard/payroll/runs/${encodeURIComponent(runId)}/${action}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          payload &&
            typeof payload === "object" &&
            "message" in payload &&
            typeof payload.message === "string"
            ? payload.message
            : `Payroll action failed (HTTP ${response.status}).`,
        );
      }
      setPayrollReloadKey((current) => current + 1);
      onNotice(
        payload &&
          typeof payload === "object" &&
          "message" in payload &&
          typeof payload.message === "string"
          ? payload.message
          : "Payroll updated.",
      );
      return true;
    } catch (actionError) {
      setPayrollError(
        actionError instanceof Error
          ? actionError.message
          : "Payroll action failed.",
      );
      return false;
    } finally {
      setIsSavingPayroll(false);
    }
  };

  const advancePayroll = async () => {
    if (status === "draft") {
      const saved = await savePayrollDraft(false);
      if (!saved?.run?.id) return;
      setPayrollData(saved);
      await runPayrollAction("review", saved.run.id);
    } else if (status === "review-needed") {
      if (!payrollData?.run?.canReview) {
        setWorkflowError("Only an authorized payroll reviewer can pass this review.");
        return;
      }
      if (!approvalFlow.configured || !approvalFlow.approvers.length) {
        setWorkflowError("Configure a payroll approval flow before sending this run for approval.");
        return;
      }
      await runPayrollAction("submit");
    } else if (status === "pending") {
      if (!payrollData?.run?.canApprove) {
        setWorkflowError("Only the assigned approver can approve this payroll stage.");
        return;
      }
      await runPayrollAction("approve");
    } else if (status === "approved") {
      await runPayrollAction("paid");
    }
  };

  const returnPayrollForCorrection = async () => {
    if (
      (status !== "review-needed" && status !== "pending") ||
      (!payrollData?.run?.canReview && !payrollData?.run?.canApprove)
    ) {
      return;
    }
    await runPayrollAction("return-for-correction");
  };

  const actionLabel =
    status === "draft"
      ? "Send for review"
      : status === "review-needed"
        ? payrollData?.run?.canReview
          ? "Pass review & send for approval"
          : "Awaiting review"
        : status === "pending"
          ? payrollData?.run?.canApprove
            ? "Approve payroll"
            : "Awaiting approval"
          : status === "approved"
            ? "Mark paid"
            : status === "paid"
              ? "Payroll marked paid"
              : "Payroll rejected";

  return (
    <section aria-labelledby="payroll-heading" className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1
              id="payroll-heading"
              className="font-jakarta text-[19px] font-bold text-[#10213c] sm:text-[21px]"
            >
              Payroll · {monthLabel}
            </h1>
            <span
              className={`rounded-full px-2 py-1 text-[8px] font-bold uppercase ${
                status === "paid"
                  ? "bg-[#e5f7f5] text-[#087b74]"
                  : status === "pending" || status === "review-needed"
                    ? "bg-[#fff2dc] text-[#946000]"
                    : "bg-[#e8eefb] text-[#365ca6]"
              }`}
            >
              {status === "draft"
                ? "Draft"
                : status === "review-needed"
                  ? "Pending review"
                  : status === "pending"
                    ? `Pending approval · ${approvalFlow.approvers[approvalIndex]?.name ?? "Approver"}`
                    : status}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-600">
            <label className="flex items-center gap-1.5">
              Pay date
              <input
                type="date"
                value={payDate}
                onChange={(event) => setPayDate(event.target.value)}
                disabled={status !== "draft"}
                className="rounded border border-[#dbe4f3] bg-white px-1.5 py-0.5 text-[9px] text-[#10213c]"
              />
            </label>
            <span>·</span>
            <span>{employees.length} employees</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="payroll-period">Payroll month</label>
          <input
            id="payroll-period"
            type="month"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="h-9 rounded-lg border border-[#dbe4f3] bg-white px-2 text-[10px] text-[#10213c]"
          />
          <button
            type="button"
            onClick={downloadPayslips}
            disabled={!rows.length || !hasCompleteInputs || isLoadingPayroll}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dbe4f3] bg-white px-3 text-[9px] font-bold text-[#10213c] hover:bg-slate-50"
          >
            <RiDownload2Line className="h-3.5 w-3.5" />
            Download payslips
          </button>
          {status === "draft" ? (
            <button
              type="button"
              onClick={() => void savePayrollDraft()}
              disabled={isSavingPayroll || isLoadingPayroll || !hasCompleteInputs}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dbe4f3] bg-white px-3 text-[9px] font-bold text-[#10213c] disabled:opacity-50"
            >
              {isSavingPayroll ? <ActionSpinner label="Saving payroll draft" /> : null}
              {isSavingPayroll ? "Saving…" : "Save draft"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void advancePayroll()}
            disabled={
              isSavingPayroll ||
              isLoadingPayroll ||
              status === "paid" ||
              status === "rejected" ||
              (status === "draft" && !hasCompleteInputs) ||
              (status === "draft" && !isPayrollPeriod(period)) ||
              (status === "review-needed" &&
                (!payrollData?.run?.canReview ||
                  isLoadingApprovalFlow ||
                  !approvalFlow.configured ||
                  !approvalFlow.approvers.length)) ||
              (status === "pending" && !payrollData?.run?.canApprove)
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1e4fc1] px-3 text-[9px] font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSavingPayroll ? (
              <ActionSpinner label="Processing payroll action" />
            ) : status === "pending" ? (
              <RiCheckLine className="h-3.5 w-3.5" />
            ) : status === "approved" ? (
              <RiBankCardLine className="h-3.5 w-3.5" />
            ) : (
              <RiSendPlaneLine className="h-3.5 w-3.5" />
            )}
            {actionLabel}
          </button>
          {(status === "review-needed" || status === "pending") ? (
            <button
              type="button"
              onClick={() => void returnPayrollForCorrection()}
              disabled={
                isSavingPayroll ||
                isLoadingPayroll ||
                (status === "review-needed"
                  ? !payrollData?.run?.canReview
                  : !payrollData?.run?.canApprove)
              }
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 text-[9px] font-bold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Return for correction
            </button>
          ) : null}
        </div>
      </header>

      <nav
        aria-label="Payroll workflow"
        className="grid grid-cols-4 rounded-xl border border-[#dfe7f4] bg-white p-2"
      >
        {stageNames.map((name, index) => {
          const current = index === stageIndex;
          const complete = index < stageIndex;
          return (
            <div
              key={name}
              aria-current={current ? "step" : undefined}
              className={`flex min-w-0 items-center gap-1.5 rounded-lg px-1.5 py-2 text-left sm:px-3 ${
                current ? "text-[#087b74]" : complete ? "text-[#1e4fc1]" : "text-slate-500"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold ${
                  complete
                    ? "bg-[#087b74] text-white"
                    : current
                      ? "bg-[#1e4fc1] text-white"
                      : "bg-[#e8eefb] text-slate-600"
                }`}
              >
                {complete ? <RiCheckLine className="h-3 w-3" /> : index + 1}
              </span>
              <span className="truncate text-[8px] font-semibold sm:text-[9px]">{name}</span>
            </div>
          );
        })}
      </nav>

      {workflowError ? (
        <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[9px] text-amber-900">
          {workflowError}
        </p>
      ) : null}
      {payrollError ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[9px] text-red-800">
          {payrollError}
        </p>
      ) : null}
      {isLoadingPayroll ? (
        <p role="status" className="rounded-lg border border-[#dfe7f4] bg-white px-3 py-4 text-center text-[9px] text-slate-500">
          Loading workspace payroll…
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        <PayrollMetric label="Gross payroll" value={formatMoney(totals.gross, currency)} />
        <PayrollMetric label="Net pay to staff" value={formatMoney(totals.netPay, currency)} detail="After all deductions" />
        <PayrollMetric label="Statutory deductions" value={formatMoney(totals.employeePension + totals.nhf + totals.paye, currency)} detail="Pension, NHF and PAYE" />
        <PayrollMetric label="Total cost to company" value={formatMoney(totals.totalCost, currency)} detail="Includes employer pension and NSITF" emphasized />
      </div>

      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.8fr)_minmax(230px,0.8fr)]">
        <section
          aria-label="Employee payroll"
          className="min-w-0 overflow-hidden rounded-xl border border-[#dfe7f4] bg-white"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf1f7] px-3 py-2">
            <h2 className="text-[10px] font-bold text-[#10213c]">Payroll entries</h2>
            {status === "draft" || status === "paid" ? (
              <button
                type="button"
                onClick={() => {
                  setEntryType(status === "paid" ? "other" : "workspace");
                  setIsAddEntryOpen((open) => !open);
                }}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-[#dbe4f3] px-2.5 text-[8px] font-bold text-[#1e4fc1] disabled:opacity-50"
              >
                <RiAddLine className="h-3 w-3" /> Add payroll entry
              </button>
            ) : null}
          </div>
          {isAddEntryOpen ? (
            <div className="flex flex-wrap items-end gap-2 border-b border-[#edf1f7] bg-[#f8fafc] px-3 py-2">
              <div className="flex basis-full gap-1">
                <button type="button" disabled={status === "paid"} onClick={() => setEntryType("workspace")} className={`rounded-md px-2 py-1 text-[8px] font-bold disabled:opacity-40 ${entryType === "workspace" ? "bg-[#1e4fc1] text-white" : "border border-[#dbe4f3] bg-white text-slate-600"}`}>Workspace employee</button>
                <button type="button" onClick={() => setEntryType("other")} className={`rounded-md px-2 py-1 text-[8px] font-bold ${entryType === "other" ? "bg-[#1e4fc1] text-white" : "border border-[#dbe4f3] bg-white text-slate-600"}`}>Other employee</button>
              </div>
              {entryType === "workspace" ? (
                <label className="min-w-[220px] flex-1 text-[8px] font-semibold text-slate-600">
                  Workspace employee
                  <select
                    value={selectedRosterId}
                    onChange={(event) => setSelectedRosterId(event.target.value)}
                    className="mt-1 h-8 w-full rounded-md border border-[#dbe4f3] bg-white px-2 text-[9px] text-[#10213c]"
                  >
                    <option value="">Choose employee</option>
                    {availableRoster.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} · {member.role}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <>
                  <label className="min-w-[180px] flex-1 text-[8px] font-semibold text-slate-600">
                    Employee name
                    <input value={otherEmployeeName} onChange={(event) => setOtherEmployeeName(event.target.value)} className="mt-1 h-8 w-full rounded-md border border-[#dbe4f3] bg-white px-2 text-[9px]" placeholder="Full name" />
                  </label>
                  <label className="min-w-[180px] flex-1 text-[8px] font-semibold text-slate-600">
                    Role
                    <input value={otherEmployeeRole} onChange={(event) => setOtherEmployeeRole(event.target.value)} className="mt-1 h-8 w-full rounded-md border border-[#dbe4f3] bg-white px-2 text-[9px]" placeholder="Job title" />
                  </label>
                </>
              )}
              <button
                type="button"
                disabled={entryType === "workspace" ? !selectedRosterId : !otherEmployeeName.trim() || !otherEmployeeRole.trim()}
                onClick={entryType === "workspace" ? addPayrollEntry : addOtherPayrollEntry}
                className="h-8 rounded-md bg-[#1e4fc1] px-3 text-[8px] font-bold text-white disabled:opacity-50"
              >
                Add entry
              </button>
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[730px] border-collapse text-left">
              <thead className="bg-[#f8faff] text-[8px] font-semibold text-slate-500">
                <tr>
                  <th scope="col" className="px-3 py-2.5">Employee</th>
                  <th scope="col" className="px-2 py-2.5 text-right">Gross</th>
                  <th scope="col" className="px-2 py-2.5 text-right">Pension {rates?.employeePension ?? 8}%</th>
                  <th scope="col" className="px-2 py-2.5 text-right">NHF {rates?.nhf ?? 2.5}%</th>
                  <th scope="col" className="px-2 py-2.5 text-right">PAYE</th>
                  <th scope="col" className="px-2 py-2.5 text-right">VAT / WHT</th>
                  <th scope="col" className="px-3 py-2.5 text-right">Net pay</th>
                  <th scope="col" className="px-2 py-2.5 text-right">Entry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1f7] text-[9px]">
                {filteredRows.map((row) => (
                  <tr key={row.id} className="text-[#10213c]">
                    <th scope="row" className="px-3 py-2.5 font-normal">
                      <span className="block font-bold">{row.name}</span>
                      <span className="mt-0.5 block text-[8px] text-slate-500">{row.role}</span>
                      {status === "draft" ? (
                        <span className="mt-1 flex flex-wrap gap-2 text-[7px] text-slate-600">
                          <label className="inline-flex items-center gap-1">
                            <input type="checkbox" checked={row.vatEnabled} onChange={(event) => updateEmployeeTax(row.id, "vatEnabled", event.target.checked)} className="h-3 w-3 accent-[#1e4fc1]" />
                            VAT {rates?.vat ?? row.vatRate}%
                          </label>
                          <label className="inline-flex items-center gap-1">
                            <input type="checkbox" checked={row.whtEnabled} onChange={(event) => updateEmployeeTax(row.id, "whtEnabled", event.target.checked)} className="h-3 w-3 accent-[#1e4fc1]" />
                            WHT {rates?.wht ?? row.whtRate}%
                          </label>
                        </span>
                      ) : null}
                    </th>
                    <td className="px-2 py-2 text-right">
                      {stage === "inputs" && status === "draft" ? (
                        <MoneyInput value={row.gross ?? ""} label={`${row.name} gross pay`} currency={currency} onChange={(value) => updateEmployee(row.id, "gross", value)} />
                      ) : row.gross === null ? "Not entered" : formatMoney(row.gross, currency)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right text-slate-600">{row.employeePension === null ? "—" : formatMoney(row.employeePension, currency)}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-right text-slate-600">{row.nhf === null ? "—" : formatMoney(row.nhf, currency)}</td>
                    <td className="px-2 py-2 text-right">
                      {stage === "inputs" && status === "draft" ? (
                        <MoneyInput value={row.paye ?? ""} label={`${row.name} PAYE`} currency={currency} onChange={(value) => updateEmployee(row.id, "paye", value)} />
                      ) : row.paye === null ? "Not entered" : formatMoney(row.paye, currency)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right text-slate-600">
                      {row.vat || row.wht ? `${formatMoney(row.vat, currency)} / ${formatMoney(row.wht, currency)}` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-bold">{row.netPay === null ? "—" : formatMoney(row.netPay, currency)}</td>
                    <td className="px-2 py-2 text-right">
                      {status === "draft" ? (
                        <button
                          type="button"
                          aria-label={`Remove ${row.name} from payroll`}
                          onClick={() => removePayrollEntry(row.id)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-red-50 hover:text-red-700"
                        >
                          <RiDeleteBinLine className="h-3 w-3" />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
                <tr className="bg-[#f8faff] font-bold text-[#10213c]">
                  <th scope="row" className="px-3 py-2.5">Total</th>
                  <td className="whitespace-nowrap px-2 py-2.5 text-right">{formatMoney(totals.gross, currency)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-right">{formatMoney(totals.employeePension, currency)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-right">{formatMoney(totals.nhf, currency)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-right">{formatMoney(totals.paye, currency)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-right">{formatMoney(totals.vat, currency)} / {formatMoney(totals.wht, currency)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">{formatMoney(totals.netPay, currency)}</td>
                  <td />
                </tr>
                {!filteredRows.length ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                      {employees.length ? "No employees match this search." : "No payroll entries yet. Add a workspace employee to begin."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#edf1f7] px-3 py-2 text-[8px] text-slate-500">
            <span>PAYE is entered per employee. Deductions use workspace payroll rates.</span>
            {status === "draft" ? (
              <button
                type="button"
                onClick={() => setStage("inputs")}
                className="inline-flex items-center gap-1 font-bold text-[#1e4fc1] hover:underline"
              >
                <RiEditLine className="h-3 w-3" /> Edit inputs
              </button>
            ) : null}
          </div>
        </section>

        <aside className="space-y-3">
          <section aria-labelledby="payroll-approval-route-heading" className="rounded-xl border border-[#dfe7f4] bg-white p-3">
            <h2 id="payroll-approval-route-heading" className="text-[10px] font-bold text-[#10213c]">
              Approval route
            </h2>
            {isLoadingApprovalFlow ? (
              <p className="mt-2 text-[8px] text-slate-500">Loading approval route…</p>
            ) : approvalFlow.configured && approvalFlow.approvers.length ? (
              <ol className="mt-2 space-y-1.5">
                {displayApprovers.map((approver, index) => {
                  const savedApproval = payrollData?.run?.approvals[index];
                  return (
                    <li key={approver.id} className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[8px] ${status === "pending" && index === approvalIndex ? "bg-[#e8f7f5] font-bold text-[#087b74]" : "bg-[#f7f9fd] text-slate-600"}`}>
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white text-[7px] font-bold">{index + 1}</span>
                      {approver.name}
                      {status === "pending" && index === approvalIndex ? <span className="ml-auto">Current</span> : savedApproval?.status === "approved" ? <span className="ml-auto">Approved</span> : null}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="mt-2">
                <p className="text-[8px] text-slate-500">
                  {approvalFlowError || "No approval flow is configured for your membership."}
                </p>
                <Link href="/dashboard/approval-flows" className="mt-1 inline-block text-[8px] font-bold text-[#1e4fc1] underline">
                  Configure payroll approval
                </Link>
              </div>
            )}
          </section>
          <section aria-labelledby="remit-heading" className="rounded-xl border border-[#dfe7f4] bg-white p-3">
            <h2 id="remit-heading" className="text-[10px] font-bold text-[#10213c]">What to remit</h2>
            <RemittanceLine label="PAYE" date="By 10 Nov" value={totals.paye} currency={currency} />
            <RemittanceLine label={`Pension (employee ${rates?.employeePension ?? 8}% + employer ${rates?.employerPension ?? 10}%)`} date="Within 7 working days after pay date" value={totals.employeePension + totals.employerPension} currency={currency} />
            <RemittanceLine label="NHF" date="By 10 Nov" value={totals.nhf} currency={currency} />
            <RemittanceLine label={`NSITF (employer ${rates?.nsitf ?? 1}%)`} date="By 16 Nov" value={totals.nsitf} currency={currency} />
          </section>

          <section className="rounded-xl border border-[#bfe7e2] bg-[#e8f7f5] p-3 text-[8px] leading-relaxed text-[#176b66]">
            <p className="font-bold">Payroll records</p>
            <p className="mt-1">Payroll moves from input to review, approval, then remittance. Marking a run paid records its status only; it does not transfer funds.</p>
          </section>

          {stage === "inputs" ? (
            <button
              type="button"
              onClick={() => setStage("review")}
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#087b74] px-3 text-[9px] font-bold text-white hover:bg-[#066a64]"
            >
              Review payroll <RiArrowRightSLine className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </aside>
      </div>
      <section
        aria-labelledby="previous-payroll-heading"
        className="rounded-xl border border-[#dfe7f4] bg-white"
      >
        <div className="border-b border-[#edf1f7] px-3 py-2.5">
          <h2
            id="previous-payroll-heading"
            className="text-[10px] font-bold text-[#10213c]"
          >
            Previous approved payroll
          </h2>
          <p className="mt-0.5 text-[8px] text-slate-500">
            Approved and paid payroll runs by month.
          </p>
        </div>
        {payrollData?.previousApprovedPayrolls.length ? (
          <div className="divide-y divide-[#edf1f7]">
            {payrollData.previousApprovedPayrolls.map((previous) => {
              const isOpen = openPreviousPeriod === previous.period;
              return (
                <div key={previous.id}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setOpenPreviousPeriod(isOpen ? null : previous.period)
                    }
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-[#f8faff]"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <RiArrowDownSLine
                        className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                      <span className="truncate text-[9px] font-bold text-[#10213c]">
                        {formatPayrollMonth(previous.period)}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-[#e8f7f5] px-2 py-1 text-[7px] font-bold uppercase text-[#087b74]">
                      {previous.status}
                    </span>
                  </button>
                  {isOpen ? (
                    <div className="bg-[#f8faff] px-3 py-2.5">
                      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[8px] text-slate-600">
                        <span>Pay date <strong className="text-[#10213c]">{previous.payDate}</strong></span>
                        <span>Employees <strong className="text-[#10213c]">{previous.employeeCount}</strong></span>
                        <span>Net pay <strong className="text-[#10213c]">{formatMoney(previous.netPay, currency)}</strong></span>
                        <span>Total cost <strong className="text-[#10213c]">{formatMoney(previous.totalCost, currency)}</strong></span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[780px] border-collapse text-left text-[8px]">
                          <thead className="bg-white text-slate-500">
                            <tr>
                              <th className="px-2 py-1.5">Employee</th>
                              <th className="px-2 py-1.5">Role</th>
                              <th className="px-2 py-1.5 text-right">Gross</th>
                              <th className="px-2 py-1.5 text-right">Pension</th>
                              <th className="px-2 py-1.5 text-right">Employer pension</th>
                              <th className="px-2 py-1.5 text-right">NHF</th>
                              <th className="px-2 py-1.5 text-right">PAYE</th>
                              <th className="px-2 py-1.5 text-right">VAT / WHT</th>
                              <th className="px-2 py-1.5 text-right">Net pay</th>
                              <th className="px-2 py-1.5 text-right">Total cost</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#dfe7f4] text-[#10213c]">
                            {previous.employees.map((employee) => (
                              <tr key={`${previous.period}-${employee.name}-${employee.role}`}>
                                <td className="px-2 py-1.5 font-semibold">{employee.name}</td>
                                <td className="px-2 py-1.5 text-slate-500">{employee.role}</td>
                                <td className="px-2 py-1.5 text-right">{formatMoney(employee.gross, currency)}</td>
                                <td className="px-2 py-1.5 text-right">{formatMoney(employee.employeePension, currency)}</td>
                                <td className="px-2 py-1.5 text-right">{formatMoney(employee.employerPension, currency)}</td>
                                <td className="px-2 py-1.5 text-right">{formatMoney(employee.nhf, currency)}</td>
                                <td className="px-2 py-1.5 text-right">{formatMoney(employee.paye, currency)}</td>
                                <td className="px-2 py-1.5 text-right">{formatMoney(employee.vat, currency)} / {formatMoney(employee.wht, currency)}</td>
                                <td className="px-2 py-1.5 text-right font-semibold">{formatMoney(employee.netPay, currency)}</td>
                                <td className="px-2 py-1.5 text-right font-semibold">{formatMoney(employee.totalCost, currency)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button type="button" onClick={() => downloadHistoryXls(previous, currency)} className="inline-flex items-center gap-1 rounded-md border border-[#dbe4f3] bg-white px-2 py-1.5 text-[8px] font-bold text-[#1e4fc1]">
                          <RiDownload2Line className="h-3 w-3" /> XLS
                        </button>
                        <button type="button" onClick={() => printHistory(previous, currency)} className="inline-flex items-center gap-1 rounded-md border border-[#dbe4f3] bg-white px-2 py-1.5 text-[8px] font-bold text-[#1e4fc1]">
                          <RiPrinterLine className="h-3 w-3" /> Print
                        </button>
                        <button type="button" onClick={() => printHistory(previous, currency)} className="inline-flex items-center gap-1 rounded-md border border-[#dbe4f3] bg-white px-2 py-1.5 text-[8px] font-bold text-[#1e4fc1]">
                          <RiDownload2Line className="h-3 w-3" /> PDF
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="px-3 py-4 text-[8px] text-slate-500">
            No previous approved payroll yet.
          </p>
        )}
      </section>
    </section>
  );
}

function PayrollMetric({
  label,
  value,
  detail,
  emphasized = false,
}: {
  label: string;
  value: string;
  detail?: string;
  emphasized?: boolean;
}) {
  return (
    <article className={`min-w-0 rounded-xl border bg-white px-3 py-2.5 ${emphasized ? "border-blue-200" : "border-[#dfe7f4]"}`}>
      <p className="text-[8px] font-semibold text-slate-500">{label}</p>
      <p className="mt-1 truncate text-[12px] font-bold text-[#10213c]">{value}</p>
      {detail ? <p className="mt-0.5 truncate text-[8px] text-slate-500">{detail}</p> : null}
    </article>
  );
}

function RemittanceLine({
  label,
  date,
  value,
  currency,
}: {
  label: string;
  date: string;
  value: number;
  currency: string;
}) {
  return (
    <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-[#f7f9fd] px-2.5 py-2">
      <span className="min-w-0">
        <span className="block text-[8px] font-bold text-[#10213c]">{label}</span>
        <span className="text-[7px] text-slate-500">{date}</span>
      </span>
      <span className="shrink-0 text-[9px] font-bold text-[#10213c]">{formatMoney(value, currency)}</span>
    </div>
  );
}

function MoneyInput({
  value,
  label,
  currency,
  onChange,
}: {
  value: number | string;
  label: string;
  currency: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="inline-flex items-center gap-1">
      <span className="sr-only">{label}</span>
      <span className="text-[7px] text-slate-500">{currency}</span>
      <input
        aria-label={label}
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-[76px] rounded-md border border-[#dbe4f3] px-1.5 py-1 text-right text-[8px] text-[#10213c] outline-none focus:border-[#1e4fc1]"
      />
    </label>
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function historyTableMarkup(payroll: PreviousPayroll, currency: string) {
  const rows = payroll.employees
    .map(
      (employee) => `
        <tr>
          <td>${escapeHtml(employee.name)}</td>
          <td>${escapeHtml(employee.role)}</td>
          <td>${formatMoney(employee.gross, currency)}</td>
          <td>${formatMoney(employee.employeePension, currency)}</td>
          <td>${formatMoney(employee.employerPension, currency)}</td>
          <td>${formatMoney(employee.nhf, currency)}</td>
          <td>${formatMoney(employee.paye, currency)}</td>
          <td>${formatMoney(employee.vat, currency)}</td>
          <td>${formatMoney(employee.wht, currency)}</td>
          <td>${formatMoney(employee.netPay, currency)}</td>
          <td>${formatMoney(employee.totalCost, currency)}</td>
        </tr>`,
    )
    .join("");
  return `<table><thead><tr><th>Employee</th><th>Role</th><th>Gross</th><th>Employee pension</th><th>Employer pension</th><th>NHF</th><th>PAYE</th><th>VAT</th><th>WHT</th><th>Net pay</th><th>Total cost</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function downloadHistoryXls(payroll: PreviousPayroll, currency: string) {
  const content = `<!doctype html><html><head><meta charset="utf-8"></head><body><h1>${escapeHtml(formatPayrollMonth(payroll.period))} payroll</h1>${historyTableMarkup(payroll, currency)}</body></html>`;
  const url = URL.createObjectURL(
    new Blob([content], { type: "application/vnd.ms-excel" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `payroll-${payroll.period}-${payroll.id}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}

function printHistory(payroll: PreviousPayroll, currency: string) {
  const printWindow = window.open("", "_blank", "width=1200,height=800");
  if (!printWindow) return;
  printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(formatPayrollMonth(payroll.period))} payroll</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#10213c}table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #dbe4f3;padding:6px;text-align:left}th{background:#f1f5fb}h1{font-size:20px}</style></head><body><h1>${escapeHtml(formatPayrollMonth(payroll.period))} payroll</h1>${historyTableMarkup(payroll, currency)}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}