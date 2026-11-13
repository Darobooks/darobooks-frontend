"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  RiArrowDownSLine,
  RiAddLine,
  RiCheckLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiSendPlaneLine,
} from "@remixicon/react";
import { useConfirmDialog } from "@/app/components/ConfirmDialog";
import ActionSpinner from "../components/ActionSpinner";

type RequestStatus = "Pending" | "Approved" | "Rejected";
type ApprovalStatus = "pending" | "approved" | "rejected" | "skipped";
type Approval = {
  step: number;
  label: string;
  approver: string | null;
  status: ApprovalStatus;
  actor: string | null;
  note: string;
  decidedAt: string | null;
};
type Comment = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
};
type Request = {
  id: string;
  number: string;
  title: string;
  category: string;
  requester: string;
  requesterId: string;
  amount: number;
  currency: string;
  status: RequestStatus;
  currentStep: number;
  description: string;
  createdAt: string;
  canReview: boolean;
  canDelete: boolean;
  approvals: Approval[];
  comments: Comment[];
};
type RequestFilter = "All" | RequestStatus;
type FlowScope = "shared" | "team" | "member";
type ApprovalMember = {
  id: string;
  name: string;
  roleName: string;
  teamId: string | null;
};
type ApprovalTeam = { id: string; name: string };
type ApprovalFlow = {
  scopeType: FlowScope;
  scopeId: string | null;
  stageUserIds: string[];
};
type SavedApprovalFlow = ApprovalFlow & { inUse: boolean };
type ApprovalFlowConfig = {
  teams: ApprovalTeam[];
  members: ApprovalMember[];
  flows: ApprovalFlow[];
};

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");
const APPROVAL_FLOWS_OPEN_KEY = "darobooksRequisitionApprovalFlowsOpen";
const APPROVAL_FLOWS_OPEN_EVENT = "darobooks:approval-flows-open-change";

function getApprovalFlowsOpenSnapshot(): boolean {
  try {
    return window.localStorage.getItem(APPROVAL_FLOWS_OPEN_KEY) !== "false";
  } catch {
    return true;
  }
}

function subscribeToApprovalFlowsOpen(onChange: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === APPROVAL_FLOWS_OPEN_KEY) onChange();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(APPROVAL_FLOWS_OPEN_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(APPROVAL_FLOWS_OPEN_EVENT, onChange);
  };
}

const statusStyles: Record<RequestStatus, string> = {
  Pending: "bg-[#fff1dc] text-[#b65c08]",
  Approved: "bg-[#ddf5ef] text-[#087e75]",
  Rejected: "bg-[#ffe8e8] text-[#c33c3c]",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function displayStatus(
  status: "pending" | "approved" | "rejected",
): RequestStatus {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending";
}

function displayNumber(id: string): string {
  return `REQ-${id.padStart(3, "0")}`;
}

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      currencyDisplay: "code",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function toRequest(value: unknown): Request {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    typeof value.category !== "string" ||
    typeof value.requester !== "string" ||
    typeof value.requesterId !== "string" ||
    typeof value.amount !== "number" ||
    typeof value.currency !== "string" ||
    (value.status !== "pending" &&
      value.status !== "approved" &&
      value.status !== "rejected") ||
    typeof value.description !== "string" ||
    typeof value.currentStep !== "number" ||
    typeof value.createdAt !== "string" ||
    typeof value.canReview !== "boolean" ||
    typeof value.canDelete !== "boolean" ||
    !Array.isArray(value.approvals) ||
    !Array.isArray(value.comments)
  ) {
    throw new Error("The requisitions service returned invalid request data.");
  }
  const approvals = value.approvals.map((entry): Approval => {
    if (
      !isRecord(entry) ||
      typeof entry.step !== "number" ||
      typeof entry.label !== "string" ||
      !(entry.approver === null || typeof entry.approver === "string") ||
      (entry.status !== "pending" &&
        entry.status !== "approved" &&
        entry.status !== "rejected" &&
        entry.status !== "skipped") ||
      !(entry.actor === null || typeof entry.actor === "string") ||
      typeof entry.note !== "string" ||
      !(entry.decidedAt === null || typeof entry.decidedAt === "string")
    ) {
      throw new Error(
        "The requisitions service returned invalid approval data.",
      );
    }
    return {
      step: entry.step,
      label: entry.label,
      approver: entry.approver,
      status: entry.status,
      actor: entry.actor,
      note: entry.note,
      decidedAt: entry.decidedAt,
    };
  });
  const comments = value.comments.map((entry): Comment => {
    if (
      !isRecord(entry) ||
      typeof entry.id !== "string" ||
      typeof entry.author !== "string" ||
      typeof entry.body !== "string" ||
      typeof entry.createdAt !== "string"
    ) {
      throw new Error(
        "The requisitions service returned invalid comment data.",
      );
    }
    return {
      id: entry.id,
      author: entry.author,
      body: entry.body,
      createdAt: entry.createdAt,
    };
  });
  return {
    id: value.id,
    number: displayNumber(value.id),
    title: value.title,
    category: value.category,
    requester: value.requester,
    requesterId: value.requesterId,
    amount: value.amount,
    currency: value.currency,
    status: displayStatus(value.status),
    currentStep: value.currentStep,
    description: value.description,
    createdAt: value.createdAt,
    canReview: value.canReview,
    canDelete: value.canDelete,
    approvals,
    comments,
  };
}

