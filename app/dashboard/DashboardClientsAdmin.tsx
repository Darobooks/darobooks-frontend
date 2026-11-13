"use client";

import { useEffect, useMemo, useState } from "react";
import {
  RiBuilding2Line,
  RiCalendarTodoLine,
  RiGroupLine,
  RiSearchLine,
  RiUser3Line,
} from "@remixicon/react";

type ClientSummary = {
  id: string;
  fullName: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  planName: string;
  planStatus: string;
  teamMemberCount: number;
  companyCount: number;
  lastActivityAt: string | null;
};

type ClientDetails = {
  client: {
    id: string;
    fullName: string;
    email: string;
    emailVerified: boolean;
    createdAt: string;
    plan: {
      key: string;
      name: string;
      status: string;
      billingInterval: string | null;
      currency: string | null;
      amountMinor: string | null;
      startsAt: string | null;
      endsAt: string | null;
    };
  };
  companies: {
    id: string;
    name: string;
    countryCode: string | null;
    currencyCode: string | null;
  }[];
  teams: { id: string; name: string; memberCount: number }[];
  teamMembers: {
    id: string;
    fullName: string;
    email: string;
    roleName: string;
    teamName: string | null;
    emailVerified: boolean;
    createdAt: string;
  }[];
  activities: {
    id: string;
    action: string;
    description: string;
    createdAt: string;
    actorName: string;
  }[];
};

function getErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || !("message" in payload)) {
    return null;
  }
  return typeof payload.message === "string" ? payload.message : null;
}

function isClientList(payload: unknown): payload is { clients: ClientSummary[] } {
  return (
    !!payload &&
    typeof payload === "object" &&
    "clients" in payload &&
    Array.isArray(payload.clients) &&
    payload.clients.every(
      (client) =>
        !!client &&
        typeof client === "object" &&
        "id" in client &&
        typeof client.id === "string" &&
        "fullName" in client &&
        typeof client.fullName === "string" &&
        "email" in client &&
        typeof client.email === "string" &&
        "emailVerified" in client &&
        typeof client.emailVerified === "boolean" &&
        "createdAt" in client &&
        typeof client.createdAt === "string" &&
        "planName" in client &&
        typeof client.planName === "string" &&
        "planStatus" in client &&
        typeof client.planStatus === "string" &&
        "teamMemberCount" in client &&
        typeof client.teamMemberCount === "number" &&
        "companyCount" in client &&
        typeof client.companyCount === "number" &&
        "lastActivityAt" in client &&
        (typeof client.lastActivityAt === "string" ||
          client.lastActivityAt === null),
    )
  );
}

function isClientDetails(payload: unknown): payload is ClientDetails {
  return (
    !!payload &&
    typeof payload === "object" &&
    "client" in payload &&
    !!payload.client &&
    typeof payload.client === "object" &&
    "plan" in payload.client &&
    !!payload.client.plan &&
    typeof payload.client.plan === "object" &&
    "companies" in payload &&
    Array.isArray(payload.companies) &&
    "teams" in payload &&
    Array.isArray(payload.teams) &&
    "teamMembers" in payload &&
    Array.isArray(payload.teamMembers) &&
    "activities" in payload &&
    Array.isArray(payload.activities)
  );
}

function formatDate(value: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function formatPlanPrice(plan: ClientDetails["client"]["plan"]) {
  if (!plan.amountMinor || !plan.currency) return "No paid subscription";
  const amount = Number(plan.amountMinor);
  if (!Number.isFinite(amount)) return "Price unavailable";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: plan.currency,
      currencyDisplay: "code",
    }).format(amount / 100);
  } catch {
    return `${plan.currency} ${(amount / 100).toFixed(2)}`;
  }
}

