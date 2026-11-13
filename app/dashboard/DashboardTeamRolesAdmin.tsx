"use client";

import { useEffect, useState, type FormEvent } from "react";
import ActionSpinner from "../components/ActionSpinner";
import { roleAccessSections } from "./role-access-features";

const apiUrl = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");
type TeamRole = {
  key: string;
  name: string;
  description: string;
  features: string[];
  isDefault: boolean;
};

function isRolesResponse(value: unknown): value is { roles: TeamRole[] } {
  return (
    !!value &&
    typeof value === "object" &&
    "roles" in value &&
    Array.isArray(value.roles) &&
    value.roles.every(
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
        "isDefault" in role &&
        typeof role.isDefault === "boolean",
    )
  );
}

export default function DashboardTeamRolesAdmin() {
  const [roles, setRoles] = useState<TeamRole[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [roleFeatures, setRoleFeatures] = useState<string[]>(["dashboard"]);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingKey, setDeletingKey] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const loadRoles = async () => {
      const token = window.sessionStorage.getItem("darobooksAccessToken");
      if (!token) {
        setError("Sign in to view team roles.");
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch(`${apiUrl}/dashboard/team-roles`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            payload &&
              typeof payload === "object" &&
              "message" in payload &&
              typeof payload.message === "string"
              ? payload.message
              : `Could not load team roles (HTTP ${response.status}).`,
          );
        }
        if (!isRolesResponse(payload)) {
          throw new Error("The team roles service returned invalid data.");
        }
        setRoles(payload.roles);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load team roles. Please try again.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    void loadRoles();
    return () => controller.abort();
  }, [loadAttempt]);

  const createRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || isCreating) return;
    setIsCreating(true);
    setError("");
    try {
      const response = await fetch(`${apiUrl}/dashboard/team-roles`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: roleName.trim(),
          description: roleDescription.trim(),
          features: roleFeatures,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          payload &&
            typeof payload === "object" &&
            "message" in payload &&
            typeof payload.message === "string"
            ? payload.message
            : `Could not create role (HTTP ${response.status}).`,
        );
      }
      setRoleName("");
      setRoleDescription("");
      setRoleFeatures(["dashboard"]);
      setLoadAttempt((current) => current + 1);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create team role.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const deleteRole = async (role: TeamRole) => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || deletingKey) return;
    setDeletingKey(role.key);
    setError("");
    try {
      const response = await fetch(
        `${apiUrl}/dashboard/team-roles/${encodeURIComponent(role.key)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          payload &&
            typeof payload === "object" &&
            "message" in payload &&
            typeof payload.message === "string"
            ? payload.message
            : `Could not delete role (HTTP ${response.status}).`,
        );
      }
      setLoadAttempt((current) => current + 1);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete team role.",
      );
    } finally {
      setDeletingKey("");
    }
  };

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-[#dfe8f6] bg-white p-4 shadow-sm sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1e4fc1]">
          Teams
        </p>
        <h1 className="mt-1 text-[18px] font-bold text-[#10213c]">
          Team roles
        </h1>
        <p className="mt-1 text-[10px] text-slate-600">
          Assign a role to control which workspace areas each team member can
          access.
        </p>
      </header>
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-800"
        >
          {error}
        </p>
      ) : null}
      <form
        onSubmit={createRole}
        className="space-y-3 rounded-xl border border-[#dfe8f6] bg-white p-4"
      >
        <div>
          <h2 className="text-[12px] font-bold text-[#10213c]">
            Create a team role
          </h2>
          <p className="mt-1 text-[9px] text-slate-500">
            Roles can be used to assign team access and requisition approval
            stages.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[9px] font-semibold text-slate-600">
            Role name
            <input
              required
              minLength={2}
              maxLength={80}
              value={roleName}
              onChange={(event) => setRoleName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-[#c7d3ec] px-3 py-2 text-[10px]"
            />
          </label>
          <label className="text-[9px] font-semibold text-slate-600">
            Description
            <input
              maxLength={255}
              value={roleDescription}
              onChange={(event) => setRoleDescription(event.target.value)}
              className="mt-1 w-full rounded-lg border border-[#c7d3ec] px-3 py-2 text-[10px]"
            />
          </label>
        </div>
        <fieldset>
          <legend className="mb-1.5 text-[9px] font-semibold text-slate-600">
            Workspace access (Dashboard is required)
          </legend>
          <div className="space-y-4">
            {roleAccessSections.map((section) => (
              <fieldset key={section.label}>
                <legend className="mb-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                  {section.label}
                </legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {section.features.map((feature) => (
                    <label
                      key={feature.key}
                      className="flex items-center gap-2 rounded-md bg-[#f7f9fd] px-2.5 py-2 text-[9px] text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={roleFeatures.includes(feature.key)}
                        disabled={feature.key === "dashboard"}
                        onChange={(event) =>
                          setRoleFeatures((current) =>
                            event.target.checked
                              ? [...current, feature.key]
                              : current.filter((key) => key !== feature.key),
                          )
                        }
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
          disabled={isCreating || roleFeatures.length === 0}
          className="rounded-md bg-[#1e4fc1] px-4 py-2 text-[10px] font-bold text-white disabled:opacity-50"
        >
          {isCreating ? (
            <span className="inline-flex items-center gap-2">
              <ActionSpinner label="Creating team role" /> Creating role…
            </span>
          ) : (
            "Create role"
          )}
        </button>
      </form>
      {isLoading ? (
        <p className="rounded-xl border border-[#dfe8f6] bg-white p-4 text-[10px] text-slate-500">
          Loading team roles…
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {roles.map((role) => (
            <article
              key={role.key}
              className="rounded-xl border border-[#dfe8f6] bg-white p-4"
            >
              <h2 className="text-[12px] font-bold text-[#10213c]">
                {role.name}
              </h2>
              <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-semibold text-slate-600">
                {role.isDefault ? "Default role" : "Custom role"}
              </span>
              <p className="mt-1 text-[10px] text-slate-600">
                {role.description}
              </p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {role.features.map((feature) => (
                  <li
                    key={feature}
                    className="rounded-full bg-[#edf3ff] px-2 py-1 text-[9px] font-medium text-[#1e4fc1]"
                  >
                    {feature}
                  </li>
                ))}
              </ul>
              {role.isDefault && (
                <p className="mt-2 text-[8px] text-slate-500">
                  Removing this role hides it for this company only.
                </p>
              )}
              <button
                type="button"
                disabled={deletingKey !== ""}
                onClick={() => void deleteRole(role)}
                className="mt-3 rounded-md border border-red-200 px-2.5 py-1.5 text-[9px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {deletingKey === role.key ? (
                  <span className="inline-flex items-center gap-1">
                    <ActionSpinner label={`Removing ${role.name}`} /> Removing…
                  </span>
                ) : (
                  "Remove role"
                )}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
