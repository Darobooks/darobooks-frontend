"use client";

import { useEffect, useState, type FormEvent } from "react";

const HANDOVER_REASONS = [
  "You asked for a person",
  "Possible security problem",
  "Account or data deletion",
  "Payment question",
  "Complaint or legal question",
  "You seem frustrated",
  "The agent could not answer",
  "Lost access to your account",
];
const CANNED_REPLIES = [
  "Thanks for contacting DaroBooks. I’m reviewing this and will follow up shortly.",
  "To protect your account, please do not share passwords or authenticator codes in chat.",
  "I’ve escalated this request to the relevant team and will update you here.",
];
type ConversationRow = {
  id: string;
  createdAt: string;
  status: string;
  urgent: boolean;
  handoverReason: string | null;
  agentSummary: string;
  waitingSeconds: number;
  lastMessage: string | null;
  customer: {
    name: string;
    email: string;
    company: string;
    plan: string;
    region: string;
    accountAgeDays: number;
    twoStepEnabled: boolean;
  };
};
type ResetRequest = { id: string; reason: string; status: string; requesterName: string };
type Detail = ConversationRow & {
  firstResponseAt: string | null;
  resolvedAt: string | null;
  csatScore: number | null;
  csatFeedback: string | null;
  assignedUserId: string | null;
  assignedUserName: string | null;
  customer: ConversationRow["customer"] & { id: string };
};
type Message = {
  id: string;
  senderType: string;
  senderName: string | null;
  body: string;
  createdAt: string;
};
type Analytics = {
  containmentRate: number;
  totalConversations: number;
  resolvedConversations: number;
  averageResponseSeconds: number | null;
  averageCsat: number | null;
  csatCount: number;
  handoverReasons: { reason: string; count: number }[];
};
type QueueQuestion = {
  id: string;
  conversationId: string;
  question: string;
  customerName: string;
  customerEmail: string;
  draftArticleId: string | null;
};
type Panel = "inbox" | "unanswered" | "analytics";

async function requestJson(url: string, init?: RequestInit) {
  const token = window.sessionStorage.getItem("darobooksAccessToken") ?? "";
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      payload && typeof payload.message === "string"
        ? payload.message
        : "The support console request failed.",
    );
  }
  return payload;
}

