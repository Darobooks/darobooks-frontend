"use client";

import { useEffect, useState, type FormEvent } from "react";

type ConversationSummary = {
  id: string;
  status: string;
  urgent: boolean;
  handoverReason: string | null;
  contained: boolean;
  createdAt: string;
  lastMessage: string | null;
  csatScore: number | null;
};
type ConversationMessage = {
  id: string;
  senderType: string;
  body: string;
  createdAt: string;
};
type ConversationDetail = {
  id: string;
  status: string;
  handoverReason: string | null;
  csatScore: number | null;
};

async function getPayload(response: Response) {
  const payload = await response.json();
  if (!response.ok) {
    const message =
      payload && typeof payload.message === "string"
        ? payload.message
        : "Could not complete the support chat request.";
    throw new Error(message);
  }
  return payload;
}

export default function DashboardSupportChat() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState("");
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const headers = () => ({
    Authorization: `Bearer ${window.sessionStorage.getItem("darobooksAccessToken") ?? ""}`,
    "Content-Type": "application/json",
  });

  async function loadConversations(selectId?: string) {
    const response = await fetch("/api/dashboard/support/chat/conversations", {
      headers: headers(),
      cache: "no-store",
    });
    const payload = await getPayload(response);
    const rows = Array.isArray(payload.conversations)
      ? (payload.conversations as ConversationSummary[])
      : [];
    setConversations(rows);
    const nextId = selectId ?? activeId ?? rows[0]?.id ?? "";
    if (nextId) await loadConversation(nextId);
    else {
      setActiveId("");
      setConversation(null);
      setMessages([]);
    }
  }

  async function loadConversation(id: string) {
    const response = await fetch(
      `/api/dashboard/support/chat/conversations/${encodeURIComponent(id)}`,
      { headers: headers(), cache: "no-store" },
    );
    const payload = await getPayload(response);
    setActiveId(id);
    setConversation(payload.conversation as ConversationDetail);
    setMessages(Array.isArray(payload.messages) ? payload.messages : []);
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/dashboard/support/chat/conversations", {
          headers: {
            Authorization: `Bearer ${window.sessionStorage.getItem("darobooksAccessToken") ?? ""}`,
          },
          cache: "no-store",
        });
        const payload = await getPayload(response);
        const rows = Array.isArray(payload.conversations)
          ? (payload.conversations as ConversationSummary[])
          : [];
        if (!active) return;
        setConversations(rows);
        const firstId = rows[0]?.id;
        if (firstId) {
          const detailResponse = await fetch(
            `/api/dashboard/support/chat/conversations/${encodeURIComponent(firstId)}`,
            {
              headers: {
                Authorization: `Bearer ${window.sessionStorage.getItem("darobooksAccessToken") ?? ""}`,
              },
              cache: "no-store",
            },
          );
          const detailPayload = await getPayload(detailResponse);
          if (!active) return;
          setActiveId(firstId);
          setConversation(detailPayload.conversation as ConversationDetail);
          setMessages(Array.isArray(detailPayload.messages) ? detailPayload.messages : []);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Could not load conversations.");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function startConversation(message: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/support/chat/conversations", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ message }),
      });
      const payload = await getPayload(response);
      setQuestion("");
      await loadConversations(payload.conversation.id);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not start a conversation.");
    } finally {
      setBusy(false);
    }
  }

  async function submitQuestion(event: FormEvent) {
    event.preventDefault();
    if (!question.trim()) return;
    await startConversation(question.trim());
  }

  async function submitReply(event: FormEvent) {
    event.preventDefault();
    if (!activeId || !reply.trim()) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/dashboard/support/chat/conversations/${encodeURIComponent(activeId)}/messages`,
        {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ message: reply.trim() }),
        },
      );
      await getPayload(response);
      setReply("");
      await loadConversations(activeId);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not send your message.");
    } finally {
      setBusy(false);
    }
  }

  async function rateConversation(score: number) {
    if (!activeId) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/dashboard/support/chat/conversations/${encodeURIComponent(activeId)}/csat`,
        {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ score }),
        },
      );
      await getPayload(response);
      await loadConversations(activeId);
    } catch (ratingError) {
      setError(ratingError instanceof Error ? ratingError.message : "Could not submit your rating.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-[#dfe7f4] bg-white p-4 sm:p-5">
      <div>
        <h2 className="text-[14px] font-bold text-[#10213c]">Support chat</h2>
        <p className="mt-1 text-[10px] text-slate-500">
          Get an answer from reviewed help articles or continue with a support specialist.
        </p>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[10px] text-red-700">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)]">
        <div className="space-y-3">
          <form onSubmit={submitQuestion} className="space-y-2 rounded-lg bg-[#f7f9fd] p-3">
            <label htmlFor="support-chat-question" className="block text-[10px] font-bold text-[#10213c]">
              Start a conversation
            </label>
            <textarea
              id="support-chat-question"
              required
              maxLength={4000}
              rows={3}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="What can we help you with?"
              className="w-full resize-y rounded-md border border-[#dbe4f3] bg-white px-3 py-2 text-[10px] outline-none focus:border-[#1e4fc1]"
            />
            <button disabled={busy} className="w-full rounded-md bg-[#1e4fc1] px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50">
              {busy ? "Sending…" : "Ask support"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void startConversation("I would like to speak to a person.")}
              className="w-full rounded-md border border-[#dbe4f3] bg-white px-3 py-2 text-[10px] font-semibold text-[#10213c] disabled:opacity-50"
            >
              Request a person
            </button>
          </form>

          <div className="space-y-2">
            <p className="text-[10px] font-bold text-[#10213c]">Your conversations</p>
            {conversations.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => void loadConversation(item.id).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Could not load conversation."))}
                className={`w-full rounded-lg border p-3 text-left ${activeId === item.id ? "border-blue-300 bg-blue-50" : "border-slate-100 bg-white"}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-[#10213c]">Conversation #{item.id}</span>
                  <span className="text-[8px] font-semibold capitalize text-slate-500">{item.status.replace("_", " ")}</span>
                </span>
                <span className="mt-1 block truncate text-[9px] text-slate-500">{item.lastMessage ?? "No messages"}</span>
              </button>
            ))}
            {!conversations.length && <p className="text-[9px] text-slate-500">No conversations yet.</p>}
          </div>
        </div>

        <div className="flex min-h-[360px] flex-col rounded-lg border border-slate-100">
          {conversation ? (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5">
                <div>
                  <p className="text-[10px] font-bold text-[#10213c]">Conversation #{conversation.id}</p>
                  <p className="mt-0.5 text-[8px] capitalize text-slate-500">{conversation.status.replace("_", " ")}</p>
                </div>
                {conversation.handoverReason && <span className="rounded-full bg-amber-50 px-2 py-1 text-[8px] font-semibold text-amber-800">{conversation.handoverReason}</span>}
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {messages.map((item) => (
                  <article key={item.id} className={`max-w-[90%] rounded-lg p-2.5 ${item.senderType === "customer" ? "ml-auto bg-blue-50" : "bg-slate-50"}`}>
                    <p className="mb-1 text-[8px] font-bold capitalize text-slate-500">{item.senderType === "assistant" ? "DaroBooks assistant" : item.senderType === "staff" ? "Support specialist" : "You"}</p>
                    <p className="whitespace-pre-wrap text-[10px] leading-5 text-[#10213c]">{item.body}</p>
                  </article>
                ))}
              </div>
              {conversation.status === "resolved" && conversation.csatScore === null ? (
                <div className="border-t border-slate-100 px-3 py-2.5">
                  <p className="mb-2 text-[9px] font-semibold text-slate-600">How was this support chat?</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button key={score} type="button" disabled={busy} onClick={() => void rateConversation(score)} aria-label={`Rate ${score} out of 5`} className="h-8 w-8 rounded-md border border-slate-200 text-[10px] font-bold text-[#1e4fc1] hover:bg-blue-50">{score}</button>
                    ))}
                  </div>
                </div>
              ) : null}
              {conversation.status !== "resolved" && (
                <form onSubmit={submitReply} className="flex gap-2 border-t border-slate-100 p-2.5">
                  <input value={reply} onChange={(event) => setReply(event.target.value)} maxLength={4000} placeholder="Write a follow-up…" className="min-w-0 flex-1 rounded-md border border-[#dbe4f3] px-3 py-2 text-[10px] outline-none focus:border-[#1e4fc1]" />
                  <button disabled={busy || !reply.trim()} className="rounded-md bg-[#1e4fc1] px-3 py-2 text-[9px] font-bold text-white disabled:opacity-50">Send</button>
                </form>
              )}
              {conversation.csatScore !== null && <p className="border-t border-slate-100 px-3 py-2 text-[9px] text-slate-500">Your rating: {conversation.csatScore}/5</p>}
            </>
          ) : (
            <p className="m-auto p-6 text-center text-[10px] text-slate-500">Start a conversation or select one to view its messages.</p>
          )}
        </div>
      </div>
    </section>
  );
}
