"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { RiAddLine, RiCloseLine, RiTimeLine } from "@remixicon/react";
import ActionSpinner from "../components/ActionSpinner";

type Project = {
  id: string;
  name: string;
  clientName: string;
  currency: string;
  billed: number;
  cost: number;
  profitPercent: number;
};

type BillableTime = {
  projectId: string;
  projectName: string;
  clientName: string;
  currency: string;
  hours: number;
  amount: number;
  entryCount: number;
};

type ProjectsResponse = {
  summary: {
    activeProjects: number;
    billedToDate: { currency: string; amount: number }[];
    hoursThisWeek: number;
    unbilledTime: { currency: string; amount: number }[];
  };
  projects: Project[];
  billableTime: BillableTime[];
};

type ProjectForm = {
  name: string;
  clientName: string;
  clientEmail: string;
  billingRate: string;
  costRate: string;
};

type TimeForm = {
  projectId: string;
  description: string;
  hours: string;
};

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

const emptyProjectForm: ProjectForm = {
  name: "",
  clientName: "",
  clientEmail: "",
  billingRate: "",
  costRate: "",
};

const emptyTimeForm: TimeForm = {
  projectId: "",
  description: "",
  hours: "",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isMoneyList(
  value: unknown,
): value is { currency: string; amount: number }[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.currency === "string" &&
        typeof item.amount === "number" &&
        Number.isFinite(item.amount),
    )
  );
}

function isProjectsResponse(value: unknown): value is ProjectsResponse {
  return (
    isRecord(value) &&
    isRecord(value.summary) &&
    typeof value.summary.activeProjects === "number" &&
    typeof value.summary.hoursThisWeek === "number" &&
    isMoneyList(value.summary.billedToDate) &&
    isMoneyList(value.summary.unbilledTime) &&
    Array.isArray(value.projects) &&
    value.projects.every(
      (project) =>
        isRecord(project) &&
        typeof project.id === "string" &&
        typeof project.name === "string" &&
        typeof project.clientName === "string" &&
        typeof project.currency === "string" &&
        typeof project.billed === "number" &&
        typeof project.cost === "number" &&
        typeof project.profitPercent === "number",
    ) &&
    Array.isArray(value.billableTime) &&
    value.billableTime.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.projectId === "string" &&
        typeof entry.projectName === "string" &&
        typeof entry.clientName === "string" &&
        typeof entry.currency === "string" &&
        typeof entry.hours === "number" &&
        typeof entry.amount === "number" &&
        typeof entry.entryCount === "number",
    )
  );
}

function apiError(payload: unknown, fallback: string): string {
  if (!isRecord(payload) || !("message" in payload)) return fallback;
  if (typeof payload.message === "string") return payload.message;
  if (
    Array.isArray(payload.message) &&
    payload.message.every((message) => typeof message === "string")
  ) {
    return payload.message.join(" ");
  }
  return fallback;
}

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,      currencyDisplay: "code",      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function moneyList(
  amounts: { currency: string; amount: number }[],
  defaultCurrency: string,
): string {
  return amounts.length
    ? amounts.map(({ currency, amount }) => money(amount, currency)).join(" · ")
    : money(0, defaultCurrency);
}

async function sendProjectRequest(
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  const token = window.sessionStorage.getItem("darobooksAccessToken");
  if (!token) throw new Error("Sign in again to manage projects.");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(
      `The project service returned an invalid response (HTTP ${response.status}).`,
    );
  }
  if (!response.ok) {
    throw new Error(
      apiError(
        payload,
        `The project request failed (HTTP ${response.status}).`,
      ),
    );
  }
  return payload;
}

