"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getAuthSession,
  NotificationItem,
  getMessageThreads,
  getNotifications,
  getSavedProjects,
  logout
} from "@/lib/api";
import DeveloperDashboardNavbar from "@/features/developer/developer-dashboard-navbar";

export default function DeveloperDashboardPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | undefined>(undefined);
  const [pendingLogout, setPendingLogout] = useState(false);
  const [savedState, setSavedState] = useState<string>("");
  const [analyticsState, setAnalyticsState] = useState<string>("");
  const [threadCount, setThreadCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [dealInterestCount, setDealInterestCount] = useState(0);
  const [inquiryThreads, setInquiryThreads] = useState<Array<{ id: string; unreadCount: number; updatedAt: string; preview: string }>>([]);
  const [proposalThreads, setProposalThreads] = useState<Array<{ id: string; unreadCount: number; updatedAt: string; preview: string }>>([]);
  const [contractNotifications, setContractNotifications] = useState<NotificationItem[]>([]);
  const [savedProjects, setSavedProjects] = useState<Array<{ id: string; project: { slug: string; title: string } }>>([]);

  useEffect(() => {
    queueMicrotask(() => {
      void getAuthSession()
        .then(() => setHasSession(true))
        .catch(() => {
          setHasSession(false);
          router.replace("/login");
        });
    });
  }, [router]);

  useEffect(() => {
    if (!hasSession) {
      return;
    }

    async function loadSaved() {
      try {
        setSavedState("Loading saved projects...");
        const items = await getSavedProjects();
        setSavedProjects(items.map((item) => ({ id: item.id, project: item.project })));
        setSavedState(items.length ? "Saved projects loaded." : "No saved projects yet.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load saved projects.";
        setSavedState(message);
      }
    }

    async function loadAnalytics() {
      try {
        setAnalyticsState("Loading analytics...");
        const [threads, notifications] = await Promise.all([getMessageThreads(), getNotifications(30)]);

        const inquiry = threads
          .filter((thread) => thread.unreadCount > 0)
          .map((thread) => ({
            id: thread.id,
            unreadCount: thread.unreadCount,
            updatedAt: thread.updatedAt,
            preview: thread.messages[0]?.content ?? "No messages yet"
          }));

        const proposal = threads
          .filter((thread) => thread.unreadCount === 0)
          .map((thread) => ({
            id: thread.id,
            unreadCount: thread.unreadCount,
            updatedAt: thread.updatedAt,
            preview: thread.messages[0]?.content ?? "No messages yet"
          }));

        const contracts = notifications.filter((item) => item.type === "DEAL_INTEREST");

        setThreadCount(threads.length);
        setUnreadMessageCount(threads.reduce((sum, thread) => sum + thread.unreadCount, 0));
        setUnreadNotificationCount(notifications.filter((item) => !item.isRead).length);
        setDealInterestCount(contracts.length);
        setInquiryThreads(inquiry);
        setProposalThreads(proposal);
        setContractNotifications(contracts);
        setAnalyticsState("Analytics loaded.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load analytics.";
        setAnalyticsState(message);
      }
    }

    loadSaved();
    loadAnalytics();
  }, [hasSession]);

  async function onLogout() {
    setPendingLogout(true);
    await logout();
    router.replace("/login");
  }

  if (!hasSession) {
    return null;
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <DeveloperDashboardNavbar onSignOut={onLogout} pendingSignOut={pendingLogout} />

      <section className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
          <h1 className="text-2xl font-semibold text-neutral-900">Developer Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-600">Role path: /developer/dashboard</p>
          <p className="mt-2 text-sm text-neutral-600">
            Other role sections: <Link href="/client/dashboard" className="font-semibold text-teal-700">Client</Link> |{" "}
            <Link href="/admin/dashboard" className="font-semibold text-teal-700">Admin</Link>
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-lg border border-neutral-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Active inquiries</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">{unreadMessageCount}</p>
            <p className="text-sm text-neutral-600">Unread messages across {threadCount} threads</p>
          </article>
          <article className="rounded-lg border border-neutral-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Contract signals</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">{dealInterestCount}</p>
            <p className="text-sm text-neutral-600">Deal-interest notifications from clients</p>
          </article>
          <article className="rounded-lg border border-neutral-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Saved projects</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">{savedProjects.length}</p>
            <p className="text-sm text-neutral-600">Bookmarks available in your workspace</p>
          </article>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-lg border border-neutral-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Unread notifications</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">{unreadNotificationCount}</p>
            <p className="text-sm text-neutral-600">System alerts pending review</p>
          </article>
          <article className="rounded-lg border border-neutral-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Session</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">Active</p>
            <p className="text-sm text-neutral-600">Use refresh token control to keep signed in</p>
          </article>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Inquiry pipeline</h2>
            <p className="text-sm text-neutral-600">Inquiry {"->"} Proposal {"->"} Contract</p>
          </div>
          {analyticsState ? <p className="mt-1 text-sm text-neutral-600">{analyticsState}</p> : null}

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <section className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <h3 className="text-sm font-semibold text-amber-900">Inquiry ({inquiryThreads.length})</h3>
              <ul className="mt-2 space-y-2 text-xs text-amber-900">
                {inquiryThreads.length === 0 ? <li>No active inquiries.</li> : null}
                {inquiryThreads.slice(0, 4).map((thread) => (
                  <li key={thread.id} className="rounded border border-amber-200 bg-white p-2">
                    <p className="font-semibold">Thread {thread.id.slice(0, 8)}</p>
                    <p className="line-clamp-2">{thread.preview}</p>
                    <p className="text-[11px]">Unread: {thread.unreadCount}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-md border border-sky-200 bg-sky-50 p-3">
              <h3 className="text-sm font-semibold text-sky-900">Proposal ({proposalThreads.length})</h3>
              <ul className="mt-2 space-y-2 text-xs text-sky-900">
                {proposalThreads.length === 0 ? <li>No proposal-stage threads yet.</li> : null}
                {proposalThreads.slice(0, 4).map((thread) => (
                  <li key={thread.id} className="rounded border border-sky-200 bg-white p-2">
                    <p className="font-semibold">Thread {thread.id.slice(0, 8)}</p>
                    <p className="line-clamp-2">{thread.preview}</p>
                    <p className="text-[11px]">Updated: {new Date(thread.updatedAt).toLocaleDateString()}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
              <h3 className="text-sm font-semibold text-emerald-900">Contract ({contractNotifications.length})</h3>
              <ul className="mt-2 space-y-2 text-xs text-emerald-900">
                {contractNotifications.length === 0 ? <li>No contract-stage activity yet.</li> : null}
                {contractNotifications.slice(0, 4).map((item) => (
                  <li key={item.id} className="rounded border border-emerald-200 bg-white p-2">
                    <p className="font-semibold">Deal interest</p>
                    <p>{new Date(item.createdAt).toLocaleString()}</p>
                    <p className="text-[11px]">{item.isRead ? "Read" : "Unread"}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <h2 className="text-base font-semibold">Saved projects</h2>
          {savedState ? <p className="mt-1 text-sm text-neutral-600">{savedState}</p> : null}
          <ul className="mt-2 grid gap-1 text-sm text-neutral-700">
            {savedProjects.map((entry) => (
              <li key={entry.id}>
                <a href={`/projects/${entry.project.slug}`} className="font-semibold text-teal-700">
                  {entry.project.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}