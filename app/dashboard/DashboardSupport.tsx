"use client";

import { useEffect, useState, type FormEvent } from "react";
import { RiCustomerService2Line } from "@remixicon/react";
import DashboardSupportChat from "./DashboardSupportChat";

type Ticket = { id: string; subject: string; message: string; status: string; priority: string; createdAt: string };

export default function DashboardSupport() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const tokenHeaders = () => ({ Authorization: `Bearer ${window.sessionStorage.getItem("darobooksAccessToken")}` });

  async function loadTickets() {
    try {
      const response = await fetch("/api/dashboard/support/tickets", { headers: tokenHeaders(), cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Could not load tickets.");
      setTickets(payload.tickets ?? []);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Could not load tickets."); }
  }

  useEffect(() => { void loadTickets(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/dashboard/support/tickets", {
        method: "POST", headers: { ...tokenHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message, priority }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Could not submit the ticket.");
      setSubject(""); setMessage(""); setPriority("Normal"); await loadTickets();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Could not submit the ticket."); }
    finally { setSaving(false); }
  }

  return (
    <section className="space-y-4">
      <DashboardSupportChat />
      <div><h1 className="text-xl font-bold text-[#10213c]">Support</h1><p className="mt-1 text-[11px] text-slate-500">Contact DaroBooks support and track your tickets.</p></div>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[10px] text-red-700">{error}</p>}
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <form onSubmit={submit} className="space-y-3 rounded-xl border border-[#dfe7f4] bg-white p-4">
          <h2 className="text-[12px] font-bold">Create a ticket</h2>
          <input required maxLength={160} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" className="w-full rounded-lg border border-[#dbe4f3] px-3 py-2 text-[11px] outline-none" />
          <textarea required maxLength={4000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Describe the issue" rows={5} className="w-full resize-y rounded-lg border border-[#dbe4f3] px-3 py-2 text-[11px] outline-none" />
          <select value={priority} onChange={(event) => setPriority(event.target.value)} className="w-full rounded-lg border border-[#dbe4f3] bg-white px-3 py-2 text-[11px]"><option>Low</option><option>Normal</option><option>High</option></select>
          <button disabled={saving} className="w-full rounded-lg bg-[#1e4fc1] px-3 py-2 text-[11px] font-bold text-white disabled:opacity-60">{saving ? "Submitting…" : "Submit ticket"}</button>
        </form>
        <div className="rounded-xl border border-[#dfe7f4] bg-white p-4">
          <h2 className="text-[12px] font-bold">Your tickets</h2>
          <div className="mt-3 space-y-2">
            {tickets.map((ticket) => <article key={ticket.id} className="rounded-lg border border-slate-100 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold">{ticket.subject}</p><p className="mt-1 line-clamp-2 text-[10px] text-slate-500">{ticket.message}</p></div><span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[8px] font-bold text-[#1e4fc1]">{ticket.status}</span></div></article>)}
            {!tickets.length && <div className="py-8 text-center text-[10px] text-slate-500"><RiCustomerService2Line className="mx-auto mb-2 h-6 w-6" />No support tickets yet.</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