export default function DashboardRequisitions({
  search,
  onNotice,
  currency,
  canConfigureApprovalFlows,
  showApprovalFlowManager = false,
}: {
  search: string;
  onNotice: (message: string) => void;
  currency: string;
  canConfigureApprovalFlows: boolean;
  showApprovalFlowManager?: boolean;
}) {
  const { confirm, dialog } = useConfirmDialog();
  const [requests, setRequests] = useState<Request[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState<RequestFilter>("All");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [approvalFlowConfig, setApprovalFlowConfig] =
    useState<ApprovalFlowConfig>({
      teams: [],
      members: [],
      flows: [],
    });
  const [savedApprovalFlows, setSavedApprovalFlows] = useState<
    SavedApprovalFlow[]
  >([]);
  const [approvalFlowsError, setApprovalFlowsError] = useState("");
  const [isLoadingApprovalFlows, setIsLoadingApprovalFlows] = useState(false);
  const [isSavingApprovalFlows, setIsSavingApprovalFlows] = useState(false);
  const [deletingFlowKey, setDeletingFlowKey] = useState("");
  const isApprovalFlowsOpen = useSyncExternalStore(
    subscribeToApprovalFlowsOpen,
    getApprovalFlowsOpenSnapshot,
    () => true,
  );
  const [newRequest, setNewRequest] = useState({
    title: "",
    category: "",
    amount: "",
    description: "",
  });

  const loadRequests = useCallback(async (selectedRequestId?: string) => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) {
      setError("Sign in again to view requisitions.");
      setIsLoading(false);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/requisitions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message =
          isRecord(payload) && typeof payload.message === "string"
            ? payload.message
            : "Could not load requisitions.";
        throw new Error(message);
      }
      if (!isRecord(payload) || !Array.isArray(payload.requisitions)) {
        throw new Error("The requisitions service returned invalid data.");
      }
      const nextRequests = payload.requisitions.map(toRequest);
      setRequests(nextRequests);
      setSelectedId((current) =>
        nextRequests.some(
          (request) => request.id === (selectedRequestId ?? current),
        )
          ? (selectedRequestId ?? current)
          : (nextRequests[0]?.id ?? ""),
      );
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load requisitions.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadRequests();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadRequests]);

  const loadApprovalFlows = useCallback(async () => {
    if (!canConfigureApprovalFlows) return;
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) return;
    setIsLoadingApprovalFlows(true);
    setApprovalFlowsError("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/dashboard/requisitions/approval-flows`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          isRecord(payload) && typeof payload.message === "string"
            ? payload.message
            : `Could not load approval flows (HTTP ${response.status}).`,
        );
      }
      if (
        !isRecord(payload) ||
        !Array.isArray(payload.teams) ||
        !Array.isArray(payload.members) ||
        !Array.isArray(payload.flows)
      ) {
        throw new Error("The approval flows service returned invalid data.");
      }
      const teams = payload.teams.map((team) => {
        if (
          !isRecord(team) ||
          typeof team.id !== "string" ||
          typeof team.name !== "string"
        ) {
          throw new Error("The approval flows service returned invalid teams.");
        }
        return { id: team.id, name: team.name };
      });
      const members = payload.members.map((member) => {
        if (
          !isRecord(member) ||
          typeof member.id !== "string" ||
          typeof member.name !== "string" ||
          typeof member.roleName !== "string" ||
          !(member.teamId === null || typeof member.teamId === "string")
        ) {
          throw new Error(
            "The approval flows service returned invalid members.",
          );
        }
        return {
          id: member.id,
          name: member.name,
          roleName: member.roleName,
          teamId: member.teamId,
        };
      });
      const flows = payload.flows.map((flow) => {
        if (!isRecord(flow)) {
          throw new Error("The approval flows service returned invalid flows.");
        }
        const scopeType = flow.scopeType;
        const scopeId = flow.scopeId;
        if (
          (scopeType !== "shared" &&
            scopeType !== "team" &&
            scopeType !== "member") ||
          !(scopeId === null || typeof scopeId === "string") ||
          !Array.isArray(flow.stageUserIds)
        ) {
          throw new Error("The approval flows service returned invalid flows.");
        }
        const validatedScopeType: FlowScope =
          scopeType === "shared"
            ? "shared"
            : scopeType === "team"
              ? "team"
              : "member";
        const stageUserIds = flow.stageUserIds.map((id) => {
          if (typeof id !== "string") {
            throw new Error(
              "The approval flows service returned invalid flows.",
            );
          }
          return id;
        });
        if (typeof flow.inUse !== "boolean") {
          throw new Error("The approval flows service returned invalid flows.");
        }
        return {
          scopeType: validatedScopeType,
          scopeId,
          stageUserIds,
          inUse: flow.inUse,
        };
      });
      setApprovalFlowConfig({
        teams,
        members,
        flows,
      });
      setSavedApprovalFlows(flows);
    } catch (loadError) {
      setApprovalFlowsError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load approval flows.",
      );
    } finally {
      setIsLoadingApprovalFlows(false);
    }
  }, [canConfigureApprovalFlows]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadApprovalFlows();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadApprovalFlows]);

  const saveApprovalFlows = async () => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || isSavingApprovalFlows) return;
    setIsSavingApprovalFlows(true);
    setApprovalFlowsError("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/dashboard/requisitions/approval-flows`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ flows: approvalFlowConfig.flows }),
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          isRecord(payload) && typeof payload.message === "string"
            ? payload.message
            : `Could not save approval flows (HTTP ${response.status}).`,
        );
      }
      if (!isRecord(payload) || typeof payload.message !== "string") {
        throw new Error("The approval flows service returned invalid data.");
      }
      setSavedApprovalFlows(
        approvalFlowConfig.flows.map((flow) => ({
          ...flow,
          inUse:
            savedApprovalFlows.find(
              (saved) =>
                saved.scopeType === flow.scopeType &&
                saved.scopeId === flow.scopeId,
            )?.inUse ?? false,
        })),
      );
      onNotice(payload.message);
    } catch (saveError) {
      setApprovalFlowsError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save approval flows.",
      );
    } finally {
      setIsSavingApprovalFlows(false);
    }
  };

  const deleteSavedApprovalFlow = async (flowToDelete: ApprovalFlow) => {
    if (isSavingApprovalFlows) return;
    if ("inUse" in flowToDelete && flowToDelete.inUse) {
      setApprovalFlowsError(
        "This approval flow is used by a pending requisition and cannot be deleted yet.",
      );
      return;
    }
    const target =
      flowToDelete.scopeType === "shared"
        ? "Everyone"
        : flowToDelete.scopeType === "team"
          ? (approvalFlowConfig.teams.find(
              (team) => team.id === flowToDelete.scopeId,
            )?.name ?? "this team")
          : (approvalFlowConfig.members.find(
              (member) => member.id === flowToDelete.scopeId,
            )?.name ?? "this requester");
    const confirmed = await confirm({
      title: "Delete approval flow?",
      message: `Delete the approval flow for ${target}?`,
      confirmLabel: "Delete flow",
      destructive: true,
    });
    if (!confirmed) return;

    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) {
      setApprovalFlowsError("Sign in again to delete an approval flow.");
      return;
    }

    const isSameFlow = (flow: ApprovalFlow) =>
      flow.scopeType === flowToDelete.scopeType &&
      flow.scopeId === flowToDelete.scopeId;
    const flowKey = `${flowToDelete.scopeType}:${flowToDelete.scopeId ?? "shared"}`;
    const remainingFlows = savedApprovalFlows.filter(
      (flow) => !isSameFlow(flow),
    );
    setIsSavingApprovalFlows(true);
    setDeletingFlowKey(flowKey);
    setApprovalFlowsError("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/dashboard/requisitions/approval-flows`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ flows: remainingFlows }),
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          isRecord(payload) && typeof payload.message === "string"
            ? payload.message
            : `Could not delete approval flow (HTTP ${response.status}).`,
        );
      }
      if (!isRecord(payload) || typeof payload.message !== "string") {
        throw new Error("The approval flows service returned invalid data.");
      }
      setSavedApprovalFlows(remainingFlows);
      setApprovalFlowConfig((current) => ({
        ...current,
        flows: current.flows.filter((flow) => !isSameFlow(flow)),
      }));
      onNotice("Approval flow deleted. Team members were not changed.");
    } catch (deleteError) {
      setApprovalFlowsError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete approval flow.",
      );
    } finally {
      setIsSavingApprovalFlows(false);
      setDeletingFlowKey("");
    }
  };

  const updateApprovalFlow = (
    index: number,
    update: (flow: ApprovalFlow) => ApprovalFlow,
  ) => {
    setApprovalFlowConfig((current) => ({
      ...current,
      flows: current.flows.map((flow, flowIndex) =>
        flowIndex === index ? update(flow) : flow,
      ),
    }));
  };

  const addApprovalFlow = (scopeType: FlowScope) => {
    if (
      scopeType === "shared" &&
      approvalFlowConfig.flows.some((flow) => flow.scopeType === "shared")
    ) {
      return;
    }
    setApprovalFlowConfig((current) => ({
      ...current,
      flows: [
        ...current.flows,
        { scopeType, scopeId: null, stageUserIds: [""] },
      ],
    }));
  };

  const updateApprovalStage = (
    flowIndex: number,
    stageIndex: number,
    memberId: string,
  ) => {
    updateApprovalFlow(flowIndex, (flow) => ({
      ...flow,
      stageUserIds: flow.stageUserIds.map((id, index) =>
        index === stageIndex ? memberId : id,
      ),
    }));
  };

  const visibleRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesFilter = filter === "All" || request.status === filter;
      const matchesSearch =
        !query ||
        `${request.id} ${request.title} ${request.category} ${request.requester} ${request.status}`
          .toLowerCase()
          .includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [filter, requests, search]);

  const selectedRequest =
    visibleRequests.find((request) => request.id === selectedId) ??
    visibleRequests[0] ??
    null;
  const filterOptions: RequestFilter[] = [
    "All",
    "Pending",
    "Approved",
    "Rejected",
  ];

  const createRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (isSaving) return;
    if (!token) {
      const message = "Sign in again to submit a requisition.";
      setError(message);
      onNotice(message);
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/requisitions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newRequest.title,
          category: newRequest.category,
          amount: Number(newRequest.amount),
          description: newRequest.description,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          isRecord(payload) && typeof payload.message === "string"
            ? payload.message
            : "Could not create requisition.",
        );
      }
      if (!isRecord(payload) || !isRecord(payload.requisition)) {
        throw new Error("The requisitions service returned invalid data.");
      }
      const created = toRequest(payload.requisition);
      setFilter("All");
      setNewRequest({ title: "", category: "", amount: "", description: "" });
      setIsCreateOpen(false);
      await loadRequests(created.id);
      onNotice(`${created.number} submitted for approval.`);
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Could not create requisition.";
      setError(message);
      onNotice(message);
    } finally {
      setIsSaving(false);
    }
  };

  const addComment = async () => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!selectedRequest || !note.trim() || isSaving) return;
    if (!token) {
      const message = "Sign in again to comment on a requisition.";
      setError(message);
      onNotice(message);
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/dashboard/requisitions/${selectedRequest.id}/comments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ body: note }),
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          isRecord(payload) && typeof payload.message === "string"
            ? payload.message
            : "Could not add comment.",
        );
      }
      setNote("");
      await loadRequests(selectedRequest.id);
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Could not add comment.";
      setError(message);
      onNotice(message);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteRequest = async () => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!selectedRequest || !selectedRequest.canDelete || isSaving) return;
    if (!token) {
      const message = "Sign in again to delete this requisition.";
      setError(message);
      onNotice(message);
      return;
    }
    const confirmed = await confirm({
      title: `Delete ${selectedRequest.number}?`,
      message: "This requisition and its comments cannot be restored.",
      confirmLabel: "Delete requisition",
      destructive: true,
    });
    if (!confirmed) return;
    setIsSaving(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/dashboard/requisitions/${selectedRequest.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          isRecord(payload) && typeof payload.message === "string"
            ? payload.message
            : "Could not delete requisition.",
        );
      }
      setSelectedId("");
      await loadRequests();
      onNotice(
        isRecord(payload) && typeof payload.message === "string"
          ? payload.message
          : "Requisition deleted.",
      );
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete requisition.";
      setError(message);
      onNotice(message);
    } finally {
      setIsSaving(false);
    }
  };

  const reviewRequest = async (status: "approved" | "rejected") => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!selectedRequest || isSaving) return;
    if (!token) {
      const message = "Sign in again to review this requisition.";
      setError(message);
      onNotice(message);
      return;
    }
    if (status === "rejected" && !note.trim()) {
      onNotice("Add a note before rejecting this requisition.");
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/dashboard/requisitions/${selectedRequest.id}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status, note }),
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          isRecord(payload) && typeof payload.message === "string"
            ? payload.message
            : "Could not review requisition.",
        );
      }
      const message =
        isRecord(payload) && typeof payload.message === "string"
          ? payload.message
          : "Requisition updated.";
      setNote("");
      await loadRequests(selectedRequest.id);
      onNotice(message);
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Could not review requisition.";
      setError(message);
      onNotice(message);
    } finally {
      setIsSaving(false);
    }
  };

  const counts = {
    All: requests.length,
    Pending: requests.filter(({ status }) => status === "Pending").length,
    Approved: requests.filter(({ status }) => status === "Approved").length,
    Rejected: requests.filter(({ status }) => status === "Rejected").length,
  };

  return (
    <div className="mx-auto max-w-[1120px]">
      {dialog}
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-bold tracking-[-0.35px] text-[#10213c] sm:text-[21px]">
            Requisitions
          </h1>
          <p className="mt-0.5 text-[10px] text-slate-600 sm:text-[11px]">
            Submit a request and follow it through your configured approval
            stages.
          </p>
        </div>
        <button
          type="button"
          disabled={
            canConfigureApprovalFlows &&
            (isLoadingApprovalFlows || approvalFlowConfig.flows.length === 0)
          }
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#1e4fc1] px-3 text-[10px] font-bold text-white transition hover:bg-[#183f9b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e4fc1] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RiAddLine className="h-4 w-4" />
          New requisition
        </button>
      </div>

      {showApprovalFlowManager && canConfigureApprovalFlows && (
        <section className="mb-3 rounded-xl border border-[#dfe8f6] bg-white p-3">
          <button
            type="button"
            aria-expanded={isApprovalFlowsOpen}
            aria-controls="requisition-approval-flows-content"
            onClick={() => {
              try {
                window.localStorage.setItem(
                  APPROVAL_FLOWS_OPEN_KEY,
                  String(!isApprovalFlowsOpen),
                );
                window.dispatchEvent(new Event(APPROVAL_FLOWS_OPEN_EVENT));
              } catch {
                setApprovalFlowsError(
                  "Could not cache the approval flows section state.",
                );
              }
            }}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span className="text-[11px] font-bold text-[#10213c]">
              Approval flows
            </span>
            <RiArrowDownSLine
              aria-hidden="true"
              className={`h-4 w-4 text-slate-500 transition-transform ${
                isApprovalFlowsOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          <div
            id="requisition-approval-flows-content"
            className="mt-3"
            hidden={!isApprovalFlowsOpen}
          >
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-[11px] font-bold text-[#10213c]">
                      Approval flows
                    </h2>
                    <p className="mt-0.5 text-[9px] text-slate-500">
                      Choose whether each flow is shared, team-specific, or for
                      one requester. Assign members to each stage; only the
                      company owner can approve their own request when assigned.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={
                        isLoadingApprovalFlows ||
                        approvalFlowConfig.flows.some(
                          (flow) => flow.scopeType === "shared",
                        ) ||
                        approvalFlowConfig.members.length === 0
                      }
                      onClick={() => addApprovalFlow("shared")}
                      className="inline-flex items-center gap-1 rounded-md border border-[#c7d3ec] px-2.5 py-1.5 text-[9px] font-semibold text-[#1e4fc1] disabled:opacity-50"
                    >
                      <RiAddLine className="h-3 w-3" />
                      Shared flow
                    </button>
                    <button
                      type="button"
                      disabled={
                        isLoadingApprovalFlows ||
                        approvalFlowConfig.teams.length === 0 ||
                        approvalFlowConfig.members.length === 0
                      }
                      onClick={() => addApprovalFlow("team")}
                      className="inline-flex items-center gap-1 rounded-md border border-[#c7d3ec] px-2.5 py-1.5 text-[9px] font-semibold text-[#1e4fc1] disabled:opacity-50"
                    >
                      <RiAddLine className="h-3 w-3" />
                      Team flow
                    </button>
                    <button
                      type="button"
                      disabled={
                        isLoadingApprovalFlows ||
                        approvalFlowConfig.members.length === 0
                      }
                      onClick={() => addApprovalFlow("member")}
                      className="inline-flex items-center gap-1 rounded-md border border-[#c7d3ec] px-2.5 py-1.5 text-[9px] font-semibold text-[#1e4fc1] disabled:opacity-50"
                    >
                      <RiAddLine className="h-3 w-3" />
                      Member flow
                    </button>
                    <button
                      type="button"
                      disabled={isSavingApprovalFlows || isLoadingApprovalFlows}
                      onClick={() => void saveApprovalFlows()}
                      className="rounded-md bg-[#1e4fc1] px-2.5 py-1.5 text-[9px] font-bold text-white disabled:opacity-50"
                    >
                      {isSavingApprovalFlows ? (
                        <span className="inline-flex items-center gap-1">
                          <ActionSpinner label="Saving approval flows" />{" "}
                          Saving…
                        </span>
                      ) : (
                        "Save flows"
                      )}
                    </button>
                  </div>
                </div>
                {approvalFlowsError && (
                  <p role="alert" className="mt-2 text-[9px] text-red-700">
                    {approvalFlowsError}
                  </p>
                )}
                {isLoadingApprovalFlows ? (
                  <p className="mt-2 text-[9px] text-slate-500">
                    Loading approval flows…
                  </p>
                ) : approvalFlowConfig.members.length === 0 ? (
                  <p className="mt-2 text-[9px] text-slate-500">
                    Add team members before configuring approval flows.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {approvalFlowConfig.flows.map((flow, flowIndex) => {
                      const scopeOptions =
                        flow.scopeType === "team"
                          ? approvalFlowConfig.teams
                          : approvalFlowConfig.members;
                      const scopedMember =
                        flow.scopeType === "member"
                          ? approvalFlowConfig.members.find(
                              (member) => member.id === flow.scopeId,
                            )
                          : null;
                      const flowTitle =
                        flow.scopeType === "shared"
                          ? "Everyone"
                          : flow.scopeType === "team"
                            ? (approvalFlowConfig.teams.find(
                                (team) => team.id === flow.scopeId,
                              )?.name ?? "Choose a team")
                            : scopedMember
                              ? `${scopedMember.name} (${scopedMember.roleName})`
                              : "Choose a requester";
                      return (
                        <article
                          key={`${flowIndex}-${flow.scopeType}-${flow.scopeId ?? "new"}`}
                          className="rounded-lg border border-[#e5ebf5] bg-[#fbfcfe] p-2.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold text-[#10213c]">
                                {flowTitle}
                              </span>
                              {flow.scopeType !== "shared" && (
                                <select
                                  aria-label={`Flow ${flowIndex + 1} requester scope`}
                                  value={flow.scopeId ?? ""}
                                  onChange={(event) =>
                                    updateApprovalFlow(
                                      flowIndex,
                                      (current) => ({
                                        ...current,
                                        scopeId: event.target.value || null,
                                      }),
                                    )
                                  }
                                  className="rounded-md border border-[#dbe4f3] bg-white px-2 py-1 text-[9px]"
                                >
                                  <option value="">
                                    Choose{" "}
                                    {flow.scopeType === "team"
                                      ? "team"
                                      : "requester"}
                                  </option>
                                  {scopeOptions.map((option) => (
                                    <option key={option.id} value={option.id}>
                                      {option.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                            <button
                              type="button"
                              aria-label={`Remove ${flowTitle} flow`}
                              onClick={() =>
                                setApprovalFlowConfig((current) => ({
                                  ...current,
                                  flows: current.flows.filter(
                                    (_, index) => index !== flowIndex,
                                  ),
                                }))
                              }
                              className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-700"
                            >
                              <RiCloseLine className="h-3 w-3" />
                            </button>
                          </div>
                          <ol className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {flow.stageUserIds.map((userId, stageIndex) => (
                              <li
                                key={`${stageIndex}-${userId}`}
                                className="flex items-center gap-2 rounded-lg bg-white p-2"
                              >
                                <span className="shrink-0 text-[9px] font-bold text-slate-500">
                                  {stageIndex + 1}.
                                </span>
                                <select
                                  aria-label={`${flowTitle} stage ${stageIndex + 1} approver`}
                                  value={userId}
                                  onChange={(event) =>
                                    updateApprovalStage(
                                      flowIndex,
                                      stageIndex,
                                      event.target.value,
                                    )
                                  }
                                  className="min-w-0 flex-1 rounded-md border border-[#dbe4f3] bg-white px-2 py-1.5 text-[9px]"
                                >
                                  <option value="">Choose approver</option>
                                  {approvalFlowConfig.members
                                    .filter(
                                      (member) =>
                                        member.id === userId ||
                                        !flow.stageUserIds.includes(member.id),
                                    )
                                    .map((member) => (
                                      <option key={member.id} value={member.id}>
                                        {member.name} ({member.roleName})
                                      </option>
                                    ))}
                                </select>
                                <button
                                  type="button"
                                  aria-label={`Remove stage ${stageIndex + 1}`}
                                  disabled={flow.stageUserIds.length <= 1}
                                  onClick={() =>
                                    updateApprovalFlow(
                                      flowIndex,
                                      (current) => ({
                                        ...current,
                                        stageUserIds:
                                          current.stageUserIds.filter(
                                            (_, index) => index !== stageIndex,
                                          ),
                                      }),
                                    )
                                  }
                                  className="shrink-0 rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                                >
                                  <RiCloseLine className="h-3 w-3" />
                                </button>
                              </li>
                            ))}
                          </ol>
                          <button
                            type="button"
                            disabled={
                              flow.stageUserIds.length >= 8 ||
                              flow.stageUserIds.length >=
                                approvalFlowConfig.members.length
                            }
                            onClick={() =>
                              updateApprovalFlow(flowIndex, (current) => ({
                                ...current,
                                stageUserIds: [...current.stageUserIds, ""],
                              }))
                            }
                            className="mt-2 inline-flex items-center gap-1 rounded-md border border-[#dbe4f3] px-2 py-1 text-[9px] font-semibold text-[#1e4fc1] disabled:opacity-50"
                          >
                            <RiAddLine className="h-3 w-3" />
                            Add stage
                          </button>
                        </article>
                      );
                    })}
                    {approvalFlowConfig.flows.length === 0 && (
                      <p className="rounded-md border border-dashed border-[#dbe4f3] p-3 text-center text-[9px] text-slate-500">
                        No flows configured. Add a shared, team, or requester
                        flow.
                      </p>
                    )}
                  </div>
                )}
              </div>
              <aside className="min-w-0 rounded-lg border border-[#e5ebf5] bg-[#f7f9fd] p-2.5">
                <h3 className="text-[9px] font-bold text-[#10213c]">
                  Saved approval flows
                </h3>
                {savedApprovalFlows.length === 0 ? (
                  <p className="mt-2 text-[9px] text-slate-500">
                    Saved flows will appear here.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {savedApprovalFlows.map((flow, index) => {
                      const target =
                        flow.scopeType === "shared"
                          ? "Everyone"
                          : flow.scopeType === "team"
                            ? (approvalFlowConfig.teams.find(
                                (team) => team.id === flow.scopeId,
                              )?.name ?? "Team")
                            : (approvalFlowConfig.members.find(
                                (member) => member.id === flow.scopeId,
                              )?.name ?? "Requester");
                      return (
                        <li
                          key={`saved-${index}-${flow.scopeType}-${flow.scopeId ?? "shared"}`}
                          className="flex items-start justify-between gap-2 rounded-md border border-[#e5ebf5] bg-white px-2.5 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-[9px] font-semibold text-[#10213c]">
                              {target}
                            </p>
                            <ol className="mt-1 space-y-0.5">
                              {flow.stageUserIds.map((memberId, stageIndex) => {
                                const member = approvalFlowConfig.members.find(
                                  (option) => option.id === memberId,
                                );
                                return (
                                  <li
                                    key={`${memberId}-${stageIndex}`}
                                    className="text-[8px] text-slate-600"
                                  >
                                    {stageIndex + 1}.{" "}
                                    {member?.name ?? "Removed member"}
                                    {member ? ` (${member.roleName})` : ""}
                                  </li>
                                );
                              })}
                            </ol>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {flow.inUse && (
                              <span className="text-[8px] font-medium text-amber-700">
                                In use
                              </span>
                            )}
                            <button
                              type="button"
                              disabled={isSavingApprovalFlows || flow.inUse}
                              onClick={() => void deleteSavedApprovalFlow(flow)}
                              aria-label={`Delete saved flow for ${target}`}
                              title={
                                flow.inUse
                                  ? "This flow is used by a pending requisition"
                                  : "Delete flow"
                              }
                              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {deletingFlowKey ===
                              `${flow.scopeType}:${flow.scopeId ?? "shared"}` ? (
                                <ActionSpinner
                                  label={`Deleting flow for ${target}`}
                                />
                              ) : (
                                <RiDeleteBinLine className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </aside>
            </div>
          </div>
        </section>
      )}

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <section aria-label="Requisition list" className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {filterOptions.map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => setFilter(option)}
                aria-pressed={filter === option}
                className={`h-6 rounded-full px-3 text-[9px] font-bold transition ${
                  filter === option
                    ? "bg-[#1e4fc1] text-white"
                    : "border border-[#dce5f4] bg-white text-[#243858] hover:bg-[#f7f9fd]"
                }`}
              >
                {option} ({counts[option]})
              </button>
            ))}
          </div>

          {error && (
            <p
              role="alert"
              className="mb-2 flex items-center justify-between gap-2 rounded-md bg-red-50 px-2.5 py-2 text-[9px] text-red-700"
            >
              {error}
              <button
                type="button"
                onClick={() => {
                  setIsLoading(true);
                  void loadRequests();
                }}
                className="shrink-0 font-bold underline"
              >
                Try again
              </button>
            </p>
          )}
          {isLoading ? (
            <p className="rounded-xl border border-[#dfe7f4] bg-white p-5 text-center text-[10px] text-slate-500">
              Loading requisitions…
            </p>
          ) : (
            <div className="space-y-1.5">
              {visibleRequests.map((request) => (
                <button
                  type="button"
                  key={request.id}
                  onClick={() => setSelectedId(request.id)}
                  aria-current={
                    selectedRequest?.id === request.id ? "true" : undefined
                  }
                  className={`w-full rounded-xl border bg-white p-2.5 text-left transition hover:border-[#9bb5ef] hover:shadow-sm ${
                    selectedRequest?.id === request.id
                      ? "border-[#1e4fc1] ring-1 ring-[#1e4fc1]"
                      : "border-[#dfe7f4]"
                  }`}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate text-[10px] font-bold text-[#10213c]">
                        {request.title}
                      </span>
                      <span className="mt-1 block text-[9px] text-slate-500">
                        {request.number} · {request.requester}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[8px] font-bold ${statusStyles[request.status]}`}
                      >
                        {request.status}
                      </span>
                      <span className="text-[9px] font-bold text-[#10213c]">
                        {formatAmount(request.amount, request.currency)}
                      </span>
                    </span>
                  </span>
                  <span className="mt-1 block truncate text-[9px] text-slate-500">
                    {request.description}
                  </span>
                </button>
              ))}
              {!visibleRequests.length && (
                <p className="rounded-xl border border-dashed border-[#d7e0ef] bg-white p-5 text-center text-[10px] text-slate-500">
                  {requests.length
                    ? "No requisitions match this filter."
                    : "No requisitions yet. Create a request to start an approval workflow."}
                </p>
              )}
            </div>
          )}
        </section>

        <div className="min-w-0 space-y-3">
          {selectedRequest ? (
            <section
              aria-label={`Details for ${selectedRequest.id}`}
              className="rounded-xl border border-[#dfe7f4] bg-white p-3 sm:p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#087e75]">
                    {selectedRequest.number} · {selectedRequest.category}
                  </p>
                  <h2 className="mt-0.5 text-[12px] font-bold leading-snug text-[#10213c] sm:text-[14px]">
                    {selectedRequest.title}
                  </h2>
                  <p className="mt-0.5 text-[9px] text-slate-500">
                    Raised by {selectedRequest.requester}
                    {selectedRequest.description
                      ? `. ${selectedRequest.description}`
                      : ""}
                  </p>
                </div>
                <p className="shrink-0 text-[13px] font-bold text-[#10213c] sm:text-[15px]">
                  {formatAmount(
                    selectedRequest.amount,
                    selectedRequest.currency,
                  )}
                </p>
              </div>

              {selectedRequest.canDelete && (
                <button
                  type="button"
                  onClick={() => void deleteRequest()}
                  disabled={isSaving}
                  className="mt-2 inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-[9px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  <RiDeleteBinLine className="h-3 w-3" />
                  {isSaving ? (
                    <>
                      <ActionSpinner label="Deleting requisition" /> Deleting…
                    </>
                  ) : (
                    "Delete unreviewed request"
                  )}
                </button>
              )}
              <ol className="mt-3 space-y-2.5">
                <ApprovalStep
                  name={selectedRequest.requester}
                  role="Requester"
                  detail="Submitted"
                  state="complete"
                />
                {selectedRequest.approvals.length === 0 && (
                  <li className="rounded-md border border-dashed border-[#dbe4f3] p-2 text-[9px] text-slate-500">
                    No approval stages were configured when this request was
                    submitted.
                  </li>
                )}
                {selectedRequest.approvals.map((approval, index) => (
                  <ApprovalStep
                    key={approval.step}
                    name={approval.actor ?? approval.approver ?? "Approver"}
                    role={approval.label}
                    detail={
                      approval.status === "approved"
                        ? approval.note || "Approved"
                        : approval.status === "rejected"
                          ? approval.note || "Rejected"
                          : approval.status === "skipped"
                            ? "Not reached"
                            : approval.step === selectedRequest.currentStep &&
                                selectedRequest.status === "Pending"
                              ? "Waiting for review"
                              : "Waiting for previous approval"
                    }
                    state={
                      approval.status === "approved"
                        ? "complete"
                        : approval.status === "rejected"
                          ? "rejected"
                          : approval.status === "pending" &&
                              approval.step === selectedRequest.currentStep &&
                              selectedRequest.status === "Pending"
                            ? "current"
                            : "upcoming"
                    }
                    last={index === selectedRequest.approvals.length - 1}
                  />
                ))}
              </ol>

              <div className="mt-3 border-t border-[#edf1f7] pt-2">
                <p className="text-[9px] text-slate-500">
                  {selectedRequest.status === "Pending"
                    ? selectedRequest.approvals.length === 0
                      ? "No approval stages are configured for this request."
                      : selectedRequest.canReview
                        ? `Waiting for ${selectedRequest.approvals[selectedRequest.currentStep - 1]?.label ?? "review"}. Add a note, then decide.`
                        : `Waiting for ${selectedRequest.approvals[selectedRequest.currentStep - 1]?.label ?? "review"}.`
                    : `This request is ${selectedRequest.status.toLowerCase()}.`}
                </p>
                {selectedRequest.comments.map((comment) => (
                  <p
                    key={comment.id}
                    className="mt-1 text-[9px] text-slate-600"
                  >
                    <strong>{comment.author}:</strong> {comment.body}
                  </p>
                ))}
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void addComment();
                  }}
                  className="mt-1.5 flex gap-1"
                >
                  <input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    aria-label="Add a note"
                    placeholder="Add a comment or a rejection note"
                    className="h-7 min-w-0 flex-1 rounded-md border border-[#cfd8e6] px-2 text-[9px] text-[#10213c] outline-none placeholder:text-slate-400 focus:border-[#1e4fc1] focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="submit"
                    aria-label="Add note"
                    disabled={!note.trim() || isSaving}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#dbe4f3] text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isSaving ? (
                      <ActionSpinner label="Saving requisition note" />
                    ) : (
                      <RiSendPlaneLine className="h-3.5 w-3.5" />
                    )}
                  </button>
                </form>
                {selectedRequest.canReview && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => void reviewRequest("approved")}
                      disabled={isSaving}
                      className="inline-flex h-7 items-center gap-1 rounded-md bg-[#078b82] px-2.5 text-[9px] font-bold text-white transition hover:bg-[#06756e] disabled:cursor-wait disabled:opacity-60"
                    >
                      {isSaving ? (
                        <ActionSpinner label="Recording approval" />
                      ) : (
                        <RiCheckLine className="h-3.5 w-3.5" />
                      )}
                      {isSaving
                        ? "Processing…"
                        : selectedRequest.currentStep === 3
                          ? "Approve and finish"
                          : "Approve and send up"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void reviewRequest("rejected")}
                      disabled={isSaving}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-[#e45c5c] px-2.5 text-[9px] font-bold text-[#c33c3c] transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
                    >
                      {isSaving ? (
                        <ActionSpinner label="Recording rejection" />
                      ) : (
                        <RiCloseLine className="h-3.5 w-3.5" />
                      )}
                      {isSaving ? "Processing…" : "Reject"}
                    </button>
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className="rounded-xl border border-[#dfe7f4] bg-white p-5 text-center text-[10px] text-slate-500">
              Select a requisition to view its approval details.
            </section>
          )}

          <section
            aria-label="Requisition activity"
            className="rounded-xl border border-[#dfe7f4] bg-white p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[10px] font-bold text-[#10213c]">
                Approval activity
              </h2>
              <span className="text-[8px] font-bold text-[#078b82]">
                Saved to this request
              </span>
            </div>
            {selectedRequest ? (
              <div className="mt-2 space-y-1.5">
                {[
                  ...selectedRequest.approvals
                    .filter((approval) => approval.actor)
                    .map((approval) => ({
                      id: `approval-${approval.step}`,
                      author: approval.actor ?? "",
                      text: `${approval.status === "rejected" ? "Rejected" : "Approved"} at ${approval.label}${approval.note ? `: ${approval.note}` : ""}`,
                      time: approval.decidedAt,
                    })),
                  ...selectedRequest.comments.map((comment) => ({
                    id: `comment-${comment.id}`,
                    author: comment.author,
                    text: comment.body,
                    time: comment.createdAt,
                  })),
                ]
                  .sort((a, b) => (b.time ?? "").localeCompare(a.time ?? ""))
                  .slice(0, 4)
                  .map((activity) => (
                    <article
                      key={activity.id}
                      className="rounded-lg border border-[#edf1f7] p-2"
                    >
                      <p className="text-[8px] font-bold text-[#10213c]">
                        {activity.author}
                      </p>
                      <p className="mt-0.5 text-[9px] text-slate-600">
                        {activity.text}
                      </p>
                      {activity.time && (
                        <time className="mt-1 block text-[8px] text-slate-400">
                          {new Date(activity.time).toLocaleString()}
                        </time>
                      )}
                    </article>
                  ))}
                {!selectedRequest.approvals.some(
                  (approval) => approval.actor,
                ) &&
                  !selectedRequest.comments.length && (
                    <p className="rounded-lg border border-dashed border-[#edf1f7] p-3 text-center text-[9px] text-slate-500">
                      Reviews and comments will appear here.
                    </p>
                  )}
              </div>
            ) : (
              <p className="mt-2 rounded-lg border border-dashed border-[#edf1f7] p-3 text-center text-[9px] text-slate-500">
                Create a requisition to start tracking review activity.
              </p>
            )}
          </section>
        </div>
      </div>

      {isCreateOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsCreateOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-requisition-title"
            className="w-full max-w-[440px] rounded-xl border border-[#dfe7f4] bg-white p-4 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="new-requisition-title"
                  className="text-[14px] font-bold text-[#10213c]"
                >
                  New requisition
                </h2>
                <p className="mt-0.5 text-[9px] text-slate-500">
                  Add the details for your spending request.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                aria-label="Close form"
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
              >
                <RiCloseLine className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={createRequest} className="mt-3 space-y-2.5">
              <label className="block text-[9px] font-semibold text-slate-700">
                What do you need?
                <input
                  required
                  autoFocus
                  value={newRequest.title}
                  onChange={(event) =>
                    setNewRequest((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  className="mt-1 h-8 w-full rounded-md border border-[#dbe4f3] px-2.5 text-[10px] font-normal outline-none focus:border-[#1e4fc1] focus:ring-2 focus:ring-blue-100"
                  placeholder="e.g. Replacement laptop"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-[9px] font-semibold text-slate-700">
                  Category
                  <input
                    required
                    value={newRequest.category}
                    onChange={(event) =>
                      setNewRequest((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    className="mt-1 h-8 w-full rounded-md border border-[#dbe4f3] px-2.5 text-[10px] font-normal outline-none focus:border-[#1e4fc1] focus:ring-2 focus:ring-blue-100"
                    placeholder="e.g. IT"
                  />
                </label>
                <label className="block text-[9px] font-semibold text-slate-700">
                  Amount ({currency})
                  <input
                    required
                    min="1"
                    step="1"
                    type="number"
                    value={newRequest.amount}
                    onChange={(event) =>
                      setNewRequest((current) => ({
                        ...current,
                        amount: event.target.value,
                      }))
                    }
                    className="mt-1 h-8 w-full rounded-md border border-[#dbe4f3] px-2.5 text-[10px] font-normal outline-none focus:border-[#1e4fc1] focus:ring-2 focus:ring-blue-100"
                    placeholder="0"
                  />
                </label>
              </div>
              <label className="block text-[9px] font-semibold text-slate-700">
                Description
                <textarea
                  value={newRequest.description}
                  onChange={(event) =>
                    setNewRequest((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  className="mt-1 w-full resize-y rounded-md border border-[#dbe4f3] px-2.5 py-2 text-[10px] font-normal outline-none focus:border-[#1e4fc1] focus:ring-2 focus:ring-blue-100"
                  placeholder="Why is this purchase needed?"
                />
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="h-8 rounded-md border border-[#dbe4f3] px-3 text-[9px] font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="h-8 rounded-md bg-[#1e4fc1] px-3 text-[9px] font-bold text-white hover:bg-[#183f9b] disabled:cursor-wait disabled:opacity-60"
                >
                  {isSaving ? (
                    <span className="inline-flex items-center gap-2">
                      <ActionSpinner label="Submitting requisition" />{" "}
                      Submitting…
                    </span>
                  ) : (
                    "Submit request"
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function ApprovalStep({
  name,
  role,
  detail,
  state,
  last = false,
}: {
  name: string;
  role: string;
  detail: string;
  state: "complete" | "current" | "upcoming" | "rejected";
  last?: boolean;
}) {
  const marker =
    state === "complete"
      ? "bg-[#078b82] text-white"
      : state === "rejected"
        ? "bg-[#c33c3c] text-white"
        : state === "current"
          ? "bg-[#1e4fc1] text-white"
          : "bg-[#cbd5e1] text-white";
  return (
    <li className="relative flex min-h-7 gap-2.5">
      {!last && (
        <span
          aria-hidden="true"
          className="absolute left-[6px] top-[15px] h-[calc(100%-5px)] w-px bg-[#dbe4f3]"
        />
      )}
      <span
        className={`relative z-10 flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full ${marker}`}
      >
        {state === "upcoming" ? null : <RiCheckLine className="h-2.5 w-2.5" />}
      </span>
      <span className="min-w-0">
        <span className="block text-[9px] leading-tight text-[#10213c]">
          <strong>{name}</strong>
          <span className="text-slate-500"> · {role}</span>
        </span>
        <span className="block text-[8px] leading-tight text-slate-500">
          {detail}
        </span>
      </span>
    </li>
  );
}