function elapsed(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export default function DashboardSupportConsole() {
  const [panel, setPanel] = useState<Panel>("inbox");
  const [filter, setFilter] = useState("all");
  const [rows, setRows] = useState<ConversationRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [resetRequests, setResetRequests] = useState<ResetRequest[]>([]);
  const [questions, setQuestions] = useState<QueueQuestion[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [staffRole, setStaffRole] = useState("");
  const [message, setMessage] = useState("");
  const [internalNote, setInternalNote] = useState(false);
  const [summary, setSummary] = useState("");
  const [handoverReason, setHandoverReason] = useState(HANDOVER_REASONS[0]);
  const [resetReason, setResetReason] = useState("");
  const [checklist, setChecklist] = useState([false, false, false, false]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadDetail(id: string) {
    const payload = await requestJson(`/api/admin/support/console/${encodeURIComponent(id)}`);
    const next = payload.conversation as Detail;
    setSelectedId(id);
    setDetail(next);
    setSummary(next.agentSummary ?? "");
    setHandoverReason(next.handoverReason ?? HANDOVER_REASONS[0]);
    setMessages(Array.isArray(payload.messages) ? payload.messages : []);
    setResetRequests(Array.isArray(payload.resetRequests) ? payload.resetRequests : []);
  }

  async function load() {
    const [listPayload, analyticsPayload, unansweredPayload] = await Promise.all([
      requestJson(`/api/admin/support/console?filter=${encodeURIComponent(filter)}`),
      requestJson("/api/admin/support/console/analytics"),
      requestJson("/api/admin/support/console/unanswered"),
    ]);
    setRows(Array.isArray(listPayload.conversations) ? listPayload.conversations : []);
    setStaffRole(typeof listPayload.staffRole === "string" ? listPayload.staffRole : "");
    setAnalytics(analyticsPayload as Analytics);
    setQuestions(Array.isArray(unansweredPayload.questions) ? unansweredPayload.questions : []);
    const nextRows = Array.isArray(listPayload.conversations)
      ? (listPayload.conversations as ConversationRow[])
      : [];
    if (selectedId && nextRows.some((row) => row.id === selectedId)) {
      await loadDetail(selectedId);
    } else if (nextRows.length) {
      await loadDetail(nextRows[0].id);
    } else {
      setSelectedId("");
      setDetail(null);
      setMessages([]);
    }
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [listPayload, analyticsPayload, unansweredPayload] = await Promise.all([
          requestJson(`/api/admin/support/console?filter=${encodeURIComponent(filter)}`),
          requestJson("/api/admin/support/console/analytics"),
          requestJson("/api/admin/support/console/unanswered"),
        ]);
        if (!active) return;
        const nextRows = Array.isArray(listPayload.conversations)
          ? (listPayload.conversations as ConversationRow[])
          : [];
        setRows(nextRows);
        setStaffRole(typeof listPayload.staffRole === "string" ? listPayload.staffRole : "");
        setAnalytics(analyticsPayload as Analytics);
        setQuestions(Array.isArray(unansweredPayload.questions) ? unansweredPayload.questions : []);
        if (nextRows.length) {
          const nextDetail = await requestJson(
            `/api/admin/support/console/${encodeURIComponent(nextRows[0].id)}`,
          );
          if (!active) return;
          setSelectedId(nextRows[0].id);
          setDetail(nextDetail.conversation as Detail);
          setSummary(nextDetail.conversation.agentSummary ?? "");
          setHandoverReason(nextDetail.conversation.handoverReason ?? HANDOVER_REASONS[0]);
          setMessages(Array.isArray(nextDetail.messages) ? nextDetail.messages : []);
          setResetRequests(Array.isArray(nextDetail.resetRequests) ? nextDetail.resetRequests : []);
        } else {
          setSelectedId("");
          setDetail(null);
          setMessages([]);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Could not load the support console.");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [filter]);

  async function refresh() {
    setError("");
    await load();
  }

  async function updateConversation(action: string) {
    if (!selectedId) return;
    setBusy(true);
    setError("");
    try {
      await requestJson(`/api/admin/support/console/${encodeURIComponent(selectedId)}`, {
        method: "PATCH",
        body: JSON.stringify({ action, handoverReason, summary }),
      });
      await refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not update the conversation.");
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!selectedId || !message.trim()) return;
    setBusy(true);
    setError("");
    try {
      await requestJson(`/api/admin/support/console/${encodeURIComponent(selectedId)}/messages`, {
        method: "POST",
        body: JSON.stringify({ message: message.trim(), internal: internalNote }),
      });
      setMessage("");
      await refresh();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not send the message.");
    } finally {
      setBusy(false);
    }
  }

  async function createDraft(questionId: string) {
    setBusy(true);
    setError("");
    try {
      await requestJson(`/api/admin/support/console/unanswered/${encodeURIComponent(questionId)}/draft`, {
        method: "POST",
      });
      await refresh();
    } catch (draftError) {
      setError(draftError instanceof Error ? draftError.message : "Could not create the draft.");
    } finally {
      setBusy(false);
    }
  }

  async function requestReset(event: FormEvent) {
    event.preventDefault();
    if (!selectedId) return;
    setBusy(true);
    setError("");
    try {
      await requestJson(`/api/admin/support/console/${encodeURIComponent(selectedId)}/two-step-reset`, {
        method: "POST",
        body: JSON.stringify({
          reason: resetReason,
          checklistConfirmed: checklist.every(Boolean),
        }),
      });
      setResetReason("");
      setChecklist([false, false, false, false]);
      await refresh();
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Could not request the 2FA reset.");
    } finally {
      setBusy(false);
    }
  }

  async function reviewReset(requestId: string, decision: "approve" | "reject") {
    setBusy(true);
    setError("");
    try {
      await requestJson(`/api/admin/support/2fa-resets/${encodeURIComponent(requestId)}/review`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      });
      await refresh();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Could not review the reset request.");
    } finally {
      setBusy(false);
    }
  }

  const canApproveReset = staffRole === "support_lead" || staffRole === "super_admin";
  const selectedRow = rows.find((row) => row.id === selectedId);
  const beforeAct = Boolean(detail?.urgent || detail?.handoverReason && [
    "Possible security problem",
    "Account or data deletion",
    "Payment question",
    "Complaint or legal question",
    "Lost access to your account",
  ].includes(detail.handoverReason));

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#10213c]">Support console</h1>
          <p className="mt-1 text-[10px] text-slate-500">Staff workspace · 2-step verification required</p>
        </div>
        <button type="button" onClick={() => void refresh().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Could not refresh the console."))} className="rounded-lg border border-[#dbe4f3] bg-white px-3 py-2 text-[10px] font-semibold text-[#10213c]">Refresh</button>
      </header>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[10px] text-red-700">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Containment rate (30 days)" value={`${analytics?.containmentRate ?? 0}%`} hint={`${analytics?.totalConversations ?? 0} conversations`} />
        <Metric label="Average response time" value={analytics?.averageResponseSeconds == null ? "—" : elapsed(analytics.averageResponseSeconds)} hint="First staff reply" />
        <Metric label="Average CSAT" value={analytics?.averageCsat == null ? "—" : `${analytics.averageCsat.toFixed(1)}/5`} hint={`${analytics?.csatCount ?? 0} ratings`} />
        <Metric label="Unanswered questions" value={String(questions.length)} hint="Awaiting knowledge review" />
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Support console sections">
        {(["inbox", "unanswered", "analytics"] as const).map((value) => (
          <button key={value} type="button" onClick={() => setPanel(value)} aria-pressed={panel === value} className={`rounded-lg px-3 py-2 text-[10px] font-semibold capitalize ${panel === value ? "bg-[#1e4fc1] text-white" : "border border-[#dbe4f3] bg-white text-[#10213c]"}`}>{value === "inbox" ? "Conversations" : value === "unanswered" ? `Unanswered queue (${questions.length})` : "Analytics"}</button>
        ))}
      </nav>

      {panel === "analytics" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-[#dfe7f4] bg-white p-4">
            <h2 className="text-[12px] font-bold text-[#10213c]">Handover reasons · last 30 days</h2>
            <div className="mt-3 space-y-2">
              {analytics?.handoverReasons.map((item) => <div key={item.reason} className="flex justify-between gap-3 border-b border-slate-100 py-2 text-[10px]"><span>{item.reason}</span><strong>{item.count}</strong></div>)}
              {!analytics?.handoverReasons.length && <p className="text-[10px] text-slate-500">No handovers recorded in this period.</p>}
            </div>
          </section>
          <section className="rounded-xl border border-[#dfe7f4] bg-white p-4">
            <h2 className="text-[12px] font-bold text-[#10213c]">Conversation outcomes</h2>
            <div className="mt-3 space-y-2 text-[10px] text-slate-600">
              <p>{analytics?.resolvedConversations ?? 0} conversations resolved.</p>
              <p>{analytics?.totalConversations ?? 0} total conversations in the last 30 days.</p>
              <p>Containment counts conversations answered by published knowledge-base content without a staff handover.</p>
            </div>
          </section>
        </div>
      )}

      {panel === "unanswered" && (
        <section className="space-y-3 rounded-xl border border-[#dfe7f4] bg-white p-4">
          <div>
            <h2 className="text-[12px] font-bold text-[#10213c]">Unanswered-question queue</h2>
            <p className="mt-1 text-[9px] text-slate-500">Create unpublished drafts from recurring customer questions. A super admin must review and publish them.</p>
          </div>
          {questions.map((question) => (
            <article key={question.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-[#10213c]">{question.question}</p>
                <p className="mt-1 text-[8px] text-slate-500">{question.customerName} · {question.customerEmail} · Conversation #{question.conversationId}</p>
              </div>
              <button type="button" disabled={busy || Boolean(question.draftArticleId)} onClick={() => void createDraft(question.id)} className="rounded-md border border-[#dbe4f3] px-3 py-2 text-[9px] font-semibold text-[#1e4fc1] disabled:opacity-50">
                {question.draftArticleId ? "Draft created" : "Create unpublished draft"}
              </button>
            </article>
          ))}
          {!questions.length && <p className="py-8 text-center text-[10px] text-slate-500">The queue is clear.</p>}
        </section>
      )}

      {panel === "inbox" && (
        <div className="grid min-h-[620px] gap-4 xl:grid-cols-[minmax(270px,0.75fr)_minmax(0,1.65fr)]">
          <aside className="overflow-hidden rounded-xl border border-[#dfe7f4] bg-white">
            <div className="border-b border-slate-100 p-3">
              <label htmlFor="support-conversation-filter" className="mb-1 block text-[9px] font-semibold text-slate-600">Filter conversations</label>
              <select id="support-conversation-filter" value={filter} onChange={(event) => setFilter(event.target.value)} className="h-9 w-full rounded-md border border-[#dbe4f3] bg-white px-2 text-[10px]">
                <option value="all">All</option><option value="needs_person">Needs a person</option><option value="with_agent">With agent</option><option value="resolved">Resolved</option>
              </select>
            </div>
            <div className="max-h-[720px] overflow-y-auto">
              {rows.map((row) => (
                <button type="button" key={row.id} onClick={() => void loadDetail(row.id).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Could not load conversation."))} className={`w-full border-b border-slate-100 p-3 text-left ${selectedId === row.id ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[10px] font-bold text-[#10213c]">{row.customer.name}</span>
                    <span className="shrink-0 text-[8px] text-slate-500">{elapsed(row.waitingSeconds)}</span>
                  </span>
                  <span className="mt-1 flex items-center gap-1.5">
                    <span className={`rounded-full px-1.5 py-0.5 text-[7px] font-bold ${row.urgent ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>{row.urgent ? "URGENT" : row.status.replace("_", " ")}</span>
                    {row.handoverReason && <span className="truncate text-[8px] text-slate-500">{row.handoverReason}</span>}
                  </span>
                  <span className="mt-1 block truncate text-[8px] text-slate-500">{row.lastMessage ?? "No messages"}</span>
                </button>
              ))}
              {!rows.length && <p className="p-6 text-center text-[10px] text-slate-500">No conversations match this filter.</p>}
            </div>
          </aside>

          {detail ? (
            <section className="space-y-3">
              <div className="grid gap-3 rounded-xl border border-[#dfe7f4] bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
                <Info label="Customer" value={`${detail.customer.name}\n${detail.customer.email}`} />
                <Info label="Company / plan" value={`${detail.customer.company}\n${detail.customer.plan}`} />
                <Info label="Region / account age" value={`${detail.customer.region}\n${detail.customer.accountAgeDays} days`} />
                <Info label="2FA status" value={detail.customer.twoStepEnabled ? "Enabled" : "Not enabled"} />
              </div>
              <div className="overflow-hidden rounded-xl border border-[#dfe7f4] bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-3">
                  <div>
                    <p className="text-[11px] font-bold text-[#10213c]">Conversation #{detail.id}</p>
                    <p className="mt-0.5 text-[8px] text-slate-500">Waiting {elapsed(selectedRow?.waitingSeconds ?? 0)} · {detail.assignedUserName ? `With ${detail.assignedUserName}` : detail.status.replace("_", " ")}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" disabled={busy} onClick={() => void updateConversation(detail.urgent ? "clear_urgent" : "mark_urgent")} className={`rounded-md px-2.5 py-1.5 text-[8px] font-bold ${detail.urgent ? "bg-red-100 text-red-700" : "border border-slate-200 text-slate-600"}`}>{detail.urgent ? "Unmark urgent" : "Mark urgent"}</button>
                    <button type="button" disabled={busy} onClick={() => void updateConversation("take_over")} className="rounded-md bg-[#1e4fc1] px-2.5 py-1.5 text-[8px] font-bold text-white">Take over</button>
                    <button type="button" disabled={busy} onClick={() => void updateConversation("return_to_agent")} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-[8px] font-semibold text-[#10213c]">Return to agent</button>
                    <button type="button" disabled={busy} onClick={() => void updateConversation("resolve")} className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[8px] font-bold text-emerald-700">Resolve</button>
                  </div>
                </div>
                <div className="grid gap-3 p-3 xl:grid-cols-[minmax(0,1fr)_230px]">
                  <div>
                    <div className="max-h-[380px] space-y-2 overflow-y-auto rounded-lg bg-slate-50 p-3">
                      {messages.map((item) => (
                        <article key={item.id} className={`max-w-[95%] rounded-lg border p-2.5 ${item.senderType === "internal" ? "border-amber-200 bg-amber-50" : item.senderType === "customer" ? "ml-auto border-blue-100 bg-blue-50" : "border-slate-100 bg-white"}`}>
                          <p className="mb-1 text-[8px] font-bold text-slate-500">{item.senderType === "internal" ? "Internal note · staff only" : item.senderType === "customer" ? detail.customer.name : item.senderName ?? (item.senderType === "assistant" ? "Assistant" : "Support")}</p>
                          <p className="whitespace-pre-wrap text-[9px] leading-5 text-[#10213c]">{item.body}</p>
                        </article>
                      ))}
                    </div>
                    <form onSubmit={sendMessage} className="mt-2 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-1.5 text-[8px] font-semibold text-slate-600">
                          <input type="checkbox" checked={internalNote} onChange={(event) => setInternalNote(event.target.checked)} />
                          Internal note (never visible to customers)
                        </label>
                        <select aria-label="Insert canned reply" defaultValue="" onChange={(event) => { if (event.target.value) setMessage((current) => current ? `${current}\n${event.target.value}` : event.target.value); event.target.value = ""; }} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[8px]">
                          <option value="">Canned replies</option>{CANNED_REPLIES.map((reply) => <option key={reply} value={reply}>{reply.slice(0, 60)}…</option>)}
                        </select>
                      </div>
                      <textarea required value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4000} rows={3} placeholder={internalNote ? "Add an internal note…" : "Reply to the customer…"} className="w-full resize-y rounded-md border border-[#dbe4f3] px-3 py-2 text-[9px] outline-none focus:border-[#1e4fc1]" />
                      <button disabled={busy || !message.trim()} className="rounded-md bg-[#1e4fc1] px-3 py-2 text-[9px] font-bold text-white disabled:opacity-50">{internalNote ? "Save internal note" : "Send reply"}</button>
                    </form>
                  </div>
                  <aside className="space-y-3">
                    <div className="space-y-2 rounded-lg border border-slate-100 p-2.5">
                      <p className="text-[9px] font-bold text-[#10213c]">Agent summary</p>
                      <textarea value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={2000} rows={4} className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-[8px]" placeholder="Summarize the customer’s issue and what has been tried." />
                      <label className="block text-[8px] font-semibold text-slate-500">Handover reason</label>
                      <select value={handoverReason} onChange={(event) => setHandoverReason(event.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[8px]">
                        {HANDOVER_REASONS.map((reason) => <option key={reason}>{reason}</option>)}
                      </select>
                      <button type="button" disabled={busy} onClick={() => void updateConversation("take_over")} className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-[8px] font-semibold">Save summary and handover</button>
                    </div>
                    {beforeAct && (
                      <div className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                        <p className="text-[9px] font-bold text-amber-900">Before you act · sensitive case</p>
                        {["Verify the customer’s identity", "Confirm account ownership", "Review the requested action and scope", "Document the reason and next steps"].map((item, index) => (
                          <label key={item} className="flex items-start gap-1.5 text-[8px] text-amber-900">
                            <input type="checkbox" checked={checklist[index]} onChange={(event) => setChecklist((current) => current.map((value, row) => row === index ? event.target.checked : value))} />
                            {item}
                          </label>
                        ))}
                      </div>
                    )}
                    {detail.customer.twoStepEnabled && (
                      <form onSubmit={requestReset} className="space-y-2 rounded-lg border border-red-100 bg-red-50 p-2.5">
                        <p className="text-[9px] font-bold text-red-800">Request a 2FA reset</p>
                        <p className="text-[8px] text-red-700">Requires a different Support lead or super admin to approve. The customer is emailed after approval.</p>
                        <textarea required minLength={10} maxLength={1000} value={resetReason} onChange={(event) => setResetReason(event.target.value)} rows={2} placeholder="Reason and identity verification completed" className="w-full rounded-md border border-red-200 bg-white px-2 py-1.5 text-[8px]" />
                        <button disabled={busy || !checklist.every(Boolean)} className="w-full rounded-md bg-red-700 px-2 py-1.5 text-[8px] font-bold text-white disabled:opacity-50">Request second approval</button>
                        {resetRequests.map((request) => (
                          <div key={request.id} className="border-t border-red-200 pt-2 text-[8px]">
                            <p>{request.status.toUpperCase()} · {request.reason}</p>
                            {request.status === "pending" && canApproveReset && (
                              <div className="mt-1.5 flex gap-2">
                                <button type="button" disabled={busy} onClick={() => void reviewReset(request.id, "approve")} className="rounded bg-emerald-700 px-2 py-1 font-bold text-white">Approve</button>
                                <button type="button" disabled={busy} onClick={() => void reviewReset(request.id, "reject")} className="rounded bg-slate-600 px-2 py-1 font-bold text-white">Reject</button>
                              </div>
                            )}
                          </div>
                        ))}
                      </form>
                    )}
                    {detail.csatScore !== null && <p className="rounded-lg border border-slate-100 p-2.5 text-[8px]">CSAT: {detail.csatScore}/5{detail.csatFeedback ? ` · ${detail.csatFeedback}` : ""}</p>}
                  </aside>
                </div>
              </div>
            </section>
          ) : (
            <div className="grid place-items-center rounded-xl border border-[#dfe7f4] bg-white p-8 text-[10px] text-slate-500">Select a conversation to view its transcript.</div>
          )}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <article className="rounded-xl border border-[#dfe7f4] bg-white p-3"><p className="text-[8px] font-semibold text-slate-500">{label}</p><p className="mt-1 text-lg font-bold text-[#10213c]">{value}</p><p className="mt-0.5 text-[8px] text-slate-400">{hint}</p></article>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 p-2"><p className="text-[8px] font-semibold text-slate-500">{label}</p><p className="mt-1 whitespace-pre-line text-[9px] font-semibold text-[#10213c]">{value}</p></div>;
}
