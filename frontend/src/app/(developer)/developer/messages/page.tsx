"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import DeveloperDashboardNavbar from "@/features/developer/developer-dashboard-navbar";
import { getRealtimeClient } from "@/lib/realtime";
import {
  createMessageThread,
  getAuthSession,
  getMessageThreads,
  getNotifications,
  getThreadMessages,
  logout,
  logoutEverywhere,
  markThreadRead,
  sendThreadMessage,
  ThreadMessage,
  ThreadSummary
} from "@/lib/api";

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString();
}

function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name.slice(0, 2) || "NA").toUpperCase();
}

export default function DeveloperMessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [viewerId, setViewerId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [pendingSignOut, setPendingSignOut] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const selectedThreadIdRef = useRef<string | null>(null);

  const threadQuery = searchParams.get("thread")?.trim() || "";
  const recipientIdQuery = searchParams.get("recipientId")?.trim() || "";
  const projectIdQuery = searchParams.get("projectId")?.trim() || "";
  const realtimeEnabled = useMemo(() => Boolean(getRealtimeClient()), []);

  useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId;
  }, [selectedThreadId]);

  const unreadMessages = useMemo(
    () => threads.reduce((sum, thread) => sum + Math.max(0, thread.unreadCount ?? 0), 0),
    [threads]
  );

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
    [selectedThreadId, threads]
  );

  const refreshNotifications = useCallback(async () => {
    const notifications = await getNotifications(50);
    setUnreadNotifications(notifications.filter((item) => !item.isRead).length);
  }, []);

  const refreshThreads = useCallback(async () => {
    const allThreads = await getMessageThreads();
    setThreads(allThreads);
    setSelectedThreadId((previous) => {
      if (threadQuery && allThreads.some((thread) => thread.id === threadQuery)) {
        return threadQuery;
      }
      if (previous && allThreads.some((thread) => thread.id === previous)) {
        return previous;
      }
      return allThreads[0]?.id ?? null;
    });
  }, [threadQuery]);

  const refreshMessages = useCallback(
    async (threadId: string, markAsRead = false) => {
      const page = await getThreadMessages(threadId, undefined, 50);
      setMessages(page.items.slice().reverse());

      if (markAsRead) {
        await markThreadRead(threadId);
        await refreshNotifications();
        setThreads((previous) =>
          previous.map((thread) =>
            thread.id === threadId
              ? {
                  ...thread,
                  unreadCount: 0
                }
              : thread
          )
        );
      }
    },
    [refreshNotifications]
  );

  const recipientLabel = useMemo(() => {
    if (!selectedThread || !viewerId) {
      return "Conversation";
    }

    const participant =
      selectedThread.participantAId === viewerId ? selectedThread.participantB : selectedThread.participantA;

    return participant?.fullName || participant?.username || "Conversation";
  }, [selectedThread, viewerId]);

  useEffect(() => {
    void (async () => {
      try {
        const session = await getAuthSession();
        setViewerId(session.sub);
      } catch {
        setViewerId(null);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        setLoadingThreads(true);
        setError(null);

        if (recipientIdQuery) {
          const createdThread = await createMessageThread({
            recipientId: recipientIdQuery,
            projectId: projectIdQuery || undefined
          });

          const params = new URLSearchParams(searchParams.toString());
          params.set("thread", createdThread.id);
          params.delete("recipientId");
          params.delete("projectId");
          params.delete("username");
          params.delete("name");
          router.replace(`/developer/messages?${params.toString()}`, { scroll: false });
          setSelectedThreadId(createdThread.id);
        }

        await Promise.all([refreshThreads(), refreshNotifications()]);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Unable to load conversations.");
      } finally {
        setLoadingThreads(false);
      }
    })();
  }, [projectIdQuery, recipientIdQuery, refreshNotifications, refreshThreads, router, searchParams]);

  useEffect(() => {
    if (!selectedThreadId) {
      return;
    }

    void (async () => {
      try {
        setLoadingMessages(true);
        await refreshMessages(selectedThreadId, true);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Unable to load messages.");
      } finally {
        setLoadingMessages(false);
      }
    })();
  }, [refreshMessages, selectedThreadId]);

  useEffect(() => {
    const supabase = getRealtimeClient();
    if (!supabase || threads.length === 0) {
      return;
    }

    const subscribedThreadIds = [...new Set(threads.map((thread) => thread.id))];
    const channels = subscribedThreadIds.map((threadId) =>
      supabase
        .channel(`thread:${threadId}`)
        .on("broadcast", { event: "new_message" }, (event) => {
          const payload = (event.payload ?? {}) as { threadId?: string };
          const payloadThreadId = payload.threadId || threadId;

          void Promise.all([refreshThreads(), refreshNotifications()]);
          if (selectedThreadIdRef.current === payloadThreadId) {
            void refreshMessages(payloadThreadId, false);
          }
        })
        .subscribe()
    );

    return () => {
      channels.forEach((channel) => {
        void supabase.removeChannel(channel);
      });
    };
  }, [refreshMessages, refreshNotifications, refreshThreads, threads]);

  useEffect(() => {
    const sync = () => {
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }

      void refreshThreads();
      void refreshNotifications();
      if (selectedThreadId) {
        void refreshMessages(selectedThreadId, false);
      }
    };

    const intervalId = window.setInterval(sync, realtimeEnabled ? 8000 : 2500);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [realtimeEnabled, refreshMessages, refreshNotifications, refreshThreads, selectedThreadId]);

  async function onSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedThreadId) {
      return;
    }

    const trimmed = messageInput.trim();
    if (!trimmed) {
      return;
    }

    try {
      setSending(true);
      const sent = await sendThreadMessage(selectedThreadId, trimmed);
      setMessages((previous) => [...previous, sent]);
      setMessageInput("");
      setThreads((previous) =>
        previous.map((thread) =>
          thread.id === selectedThreadId
            ? {
                ...thread,
                updatedAt: sent.createdAt,
                messages: [
                  {
                    id: sent.id,
                    content: sent.content,
                    senderId: sent.senderId,
                    createdAt: sent.createdAt
                  }
                ]
              }
            : thread
        )
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  async function onSignOut() {
    try {
      setPendingSignOut(true);
      await logout();
      router.replace("/login");
    } finally {
      setPendingSignOut(false);
    }
  }

  async function onSignOutEverywhere() {
    try {
      setPendingSignOut(true);
      await logoutEverywhere();
      router.replace("/login");
    } finally {
      setPendingSignOut(false);
    }
  }

  function onSelectThread(threadId: string) {
    setSelectedThreadId(threadId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("thread", threadId);
    router.replace(`/developer/messages?${params.toString()}`, { scroll: false });
  }

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <DeveloperDashboardNavbar
        onSignOut={() => {
          void onSignOut();
        }}
        onSignOutEverywhere={() => {
          void onSignOutEverywhere();
        }}
        pendingSignOut={pendingSignOut}
        unreadMessages={unreadMessages}
        unreadNotifications={unreadNotifications}
      />

      <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-5 md:grid-cols-[300px_minmax(0,1fr)] md:px-6">
        <aside className="rounded-xl border border-neutral-200 bg-white p-3">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">Client Messages</h1>
            <span className="text-xs text-neutral-500">{threads.length}</span>
          </div>

          {loadingThreads ? <p className="text-sm text-neutral-500">Loading conversations...</p> : null}
          {!loadingThreads && threads.length === 0 ? (
            <p className="text-sm text-neutral-500">No conversations yet. Clients will appear here when they message you.</p>
          ) : null}

          <div className="space-y-2">
            {threads.map((thread) => {
              const participant = viewerId
                ? thread.participantAId === viewerId
                  ? thread.participantB
                  : thread.participantA
                : thread.participantA;
              const label = participant?.fullName || participant?.username || "Conversation";
              const lastMessage = thread.messages[0]?.content ?? "No messages yet";

              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => onSelectThread(thread.id)}
                  className={`w-full rounded-lg border p-2 text-left transition ${
                    selectedThreadId === thread.id
                      ? "border-neutral-900 bg-neutral-100"
                      : "border-neutral-200 bg-white hover:bg-neutral-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-semibold text-white">
                      {initials(label)}
                    </span>
                    <p className="truncate text-sm font-semibold">{label}</p>
                    {thread.unreadCount > 0 ? (
                      <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-semibold text-white">
                        {thread.unreadCount}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-xs text-neutral-600">{lastMessage}</p>
                  <p className="mt-1 text-[11px] text-neutral-500">{formatTime(thread.updatedAt)}</p>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="flex min-h-[70vh] flex-col rounded-xl border border-neutral-200 bg-white">
          <header className="border-b border-neutral-200 px-4 py-3">
            <p className="text-sm font-semibold">{recipientLabel}</p>
            {selectedThread?.project ? (
              <Link href={`/projects/${selectedThread.project.slug}`} className="text-xs text-blue-700 underline">
                Regarding: {selectedThread.project.title}
              </Link>
            ) : null}
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {loadingMessages ? <p className="text-sm text-neutral-500">Loading messages...</p> : null}
            {!loadingMessages && messages.length === 0 ? (
              <p className="text-sm text-neutral-500">No messages yet. Start the conversation below.</p>
            ) : null}

            {messages.map((message) => {
              const isMine = message.senderId === viewerId;
              return (
                <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      isMine ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-900"
                    }`}
                  >
                    <p>{message.content}</p>
                    <p className={`mt-1 text-[11px] ${isMine ? "text-neutral-300" : "text-neutral-500"}`}>
                      {formatTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={onSend} className="border-t border-neutral-200 p-3">
            <div className="flex items-center gap-2">
              <input
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                placeholder={selectedThreadId ? "Type your reply..." : "Select a conversation to begin"}
                disabled={!selectedThreadId || sending}
                className="h-10 flex-1 rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-900 disabled:bg-neutral-100"
              />
              <button
                type="submit"
                disabled={!selectedThreadId || sending || !messageInput.trim()}
                className="inline-flex h-10 items-center rounded-lg bg-neutral-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        </section>
      </section>

      {error ? (
        <section className="mx-auto w-full max-w-7xl px-4 pb-6 md:px-6">
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        </section>
      ) : null}
    </main>
  );
}
