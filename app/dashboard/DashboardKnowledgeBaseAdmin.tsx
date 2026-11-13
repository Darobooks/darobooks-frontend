"use client";

import { useEffect, useState, type FormEvent } from "react";
import { RiArrowDownSLine } from "@remixicon/react";

type Article = { id: string; title: string; content: string; category: string; published: boolean };

export default function DashboardKnowledgeBaseAdmin() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [form, setForm] = useState({ title: "", content: "", category: "General", published: true });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openArticleId, setOpenArticleId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const headers = () => ({
    Authorization: `Bearer ${window.sessionStorage.getItem("darobooksAccessToken") ?? ""}`,
    "Content-Type": "application/json",
  });

  async function load() {
    const response = await fetch("/api/admin/knowledge-base/articles", { headers: headers(), cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message ?? "Could not load articles.");
    setArticles(payload.articles ?? []);
  }
  useEffect(() => { void load().catch((loadError) => setError(loadError.message)); }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch(
        editingId ? `/api/admin/knowledge-base/articles/${editingId}` : "/api/admin/knowledge-base/articles",
        { method: editingId ? "PATCH" : "POST", headers: headers(), body: JSON.stringify(form) },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Could not save article.");
      setForm({ title: "", content: "", category: "General", published: true });
      setEditingId(null);
      await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Could not save article."); }
  }

  async function remove(id: string) {
    const response = await fetch(`/api/admin/knowledge-base/articles/${id}`, { method: "DELETE", headers: headers() });
    if (!response.ok) { const payload = await response.json(); setError(payload.message ?? "Could not delete article."); return; }
    await load();
  }

  return (
    <section className="space-y-4">
      <div><h1 className="text-xl font-bold text-[#10213c]">Knowledge base management</h1><p className="mt-1 text-[11px] text-slate-500">Create articles that appear for dashboard users.</p></div>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[10px] text-red-700">{error}</p>}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
        <form onSubmit={save} className="grid gap-3 rounded-xl border border-[#dfe7f4] bg-white p-4">
          <input required maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Article title" className="rounded-lg border border-[#dbe4f3] px-3 py-2 text-[11px]" />
          <input maxLength={80} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Category" className="rounded-lg border border-[#dbe4f3] px-3 py-2 text-[11px]" />
          <textarea required maxLength={10000} rows={8} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} placeholder="Article content" className="rounded-lg border border-[#dbe4f3] px-3 py-2 text-[11px]" />
          <label className="flex items-center gap-2 text-[11px]"><input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} /> Published</label>
          <button className="rounded-lg bg-[#1e4fc1] px-4 py-2 text-[11px] font-bold text-white">{editingId ? "Update article" : "Add article"}</button>
        </form>
        <div className="space-y-2">
          {articles.map((article) => (
            <article key={article.id} className="overflow-hidden rounded-xl border border-[#dfe7f4] bg-white">
              <button
                type="button"
                onClick={() => setOpenArticleId(openArticleId === article.id ? null : article.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
                aria-expanded={openArticleId === article.id}
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words text-[12px] font-bold text-[#10213c]">{article.title}</p>
                  <p className="mt-0.5 text-[9px] text-slate-400">{article.category} · {article.published ? "Published" : "Draft"}</p>
                </div>
                <RiArrowDownSLine className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${openArticleId === article.id ? "rotate-180" : ""}`} />
              </button>
              {openArticleId === article.id && (
                <div className="border-t border-slate-100 px-4 py-3">
                  <p className="whitespace-pre-wrap text-[10px] leading-5 text-slate-600">{article.content}</p>
                  <div className="mt-3 flex justify-end gap-3 border-t border-slate-100 pt-3">
                    <button onClick={() => { setEditingId(article.id); setForm(article); setOpenArticleId(article.id); }} className="text-[10px] font-semibold text-[#1e4fc1]">Edit</button>
                    <button onClick={() => void remove(article.id)} className="text-[10px] font-semibold text-red-600">Delete</button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
