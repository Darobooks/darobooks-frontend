"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { RiBellLine, RiCheckLine, RiUserAddLine } from "@remixicon/react";
import { showToast } from "../components/toast";

type PracticeStatus = "On track" | "Needs attention" | "Overdue items";
type PracticeClient = {
  name: string;
  country: string;
  plan: string;
  due: number;
  nextFiling: string;
  status: PracticeStatus;
};

const API_BASE_URL = (process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000").replace(/\/+$/, "");

const emptyMetrics = { clients: 0, tasksDueThisWeek: 0, needAttention: 0, filingsIn14Days: 0 };

const filters = ["All clients", "Busy this week", "Needs attention"] as const;

export default function DashboardPractice() {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("All clients");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [clients, setClients] = useState<PracticeClient[]>([]);
  const [metrics, setMetrics] = useState(emptyMetrics);

  async function loadPractice() {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/practice`, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Could not load Practice.");
      setClients(payload.clients ?? []);
      setMetrics(payload.metrics ?? emptyMetrics);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not load Practice.");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadPractice(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const visibleClients = useMemo(() => clients.filter((client) => {
    const matchesFilter = activeFilter === "All clients"
      || (activeFilter === "Busy this week" && client.due >= 5)
      || (activeFilter === "Needs attention" && client.status !== "On track");
    return matchesFilter;
  }), [activeFilter, clients]);

  async function inviteClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) return;
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/practice/clients`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.get("clientName"), email: form.get("email") }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Could not invite client.");
      setInviteOpen(false);
      showToast(payload.message ?? "Client invitation sent.", "success");
      await loadPractice();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not invite client.");
    }
  }

  async function sendReminders() {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/practice/reminders`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Could not queue reminders.");
      showToast(payload.message ?? `${payload.count ?? 0} reminder(s) sent.`, payload.failed ? "info" : "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not queue reminders.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-[#087b74]">DaroPractice</p>
          <h1 className="mt-1 text-[24px] font-bold text-[#10213c]">Practice</h1>
          <p className="mt-1 text-[11px] text-slate-600">For accountants and bookkeepers: manage all your clients in one place, with one login.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void sendReminders()} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#dbe4f3] bg-white px-3 text-[9px] font-bold text-[#10213c]">
            <RiBellLine className="h-3.5 w-3.5" /> Bulk reminders
          </button>
          <button type="button" onClick={() => setInviteOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#1e4fc1] px-3 text-[9px] font-bold text-white">
            <RiUserAddLine className="h-3.5 w-3.5" /> Invite a client
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Clients" value={String(metrics.clients)} />
        <Metric label="Tasks due this week" value={String(metrics.tasksDueThisWeek)} />
        <Metric label="Need attention" value={String(metrics.needAttention)} />
        <Metric label="Filings in 14 days" value={String(metrics.filingsIn14Days)} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button key={filter} type="button" onClick={() => setActiveFilter(filter)} className={`rounded-full px-3 py-1.5 text-[9px] font-bold ${activeFilter === filter ? "bg-[#1e4fc1] text-white" : "border border-[#dbe4f3] bg-white text-[#10213c]"}`}>
            {filter}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-[#e1e8f4] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-[#f8faff] text-[9px] font-bold text-[#10213c]">
              <tr>{["Client", "Country", "Plan", "Due this week", "Next filing", "Status"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[#edf1f7] text-[10px] text-[#10213c]">
              {visibleClients.map((client) => (
                <tr key={client.name} className="hover:bg-[#f8faff]">
                  <td className="px-4 py-3 font-semibold">{client.name}</td>
                  <td className="px-4 py-3">{client.country}</td>
                  <td className="px-4 py-3">{client.plan}</td>
                  <td className="px-4 py-3">{client.due}</td>
                  <td className="px-4 py-3">{client.nextFiling}</td>
                  <td className="px-4 py-3"><StatusBadge status={client.status} /></td>
                </tr>
              ))}
              {visibleClients.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No clients match this view.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-[#d8eadf] bg-[#f1f9f4] px-4 py-3 text-[9px] text-[#087b74]">
        <span className="mr-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#dcefe3] align-middle"><RiCheckLine className="h-3 w-3" /></span>
        Accountant seats are free on every plan. You can switch into any client in one click and change the audit trail without sharing their audit trail with your name.
      </div>

      {inviteOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#08172e]/30 px-4" role="dialog" aria-modal="true" aria-label="Invite a client">
          <form onSubmit={inviteClient} className="w-full max-w-sm rounded-xl border border-[#dbe4f3] bg-white p-5 shadow-xl">
            <h2 className="text-[14px] font-bold text-[#10213c]">Invite a client</h2>
            <label className="mt-4 block text-[9px] font-semibold text-slate-600">Client name<input required name="clientName" className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] px-3 text-[10px]" /></label>
            <label className="mt-3 block text-[9px] font-semibold text-slate-600">Email address<input required type="email" name="email" className="mt-1 h-9 w-full rounded-md border border-[#dbe4f3] px-3 text-[10px]" /></label>
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setInviteOpen(false)} className="h-8 rounded-md border border-[#dbe4f3] px-3 text-[9px] font-bold">Cancel</button><button type="submit" className="h-8 rounded-md bg-[#1e4fc1] px-3 text-[9px] font-bold text-white">Send invitation</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[#e1e8f4] bg-white px-4 py-4"><p className="text-[22px] font-bold text-[#10213c]">{value}</p><p className="mt-1 text-[9px] text-slate-600">{label}</p></div>;
}

function StatusBadge({ status }: { status: PracticeStatus }) {
  const styles = status === "On track" ? "bg-[#dcf7e4] text-[#087b74]" : status === "Needs attention" ? "bg-[#fff4cf] text-[#b7791f]" : "bg-[#ffe2dc] text-[#c2410c]";
  return <span className={`rounded-full px-2 py-1 text-[8px] font-bold ${styles}`}>{status}</span>;
}
