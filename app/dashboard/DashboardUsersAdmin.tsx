"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import ActionSpinner from "../components/ActionSpinner";

type AdminRole = {
  key: string;
  name: string;
  description: string;
  features: string[];
};
type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  roleKey: string;
  roleName: string;
  emailVerified: boolean;
  createdAt: string;
};

function getErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || !("message" in payload)) {
    return null;
  }
  return typeof payload.message === "string" ? payload.message : null;
}

function isAdminRoles(payload: unknown): payload is { roles: AdminRole[] } {
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
        role.features.every((feature: unknown) => typeof feature === "string"),
    )
  );
}

function isAdminUsers(payload: unknown): payload is { users: AdminUser[] } {
  return (
    !!payload &&
    typeof payload === "object" &&
    "users" in payload &&
    Array.isArray(payload.users) &&
    payload.users.every(
      (user) =>
        !!user &&
        typeof user === "object" &&
        "id" in user &&
        typeof user.id === "string" &&
        "fullName" in user &&
        typeof user.fullName === "string" &&
        "email" in user &&
        typeof user.email === "string" &&
        "roleKey" in user &&
        typeof user.roleKey === "string" &&
        "roleName" in user &&
        typeof user.roleName === "string" &&
        "emailVerified" in user &&
        typeof user.emailVerified === "boolean" &&
        "createdAt" in user &&
        typeof user.createdAt === "string",
    )
  );
}

