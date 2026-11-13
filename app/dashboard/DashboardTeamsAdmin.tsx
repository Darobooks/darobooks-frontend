"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import ActionSpinner from "../components/ActionSpinner";

type TeamRole = {
  key: string;
  name: string;
  description: string;
  features: string[];
};
type TeamMember = {
  id: string;
  companyId: string;
  companyName: string;
  fullName: string;
  email: string;
  roleKey: string;
  roleName: string;
  teamId: string | null;
  teamName: string | null;
  emailVerified: boolean;
  createdAt: string;
};
type NamedTeam = { id: string; name: string; memberCount: number };
type TeamResponse = { users: TeamMember[]; usersLimit: number | null };
type NamedTeamsResponse = { teams: NamedTeam[] };
type Company = { id: string; name: string };
const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

function getErrorMessage(payload: unknown): string | null {
  return payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string"
    ? payload.message
    : null;
}

function isTeamResponse(value: unknown): value is TeamResponse {
  return (
    !!value &&
    typeof value === "object" &&
    "users" in value &&
    Array.isArray(value.users) &&
    value.users.every(
      (user) =>
        !!user &&
        typeof user === "object" &&
        "id" in user &&
        typeof user.id === "string" &&
        "companyId" in user &&
        typeof user.companyId === "string" &&
        "companyName" in user &&
        typeof user.companyName === "string" &&
        "fullName" in user &&
        typeof user.fullName === "string" &&
        "email" in user &&
        typeof user.email === "string" &&
        "roleKey" in user &&
        typeof user.roleKey === "string" &&
        "roleName" in user &&
        typeof user.roleName === "string" &&
        "teamId" in user &&
        (typeof user.teamId === "string" || user.teamId === null) &&
        "teamName" in user &&
        (typeof user.teamName === "string" || user.teamName === null) &&
        "emailVerified" in user &&
        typeof user.emailVerified === "boolean" &&
        "createdAt" in user &&
        typeof user.createdAt === "string",
    ) &&
    "usersLimit" in value &&
    (value.usersLimit === null ||
      (typeof value.usersLimit === "number" &&
        Number.isInteger(value.usersLimit) &&
        value.usersLimit > 0))
  );
}

function isNamedTeamsResponse(value: unknown): value is NamedTeamsResponse {
  return (
    !!value &&
    typeof value === "object" &&
    "teams" in value &&
    Array.isArray(value.teams) &&
    value.teams.every(
      (team) =>
        !!team &&
        typeof team === "object" &&
        "id" in team &&
        typeof team.id === "string" &&
        "name" in team &&
        typeof team.name === "string" &&
        "memberCount" in team &&
        typeof team.memberCount === "number" &&
        Number.isInteger(team.memberCount),
    )
  );
}

function isCompaniesResponse(value: unknown): value is { companies: Company[]; currentCompanyId: string } {
  return !!value && typeof value === "object" && "companies" in value && Array.isArray(value.companies) && value.companies.every((company) => !!company && typeof company === "object" && "id" in company && typeof company.id === "string" && "name" in company && typeof company.name === "string") && "currentCompanyId" in value && typeof value.currentCompanyId === "string";
}

function isTeamRoles(value: unknown): value is { roles: TeamRole[] } {
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
        role.features.every((feature: unknown) => typeof feature === "string"),
    )
  );
}

