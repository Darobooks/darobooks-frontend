"use client";

import { useEffect, useState } from "react";
import {
  RiArrowRightSLine,
  RiCheckLine,
  RiQuestionAnswerLine,
  RiSettings3Line,
  RiSparkling2Line,
} from "@remixicon/react";

type Suggestion = {
  id: string;
  title: string;
  date: string;
  amount: number;
  category: string;
  detail: string;
};
type AssistRule = {
  id: string;
  name: string;
  merchantPattern: string;
  category: string;
  enabled: boolean;
};

const API_BASE_URL = (process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000").replace(/\/+$/, "");

export default function DashboardAssist() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [rules, setRules] = useState<AssistRule[]>([]);
  const [matchedRateThisMonth, setMatchedRateThisMonth] = useState(0);
  const [receiptsRead, setReceiptsRead] = useState(0);
  const [estimatedHoursSavedThisMonth, setEstimatedHoursSavedThisMonth] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState({ name: "", merchantPattern: "", category: "" });
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [pendingDeleteRule, setPendingDeleteRule] = useState<AssistRule | null>(null);
  const [activeTab, setActiveTab] = useState("Suggested categories");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [askError, setAskError] = useState("");

  useEffect(() => {
    const loadAssist = async () => {
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch(`${API_BASE_URL}/dashboard/assist`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        const payload = (await response.json()) as { suggestions?: Suggestion[]; rules?: AssistRule[]; matchedRateThisMonth?: number; receiptsRead?: number; estimatedHoursSavedThisMonth?: number; answer?: string; message?: string };
        if (!response.ok) throw new Error(payload.message ?? "Could not load Assist.");
        setSuggestions(payload.suggestions ?? []);
        setRules(payload.rules ?? []);
        setMatchedRateThisMonth(payload.matchedRateThisMonth ?? 0);
        setReceiptsRead(payload.receiptsRead ?? 0);
        setEstimatedHoursSavedThisMonth(payload.estimatedHoursSavedThisMonth ?? 0);
        setAnswer(payload.answer ?? "");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load Assist.");
      } finally {
        setIsLoading(false);
      }
    };
    void loadAssist();
  }, []);

  const acceptSuggestion = async (suggestion: Suggestion) => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) {
      setError("Sign in again before accepting a suggestion.");
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/assist/suggestions/${encodeURIComponent(suggestion.id)}/accept`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ category: suggestion.category }),
      });
      if (!response.ok) throw new Error("Could not accept this suggestion.");
      setSuggestions((current) => current.filter((item) => item.id !== suggestion.id));
      setError("");
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "Could not accept this suggestion.");
    }
  };

  const askBooks = async () => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isAsking) return;
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) {
      setAskError("Sign in again before asking your books.");
      return;
    }
    setIsAsking(true);
    setAskError("");
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/assist/ask`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ question: trimmedQuestion }) });
      const payload = (await response.json()) as { answer?: string; message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Could not ask your books.");
      setAnswer(payload.answer ?? "No answer was returned from your books.");
      setQuestion("");
    } catch (askErrorValue) {
      setAskError(askErrorValue instanceof Error ? askErrorValue.message : "Could not ask your books.");
    } finally {
      setIsAsking(false);
    }
  };

  const persistRule = async (
    rule: Omit<AssistRule, "id">,
    resetForm: boolean,
  ) => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) {
      setError("Sign in again before managing rules.");
      return;
    }
    setIsSavingRule(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/assist/rules`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(rule),
      });
      const payload = (await response.json()) as { message?: string; rule?: AssistRule };
      if (!response.ok) throw new Error(payload.message ?? "Could not save rule.");
      const savedRule = payload.rule;
      if (!savedRule) throw new Error("The saved rule could not be loaded.");
      setRules((current) => [...current.filter((item) => item.name !== savedRule.name), savedRule]);
      if (resetForm) setRuleForm({ name: "", merchantPattern: "", category: "" });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save rule.");
    } finally {
      setIsSavingRule(false);
    }
  };

  const saveRule = async () => {
    const rule = {
      ...ruleForm,
      name: ruleForm.name.trim(),
      merchantPattern: ruleForm.merchantPattern.trim(),
      category: ruleForm.category.trim(),
      enabled: true,
    };
    if (!rule.name || !rule.merchantPattern || !rule.category) {
      setError("Enter a rule name, merchant pattern, and category.");
      return;
    }
    await persistRule(rule, true);
  };

  const toggleRule = async (rule: AssistRule) => {
    await persistRule({
      name: rule.name,
      merchantPattern: rule.merchantPattern,
      category: rule.category,
      enabled: !rule.enabled,
    }, false);
  };

  const editRule = (rule: AssistRule) => {
    setRuleForm({
      name: rule.name,
      merchantPattern: rule.merchantPattern,
      category: rule.category,
    });
    setIsRulesOpen(true);
  };

  const deleteRule = async () => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || !pendingDeleteRule) {
      setError("Sign in again before managing rules.");
      return;
    }
    setIsSavingRule(true);
    setError("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/dashboard/assist/rules/${encodeURIComponent(pendingDeleteRule.id)}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      );
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Could not delete rule.");
      setRules((current) => current.filter((rule) => rule.id !== pendingDeleteRule.id));
      if (ruleForm.name === pendingDeleteRule.name) {
        setRuleForm({ name: "", merchantPattern: "", category: "" });
      }
      setPendingDeleteRule(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete rule.");
    } finally {
      setIsSavingRule(false);
    }
  };

  const startNewRule = () => {
    setRuleForm({ name: "", merchantPattern: "", category: "" });
    setIsRulesOpen(true);
  };

  return (
    <section aria-labelledby="assist-heading" className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#087b74]">DaroAssist</p>
          <h1 id="assist-heading" className="font-jakarta text-[19px] font-bold text-[#10213c] sm:text-[21px]">Assist</h1>
          <p className="mt-1 text-[10px] text-slate-600">Review categories suggested for unmatched bank lines. Importing a statement creates its ledger entries; accepting a suggestion saves its category and marks the line matched, but does not link it to an invoice or bill.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setIsRulesOpen((open) => !open)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dbe4f3] bg-white px-3 text-[9px] font-bold text-[#10213c]"><RiSettings3Line className="h-3.5 w-3.5" /> Rules</button>
          <button type="button" onClick={() => document.getElementById("assist-question")?.focus()} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1e4fc1] px-3 text-[9px] font-bold text-white hover:bg-blue-800"><RiQuestionAnswerLine className="h-3.5 w-3.5" /> Ask your books</button>
        </div>
      </header>
      {pendingDeleteRule ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[9px] text-amber-900">
          <span>Delete the “{pendingDeleteRule.name}” rule?</span>
          <span className="flex gap-2">
            <button type="button" disabled={isSavingRule} onClick={() => void deleteRule()} className="font-bold text-red-700 disabled:opacity-50">{isSavingRule ? "Deleting…" : "Delete"}</button>
            <button type="button" disabled={isSavingRule} onClick={() => setPendingDeleteRule(null)} className="font-bold text-[#1e4fc1] disabled:opacity-50">Cancel</button>
          </span>
        </div>
      ) : null}
      {isRulesOpen ? (
        <section aria-labelledby="assist-rules-heading" className="rounded-xl border border-[#dfe7f4] bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 id="assist-rules-heading" className="text-[10px] font-bold text-[#10213c]">Configure rules</h2>
              <p className="mt-0.5 text-[8px] text-slate-500">Rules are checked before Assist’s general category suggestions.</p>
            </div>
            <button type="button" onClick={() => setIsRulesOpen(false)} className="text-[9px] font-bold text-[#1e4fc1]">Close</button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <input value={ruleForm.name} onChange={(event) => setRuleForm((current) => ({ ...current, name: event.target.value }))} placeholder="Rule name" className="h-8 rounded-md border border-[#dbe4f3] px-2 text-[9px]" />
            <input value={ruleForm.merchantPattern} onChange={(event) => setRuleForm((current) => ({ ...current, merchantPattern: event.target.value }))} placeholder="Merchant contains" className="h-8 rounded-md border border-[#dbe4f3] px-2 text-[9px]" />
            <div className="flex gap-2"><input value={ruleForm.category} onChange={(event) => setRuleForm((current) => ({ ...current, category: event.target.value }))} placeholder="Category" className="h-8 min-w-0 flex-1 rounded-md border border-[#dbe4f3] px-2 text-[9px]" /><button type="button" disabled={isSavingRule} onClick={() => void saveRule()} className="rounded-md bg-[#1e4fc1] px-2.5 text-[8px] font-bold text-white disabled:opacity-50">{isSavingRule ? "Saving…" : "Save rule"}</button></div>
          </div>
          <AssistRuleList rules={rules} onEdit={editRule} onToggle={toggleRule} onDelete={setPendingDeleteRule} disabled={isSavingRule} />
        </section>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-4">
        <AssistMetric label="Suggestions waiting" value={isLoading ? "…" : String(suggestions.length)} />
        <AssistMetric label="Matched rate this month" value={`${matchedRateThisMonth}%`} />
        <AssistMetric label="Receipts read" value={String(receiptsRead)} />
        <AssistMetric label="Est. hours saved this month" value={String(estimatedHoursSavedThisMonth)} />
      </div>
      {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[9px] text-red-800">{error}</p> : null}

      <div className="flex flex-wrap gap-1.5">
        {["Suggested categories", "Bank rules", "Receipt capture"].map((tab) => (
          <button key={tab} type="button" aria-pressed={activeTab === tab} onClick={() => setActiveTab(tab)} className={`rounded-full px-3 py-1.5 text-[8px] font-bold ${activeTab === tab ? "bg-[#1e4fc1] text-white" : "border border-[#dbe4f3] bg-white text-[#10213c]"}`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Suggested categories" ? (
        <section aria-label="Suggestions" className="space-y-2">
          {isLoading ? <p className="rounded-xl border border-dashed border-[#dbe4f3] bg-white px-3 py-8 text-center text-[9px] text-slate-500">Loading suggestions…</p> : suggestions.length ? suggestions.map((suggestion) => (
            <article key={suggestion.id} className="grid gap-2 rounded-xl border border-[#dfe7f4] bg-white px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
              <div className="min-w-0">
                <h2 className="truncate text-[10px] font-bold text-[#10213c]">{suggestion.title}</h2>
                <p className="mt-0.5 text-[8px] text-slate-500">{suggestion.date} · {suggestion.detail}</p>
              </div>
              <div className="flex items-center gap-2 sm:justify-end">
                <strong className="text-[10px] text-[#10213c]">{suggestion.amount}</strong>
                <span className="rounded-full bg-[#e5f7f5] px-2 py-1 text-[7px] font-bold text-[#087b74]">{suggestion.category}</span>
              </div>
              <button type="button" onClick={() => void acceptSuggestion(suggestion)} className="inline-flex h-7 items-center justify-center gap-1 rounded-md bg-[#1e4fc1] px-2.5 text-[8px] font-bold text-white hover:bg-blue-800"><RiCheckLine className="h-3 w-3" /> Accept category</button>
            </article>
          )) : <p className="rounded-xl border border-dashed border-[#dbe4f3] bg-white px-3 py-8 text-center text-[9px] text-slate-500">No unmatched bank lines need category review.</p>}
        </section>
      ) : activeTab === "Bank rules" ? (
        <section aria-label="Bank rules" className="rounded-xl border border-[#dfe7f4] bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-[10px] font-bold text-[#10213c]">Merchant category rules</h2>
              <p className="mt-0.5 text-[8px] text-slate-500">Enabled rules suggest a category when an unmatched bank line contains the merchant pattern.</p>
            </div>
            <button type="button" onClick={startNewRule} className="rounded-md bg-[#1e4fc1] px-2.5 py-1.5 text-[8px] font-bold text-white">Add rule</button>
          </div>
          <AssistRuleList rules={rules} onEdit={editRule} onToggle={toggleRule} onDelete={setPendingDeleteRule} disabled={isSavingRule} />
        </section>
      ) : (
        <section className="rounded-xl border border-dashed border-[#dbe4f3] bg-white px-3 py-8 text-center">
          <RiSparkling2Line className="mx-auto h-5 w-5 text-[#1e4fc1]" />
          <p className="mt-2 text-[10px] font-bold text-[#10213c]">Receipt capture is not available yet</p>
          <p className="mt-1 text-[9px] text-slate-500">Assist does not currently read or process receipts.</p>
        </section>
      )}

      <section aria-labelledby="ask-books-heading" className="rounded-xl border border-[#dfe7f4] bg-white p-3">
        <div className="flex items-center gap-2">
          <RiSparkling2Line className="h-4 w-4 text-[#087b74]" />
          <h2 id="ask-books-heading" className="text-[10px] font-bold text-[#10213c]">Ask your books</h2>
        </div>
        <div className="mt-2 flex gap-2 rounded-lg bg-[#f1f5fd] p-2">
          <span className="shrink-0 rounded-md bg-white px-2 py-1.5 text-[8px] font-bold text-[#1e4fc1]">You:</span>
          <input id="assist-question" value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void askBooks(); } }} placeholder="How much sales tax do I owe for October?" className="min-w-0 flex-1 bg-transparent text-[9px] text-[#10213c] outline-none placeholder:text-slate-500" />
          <button type="button" onClick={() => void askBooks()} disabled={isAsking || !question.trim()} aria-label="Ask your books" className="shrink-0 rounded-md bg-[#1e4fc1] px-2 py-1 text-white disabled:cursor-wait disabled:opacity-50">{isAsking ? "…" : <RiArrowRightSLine className="h-3.5 w-3.5" />}</button>
        </div>
        {askError ? <p role="alert" className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[9px] text-red-800">{askError}</p> : answer ? <p className="mt-2 rounded-lg bg-[#e5f7f5] px-2.5 py-2 text-[9px] leading-relaxed text-[#176b66]"><strong>DaroAssist:</strong> {answer}</p> : <p className="mt-2 rounded-lg bg-[#f1f5fd] px-2.5 py-2 text-[9px] text-slate-500">Ask a question to search your accepted books.</p>}
      </section>
    </section>
  );
}

function AssistMetric({ label, value }: { label: string; value: string }) {
  return <article className="rounded-xl border border-[#dfe7f4] bg-white px-3 py-2.5"><p className="text-[8px] font-semibold text-slate-500">{label}</p><p className="mt-1 text-[15px] font-bold text-[#10213c]">{value}</p></article>;
}

function AssistRuleList({
  rules,
  onEdit,
  onToggle,
  onDelete,
  disabled,
}: {
  rules: AssistRule[];
  onEdit: (rule: AssistRule) => void;
  onToggle: (rule: AssistRule) => void;
  onDelete: (rule: AssistRule) => void;
  disabled: boolean;
}) {
  if (!rules.length) return <p className="mt-3 text-[8px] text-slate-500">No rules configured yet.</p>;
  return (
    <ul className="divide-y divide-[#edf1f7]">
      {rules.map((rule) => (
        <li key={rule.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[8px] text-slate-600">
          <span>
            <strong className="text-[#10213c]">{rule.name}</strong> · merchant contains “{rule.merchantPattern}” · <strong className="text-[#087b74]">{rule.category}</strong>
            <span className="ml-1 text-slate-500">{rule.enabled ? "Enabled" : "Disabled"}</span>
          </span>
          <span className="flex gap-2">
            <button type="button" disabled={disabled} onClick={() => onEdit(rule)} className="font-bold text-[#1e4fc1] disabled:opacity-50">Edit</button>
            <button type="button" disabled={disabled} onClick={() => onToggle(rule)} className="font-bold text-[#1e4fc1] disabled:opacity-50">{rule.enabled ? "Disable" : "Enable"}</button>
            <button type="button" disabled={disabled} onClick={() => onDelete(rule)} className="font-bold text-red-700 disabled:opacity-50">Delete</button>
          </span>
        </li>
      ))}
    </ul>
  );
}
