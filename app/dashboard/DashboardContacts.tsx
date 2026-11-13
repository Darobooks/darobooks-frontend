"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { RiAddLine, RiDeleteBinLine, RiEditLine } from "@remixicon/react";
import { useToastOnChange } from "@/app/components/toast";
import { useConfirmDialog } from "@/app/components/ConfirmDialog";
import ActionSpinner from "@/app/components/ActionSpinner";

type ContactKind = "customer" | "supplier";
type ContactStatus = "On time" | "Overdue" | "Needs review";

type Contact = {
  id: string;
  kind: ContactKind;
  name: string;
  email: string;
  phone: string;
  location: string;
  status: ContactStatus;
  balance: number;
  creditLimit: number;
  recentActivity: { label: string; date: string; amount: number }[];
};

type ContactsResponse = {
  summary: {
    customers: number;
    suppliers: number;
    owedToYou: number;
    youOwe: number;
  };
  contacts: Contact[];
};

type ContactForm = {
  kind: ContactKind;
  name: string;
  email: string;
  phone: string;
  location: string;
  creditLimit: string;
};

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

const emptyResponse: ContactsResponse = {
  summary: { customers: 0, suppliers: 0, owedToYou: 0, youOwe: 0 },
  contacts: [],
};

const emptyForm: ContactForm = {
  kind: "customer",
  name: "",
  email: "",
  phone: "",
  location: "",
  creditLimit: "",
};

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,      currencyDisplay: "code",      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isContact(value: unknown): value is Contact {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    (value.kind === "customer" || value.kind === "supplier") &&
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    typeof value.phone === "string" &&
    typeof value.location === "string" &&
    ["On time", "Overdue", "Needs review"].includes(String(value.status)) &&
    typeof value.balance === "number" &&
    Number.isFinite(value.balance) &&
    typeof value.creditLimit === "number" &&
    Number.isFinite(value.creditLimit) &&
    Array.isArray(value.recentActivity) &&
    value.recentActivity.every(
      (activity) =>
        isRecord(activity) &&
        typeof activity.label === "string" &&
        typeof activity.date === "string" &&
        typeof activity.amount === "number" &&
        Number.isFinite(activity.amount),
    )
  );
}

function isSavedContact(
  value: unknown,
): value is Pick<
  Contact,
  "id" | "kind" | "name" | "email" | "phone" | "location" | "creditLimit"
> {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (value.kind === "customer" || value.kind === "supplier") &&
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    typeof value.phone === "string" &&
    typeof value.location === "string" &&
    typeof value.creditLimit === "number" &&
    Number.isFinite(value.creditLimit)
  );
}

function isContactsResponse(value: unknown): value is ContactsResponse {
  if (!isRecord(value) || !isRecord(value.summary)) return false;
  return (
    typeof value.summary.customers === "number" &&
    typeof value.summary.suppliers === "number" &&
    typeof value.summary.owedToYou === "number" &&
    typeof value.summary.youOwe === "number" &&
    Array.isArray(value.contacts) &&
    value.contacts.every(isContact)
  );
}

