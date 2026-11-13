"use client";

import { useEffect, useState } from "react";

type Ticket = { id: string; subject: string; message: string; status: string; priority: string; createdAt: string; userName: string; userEmail: string; assignedUserId: string | null; assignedUserName: string | null };
type AdminUser = { id: string; fullName: string; email: string };

export default function DashboardTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const headers = () => ({ Authorization: `Bearer ${window.sessionStorage.getItem("darobooksAccessToken")}` });

  async function loadTickets() {
    try {
      const [ticketsResponse, usersResponse] = await Promise.all([
        fetch("/api/admin/support/tickets", { headers: headers(), cache: "no-store" }),
        fetch("/api/admin/users", { headers: headers(), cache: "no-store" }),
      ]);
      const [ticketsPayload, usersPayload] = await Promise.all([
        ticketsResponse.json(),
        usersResponse.json(),
      ]);
      if (!ticketsResponse.ok) throw new Error(ticketsPayload.message ?? "Could not load tickets.");
      if (!usersResponse.ok) throw new Error(usersPayload.message ?? "Could not load admin users.");
      setTickets(ticketsPayload.tickets ?? []);
      setUsers(usersPayload.users ?? []);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Could not load tickets."); }
  }
  useEffect(() => { void loadTickets(); }, []);

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/admin/support/tickets/${id}`, { method: "PATCH", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    await loadTickets();
  }

  async function assignTicket(id: string, assignedUserId: string) {
    setError("");
    try {
      const response = await fetch(`/api/admin/support/tickets/${id}`, {
        method: "PATCH",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ assignedUserId: assignedUserId || null }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Could not assign the ticket.");
      await loadTickets();
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "Could not assign the ticket.");
    }
  }

  return (
    <section className="space-y-4">
      <div><h1 className="text-xl font-bold text-[#10213c]">Support tickets</h1><p className="mt-1 text-[11px] text-slate-500">Review and resolve customer support requests.</p></div>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[10px] text-red-700">{error}</p>}
      <div className="overflow-hidden rounded-xl border border-[#dfe7f4] bg-white">
        {tickets.map((ticket) => <article key={ticket.id} className="grid gap-3 border-b border-slate-100 p-4 last:border-0 md:grid-cols-[1fr_180px]">
          <div><div className="flex flex-wrap items-center gap-2"><p className="text-[12px] font-bold">{ticket.subject}</p><span className="text-[9px] text-slate-400">#{ticket.id}</span></div><p className="mt-1 text-[10px] text-slate-600">{ticket.message}</p><p className="mt-2 text-[9px] text-slate-400">{ticket.userName} · {ticket.userEmail}</p></div>
          <div className="space-y-2">
            <select aria-label={`Assign ${ticket.subject}`} value={ticket.assignedUserId ?? ""} onChange={(event) => void assignTicket(ticket.id, event.target.value)} className="h-8 w-full rounded-lg border border-[#dbe4f3] bg-white px-2 text-[10px]"><option value="">Unassigned</option>{users.map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}</select>
            <select aria-label={`Status for ${ticket.subject}`} value={ticket.status} onChange={(event) => void updateStatus(ticket.id, event.target.value)} className="h-8 w-full rounded-lg border border-[#dbe4f3] bg-white px-2 text-[10px]"><option>Open</option><option>In progress</option><option>Resolved</option><option>Closed</option></select>
          </div>
        </article>)}
        {!tickets.length && !error && <p className="py-10 text-center text-[11px] text-slate-500">No support tickets.</p>}
      </div>
    </section>
  );
}
