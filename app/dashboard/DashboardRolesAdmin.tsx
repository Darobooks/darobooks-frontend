"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import ActionSpinner from "../components/ActionSpinner";
import { roleAccessSections } from "./role-access-features";

type AdminRole = {
  key: string;
  name: string;
  description: string;
  features: string[];
  isCustom: boolean;
};

function getErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || !("message" in payload)) {
    return null;
  }
  return typeof payload.message === "string" ? payload.message : null;
}

function isRolesResponse(payload: unknown): payload is { roles: AdminRole[] } {
  return (
    !!payload &&
    typeof payload === "object" &&
    "roles" in payload &&
    Array.isArray(payload.roles) &&
    payload.roles.every(
      (role) =>
        !!role &&
        typeof role === "object" &&
        "key" in role &&
        typeof role.key === "string" &&
        "name" in role &&
        typeof role.name === "string" &&
        "description" in role &&
        typeof role.description === "string" &&
        "features" in role &&
        Array.isArray(role.features) &&
        role.features.every(
          (feature: unknown) => typeof feature === "string",
        ) &&
        "isCustom" in role &&
        typeof role.isCustom === "boolean",
    )
  );
}

function isAdminRole(payload: unknown): payload is AdminRole {
  return isRolesResponse({ roles: [payload] });
}