export default function DashboardUsersAdmin() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    roleKey: "staff",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError("");
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) {
      setError("Sign in to manage users.");
      if (showLoading) setIsLoading(false);
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [usersResponse, rolesResponse] = await Promise.all([
        fetch("/api/admin/users", { headers, cache: "no-store" }),
        fetch("/api/admin/roles", { headers, cache: "no-store" }),
      ]);
      const [usersPayload, rolesPayload]: [unknown, unknown] =
        await Promise.all([usersResponse.json(), rolesResponse.json()]);
      if (!usersResponse.ok) {
        throw new Error(
          getErrorMessage(usersPayload) ??
            `Could not load users (HTTP ${usersResponse.status}).`,
        );
      }
      if (!rolesResponse.ok) {
        throw new Error(
          getErrorMessage(rolesPayload) ??
            `Could not load roles (HTTP ${rolesResponse.status}).`,
        );
      }
      if (!isAdminUsers(usersPayload) || !isAdminRoles(rolesPayload)) {
        throw new Error("The user management service returned invalid data.");
      }
      setUsers(usersPayload.users);
      setRoles(rolesPayload.roles);
      setForm((current) => ({
        ...current,
        roleKey: rolesPayload.roles.some((role) => role.key === current.roleKey)
          ? current.roleKey
          : (rolesPayload.roles[0]?.key ?? ""),
      }));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load user management. Please try again.",
      );
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const addUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isCreating) return;
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) {
      setError("Sign in to create a user.");
      return;
    }

    setIsCreating(true);
    setError("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          roleKey: form.roleKey,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload) ??
            `Could not create user (HTTP ${response.status}).`,
        );
      }
      setForm({ fullName: "", email: "", roleKey: roles[0]?.key ?? "" });
      await loadData(false);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create user. Please try again.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const changeUserRole = async (userId: string, roleKey: string) => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || updatingUserId) return;
    setUpdatingUserId(userId);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/users/${encodeURIComponent(userId)}/role`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ roleKey }),
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload) ??
            `Could not update user role (HTTP ${response.status}).`,
        );
      }
      await loadData(false);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update the role. Please try again.",
      );
    } finally {
      setUpdatingUserId("");
    }
  };

  const selectedRole = roles.find((role) => role.key === form.roleKey);

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-[#dfe8f6] bg-white p-4 shadow-sm sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1e4fc1]">
          System admins
        </p>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[18px] font-bold text-[#10213c]">
              Platform users and access
            </h2>
            <p className="mt-1 text-[10px] text-slate-600">
              Invite system admins and assign the dashboard areas their role can
              access.
            </p>
          </div>
          <span className="rounded-full bg-[#edf3ff] px-2.5 py-1 text-[10px] font-semibold text-[#1e4fc1]">
            {isLoading ? "Loading…" : `${users.length} admins`}
          </span>
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
            onClick={() => void loadData()}
            className="shrink-0 font-bold underline"
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-[#dfe8f6] bg-white p-4 shadow-sm sm:p-5">
          <h3 className="text-[13px] font-bold text-[#10213c]">
            Invite a system admin
          </h3>
          <form className="mt-4 space-y-3" onSubmit={addUser}>
            <div>
              <label
                htmlFor="user-full-name"
                className="text-[10px] font-semibold text-slate-600"
              >
                Full name
              </label>
              <input
                id="user-full-name"
                value={form.fullName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    fullName: event.target.value,
                  }))
                }
                minLength={2}
                maxLength={120}
                required
                className="mt-1 h-9 w-full rounded-md border border-[#d9e3f4] bg-slate-50 px-3 text-[10px] text-[#10213c] outline-none focus:border-[#1e4fc1] focus:ring-2 focus:ring-blue-100"
                placeholder="e.g. Samuel Ade"
              />
            </div>
            <div>
              <label
                htmlFor="user-email"
                className="text-[10px] font-semibold text-slate-600"
              >
                Email address
              </label>
              <input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                required
                className="mt-1 h-9 w-full rounded-md border border-[#d9e3f4] bg-slate-50 px-3 text-[10px] text-[#10213c] outline-none focus:border-[#1e4fc1] focus:ring-2 focus:ring-blue-100"
                placeholder="name@company.com"
              />
            </div>
            <div>
              <label
                htmlFor="user-role"
                className="text-[10px] font-semibold text-slate-600"
              >
                Role
              </label>
              <select
                id="user-role"
                value={form.roleKey}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    roleKey: event.target.value,
                  }))
                }
                required
                className="mt-1 h-9 w-full rounded-md border border-[#d9e3f4] bg-slate-50 px-3 text-[10px] text-[#10213c] outline-none focus:border-[#1e4fc1] focus:ring-2 focus:ring-blue-100"
              >
                {roles.map((role) => (
                  <option key={role.key} value={role.key}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedRole ? (
              <div className="rounded-xl border border-[#edf2ff] bg-[#f7faff] p-3">
                <p className="text-[10px] font-bold text-[#10213c]">
                  {selectedRole.name} access
                </p>
                <p className="mt-1 text-[9px] text-slate-600">
                  {selectedRole.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedRole.features.map((feature) => (
                    <span
                      key={feature}
                      className="rounded-full bg-white px-2 py-1 text-[8px] font-medium text-slate-700 ring-1 ring-[#dfe8f6]"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <button
              type="submit"
              disabled={isCreating || isLoading || roles.length === 0}
              className="inline-flex h-9 items-center justify-center rounded-md bg-[#1e4fc1] px-4 text-[10px] font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? (
                <span className="inline-flex items-center gap-2">
                  <ActionSpinner label="Sending invitation" /> Sending
                  invitation…
                </span>
              ) : (
                "Invite admin"
              )}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-[#dfe8f6] bg-white p-4 shadow-sm sm:p-5">
          <h3 className="text-[13px] font-bold text-[#10213c]">
            Current system admins
          </h3>
          {isLoading ? (
            <p className="mt-4 text-[10px] text-slate-500">Loading users…</p>
          ) : users.length === 0 ? (
            <p className="mt-4 text-[10px] text-slate-500">
              No system admins have been added yet.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col gap-3 rounded-xl border border-[#edf2ff] bg-[#f9fbff] p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold text-[#10213c]">
                      {user.fullName}
                    </p>
                    <p className="truncate text-[9px] text-slate-500">
                      {user.email}
                    </p>
                    <p className="mt-1 text-[8px] text-slate-500">
                      {user.emailVerified
                        ? "Email verified"
                        : "Invitation pending"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {updatingUserId === user.id ? (
                      <ActionSpinner
                        label={`Updating ${user.fullName}'s role`}
                      />
                    ) : null}
                    <select
                      aria-label={`Role for ${user.fullName}`}
                      value={user.roleKey}
                      disabled={updatingUserId === user.id}
                      onChange={(event) =>
                        void changeUserRole(user.id, event.target.value)
                      }
                      className="h-8 rounded-md border border-[#d9e3f4] bg-white px-2 text-[9px] font-semibold text-[#1e4fc1] outline-none focus:border-[#1e4fc1] disabled:opacity-60"
                    >
                      {roles.map((role) => (
                        <option key={role.key} value={role.key}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
