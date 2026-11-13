"use client";

import { useEffect, useState } from "react";
import { RiArrowDownSLine, RiBookOpenLine, RiSearchLine } from "@remixicon/react";

const defaults = [
  ["Getting started with DaroBooks", "Set up your company, profile, invoice settings, and first customer."],
  ["Creating and sending invoices", "Create an invoice, add line items, apply tax, and send it to a customer."],
  ["Recording payments", "Record an invoice payment and reconcile the related bank transaction."],
  ["Managing users and roles", "Invite team members and control workspace feature access."],
];

export default function DashboardKnowledgeBase() {
  const [search, setSearch] = useState("");
  const [openArticle, setOpenArticle] = useState(0);
  const [articles, setArticles] = useState<{ id: string; title: string; content: string; category: string }[]>(defaults.map(([title, content], index) => ({ id: String(index), title, content, category: "General" })));
  useEffect(() => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) return;
    void fetch("/api/dashboard/knowledge-base/articles", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (Array.isArray(payload.articles) && payload.articles.length) setArticles(payload.articles);
      });
  }, []);
  const filtered = articles.filter((article) =>
    `${article.title} ${article.content}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[#10213c]">Knowledge base</h1>
        <p className="mt-1 text-[11px] text-slate-500">Find guides and answers for DaroBooks.</p>
      </div>
      <label className="flex h-10 items-center gap-2 rounded-lg border border-[#dbe4f3] bg-white px-3">
        <RiSearchLine className="h-4 w-4 text-slate-500" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the knowledge base" className="min-w-0 flex-1 bg-transparent text-[11px] outline-none" />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        {        filtered.map((article, index) => (
              <article key={article.id} className="rounded-xl border border-[#dfe7f4] bg-white">
            <button type="button" onClick={() => setOpenArticle(openArticle === index ? -1 : index)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[#1e4fc1]"><RiBookOpenLine className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1 text-[12px] font-bold text-[#10213c]">{article.title}</span>
              <RiArrowDownSLine className={`h-4 w-4 text-slate-500 transition ${openArticle === index ? "rotate-180" : ""}`} />
            </button>
            {openArticle === index && <p className="border-t border-slate-100 px-4 py-3 text-[11px] leading-5 text-slate-600">{article.content}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
