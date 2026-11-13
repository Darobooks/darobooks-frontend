"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RiAddLine,
  RiCloseLine,
  RiDeleteBinLine,
} from "@remixicon/react";
import ActionSpinner from "../components/ActionSpinner";

type ApprovalModule = "requisitions" | "payroll";
type FlowScope = "shared" | "team" | "member";
type ApprovalTeam = { id: string; name: string };
type ApprovalMember = {
  id: string;
  name: string;
  roleName: string;
  teamId: string | null;
};
type ApprovalFlow = {
  scopeType: FlowScope;
  scopeId: string | null;
  stageUserIds: string[];
  inUse: boolean;
};
type ApprovalFlowConfig = {
  teams: ApprovalTeam[];
  members: ApprovalMember[];
  flows: ApprovalFlow[];
};

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");
const emptyConfig: ApprovalFlowConfig = { teams: [], members: [], flows: [] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function getErrorMessage(value: unknown, fallback: string) {
  return isRecord(value) && typeof value.message === "string"
    ? value.message
    : fallback;
}

function isFlowConfig(value: unknown): value is ApprovalFlowConfig {
  return (
    isRecord(value) &&
    Array.isArray(value.teams) &&
    value.teams.every(
      (team) =>
        isRecord(team) &&
        typeof team.id === "string" &&
        typeof team.name === "string",
    ) &&
    Array.isArray(value.members) &&
    value.members.every(
      (member) =>
        isRecord(member) &&
        typeof member.id === "string" &&
        typeof member.name === "string" &&
        typeof member.roleName === "string" &&
        (member.teamId === null || typeof member.teamId === "string"),
    ) &&
    Array.isArray(value.flows) &&
    value.flows.every(
      (flow) =>
        isRecord(flow) &&
        (flow.scopeType === "shared" ||
          flow.scopeType === "team" ||
          flow.scopeType === "member") &&
        (flow.scopeId === null || typeof flow.scopeId === "string") &&
        Array.isArray(flow.stageUserIds) &&
        flow.stageUserIds.every((id) => typeof id === "string") &&
        typeof flow.inUse === "boolean",
    )
  );
}

export default function DashboardApprovalFlows({
  canManageRequisitions,
  canManagePayroll,
  onNotice,
}: {
  canManageRequisitions: boolean;
  canManagePayroll: boolean;
  onNotice: (message: string) => void;
}) {
  const [module, setModule] = useState<ApprovalModule>(
    canManageRequisitions ? "requisitions" : "payroll",
  );
  const [config, setConfig] = useState<ApprovalFlowConfig>(emptyConfig);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const selectedModuleAllowed =
    module === "requisitions" ? canManageRequisitions : canManagePayroll;

  const loadFlows = useCallback(async () => {
    setIsLoading(true);
    setError("");
    if (!selectedModuleAllowed) {
      setConfig(emptyConfig);
      setIsLoading(false);
      return;
    }
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) {
      setError("Sign in again to manage approval flows.");
      setIsLoading(false);
      return;
    }
    try {
      const response = await fetch(
        `${API_BASE_URL}/dashboard/approval-flows?module=${module}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, `Could not load ${module} approval flows.`),
        );
      }
      if (!isFlowConfig(payload)) {
        throw new Error("The approval flows service returned invalid data.");
      }
      setConfig(payload);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load approval flows.",
      );
      setConfig(emptyConfig);
    } finally {
      setIsLoading(false);
    }
  }, [module, selectedModuleAllowed]);

  useEffect(() => {
    void loadFlows();
  }, [loadFlows]);

  const addFlow = (scopeType: FlowScope) => {
    if (
      (scopeType === "shared" &&
        config.flows.some((flow) => flow.scopeType === "shared")) ||
      (scopeType === "team" && !config.teams.length) ||
      !config.members.length
    ) {
      return;
    }
    setConfig((current) => ({
      ...current,
      flows: [
        ...current.flows,
        { scopeType, scopeId: null, stageUserIds: [""], inUse: false },
      ],
    }));
  };

  const updateFlow = (
    flowIndex: number,
    update: (flow: ApprovalFlow) => ApprovalFlow,
  ) => {
    setConfig((current) => ({
      ...current,
      flows: current.flows.map((flow, index) =>
        index === flowIndex ? update(flow) : flow,
      ),
    }));
  };

  const saveFlows = async (flows = config.flows) => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || isSaving || !selectedModuleAllowed) return;
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/dashboard/approval-flows?module=${module}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            flows: flows.map(({ scopeType, scopeId, stageUserIds }) => ({
              scopeType,
              scopeId,
              stageUserIds,
            })),
          }),
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, `Could not save ${module} approval flows.`),
        );
      }
      if (!isRecord(payload) || typeof payload.message !== "string") {
        throw new Error("The approval flows service returned invalid data.");
      }
      onNotice(payload.message);
      await loadFlows();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save approval flows.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section aria-labelledby="approval-flows-heading" className="space-y-3">
      <header>
        <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#087b74]">
          Teams
        </p>
        <h1
          id="approval-flows-heading"
          className="font-jakarta text-[19px] font-bold text-[#10213c] sm:text-[21px]"
        >
          Approval flows
        </h1>
        <p className="mt-1 text-[10px] text-slate-600">
          Set approver order by workspace, team, or individual for each workflow.
        </p>
      </header>

      <div className="flex w-fit max-w-full gap-1 rounded-lg border border-[#dfe7f4] bg-white p-1">
        {([
          ["requisitions", "Requisitions", canManageRequisitions],
          ["payroll", "Payroll", canManagePayroll],
        ] as const).map(([key, label, enabled]) => (
          <button
            key={key}
            type="button"
            aria-pressed={module === key}
            disabled={!enabled}
            onClick={() => setModule(key)}
            className={`rounded-md px-3 py-1.5 text-[9px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
              module === key
                ? "bg-[#1e4fc1] text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {!selectedModuleAllowed ? (
        <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-900">
          Your role does not allow configuration for this workflow.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-800">
          {error}
        </p>
      ) : null}

      <section className="rounded-xl border border-[#dfe7f4] bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[11px] font-bold text-[#10213c]">
              {module === "payroll" ? "Payroll approval" : "Requisition approval"}
            </h2>
            <p className="mt-0.5 text-[9px] text-slate-500">
              Approvers act in order. Member-specific flows take precedence over team and shared flows.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FlowAddButton disabled={!selectedModuleAllowed || isLoading || !config.members.length || config.flows.some((flow) => flow.scopeType === "shared")} onClick={() => addFlow("shared")}>
              Shared flow
            </FlowAddButton>
            <FlowAddButton disabled={!selectedModuleAllowed || isLoading || !config.teams.length || !config.members.length} onClick={() => addFlow("team")}>
              Team flow
            </FlowAddButton>
            <FlowAddButton disabled={!selectedModuleAllowed || isLoading || !config.members.length} onClick={() => addFlow("member")}>
              Member flow
            </FlowAddButton>
            <button
              type="button"
              disabled={isSaving || isLoading || !selectedModuleAllowed}
              onClick={() => void saveFlows()}
              className="inline-flex items-center gap-1 rounded-md bg-[#1e4fc1] px-2.5 py-1.5 text-[9px] font-bold text-white disabled:opacity-50"
            >
              {isSaving ? <ActionSpinner label="Saving approval flows" /> : null}
              {isSaving ? "Saving…" : "Save flows"}
            </button>
          </div>
        </div>

        {isLoading ? (
          <p className="mt-3 text-[9px] text-slate-500">Loading approval flows…</p>
        ) : config.members.length === 0 ? (
          <p className="mt-3 text-[9px] text-slate-500">
            Add team members before configuring approval flows.
          </p>
        ) : config.flows.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-[#dbe4f3] px-3 py-5 text-center text-[9px] text-slate-500">
            No {module} flows configured yet. Add a shared, team, or member flow.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {config.flows.map((flow, flowIndex) => {
              const isTeam = flow.scopeType === "team";
              const target =
                flow.scopeType === "shared"
                  ? "Everyone"
                  : isTeam
                    ? config.teams.find((team) => team.id === flow.scopeId)?.name ?? "Choose a team"
                    : config.members.find((member) => member.id === flow.scopeId)?.name ?? "Choose a member";
              const options = isTeam ? config.teams : config.members;
              return (
                <article key={`${flow.scopeType}-${flow.scopeId ?? "new"}`} className="rounded-lg border border-[#e5ebf5] bg-[#fbfcfe] p-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[9px] font-bold text-[#10213c]">{target}</span>
                      {flow.scopeType !== "shared" ? (
                        <select
                          aria-label={`${target} flow scope`}
                          value={flow.scopeId ?? ""}
                          onChange={(event) => updateFlow(flowIndex, (current) => ({ ...current, scopeId: event.target.value || null }))}
                          className="rounded-md border border-[#dbe4f3] bg-white px-2 py-1 text-[9px]"
                        >
                          <option value="">Choose {isTeam ? "team" : "member"}</option>
                          {options.map((option) => (
                            <option key={option.id} value={option.id}>{option.name}</option>
                          ))}
                        </select>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      {flow.inUse ? <span className="text-[8px] font-medium text-amber-700">In use</span> : null}
                      <button
                        type="button"
                        aria-label={`Remove ${target} flow`}
                        disabled={flow.inUse}
                        onClick={() => setConfig((current) => ({ ...current, flows: current.flows.filter((_, index) => index !== flowIndex) }))}
                        className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                      >
                        <RiDeleteBinLine className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <ol className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {flow.stageUserIds.map((userId, stageIndex) => (
                      <li key={`${stageIndex}-${userId}`} className="flex items-center gap-1.5 rounded-lg bg-white p-2">
                        <span className="shrink-0 text-[9px] font-bold text-slate-500">{stageIndex + 1}.</span>
                        <select
                          aria-label={`${target} stage ${stageIndex + 1} approver`}
                          value={userId}
                          onChange={(event) => updateFlow(flowIndex, (current) => ({
                            ...current,
                            stageUserIds: current.stageUserIds.map((id, index) => index === stageIndex ? event.target.value : id),
                          }))}
                          className="min-w-0 flex-1 rounded-md border border-[#dbe4f3] bg-white px-2 py-1.5 text-[9px]"
                        >
                          <option value="">Choose approver</option>
                          {config.members.filter((member) => member.id === userId || !flow.stageUserIds.includes(member.id)).map((member) => (
                            <option key={member.id} value={member.id}>{member.name} ({member.roleName})</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          aria-label={`Remove stage ${stageIndex + 1}`}
                          disabled={flow.stageUserIds.length <= 1}
                          onClick={() => updateFlow(flowIndex, (current) => ({
                            ...current,
                            stageUserIds: current.stageUserIds.filter((_, index) => index !== stageIndex),
                          }))}
                          className="shrink-0 rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                        >
                          <RiCloseLine className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ol>
                  <button
                    type="button"
                    disabled={flow.stageUserIds.length >= 8 || flow.stageUserIds.length >= config.members.length}
                    onClick={() => updateFlow(flowIndex, (current) => ({ ...current, stageUserIds: [...current.stageUserIds, ""] }))}
                    className="mt-2 inline-flex items-center gap-1 rounded-md border border-[#dbe4f3] px-2 py-1 text-[9px] font-semibold text-[#1e4fc1] disabled:opacity-50"
                  >
                    <RiAddLine className="h-3 w-3" /> Add stage
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}

function FlowAddButton({
  children,
  disabled,
  onClick,
}: {
  children: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-md border border-[#c7d3ec] px-2.5 py-1.5 text-[9px] font-semibold text-[#1e4fc1] disabled:opacity-50"
    >
      {children}
    </button>
  );
}