export default function DashboardRolesAdmin() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [selectedRoleKey, setSelectedRoleKey] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRole, setNewRole] = useState({
    name: "",
    description: "",
    features: ["dashboard"] as string[],
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadRoles = useCallback(async () => {
    setIsLoading(true);
    setError("");
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) {
      setError("Sign in to manage roles.");
      setIsLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/admin/roles", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload) ??
            `Could not load roles (HTTP ${response.status}).`,
        );
      }
      if (!isRolesResponse(payload)) {
        throw new Error("The roles service returned invalid data.");
      }
      setRoles(payload.roles);
      setSelectedRoleKey((selected) =>
        payload.roles.some((role) => role.key === selected)
          ? selected
          : (payload.roles[0]?.key ?? ""),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load roles. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRoles(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRoles]);

  const toggleFeature = (roleKey: string, feature: string) => {
    setRoles((current) =>
      current.map((role) =>
        role.key !== roleKey
          ? role
          : {
              ...role,
              features: role.features.includes(feature)
                ? role.features.filter((item) => item !== feature)
                : [...role.features, feature],
            },
      ),
    );
    setMessage("");
  };

  const saveRoles = async () => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || isSaving) return;
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/roles", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roles: roles.map(({ key, features }) => ({ key, features })),
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload) ??
            `Could not save roles (HTTP ${response.status}).`,
        );
      }
      setMessage(getErrorMessage(payload) ?? "Role access has been saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save roles. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const createRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || isCreatingRole) return;
    setIsCreatingRole(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/roles", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newRole),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload) ??
            `Could not create role (HTTP ${response.status}).`,
        );
      }
      if (
        !payload ||
        typeof payload !== "object" ||
        !("role" in payload) ||
        !isAdminRole(payload.role)
      ) {
        throw new Error("The roles service returned invalid data.");
      }
      const createdRole = payload.role;
      setRoles((current) => [...current, createdRole]);
      setSelectedRoleKey(createdRole.key);
      setNewRole({ name: "", description: "", features: ["dashboard"] });
      setShowCreateForm(false);
      setMessage("Custom role created. You can assign it from the Users page.");
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create role. Please try again.",
      );
    } finally {
      setIsCreatingRole(false);
    }
  };

  const toggleNewFeature = (feature: string) => {
    setNewRole((current) => ({
      ...current,
      features: current.features.includes(feature)
        ? current.features.filter((item) => item !== feature)
        : [...current.features, feature],
    }));
  };

  const selectedRole = roles.find((role) => role.key === selectedRoleKey);

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-[#dfe8f6] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1e4fc1]">
              Super Admin
            </p>
            <h2 className="mt-1 text-[18px] font-bold text-[#10213c]">
              Roles and access
            </h2>
            <p className="mt-1 text-[10px] text-slate-600">
              Select a role to review access, or create a custom platform role.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/users"
              className="inline-flex h-9 items-center justify-center rounded-md border border-[#dfe8f6] px-4 text-[10px] font-bold text-[#1e4fc1] hover:bg-[#f5f8ff]"
            >
              Add system user
            </Link>
            <button
              type="button"
              onClick={() => setShowCreateForm((open) => !open)}
              className="inline-flex h-9 items-center justify-center rounded-md border border-[#1e4fc1] px-4 text-[10px] font-bold text-[#1e4fc1] hover:bg-[#f5f8ff]"
            >
              {showCreateForm ? "Cancel" : "Create custom role"}
            </button>
            <button
              type="button"
              onClick={() => void saveRoles()}
              disabled={isLoading || isSaving || roles.length === 0}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#1e4fc1] px-4 text-[10px] font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <ActionSpinner label="Saving roles" /> Saving…
                </>
              ) : (
                "Save access"
              )}
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-800"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadRoles()}
            className="shrink-0 font-bold underline"
          >
            Retry
          </button>
        </div>
      ) : null}
      {message ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] text-emerald-800"
        >
          {message}
        </p>
      ) : null}

      {isLoading ? (
        <p className="rounded-xl border border-[#dfe8f6] bg-white p-4 text-[10px] text-slate-500">
          Loading roles…
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.8fr)]">
          <div className="h-fit overflow-hidden rounded-2xl border border-[#dfe8f6] bg-white shadow-sm">
            <h3 className="border-b border-[#edf2ff] px-4 py-3 text-[11px] font-bold text-[#10213c]">
              Platform roles
            </h3>
            <div className="divide-y divide-[#edf2ff]">
              {roles.map((role) => (
                <button
                  type="button"
                  key={role.key}
                  aria-expanded={selectedRoleKey === role.key}
                  onClick={() => {
                    setSelectedRoleKey(role.key);
                    setShowCreateForm(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition ${
                    selectedRoleKey === role.key
                      ? "bg-[#f3f7ff]"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[11px] font-bold text-[#10213c]">
                      {role.name}
                    </span>
                    <span className="mt-1 block text-[9px] text-slate-500">
                      {role.features.length} access areas
                    </span>
                  </span>
                  {role.isCustom ? (
                    <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[8px] font-bold text-[#1e4fc1]">
                      Custom
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#dfe8f6] bg-white p-4 shadow-sm sm:p-5">
            {showCreateForm ? (
              <form onSubmit={createRole} className="space-y-4">
                <div>
                  <h3 className="text-[13px] font-bold text-[#10213c]">
                    Create custom role
                  </h3>
                  <p className="mt-1 text-[10px] text-slate-600">
                    The role will be available when inviting or updating a
                    system user.
                  </p>
                </div>
                <label className="block text-[10px] font-semibold text-slate-700">
                  Role name
                  <input
                    required
                    minLength={2}
                    maxLength={80}
                    value={newRole.name}
                    onChange={(event) =>
                      setNewRole({ ...newRole, name: event.target.value })
                    }
                    className="mt-1 h-9 w-full rounded-md border border-[#dfe8f6] px-3 text-[11px] outline-none focus:border-[#1e4fc1]"
                    placeholder="e.g. Billing reviewer"
                  />
                </label>
                <label className="block text-[10px] font-semibold text-slate-700">
                  Description
                  <textarea
                    maxLength={255}
                    value={newRole.description}
                    onChange={(event) =>
                      setNewRole({
                        ...newRole,
                        description: event.target.value,
                      })
                    }
                    className="mt-1 min-h-20 w-full rounded-md border border-[#dfe8f6] p-3 text-[11px] outline-none focus:border-[#1e4fc1]"
                    placeholder="Describe this role's responsibilities"
                  />
                </label>
                <fieldset>
                  <legend className="mb-2 text-[10px] font-semibold text-slate-700">
                    Access areas (Dashboard is required)
                  </legend>
                  <div className="space-y-4">
                    {roleAccessSections.map((section) => (
                      <fieldset key={section.label}>
                        <legend className="mb-2 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                          {section.label}
                        </legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {section.features.map((feature) => (
                            <label
                              key={feature.key}
                              className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#edf2ff] bg-[#f9fbff] px-2.5 py-2 text-[10px] text-slate-700"
                            >
                              <input
                                type="checkbox"
                                checked={newRole.features.includes(feature.key)}
                                disabled={feature.key === "dashboard"}
                                onChange={() => toggleNewFeature(feature.key)}
                                className="h-3.5 w-3.5 accent-[#1e4fc1]"
                              />
                              {feature.label}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    ))}
                  </div>
                </fieldset>
                <button
                  type="submit"
                  disabled={
                    isCreatingRole ||
                    !newRole.name.trim() ||
                    newRole.features.length === 0
                  }
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#1e4fc1] px-4 text-[10px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreatingRole ? (
                    <>
                      <ActionSpinner label="Creating role" /> Creating…
                    </>
                  ) : (
                    "Create role"
                  )}
                </button>
              </form>
            ) : selectedRole ? (
              <article>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#1e4fc1]">
                      {selectedRole.isCustom ? "Custom role" : "Platform role"}
                    </p>
                    <h3 className="mt-1 text-[15px] font-bold text-[#10213c]">
                      {selectedRole.name}
                    </h3>
                    <p className="mt-1 text-[10px] text-slate-600">
                      {selectedRole.description || "No description provided."}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-semibold text-slate-600">
                    {selectedRole.key}
                  </span>
                </div>
                <div className="mt-5 space-y-4">
                  {roleAccessSections.map((section) => (
                    <fieldset key={section.label}>
                      <legend className="mb-2 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                        {section.label}
                      </legend>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {section.features.map((feature) => (
                          <label
                            key={feature.key}
                            className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#edf2ff] bg-[#f9fbff] px-2.5 py-2 text-[10px] text-slate-700"
                          >
                            <input
                              type="checkbox"
                              checked={selectedRole.features.includes(
                                feature.key,
                              )}
                              disabled={feature.key === "dashboard"}
                              onChange={() =>
                                toggleFeature(selectedRole.key, feature.key)
                              }
                              className="h-3.5 w-3.5 accent-[#1e4fc1]"
                            />
                            {feature.label}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>
              </article>
            ) : (
              <p className="text-[10px] text-slate-500">
                Choose a role to view its access settings.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