function getApiError(payload: unknown, fallback: string) {
  if (isRecord(payload) && typeof payload.message === "string") {
    return payload.message;
  }
  return fallback;
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

export default function DashboardContacts({
  search = "",
  currency = "USD",
}: {
  search?: string;
  currency?: string;
}) {
  const { confirm, dialog } = useConfirmDialog();
  const [data, setData] = useState<ContactsResponse>(emptyResponse);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingContactId, setDeletingContactId] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<ContactKind>("customer");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactForm>(emptyForm);
  useToastOnChange(error);

  const loadContacts = useCallback(async () => {
    await Promise.resolve();
    try {
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) throw new Error("Sign in again to manage contacts.");
      const response = await fetch(`${API_BASE_URL}/dashboard/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getApiError(payload, "Could not load contacts."));
      }
      if (!isContactsResponse(payload)) {
        throw new Error("The contacts service returned invalid contact data.");
      }
      setData(payload);
      setSelectedContactId((selected) =>
        payload.contacts.some((contact) => contact.id === selected)
          ? selected
          : (payload.contacts[0]?.id ?? ""),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load contacts. Please try again.",
      );
      setData(emptyResponse);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadContacts();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadContacts]);

  const visibleContacts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.contacts.filter((contact) => {
      if (contact.kind !== activeTab) return false;
      return (
        !query ||
        `${contact.name} ${contact.email} ${contact.phone} ${contact.location} ${contact.status}`
          .toLowerCase()
          .includes(query)
      );
    });
  }, [activeTab, data.contacts, search]);

  const selectedContact =
    visibleContacts.find((contact) => contact.id === selectedContactId) ??
    visibleContacts[0];

  const openCreateForm = () => {
    setError("");
    setEditingContactId(null);
    setForm({ ...emptyForm, kind: activeTab });
    setIsFormOpen(true);
  };

  const openEditForm = (contact: Contact) => {
    setError("");
    setEditingContactId(contact.id);
    setForm({
      kind: contact.kind,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      location: contact.location,
      creditLimit: String(contact.creditLimit),
    });
    setIsFormOpen(true);
  };

  const saveContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setError("");
    try {
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) throw new Error("Sign in again to manage contacts.");
      const response = await fetch(
        `${API_BASE_URL}/dashboard/contacts${editingContactId ? `/${encodeURIComponent(editingContactId)}` : ""}`,
        {
          method: editingContactId ? "PATCH" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...form,
            creditLimit: form.creditLimit === "" ? 0 : Number(form.creditLimit),
          }),
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getApiError(payload, "Could not save this contact."));
      }
      if (!isRecord(payload) || !isSavedContact(payload.contact)) {
        throw new Error("The contacts service returned invalid contact data.");
      }
      setActiveTab(payload.contact.kind);
      setSelectedContactId(payload.contact.id);
      setIsFormOpen(false);
      await loadContacts();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save this contact. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const deleteContact = async (contact: Contact) => {
    const confirmed = await confirm({
      title: `Delete ${contact.name}?`,
      message: "This cannot be undone.",
      confirmLabel: "Delete contact",
      destructive: true,
    });
    if (!confirmed) return;
    setDeletingContactId(contact.id);
    setError("");
    try {
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) throw new Error("Sign in again to manage contacts.");
      const response = await fetch(
        `${API_BASE_URL}/dashboard/contacts/${encodeURIComponent(contact.id)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(getApiError(payload, "Could not delete this contact."));
      }
      setSelectedContactId("");
      await loadContacts();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete this contact. Please try again.",
      );
    } finally {
      setDeletingContactId("");
    }
  };

  const customerCount = data.summary.customers;
  const supplierCount = data.summary.suppliers;
  const summaryStats = [
    { label: "Customers", value: String(customerCount) },
    { label: "Suppliers", value: String(supplierCount) },
    { label: "Owed to you", value: money(data.summary.owedToYou, currency) },
    { label: "You owe", value: money(data.summary.youOwe, currency) },
  ];

  return (
    <section className="rounded-[18px] border border-[#dfe7f4] bg-[#f4f7fb]">
      {dialog}
      <header className="flex items-center justify-between gap-3 border-b border-[#dfe7f4] bg-[#f7f9fc] px-4 py-3">
        <span className="rounded-md bg-[#eef4ff] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#1f4fc1]">
          DaroContacts
        </span>
        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e4fc1] px-3 py-2 text-[10px] font-bold text-white hover:bg-blue-800"
        >
          <RiAddLine className="h-3.5 w-3.5" />
          New contact
        </button>
      </header>

      <div className="px-4 py-4">
        <h1 className="text-[24px] font-bold tracking-[-0.6px] text-[#10213c]">
          Customers and suppliers
        </h1>
        <p className="mt-1 text-[12px] text-slate-600">
          Manage the people and companies you work with.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                setError("");
                void loadContacts();
              }}
              className="shrink-0 font-bold underline"
            >
              Retry
            </button>
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-[#dfe7f4] bg-white px-3 py-3"
            >
              <div className="text-[11px] font-medium text-slate-600">
                {stat.label}
              </div>
              <div className="mt-2 text-[18px] font-bold tracking-[-0.35px] text-[#10213c]">
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-[#dfe7f4] bg-white">
          <div className="flex items-center gap-2 border-b border-[#dfe7f4] bg-[#f8fafc] px-3 py-2">
            {(["customer", "supplier"] as ContactKind[]).map((kind) => {
              const count = kind === "customer" ? customerCount : supplierCount;
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setActiveTab(kind)}
                  className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${
                    activeTab === kind
                      ? "bg-[#1e4fc1] text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {kind === "customer" ? "Customers" : "Suppliers"}
                  <span className="ml-1.5 text-[9px] opacity-80">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-0 xl:grid-cols-[1.6fr_0.9fr]">
            <div className="border-b border-[#eef2f7] xl:border-b-0 xl:border-r">
              {isLoading ? (
                <p className="px-4 py-8 text-center text-[11px] text-slate-500">
                  Loading contacts…
                </p>
              ) : visibleContacts.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-[12px] font-semibold text-[#10213c]">
                    {search.trim()
                      ? "No contacts match your search."
                      : `No ${activeTab === "customer" ? "customers" : "suppliers"} yet.`}
                  </p>
                  {!search.trim() && (
                    <button
                      type="button"
                      onClick={openCreateForm}
                      className="mt-2 text-[11px] font-bold text-[#1e4fc1] hover:underline"
                    >
                      Add your first contact
                    </button>
                  )}
                </div>
              ) : (
                <ul>
                  {visibleContacts.map((contact) => (
                    <li key={contact.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedContactId(contact.id)}
                        className={`flex w-full items-center justify-between gap-3 border-b border-[#edf2f7] px-4 py-3 text-left transition ${
                          selectedContact?.id === contact.id
                            ? "bg-[#eef4ff]"
                            : "bg-white hover:bg-slate-50"
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold text-[#10213c]">
                            {contact.name}
                          </span>
                          <span className="mt-1 block truncate text-[10px] text-slate-500">
                            {[contact.location, contact.email]
                              .filter(Boolean)
                              .join(" · ") || "No contact details"}
                          </span>
                        </span>
                        <span className="text-right">
                          <span className="block text-[13px] font-bold text-[#10213c]">
                            {money(contact.balance, currency)}
                          </span>
                          <span
                            className={`mt-1 block text-[9px] font-medium ${
                              contact.status === "Overdue"
                                ? "text-amber-700"
                                : contact.status === "Needs review"
                                  ? "text-orange-700"
                                  : "text-emerald-700"
                            }`}
                          >
                            {contact.status}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <aside className="bg-[#f7f9fc] p-4">
              {selectedContact ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="break-words text-[18px] font-bold tracking-[-0.35px] text-[#10213c]">
                        {selectedContact.name}
                      </h2>
                      <p className="mt-1 text-[10px] text-slate-500">
                        {selectedContact.kind === "customer"
                          ? "Customer"
                          : "Supplier"}
                        {selectedContact.location
                          ? ` · ${selectedContact.location}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => openEditForm(selectedContact)}
                        aria-label={`Edit ${selectedContact.name}`}
                        className="dashboard-action-button border border-[#dfe7f4] bg-white"
                      >
                        <RiEditLine className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={deletingContactId === selectedContact.id}
                        onClick={() => void deleteContact(selectedContact)}
                        aria-label={`Delete ${selectedContact.name}`}
                        className="dashboard-action-button dashboard-action-button-danger border border-red-100 bg-white text-red-600 disabled:cursor-wait disabled:opacity-60"
                      >
                        {deletingContactId === selectedContact.id ? (
                          <ActionSpinner label={`Deleting ${selectedContact.name}`} />
                        ) : (
                          <RiDeleteBinLine className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-[#dfe7f4] bg-white px-3 py-2">
                      <p className="text-[9px] text-slate-500">Balance</p>
                      <p className="mt-1 text-[13px] font-bold text-[#10213c]">
                        {money(selectedContact.balance, currency)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#dfe7f4] bg-white px-3 py-2">
                      <p className="text-[9px] text-slate-500">Credit limit</p>
                      <p className="mt-1 text-[13px] font-bold text-[#10213c]">
                        {money(selectedContact.creditLimit, currency)}
                      </p>
                    </div>
                  </div>

                  {(selectedContact.email || selectedContact.phone) && (
                    <div className="mt-3 rounded-lg border border-[#dfe7f4] bg-white px-3 py-2 text-[10px] text-slate-600">
                      {selectedContact.email && (
                        <p className="break-all">{selectedContact.email}</p>
                      )}
                      {selectedContact.phone && (
                        <p className={selectedContact.email ? "mt-1" : ""}>
                          {selectedContact.phone}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-4 rounded-xl border border-[#dfe7f4] bg-white p-3">
                    <h3 className="mb-2 text-[11px] font-bold text-[#10213c]">
                      Recent invoice activity
                    </h3>
                    {selectedContact.recentActivity.length ? (
                      <ul className="space-y-2">
                        {selectedContact.recentActivity.map((item, index) => (
                          <li
                            key={`${item.label}-${item.date}-${index}`}
                            className="flex items-center justify-between gap-3 border-b border-[#edf2f7] pb-2 last:border-0 last:pb-0"
                          >
                            <span>
                              <span className="block text-[10px] font-medium text-slate-700">
                                {item.label}
                              </span>
                              <span className="text-[9px] text-slate-500">
                                {dateLabel(item.date)}
                              </span>
                            </span>
                            <span className="text-[10px] font-semibold text-[#10213c]">
                              {money(item.amount, currency)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[10px] text-slate-500">
                        No invoice activity for this contact yet.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex min-h-40 items-center justify-center text-center text-[11px] text-slate-500">
                  Select a contact to view its details.
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>

      {isFormOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving) {
              setIsFormOpen(false);
            }
          }}
        >
          <form
            onSubmit={saveContact}
            aria-labelledby="contact-form-title"
            className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#dfe7f4] bg-white p-5 shadow-xl"
          >
            <h2
              id="contact-form-title"
              className="text-[18px] font-bold text-[#10213c]"
            >
              {editingContactId ? "Edit contact" : "New contact"}
            </h2>
            <p className="mt-1 text-[11px] text-slate-500">
              Contact records are private to your workspace.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-[10px] font-semibold text-slate-700">
                Contact type
                <select
                  value={form.kind}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      kind: event.target.value as ContactKind,
                    }))
                  }
                  className="mt-1 block h-10 w-full rounded-lg border border-[#dbe4f3] bg-white px-3 text-[11px] outline-none focus:border-[#1e4fc1]"
                >
                  <option value="customer">Customer</option>
                  <option value="supplier">Supplier</option>
                </select>
              </label>
              <label className="text-[10px] font-semibold text-slate-700">
                Name *
                <input
                  autoFocus
                  required
                  minLength={2}
                  maxLength={160}
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="mt-1 block h-10 w-full rounded-lg border border-[#dbe4f3] px-3 text-[11px] outline-none focus:border-[#1e4fc1]"
                />
              </label>
              <label className="text-[10px] font-semibold text-slate-700">
                Email
                <input
                  type="email"
                  maxLength={254}
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  className="mt-1 block h-10 w-full rounded-lg border border-[#dbe4f3] px-3 text-[11px] outline-none focus:border-[#1e4fc1]"
                />
              </label>
              <label className="text-[10px] font-semibold text-slate-700">
                Phone
                <input
                  maxLength={40}
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  className="mt-1 block h-10 w-full rounded-lg border border-[#dbe4f3] px-3 text-[11px] outline-none focus:border-[#1e4fc1]"
                />
              </label>
              <label className="text-[10px] font-semibold text-slate-700">
                Location
                <input
                  maxLength={160}
                  value={form.location}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                  className="mt-1 block h-10 w-full rounded-lg border border-[#dbe4f3] px-3 text-[11px] outline-none focus:border-[#1e4fc1]"
                />
              </label>
              <label className="text-[10px] font-semibold text-slate-700">
                Credit limit ({currency})
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.creditLimit}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      creditLimit: event.target.value,
                    }))
                  }
                  className="mt-1 block h-10 w-full rounded-lg border border-[#dbe4f3] px-3 text-[11px] outline-none focus:border-[#1e4fc1]"
                />
              </label>
            </div>

            {error && (
              <p role="alert" className="mt-3 text-[11px] text-red-700">
                {error}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={isSaving}
                aria-busy={isSaving}
                onClick={() => setIsFormOpen(false)}
                className="rounded-lg border border-[#dbe4f3] px-4 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-[#1e4fc1] px-4 py-2 text-[11px] font-bold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
              >
                {isSaving ? (
                  <span className="inline-flex items-center gap-2">
                    <ActionSpinner label="Saving contact" />
                    Saving…
                  </span>
                ) : editingContactId
                  ? "Save changes"
                  : "Create contact"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
