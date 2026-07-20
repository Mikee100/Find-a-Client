"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Circle, Paperclip, Search, SendHorizontal } from "lucide-react";
import DeveloperDashboardNavbar from "@/features/developer/developer-dashboard-navbar";
import { getRealtimeClient } from "@/lib/realtime";
import {
  createMessageThread,
  getAuthSession,
  HireRequestResponse,
  listHireRequests,
  getMessageQuickReplies,
  getMessageThreads,
  getNotifications,
  getThreadMessages,
  logout,
  logoutEverywhere,
  markThreadRead,
  sendThreadAttachment,
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

function formatThreadTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name.slice(0, 2) || "NA").toUpperCase();
}

function formatHireStatus(status: HireRequestResponse["status"]): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [pendingSignOut, setPendingSignOut] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [threadSearch, setThreadSearch] = useState("");
  const [hireRequests, setHireRequests] = useState<HireRequestResponse[]>([]);
  const selectedThreadIdRef = useRef<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const hasRedirectedOnAuthErrorRef = useRef(false);

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

  const visibleThreads = useMemo(() => {
    const needle = threadSearch.trim().toLowerCase();
    if (!needle) {
      return threads;
    }

    return threads.filter((thread) => {
      const participant = viewerId
        ? thread.participantAId === viewerId
          ? thread.participantB
          : thread.participantA
        : thread.participantA;
      const label = participant?.fullName || participant?.username || "conversation";
      const preview = thread.messages[0]?.content ?? "";
      return `${label} ${preview}`.toLowerCase().includes(needle);
    });
  }, [threadSearch, threads, viewerId]);

  const isUnauthorizedError = useCallback((caughtError: unknown) => {
    if (!(caughtError instanceof Error)) {
      return false;
    }

    return caughtError.message.toLowerCase().includes("unauthorized");
  }, []);

  const handleRequestError = useCallback(
    (caughtError: unknown, fallbackMessage: string) => {
      if (isUnauthorizedError(caughtError)) {
        setError("Your session expired. Please sign in again.");
        if (!hasRedirectedOnAuthErrorRef.current) {
          hasRedirectedOnAuthErrorRef.current = true;
          router.replace("/login");
        }
        return;
      }

      setError(caughtError instanceof Error ? caughtError.message : fallbackMessage);
    },
    [isUnauthorizedError, router]
  );

  const refreshNotifications = useCallback(async () => {
    const notifications = await getNotifications(50);
    setUnreadNotifications(notifications.filter((item) => !item.isRead).length);
  }, []);

  const refreshHireRequests = useCallback(async () => {
    const data = await listHireRequests({ scope: "received", limit: 100 });
    setHireRequests(data);
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

  const onMessagesScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 60;
  }, []);

  const recipientLabel = useMemo(() => {
    if (!selectedThread || !viewerId) {
      return "Conversation";
    }

    const participant =
      selectedThread.participantAId === viewerId ? selectedThread.participantB : selectedThread.participantA;

    return participant?.fullName || participant?.username || "Conversation";
  }, [selectedThread, viewerId]);
  const visibleQuickReplies = selectedThreadId ? quickReplies : [];
  const latestHireRequestByThreadId = useMemo(() => {
    const map = new Map<string, HireRequestResponse>();

    for (const item of hireRequests) {
      if (!item.threadId) {
        continue;
      }

      const current = map.get(item.threadId);
      if (!current || new Date(item.createdAt).getTime() > new Date(current.createdAt).getTime()) {
        map.set(item.threadId, item);
      }
    }

    return map;
  }, [hireRequests]);
  const selectedThreadHireRequest = selectedThreadId ? latestHireRequestByThreadId.get(selectedThreadId) : undefined;

  useEffect(() => {
    void (async () => {
      try {
        const session = await getAuthSession();
        setViewerId(session.sub);
      } catch (caughtError) {
        setViewerId(null);
        handleRequestError(caughtError, "Please sign in to view messages.");
      }
    })();
  }, [handleRequestError]);

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

        await Promise.all([refreshThreads(), refreshNotifications(), refreshHireRequests()]);
      } catch (caughtError) {
        handleRequestError(caughtError, "Unable to load conversations.");
      } finally {
        setLoadingThreads(false);
      }
    })();
  }, [handleRequestError, projectIdQuery, recipientIdQuery, refreshHireRequests, refreshNotifications, refreshThreads, router, searchParams]);

  useEffect(() => {
    if (!selectedThreadId) {
      return;
    }

    shouldStickToBottomRef.current = true;

    void (async () => {
      try {
        setLoadingMessages(true);
        const [, templates] = await Promise.all([
          refreshMessages(selectedThreadId, true),
          getMessageQuickReplies(selectedThreadId)
        ]);
        setQuickReplies(templates);
      } catch (caughtError) {
        handleRequestError(caughtError, "Unable to load messages.");
      } finally {
        setLoadingMessages(false);
      }
    })();
  }, [handleRequestError, refreshMessages, selectedThreadId]);

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

          void Promise.all([refreshThreads(), refreshNotifications(), refreshHireRequests()]).catch((caughtError) => {
            handleRequestError(caughtError, "Unable to refresh conversations.");
          });
          if (selectedThreadIdRef.current === payloadThreadId) {
            void refreshMessages(payloadThreadId, false).catch((caughtError) => {
              handleRequestError(caughtError, "Unable to refresh messages.");
            });
          }
        })
        .subscribe()
    );

    return () => {
      channels.forEach((channel) => {
        void supabase.removeChannel(channel);
      });
    };
  }, [handleRequestError, refreshHireRequests, refreshMessages, refreshNotifications, refreshThreads, threads]);

  useEffect(() => {
    const sync = () => {
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }

      void Promise.all([refreshThreads(), refreshNotifications(), refreshHireRequests()]).catch((caughtError) => {
        handleRequestError(caughtError, "Unable to refresh conversations.");
      });
      if (selectedThreadId) {
        void refreshMessages(selectedThreadId, false).catch((caughtError) => {
          handleRequestError(caughtError, "Unable to refresh messages.");
        });
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
  }, [handleRequestError, realtimeEnabled, refreshHireRequests, refreshMessages, refreshNotifications, refreshThreads, selectedThreadId]);

  useEffect(() => {
    if (!shouldStickToBottomRef.current) {
      return;
    }

    messageEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [messages]);

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
      shouldStickToBottomRef.current = true;
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
      handleRequestError(caughtError, "Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  async function onSelectAttachment(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile || !selectedThreadId) {
      return;
    }

    try {
      setUploadingAttachment(true);
      shouldStickToBottomRef.current = true;
      const sent = await sendThreadAttachment(selectedThreadId, selectedFile, messageInput.trim() || undefined);
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
      handleRequestError(caughtError, "Unable to upload attachment.");
    } finally {
      setUploadingAttachment(false);
      event.target.value = "";
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

  function onBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.replace("/developer/dashboard");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] text-neutral-900">
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

      <section className="mx-auto w-full max-w-7xl px-4 py-3 md:px-6 md:py-4">
        <div className="grid min-h-[72vh] border-y border-slate-200 md:grid-cols-[290px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 bg-slate-50/50 p-3 md:border-b-0 md:border-r">
              <div className="mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Developer Inbox</p>
                <div className="mt-1 flex items-center justify-between">
                  <h1 className="text-base font-semibold tracking-tight text-slate-900">Client Conversations</h1>
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600">{threads.length}</span>
                </div>
              </div>

              <label className="mb-2 flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={threadSearch}
                  onChange={(event) => setThreadSearch(event.target.value)}
                  placeholder="Search conversations"
                  className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
              </label>

              {loadingThreads ? <p className="text-sm text-slate-500">Loading conversations...</p> : null}
              {!loadingThreads && visibleThreads.length === 0 ? (
                <p className="text-sm text-slate-500">No conversations found.</p>
              ) : null}

              <div className="max-h-[54vh] overflow-y-auto pr-1">
                {visibleThreads.map((thread) => {
                  const participant = viewerId
                    ? thread.participantAId === viewerId
                      ? thread.participantB
                      : thread.participantA
                    : thread.participantA;
                  const label = participant?.fullName || participant?.username || "Conversation";
                  const lastMessage = thread.messages[0]?.content ?? "No messages yet";
                  const linkedHireRequest = latestHireRequestByThreadId.get(thread.id);

                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => onSelectThread(thread.id)}
                      className={`w-full border-b px-1 py-2 text-left transition ${
                        selectedThreadId === thread.id
                          ? "border-slate-900 bg-slate-50"
                          : "border-slate-200 bg-transparent hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
                          {initials(label)}
                        </span>
                        <p className="truncate text-sm font-semibold text-slate-900">{label}</p>
                        {thread.unreadCount > 0 ? (
                          <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-slate-900 px-1.5 text-[10px] font-semibold text-white">
                            {thread.unreadCount}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-600">{lastMessage}</p>
                      {linkedHireRequest ? (
                        <p className="mt-1 text-[11px] font-medium text-slate-700">Hire request: {formatHireStatus(linkedHireRequest.status)}</p>
                      ) : null}
                      <p className="mt-1 text-[11px] text-slate-400">{formatThreadTime(thread.updatedAt)}</p>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="flex min-h-[72vh] flex-col bg-transparent">
              <header className="border-b border-slate-200 px-4 py-2.5">
                <button
                  type="button"
                  onClick={onBack}
                  className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>
                <div className="flex items-center gap-2">
                  <Circle className={`h-2.5 w-2.5 ${realtimeEnabled ? "fill-emerald-500 text-emerald-500" : "fill-amber-500 text-amber-500"}`} />
                  <p className="text-sm font-semibold text-slate-900">{recipientLabel}</p>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{realtimeEnabled ? "Live updates active" : "Syncing every few seconds"}</p>
                {selectedThread?.project ? (
                  <Link href={`/projects/${selectedThread.project.slug}`} className="mt-1 inline-flex text-xs font-medium text-slate-700 hover:underline">
                    Regarding: {selectedThread.project.title}
                  </Link>
                ) : null}
                {selectedThreadHireRequest ? (
                  <Link href="/developer/hire-requests" className="mt-1 inline-flex text-xs font-semibold text-slate-700 hover:underline">
                    Hire request status: {formatHireStatus(selectedThreadHireRequest.status)}
                  </Link>
                ) : null}
              </header>

              <div ref={messagesContainerRef} onScroll={onMessagesScroll} className="flex-1 space-y-2 overflow-y-auto bg-slate-50/40 px-4 py-3">
                {loadingMessages ? <p className="text-sm text-slate-500">Loading messages...</p> : null}
                {!loadingMessages && messages.length === 0 ? (
                  <p className="text-sm text-slate-500">No messages yet. Start the conversation below.</p>
                ) : null}

                {messages.map((message) => {
                  const isMine = message.senderId === viewerId;
                  return (
                    <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[82%] rounded-lg border px-3 py-2 text-sm ${isMine ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"}`}>
                        <p className="leading-6">{message.content}</p>
                        {message.attachments && message.attachments.length > 0 ? (
                          <div className="mt-2 space-y-1">
                            {message.attachments.map((attachment) => (
                              <a
                                key={attachment.id}
                                href={attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                className={`inline-flex max-w-full truncate rounded border px-2 py-1 text-xs ${isMine ? "border-slate-600 text-slate-100 hover:bg-slate-800" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}
                              >
                                {attachment.fileName}
                              </a>
                            ))}
                          </div>
                        ) : null}
                        <p className={`mt-1 text-[11px] ${isMine ? "text-slate-300" : "text-slate-500"}`}>
                          {formatTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messageEndRef} />
              </div>

              <form onSubmit={onSend} className="border-t border-slate-200 bg-transparent p-3">
                <input
                  ref={attachmentInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.mp4,.webm,.mov,.txt"
                  className="hidden"
                  onChange={(event) => {
                    void onSelectAttachment(event);
                  }}
                />
                {visibleQuickReplies.length > 0 ? (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {visibleQuickReplies.slice(0, 5).map((template) => (
                      <button
                        key={template}
                        type="button"
                        onClick={() => setMessageInput(template)}
                        className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] text-slate-700 hover:bg-slate-100"
                      >
                        {template.length > 52 ? `${template.slice(0, 52)}...` : template}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!selectedThreadId || sending || uploadingAttachment}
                    onClick={() => attachmentInputRef.current?.click()}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 disabled:opacity-60"
                  >
                    <Paperclip className="h-4 w-4" />
                    {uploadingAttachment ? "Uploading" : "Attach"}
                  </button>
                  <input
                    value={messageInput}
                    onChange={(event) => setMessageInput(event.target.value)}
                    placeholder={selectedThreadId ? "Type your reply..." : "Select a conversation to begin"}
                    disabled={!selectedThreadId || sending || uploadingAttachment}
                    className="h-9 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none placeholder:text-slate-400 disabled:bg-slate-100"
                  />
                  <button
                    type="submit"
                    disabled={!selectedThreadId || sending || uploadingAttachment || !messageInput.trim()}
                    className="inline-flex h-9 items-center gap-1 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    <SendHorizontal className="h-4 w-4" />
                    {sending ? "Sending" : "Send"}
                  </button>
                </div>
              </form>
            </section>
        </div>
      </section>

      {error ? (
        <section className="mx-auto w-full max-w-7xl px-4 pb-6 md:px-6">
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        </section>
      ) : null}
    </main>
  );
}