export default function DashboardProjects({
  search,
  currency,
  onNotice,
}: {
  search: string;
  currency: string;
  onNotice: (message: string) => void;
}) {
  const [data, setData] = useState<ProjectsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<"project" | "time" | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProjectForm);
  const [timeForm, setTimeForm] = useState<TimeForm>(emptyTimeForm);
  const [isSaving, setIsSaving] = useState(false);
  const [billingProjectId, setBillingProjectId] = useState("");

  const loadProjects = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const payload = await sendProjectRequest("/dashboard/projects");
      if (!isProjectsResponse(payload)) {
        throw new Error("The project service returned an invalid response.");
      }
      setData(payload);
      setError("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not load projects. Please try again.",
      );
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadProjects();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadProjects]);

  const submitProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setError("");
    try {
      await sendProjectRequest("/dashboard/projects", {
        method: "POST",
        body: JSON.stringify({
          ...projectForm,
          billingRate: Number(projectForm.billingRate),
          costRate: projectForm.costRate ? Number(projectForm.costRate) : 0,
        }),
      });
      setProjectForm(emptyProjectForm);
      setDialog(null);
      onNotice("Project created.");
      await loadProjects(false);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not create the project. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const submitTime = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving || !timeForm.projectId) return;
    setIsSaving(true);
    setError("");
    try {
      await sendProjectRequest(
        `/dashboard/projects/${timeForm.projectId}/time-entries`,
        {
          method: "POST",
          body: JSON.stringify({
            description: timeForm.description,
            hours: Number(timeForm.hours),
          }),
        },
      );
      setTimeForm(emptyTimeForm);
      setDialog(null);
      onNotice("Time entry saved.");
      await loadProjects(false);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not save time. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const billProjectTime = async (projectId: string) => {
    if (billingProjectId) return;
    setBillingProjectId(projectId);
    setError("");
    try {
      const payload = await sendProjectRequest(
        `/dashboard/projects/${projectId}/bill`,
        { method: "POST" },
      );
      const invoice =
        isRecord(payload) && isRecord(payload.invoice) ? payload.invoice : null;
      if (
        !invoice ||
        typeof invoice.invoiceNumber !== "string" ||
        typeof invoice.entryCount !== "number"
      ) {
        throw new Error("The project service returned an invalid invoice.");
      }
      onNotice(
        `Draft invoice ${invoice.invoiceNumber} created from ${invoice.entryCount} time entries.`,
      );
      await loadProjects(false);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not create the project invoice. Please try again.",
      );
    } finally {
      setBillingProjectId("");
    }
  };

  const filteredProjects = (data?.projects ?? []).filter((project) =>
    `${project.name} ${project.clientName}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  const openTimeDialog = () => {
    setError("");
    setTimeForm({
      ...emptyTimeForm,
      projectId: data?.projects[0]?.id ?? "",
    });
    setDialog("time");
  };

  const closeDialog = () => {
    if (isSaving) return;
    setDialog(null);
    setError("");
  };

  const summary = [
    {
      label: "Active projects",
      value: isLoading ? "Loading…" : String(data?.summary.activeProjects ?? 0),
    },
    {
      label: "Billed to date",
      value: isLoading
        ? "Loading…"
        : moneyList(data?.summary.billedToDate ?? [], currency),
    },
    {
      label: "Hours this week",
      value: isLoading ? "Loading…" : String(data?.summary.hoursThisWeek ?? 0),
    },
    {
      label: "Unbilled time",
      value: isLoading
        ? "Loading…"
        : moneyList(data?.summary.unbilledTime ?? [], currency),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#078b82]">
            DaroTime
          </p>
          <h1 className="mt-1 font-jakarta text-[19px] font-bold tracking-[-0.4px] text-[#10213c] sm:text-[22px]">
            Projects and time
          </h1>
          <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-slate-600 sm:text-[11px]">
            Track hours and project profitability. Turn saved billable time into
            invoices and see which jobs really make money.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={!data?.projects.length || isLoading}
            onClick={openTimeDialog}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#dbe4f3] bg-white px-3 text-[10px] font-semibold text-[#10213c] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RiTimeLine className="h-3.5 w-3.5" />
            Log time
          </button>
          <button
            type="button"
            onClick={() => {
              setError("");
              setDialog("project");
            }}
            className="inline-flex h-8 items-center gap-1 rounded-md bg-[#1e4fc1] px-3 text-[10px] font-semibold text-white transition hover:bg-blue-800"
          >
            <RiAddLine className="h-3.5 w-3.5" />
            New project
          </button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-800"
        >
          {error}
        </p>
      )}

      <section
        aria-label="Project summary"
        className="grid grid-cols-2 gap-2 lg:grid-cols-4"
      >
        {summary.map((item) => (
          <article
            key={item.label}
            className="min-w-0 rounded-lg border border-[#e1e8f4] bg-white px-3 py-2.5"
          >
            <h2 className="text-[9px] font-semibold text-slate-600">
              {item.label}
            </h2>
            <p className="mt-1 break-words font-jakarta text-[13px] font-bold tracking-[-0.2px] text-[#10213c] sm:text-[14px]">
              {item.value}
            </p>
          </article>
        ))}
      </section>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
        <section className="rounded-xl border border-[#e1e8f4] bg-white p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-[12px] font-bold text-[#10213c]">
                Job profitability
              </h2>
              <p className="mt-0.5 text-[9px] text-slate-500">
                Project value compared with project costs
              </p>
            </div>
            <span className="rounded-md bg-[#e6f5f3] px-2 py-1 text-[8px] font-semibold text-[#087f78]">
              Active projects
            </span>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <p className="py-6 text-center text-[10px] text-slate-500">
                Loading projects…
              </p>
            ) : (
              filteredProjects.map((project) => {
                const isProfitable = project.profitPercent >= 0;
                return (
                  <article key={project.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-[10px] font-bold text-[#10213c]">
                          {project.name}
                        </h3>
                        <p className="mt-0.5 truncate text-[8px] text-slate-500">
                          {project.clientName}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-[9px] font-bold ${
                          isProfitable ? "text-[#078b82]" : "text-[#d84a4a]"
                        }`}
                      >
                        {project.profitPercent > 0 ? "+" : ""}
                        {project.profitPercent}%
                      </span>
                    </div>
                    <div
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#edf1f7]"
                      role="meter"
                      aria-label={`${project.name} profit margin`}
                      aria-valuemin={-100}
                      aria-valuemax={100}
                      aria-valuenow={Math.max(
                        -100,
                        Math.min(project.profitPercent, 100),
                      )}
                    >
                      <div
                        className={`h-full rounded-full ${
                          isProfitable ? "bg-[#078b82]" : "bg-[#d84a4a]"
                        }`}
                        style={{
                          width: `${Math.min(
                            Math.abs(project.profitPercent),
                            100,
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-[8px] text-slate-500">
                      Billed {money(project.billed, project.currency)} · Cost{" "}
                      {money(project.cost, project.currency)}
                    </p>
                  </article>
                );
              })
            )}
            {!isLoading && filteredProjects.length === 0 && (
              <p className="rounded-lg bg-[#f4f7fd] px-3 py-6 text-center text-[10px] text-slate-600">
                {search.trim()
                  ? "No projects match your search."
                  : "No active projects yet. Create a project to get started."}
              </p>
            )}
          </div>
        </section>

        <div className="space-y-3">
          <section className="rounded-xl border border-[#e1e8f4] bg-white p-3 sm:p-4">
            <div className="mb-3">
              <h2 className="text-[12px] font-bold text-[#10213c]">
                Time ready to bill
              </h2>
              <p className="mt-0.5 text-[9px] text-slate-500">
                Saved billable hours not yet invoiced
              </p>
            </div>
            <div className="space-y-3">
              {isLoading ? (
                <p className="py-4 text-center text-[10px] text-slate-500">
                  Loading billable time…
                </p>
              ) : (
                (data?.billableTime ?? []).map((entry) => (
                  <div
                    key={entry.projectId}
                    className="rounded-lg border border-[#edf1f7] p-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[9px] font-semibold text-[#10213c]">
                          {entry.projectName}
                        </p>
                        <p className="truncate text-[8px] text-slate-500">
                          {entry.clientName} · {entry.entryCount}{" "}
                          {entry.entryCount === 1 ? "entry" : "entries"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[9px] font-semibold text-[#10213c]">
                          {entry.hours.toLocaleString()} h
                        </p>
                        <p className="text-[8px] text-slate-500">
                          {money(entry.amount, entry.currency)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={billingProjectId !== ""}
                      onClick={() => void billProjectTime(entry.projectId)}
                      className="mt-2 h-7 w-full rounded-md bg-[#078b82] px-3 text-[9px] font-bold text-white transition hover:bg-[#06756e] disabled:cursor-wait disabled:opacity-60"
                    >
                      {billingProjectId === entry.projectId ? (
                        <span className="inline-flex items-center justify-center gap-2">
                          <ActionSpinner label="Creating draft invoice" />{" "}
                          Creating draft invoice…
                        </span>
                      ) : (
                        "Create draft invoice"
                      )}
                    </button>
                  </div>
                ))
              )}
              {!isLoading && !data?.billableTime.length && (
                <p className="rounded-lg bg-[#f4f7fd] px-3 py-5 text-center text-[9px] text-slate-600">
                  No saved billable time is waiting for an invoice.
                </p>
              )}
            </div>
          </section>

          <aside className="rounded-xl border border-[#ccece6] bg-[#e8f7f4] p-3">
            <p className="text-[9px] leading-relaxed text-[#326e68]">
              Creating a draft invoice includes all unbilled time for that
              project. Review and send it from Invoices.
            </p>
          </aside>
        </div>
      </div>

      {dialog && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-3"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-dialog-title"
            className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-xl border border-[#e1e8f4] bg-white p-4 shadow-2xl sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="project-dialog-title"
                  className="text-[14px] font-bold text-[#10213c]"
                >
                  {dialog === "project" ? "Create project" : "Log project time"}
                </h2>
                <p className="mt-1 text-[9px] text-slate-500">
                  {dialog === "project"
                    ? "Set the client and hourly rates for this project."
                    : "Time is saved as billable and can be invoiced later."}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={closeDialog}
                className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100"
              >
                <RiCloseLine className="h-4 w-4" />
              </button>
            </div>

            {dialog === "project" ? (
              <form onSubmit={submitProject} className="mt-4 space-y-3">
                <label className="block text-[9px] font-semibold text-slate-700">
                  Project name
                  <input
                    required
                    minLength={2}
                    maxLength={160}
                    value={projectForm.name}
                    onChange={(event) =>
                      setProjectForm({
                        ...projectForm,
                        name: event.target.value,
                      })
                    }
                    className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] px-3 text-[10px] font-normal outline-none focus:border-[#1e4fc1] focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="block text-[9px] font-semibold text-slate-700">
                  Client name
                  <input
                    required
                    minLength={2}
                    maxLength={160}
                    value={projectForm.clientName}
                    onChange={(event) =>
                      setProjectForm({
                        ...projectForm,
                        clientName: event.target.value,
                      })
                    }
                    className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] px-3 text-[10px] font-normal outline-none focus:border-[#1e4fc1] focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="block text-[9px] font-semibold text-slate-700">
                  Client email
                  <input
                    type="email"
                    required
                    maxLength={254}
                    value={projectForm.clientEmail}
                    onChange={(event) =>
                      setProjectForm({
                        ...projectForm,
                        clientEmail: event.target.value,
                      })
                    }
                    className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] px-3 text-[10px] font-normal outline-none focus:border-[#1e4fc1] focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-[9px] font-semibold text-slate-700">
                    Billing rate ({currency}/hour)
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={projectForm.billingRate}
                      onChange={(event) =>
                        setProjectForm({
                          ...projectForm,
                          billingRate: event.target.value,
                        })
                      }
                      className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] px-3 text-[10px] font-normal outline-none focus:border-[#1e4fc1] focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <label className="block text-[9px] font-semibold text-slate-700">
                    Cost rate ({currency}/hour)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={projectForm.costRate}
                      onChange={(event) =>
                        setProjectForm({
                          ...projectForm,
                          costRate: event.target.value,
                        })
                      }
                      className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] px-3 text-[10px] font-normal outline-none focus:border-[#1e4fc1] focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="h-9 w-full rounded-md bg-[#1e4fc1] px-4 text-[10px] font-bold text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
                >
                  {isSaving ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <ActionSpinner label="Creating project" /> Creating…
                    </span>
                  ) : (
                    "Create project"
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={submitTime} className="mt-4 space-y-3">
                <label className="block text-[9px] font-semibold text-slate-700">
                  Project
                  <select
                    required
                    value={timeForm.projectId}
                    onChange={(event) =>
                      setTimeForm({
                        ...timeForm,
                        projectId: event.target.value,
                      })
                    }
                    className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] bg-white px-3 text-[10px] font-normal outline-none focus:border-[#1e4fc1] focus:ring-2 focus:ring-blue-100"
                  >
                    {data?.projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-[9px] font-semibold text-slate-700">
                  What did you work on?
                  <input
                    required
                    minLength={2}
                    maxLength={250}
                    value={timeForm.description}
                    onChange={(event) =>
                      setTimeForm({
                        ...timeForm,
                        description: event.target.value,
                      })
                    }
                    className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] px-3 text-[10px] font-normal outline-none focus:border-[#1e4fc1] focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="block text-[9px] font-semibold text-slate-700">
                  Hours
                  <input
                    type="number"
                    min="0.01"
                    max="24"
                    step="0.01"
                    required
                    value={timeForm.hours}
                    onChange={(event) =>
                      setTimeForm({
                        ...timeForm,
                        hours: event.target.value,
                      })
                    }
                    className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] px-3 text-[10px] font-normal outline-none focus:border-[#1e4fc1] focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="h-9 w-full rounded-md bg-[#078b82] px-4 text-[10px] font-bold text-white transition hover:bg-[#06756e] disabled:cursor-wait disabled:opacity-60"
                >
                  {isSaving ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <ActionSpinner label="Saving time entry" /> Saving…
                    </span>
                  ) : (
                    "Save time"
                  )}
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
