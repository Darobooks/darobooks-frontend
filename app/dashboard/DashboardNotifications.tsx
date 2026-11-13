"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RiCheckboxCircleLine,
  RiNotification3Line,
} from "@remixicon/react";
import { showToast } from "../components/toast";
import ActionSpinner from "../components/ActionSpinner";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_NEST_API_URL ?? "http://localhost:5000"
).replace(/\/+$/, "");

type Notification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

function isNotification(value: unknown): value is Notification {
  return (
    !!value &&
    typeof value === "object" &&
    "id" in value &&
    typeof value.id === "string" &&
    "title" in value &&
    typeof value.title === "string" &&
    "body" in value &&
    typeof value.body === "string" &&
    "createdAt" in value &&
    typeof value.createdAt === "string"
  );
}

export default function DashboardNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async () => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token) {
      setError("Sign in to view notifications.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          payload && typeof payload === "object" && "message" in payload &&
            typeof payload.message === "string"
            ? payload.message
            : "Could not load notifications.",
        );
      }
      if (
        !payload ||
        typeof payload !== "object" ||
        !("notifications" in payload) ||
        !Array.isArray(payload.notifications) ||
        !payload.notifications.every(isNotification)
      ) {
        throw new Error("The notification service returned invalid data.");
      }
      setNotifications(payload.notifications);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load notifications.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const markRead = async (id: string) => {
    const token = window.sessionStorage.getItem("darobooksAccessToken");
    if (!token || updatingId) return;
    setUpdatingId(id);
    setError("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/dashboard/notifications/${encodeURIComponent(id)}/read`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) throw new Error("Could not mark notification as read.");
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => (item.id === id ? { ...item, readAt } : item)),
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not mark notification as read.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter((item) => !item.readAt);
    if (!unread.length || isMarkingAll) return;
    setIsMarkingAll(true);
    try {
      await Promise.all(unread.map((item) => markRead(item.id)));
      showToast("All notifications marked as read.", "success");
      await loadNotifications();
    } finally {
      setIsMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((item) => !item.readAt).length;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-[#dfe8f6] bg-white p-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1e4fc1]">
            Inbox
          </p>
          <h2 className="mt-1 text-[18px] font-bold text-[#10213c]">Notifications</h2>
          <p className="mt-1 text-[10px] text-slate-500">
            {unreadCount === 0
              ? "You are all caught up."
              : `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`}
          </p>
        </div>
        <button
          type="button"
          disabled={unreadCount === 0 || isMarkingAll}
          onClick={() => void markAllRead()}
          className="inline-flex items-center gap-2 rounded-md border border-[#dbe4f3] px-3 py-2 text-[10px] font-bold text-[#1e4fc1] disabled:opacity-50"
        >
          {isMarkingAll ? <ActionSpinner label="Marking notifications" /> : null}
          Mark all as read
        </button>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[10px] text-red-700">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-xl border border-[#dfe8f6] bg-white px-4 py-10 text-center text-[11px] text-slate-500">
          Loading notifications…
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border border-[#dfe8f6] bg-white px-4 py-12 text-center">
          <RiNotification3Line className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-[12px] font-bold text-[#10213c]">No notifications</p>
          <p className="mt-1 text-[10px] text-slate-500">New account updates will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((item) => (
            <article
              key={item.id}
              className={`rounded-xl border p-4 ${
                item.readAt
                  ? "border-[#e5eaf3] bg-white"
                  : "border-blue-200 bg-[#f5f8ff]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[12px] font-bold text-[#10213c]">{item.title}</h3>
                  <p className="mt-1 whitespace-pre-wrap text-[11px] leading-5 text-slate-600">
                    {item.body}
                  </p>
                  <time dateTime={item.createdAt} className="mt-2 block text-[9px] text-slate-400">
                    {new Date(item.createdAt).toLocaleString()}
                  </time>
                </div>
                {!item.readAt ? (
                  <button
                    type="button"
                    disabled={updatingId === item.id}
                    onClick={() => void markRead(item.id)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-[9px] font-bold text-[#1e4fc1] hover:bg-blue-50 disabled:opacity-50"
                  >
                    {updatingId === item.id ? (
                      <ActionSpinner label="Marking notification" />
                    ) : (
                      <RiCheckboxCircleLine className="h-3.5 w-3.5" />
                    )}
                    Mark read
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