export default function DashboardClientsAdmin() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [details, setDetails] = useState<ClientDetails | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailsError, setDetailsError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const loadClients = async () => {
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) {
        setError("Sign in to view registered clients.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/admin/clients", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            getErrorMessage(payload) ??
              `Could not load clients (HTTP ${response.status}).`,
          );
        }
        if (!isClientList(payload)) {
          throw new Error("The client service returned invalid data.");
        }
        setClients(payload.clients);
        setSelectedId((current) => current || payload.clients[0]?.id || "");
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load clients. Please try again.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void loadClients();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    const controller = new AbortController();
    const loadDetails = async () => {
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) {
        setDetailsError("Sign in to view client details.");
        return;
      }
      setIsDetailsLoading(true);
      setDetailsError("");
      setDetails(null);
      try {
        const response = await fetch(
          `/api/admin/clients/${encodeURIComponent(selectedId)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            getErrorMessage(payload) ??
              `Could not load client details (HTTP ${response.status}).`,
          );
        }
        if (!isClientDetails(payload)) {
          throw new Error("The client detail service returned invalid data.");
        }
        setDetails(payload);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setDetailsError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load client details. Please try again.",
        );
      } finally {
        if (!controller.signal.aborted) setIsDetailsLoading(false);
      }
    };

    void loadDetails();
    return () => controller.abort();
  }, [selectedId]);

  const filteredClients = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return clients;
    return clients.filter(
      (client) =>
        client.fullName.toLowerCase().includes(normalizedSearch) ||
        client.email.toLowerCase().includes(normalizedSearch) ||
        client.planName.toLowerCase().includes(normalizedSearch),
    );
  }, [clients, search]);

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-[#dfe8f6] bg-white p-5 shadow-sm sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1e4fc1]">
          Super Admin
        </p>
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#10213c]">Clients</h1>
            <p className="mt-1 text-xs text-slate-500">
              Review registered client accounts, subscriptions, workspaces, and
              recent activity.
            </p>
          </div>
          <p className="rounded-xl bg-[#f2f6fd] px-3 py-2 text-xs font-semibold text-[#29456e]">
            {clients.length} registered {clients.length === 1 ? "client" : "clients"}
          </p>
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700"
        >
          {error}
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.82fr)_minmax(0,1.5fr)]">
        <section className="overflow-hidden rounded-2xl border border-[#dfe8f6] bg-white shadow-sm">
          <div className="border-b border-[#edf1f7] p-4">
            <label className="relative block">
              <RiSearchLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <span className="sr-only">Search clients</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email or plan"
                className="w-full rounded-xl border border-[#dfe8f6] bg-white py-2.5 pl-9 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#315dc7] focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>
          <div className="max-h-[690px] overflow-y-auto p-2">
            {isLoading ? (
              <div className="space-y-2 p-2" aria-label="Loading clients">
                {[0, 1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-[88px] animate-pulse rounded-xl bg-slate-100"
                  />
                ))}
              </div>
            ) : filteredClients.length ? (
              <ul className="space-y-1">
                {filteredClients.map((client) => (
                  <li key={client.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(client.id)}
                      aria-pressed={selectedId === client.id}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        selectedId === client.id
                          ? "border-[#b8c9ef] bg-[#f2f6fd]"
                          : "border-transparent hover:border-[#e7edf7] hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-[#10213c]">
                            {client.fullName}
                          </span>
                          <span className="mt-1 block truncate text-[11px] text-slate-500">
                            {client.email}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[9px] font-semibold capitalize text-slate-600 ring-1 ring-slate-200">
                          {client.planStatus}
                        </span>
                      </span>
                      <span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
                        <span className="font-semibold text-[#315dc7]">
                          {client.planName}
                        </span>
                        <span>{client.companyCount} companies</span>
                        <span>{client.teamMemberCount} team members</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-10 text-center text-xs text-slate-500">
                {clients.length
                  ? "No clients match your search."
                  : "No registered client accounts yet."}
              </p>
            )}
          </div>
        </section>

        <section
          aria-live="polite"
          className="min-h-[460px] rounded-2xl border border-[#dfe8f6] bg-white p-4 shadow-sm sm:p-5"
        >
          {isDetailsLoading ? (
            <div className="space-y-4" aria-label="Loading client details">
              <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : detailsError ? (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700"
            >
              {detailsError}
            </p>
          ) : details?.client.id === selectedId ? (
            <ClientDetail details={details} />
          ) : (
            <div className="flex min-h-[420px] items-center justify-center text-center text-xs text-slate-500">
              {isLoading
                ? "Loading client accounts..."
                : "Select a client to view account details."}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function ClientDetail({ details }: { details: ClientDetails }) {
  const { client, companies, teams, teamMembers, activities } = details;
  const planPrice = formatPlanPrice(client.plan);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-[#edf1f7] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#edf3ff] text-[#315dc7]">
            <RiUser3Line className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-[#10213c]">
              {client.fullName}
            </h2>
            <p className="mt-1 break-all text-xs text-slate-500">
              {client.email}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-[9px] font-bold capitalize ${
                  client.plan.status === "active"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {client.plan.status}
              </span>
              <span className="text-[10px] text-slate-500">
                {client.emailVerified ? "Email verified" : "Email not verified"}
              </span>
            </div>
          </div>
        </div>
        <div className="shrink-0 rounded-xl bg-[#f6f8fc] px-4 py-3 sm:text-right">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Current plan
          </p>
          <p className="mt-1 text-sm font-bold text-[#10213c]">
            {client.plan.name}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500">
            {planPrice}
            {client.plan.billingInterval ? ` / ${client.plan.billingInterval}` : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={<RiBuilding2Line className="h-4 w-4" />}
          label="Companies"
          value={companies.length}
        />
        <SummaryCard
          icon={<RiGroupLine className="h-4 w-4" />}
          label="Teams"
          value={teams.length}
        />
        <SummaryCard
          icon={<RiUser3Line className="h-4 w-4" />}
          label="Team members"
          value={teamMembers.length}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DetailSection title="Account and subscription">
          <DetailRow label="Client ID" value={client.id} />
          <DetailRow label="Registered" value={formatDate(client.createdAt)} />
          <DetailRow
            label="Plan started"
            value={formatDate(client.plan.startsAt)}
          />
          <DetailRow
            label="Plan expires"
            value={formatDate(client.plan.endsAt)}
          />
          <DetailRow
            label="Billing currency"
            value={client.plan.currency ?? "Not set"}
          />
        </DetailSection>

        <DetailSection title="Companies">
          {companies.length ? (
            <ul className="space-y-2">
              {companies.map((company) => (
                <li
                  key={company.id}
                  className="rounded-lg border border-[#edf1f7] px-3 py-2"
                >
                  <p className="text-xs font-semibold text-[#10213c]">
                    {company.name}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {[company.countryCode, company.currencyCode]
                      .filter(Boolean)
                      .join(" · ") || "Location and currency not set"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyMessage>No companies have been added.</EmptyMessage>
          )}
        </DetailSection>

        <DetailSection title="Teams">
          {teams.length ? (
            <ul className="space-y-2">
              {teams.map((team) => (
                <li
                  key={team.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[#edf1f7] px-3 py-2"
                >
                  <span className="text-xs font-semibold text-[#10213c]">
                    {team.name}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {team.memberCount}{" "}
                    {team.memberCount === 1 ? "member" : "members"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyMessage>No teams have been created.</EmptyMessage>
          )}
        </DetailSection>

        <DetailSection title={`Team members (${teamMembers.length})`}>
          {teamMembers.length ? (
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {teamMembers.map((member) => (
                <li
                  key={member.id}
                  className="rounded-lg border border-[#edf1f7] px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-[#10213c]">
                        {member.fullName}
                      </p>
                      <p className="mt-1 break-all text-[10px] text-slate-500">
                        {member.email}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#f2f6fd] px-2 py-1 text-[9px] font-medium capitalize text-[#29456e]">
                      {member.roleName}
                    </span>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500">
                    {member.teamName ?? "Not assigned to a team"}
                    {" · "}
                    {member.emailVerified ? "Verified" : "Unverified"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyMessage>No team members have been added.</EmptyMessage>
          )}
        </DetailSection>
      </div>

      <DetailSection title={`Recent activity (${activities.length})`}>
        {activities.length ? (
          <ul className="space-y-3">
            {activities.map((activity) => (
              <li
                key={activity.id}
                className="flex gap-3 border-l-2 border-[#dbe6fa] pl-3"
              >
                <RiCalendarTodoLine className="mt-0.5 h-4 w-4 shrink-0 text-[#315dc7]" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#10213c]">
                    {activity.description}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {activity.actorName} · {formatDate(activity.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyMessage>No account activity has been recorded.</EmptyMessage>
        )}
      </DetailSection>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#edf1f7] p-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f2f6fd] text-[#315dc7]">
        {icon}
      </span>
      <div>
        <p className="text-sm font-bold text-[#10213c]">{value}</p>
        <p className="text-[10px] text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#edf1f7] p-3.5">
      <h3 className="mb-3 text-xs font-bold text-[#10213c]">{title}</h3>
      {children}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-[10px] text-slate-500">{label}</span>
      <span className="break-all text-right text-[10px] font-medium text-slate-700">
        {value}
      </span>
    </div>
  );
}

function EmptyMessage({ children }: { children: React.ReactNode }) {
  return <p className="py-2 text-[10px] text-slate-500">{children}</p>;
}