export default function DashboardTeamsAdmin() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<TeamRole[]>([]);
  const [teams, setTeams] = useState<NamedTeam[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyIds, setCompanyIds] = useState<string[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [usersLimit, setUsersLimit] = useState<number | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [roleKey, setRoleKey] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editCompanyIds, setEditCompanyIds] = useState<string[]>([]);
  const [editRoleKey, setEditRoleKey] = useState("");
  const [isSavingMember, setIsSavingMember] = useState(false);

  const loadTeam = useCallback(async (showLoading = true) => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) {
      setError("Sign in to manage your team.");
      setIsLoading(false);
      return;
    }
    if (showLoading) setIsLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [teamResponse, rolesResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/dashboard/teams`, {
          headers,
          cache: "no-store",
        }),
        fetch(`${API_BASE_URL}/dashboard/team-roles`, {
          headers,
          cache: "no-store",
        }),
      ]);
      const groupsResponse = await fetch(
        `${API_BASE_URL}/dashboard/teams/groups`,
        {
          headers,
          cache: "no-store",
        },
      );
      const companiesResponse = await fetch(`${API_BASE_URL}/dashboard/companies`, { headers, cache: "no-store" });
      const [teamPayload, rolesPayload, groupsPayload, companiesPayload]: [
        unknown,
        unknown,
        unknown,
        unknown,
      ] = await Promise.all([
        teamResponse.json(),
        rolesResponse.json(),
        groupsResponse.json(),
        companiesResponse.json(),
      ]);
      if (!teamResponse.ok) {
        throw new Error(
          getErrorMessage(teamPayload) ??
            `Could not load team members (HTTP ${teamResponse.status}).`,
        );
      }
      if (!rolesResponse.ok) {
        throw new Error(
          getErrorMessage(rolesPayload) ??
            `Could not load team roles (HTTP ${rolesResponse.status}).`,
        );
      }
      if (!groupsResponse.ok) {
        throw new Error(
          getErrorMessage(groupsPayload) ??
            `Could not load named teams (HTTP ${groupsResponse.status}).`,
        );
      }
      if (!companiesResponse.ok) {
        throw new Error(getErrorMessage(companiesPayload) ?? `Could not load companies (HTTP ${companiesResponse.status}).`);
      }
      if (
        !isTeamResponse(teamPayload) ||
        !isTeamRoles(rolesPayload) ||
        !isNamedTeamsResponse(groupsPayload) ||
        !isCompaniesResponse(companiesPayload)
      ) {
        throw new Error("The team service returned invalid data.");
      }
      setMembers(teamPayload.users);
      setUsersLimit(teamPayload.usersLimit);
      setRoles(rolesPayload.roles);
      setTeams(groupsPayload.teams);
      setCompanies(companiesPayload.companies);
      setCompanyIds((current) => {
        const accessibleIds = new Set(
          companiesPayload.companies.map((company) => company.id),
        );
        const accessibleSelection = current.filter((id) => accessibleIds.has(id));
        return accessibleSelection.length > 0
          ? accessibleSelection
          : [companiesPayload.currentCompanyId];
      });
      setRoleKey((current) =>
        rolesPayload.roles.some((role) => role.key === current)
          ? current
          : (rolesPayload.roles[0]?.key ?? ""),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load your team. Please try again.",
      );
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadTeam(), 0);
    return () => window.clearTimeout(timer);
  }, [loadTeam]);

  const inviteMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || isInviting) return;
    setIsInviting(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/teams`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          roleKey,
          companyIds,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload) ??
            `Could not invite team member (HTTP ${response.status}).`,
        );
      }
      setFullName("");
      setEmail("");
      await loadTeam(false);
      window.dispatchEvent(
        new CustomEvent("darobooks:toast", {
          detail: {
            tone: "success",
            message: "Team invitation sent successfully.",
          },
        }),
      );
    } catch (inviteError) {
      setError(
        inviteError instanceof Error
          ? inviteError.message
          : "Could not invite the team member. Please try again.",
      );
    } finally {
      setIsInviting(false);
    }
  };

  const updateRole = async (id: string, nextRole: string, memberCompanyId: string) => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || updatingId) return;
    setUpdatingId(id);
    setError("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/dashboard/teams/${encodeURIComponent(id)}/role`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ roleKey: nextRole, companyId: memberCompanyId }),
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload) ??
            `Could not update team role (HTTP ${response.status}).`,
        );
      }
      await loadTeam(false);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update the team role. Please try again.",
      );
    } finally {
      setUpdatingId("");
    }
  };

  const createTeam = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    const name = newTeamName.trim();
    if (!token || isCreatingTeam || name.length < 2 || name.length > 80) {
      return;
    }
    setIsCreatingTeam(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/teams/groups`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload) ??
            `Could not create team (HTTP ${response.status}).`,
        );
      }
      setNewTeamName("");
      await loadTeam(false);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create the team. Please try again.",
      );
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const deleteTeam = async (team: NamedTeam) => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || updatingId) return;
    setUpdatingId(`team-${team.id}`);
    setError("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/dashboard/teams/groups/${encodeURIComponent(team.id)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload) ??
            `Could not delete team (HTTP ${response.status}).`,
        );
      }
      await loadTeam(false);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete the team. Please try again.",
      );
    } finally {
      setUpdatingId("");
    }
  };

  const assignTeam = async (memberId: string, teamId: string, memberCompanyId: string) => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || updatingId) return;
    setUpdatingId(memberId);
    setError("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/dashboard/teams/${encodeURIComponent(memberId)}/team`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ teamId: teamId || null, companyId: memberCompanyId }),
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload) ??
            `Could not update team assignment (HTTP ${response.status}).`,
        );
      }
      await loadTeam(false);
    } catch (assignError) {
      setError(
        assignError instanceof Error
          ? assignError.message
          : "Could not update team assignment. Please try again.",
      );
    } finally {
      setUpdatingId("");
    }
  };

  const openMemberEditor = (member: TeamMember) => {
    setEditingMember(member);
    setEditFullName(member.fullName);
    setEditCompanyIds(
      members
        .filter((entry) => entry.id === member.id)
        .map((entry) => entry.companyId),
    );
    setEditRoleKey(member.roleKey);
  };

  const saveMemberDetails = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || !editingMember || isSavingMember || editCompanyIds.length === 0) {
      return;
    }
    setIsSavingMember(true);
    setError("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/dashboard/teams/${encodeURIComponent(editingMember.id)}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName: editFullName.trim(),
            companyIds: editCompanyIds,
            roleKey: editRoleKey,
          }),
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload) ??
            `Could not update team member (HTTP ${response.status}).`,
        );
      }
      setEditingMember(null);
      await loadTeam(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not update the team member. Please try again.",
      );
    } finally {
      setIsSavingMember(false);
    }
  };

  const memberCount = new Set(members.map((member) => member.id)).size;
  const atLimit = usersLimit !== null && memberCount + 1 >= usersLimit;

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-[#dfe8f6] bg-white p-4 shadow-sm sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1e4fc1]">
          Teams
        </p>
        <h1 className="mt-1 text-[18px] font-bold text-[#10213c]">
          Manage your team
        </h1>
        <p className="mt-1 text-[10px] text-slate-600">
          Invite people to your workspace and choose what they can access.
        </p>
        <p className="mt-2 text-[10px] font-semibold text-slate-700">
          {memberCount + 1} of {usersLimit ?? "unlimited"} users used
          (including you)
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

      <details open className="rounded-xl border border-[#dfe8f6] bg-white">
        <summary className="cursor-pointer px-4 py-3 text-[11px] font-bold text-[#10213c]">
          Manage named teams
        </summary>
        <div className="grid gap-4 border-t border-[#edf1f7] p-4 md:grid-cols-2">
          <form onSubmit={createTeam} className="space-y-3">
            <div>
              <h2 className="text-[11px] font-bold text-[#10213c]">
                Named teams
              </h2>
              <p className="mb-2 mt-0.5 text-[9px] text-slate-500">
                Group members by department or approval responsibility.
              </p>
              <label className="text-[9px] font-semibold text-slate-600">
                Team name
                <input
                  required
                  minLength={2}
                  maxLength={80}
                  value={newTeamName}
                  onChange={(event) => setNewTeamName(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#c7d3ec] px-3 py-2 text-[10px]"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={isLoading || isCreatingTeam}
              className="rounded-md border border-[#1e4fc1] px-4 py-2 text-[10px] font-bold text-[#1e4fc1] disabled:opacity-50"
            >
              {isCreatingTeam ? (
                <span className="inline-flex items-center gap-2">
                  <ActionSpinner label="Creating team" /> Creating team…
                </span>
              ) : (
                "Create team"
              )}
            </button>
          </form>

          <div>
            <h2 className="mb-2 text-[11px] font-bold text-[#10213c]">
              Your teams
            </h2>
            {teams.length === 0 ? (
              <p className="text-[10px] text-slate-500">
                No named teams yet.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-[#f7f9fd] px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[10px] font-semibold text-[#10213c]">
                        {team.name}
                      </span>
                      <span className="text-[8px] text-slate-500">
                        {team.memberCount}{" "}
                        {team.memberCount === 1 ? "member" : "members"}
                      </span>
                    </span>
                    <button
                      type="button"
                      disabled={updatingId !== ""}
                      onClick={() => void deleteTeam(team)}
                      className="shrink-0 rounded px-2 py-1 text-[8px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      {updatingId === `team-${team.id}` ? (
                        <span className="inline-flex items-center gap-1">
                          <ActionSpinner label={`Deleting ${team.name}`} />{" "}
                          Deleting…
                        </span>
                      ) : (
                        "Delete"
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </details>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(18rem,0.75fr)_minmax(0,1.5fr)]">
      <form
        onSubmit={inviteMember}
        className="grid gap-3 rounded-xl border border-[#dfe8f6] bg-white p-4 sm:grid-cols-2 lg:grid-cols-1"
      >
        <label className="text-[10px] font-semibold text-slate-700">
          Full name
          <input
            required
            minLength={2}
            maxLength={120}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="mt-1 w-full rounded-lg border border-[#c7d3ec] px-3 py-2"
          />
        </label>
        <label className="text-[10px] font-semibold text-slate-700">
          Email
          <input
            required
            type="email"
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-lg border border-[#c7d3ec] px-3 py-2"
          />
        </label>
        <label className="text-[10px] font-semibold text-slate-700">
          Team role
          <select
            required
            value={roleKey}
            onChange={(event) => setRoleKey(event.target.value)}
            className="mt-1 w-full rounded-lg border border-[#c7d3ec] bg-white px-3 py-2"
          >
            {roles.map((role) => (
              <option key={role.key} value={role.key}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="text-[10px] font-semibold text-slate-700">
          <legend>Company access</legend>
          <div className="mt-1 grid gap-1 rounded-lg border border-[#c7d3ec] p-2">
            {companies.map((company) => (
              <label key={company.id} className="flex items-center gap-2 font-normal">
                <input
                  type="checkbox"
                  checked={companyIds.includes(company.id)}
                  onChange={(event) =>
                    setCompanyIds((current) =>
                      event.target.checked
                        ? [...current, company.id]
                        : current.filter((id) => id !== company.id),
                    )
                  }
                  className="accent-[#1e4fc1]"
                />
                {company.name}
              </label>
            ))}
          </div>
        </fieldset>
        <button
          type="submit"
          disabled={isLoading || isInviting || companyIds.length === 0 || roles.length === 0}
          className="self-end rounded-md bg-[#1e4fc1] px-4 py-2 text-[10px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isInviting ? (
            <span className="inline-flex items-center gap-2">
              <ActionSpinner label="Sending invitation" /> Sending invitation…
            </span>
          ) : (
            "Invite team member"
          )}
        </button>
        {atLimit ? (
          <p className="text-[10px] text-amber-800 sm:col-span-2">
            Your plan has reached its user limit. Existing members can still be
            assigned to another company; inviting a new person requires an
            upgrade.
          </p>
        ) : null}
      </form>

      <div className="overflow-x-auto rounded-xl border border-[#dfe8f6] bg-white">
        {isLoading ? (
          <p className="p-4 text-[10px] text-slate-500">Loading team…</p>
        ) : members.length === 0 ? (
          <p className="p-4 text-[10px] text-slate-500">
            You have not invited anyone yet.
          </p>
        ) : (
          <table className="w-full min-w-[680px] border-collapse text-left">
            <thead className="bg-[#f8faff] text-[9px] font-semibold text-slate-600">
              <tr>
                <th scope="col" className="px-3 py-2.5">
                  Team member
                </th>
                <th scope="col" className="px-3 py-2.5">
                  Company
                </th>
                <th scope="col" className="px-3 py-2.5">
                  Role
                </th>
                <th scope="col" className="px-3 py-2.5">
                  Team
                </th>
                <th scope="col" className="px-3 py-2.5">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((member, index) => (
                <tr
                  key={`${member.companyId}-${member.id}`}
                  className="border-t border-[#edf1f7] text-[10px]"
                >
                  <th scope="row" className="px-3 py-3 font-semibold">
                    {member.fullName}
                    <span className="mt-0.5 block font-normal text-slate-500">
                      {member.email}
                    </span>
                    {members.findIndex((entry) => entry.id === member.id) ===
                    index ? (
                      <button
                        type="button"
                        disabled={updatingId !== "" || isSavingMember}
                        onClick={() => openMemberEditor(member)}
                        className="mt-1 text-[9px] font-semibold text-[#1e4fc1] underline-offset-2 hover:underline disabled:opacity-50"
                      >
                        Edit member
                      </button>
                    ) : null}
                  </th>
                  <td className="px-3 py-3">{member.companyName}</td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-2">
                      {updatingId === member.id ? (
                        <ActionSpinner label={`Updating ${member.fullName}`} />
                      ) : null}
                      <select
                        aria-label={`Role for ${member.fullName}`}
                        value={member.roleKey}
                        disabled={updatingId !== ""}
                        onChange={(event) =>
                          void updateRole(member.id, event.target.value, member.companyId)
                        }
                        className="rounded-md border border-[#dbe4f3] bg-white px-2 py-1"
                      >
                        {roles.map((role) => (
                          <option key={role.key} value={role.key}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-2">
                      {updatingId === member.id ? (
                        <ActionSpinner label={`Updating ${member.fullName}`} />
                      ) : null}
                      <select
                        aria-label={`Team for ${member.fullName}`}
                        value={member.teamId ?? ""}
                        disabled={updatingId !== ""}
                        onChange={(event) =>
                          void assignTeam(member.id, event.target.value, member.companyId)
                        }
                        className="rounded-md border border-[#dbe4f3] bg-white px-2 py-1"
                      >
                        <option value="">Unassigned</option>
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {member.emailVerified ? "Active" : "Invitation pending"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      </div>

      {editingMember ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#08172e]/45 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSavingMember) {
              setEditingMember(null);
            }
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-member-title"
            onSubmit={saveMemberDetails}
            className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-xl"
          >
            <div>
              <h2 id="edit-member-title" className="text-[15px] font-bold text-[#10213c]">
                Edit team member
              </h2>
              <p className="mt-1 text-[10px] text-slate-500">
                {editingMember.email}
              </p>
            </div>
            <label className="block text-[10px] font-semibold text-slate-700">
              Full name
              <input
                required
                minLength={2}
                maxLength={120}
                value={editFullName}
                onChange={(event) => setEditFullName(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[#c7d3ec] px-3 py-2"
              />
            </label>
            <label className="block text-[10px] font-semibold text-slate-700">
              Role for new company assignments
              <select
                required
                value={editRoleKey}
                onChange={(event) => setEditRoleKey(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[#c7d3ec] bg-white px-3 py-2"
              >
                {roles.map((role) => (
                  <option key={role.key} value={role.key}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="text-[10px] font-semibold text-slate-700">
              <legend>Company access</legend>
              <div className="mt-1 grid gap-2 rounded-lg border border-[#c7d3ec] p-3 sm:grid-cols-2">
                {companies.map((company) => (
                  <label key={company.id} className="flex items-center gap-2 font-normal">
                    <input
                      type="checkbox"
                      checked={editCompanyIds.includes(company.id)}
                      onChange={(event) =>
                        setEditCompanyIds((current) =>
                          event.target.checked
                            ? [...current, company.id]
                            : current.filter((id) => id !== company.id),
                        )
                      }
                      className="accent-[#1e4fc1]"
                    />
                    {company.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex justify-end gap-2 border-t border-[#edf1f7] pt-3">
              <button
                type="button"
                disabled={isSavingMember}
                onClick={() => setEditingMember(null)}
                className="rounded-md border border-[#c7d3ec] px-3 py-2 text-[10px] font-semibold text-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isSavingMember ||
                  editFullName.trim().length < 2 ||
                  editCompanyIds.length === 0
                }
                className="rounded-md bg-[#1e4fc1] px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50"
              >
                {isSavingMember ? (
                  <span className="inline-flex items-center gap-2">
                    <ActionSpinner label="Saving team member" /> Saving…
                  </span>
                ) : (
                  "Save changes"
                )}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
