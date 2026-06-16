"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  getAuthSession,
  NotificationItem,
  getMessageThreads,
  getNotifications,
  getSavedProjects,
  logout,
  logoutEverywhere
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

    void loadSaved();
    void loadAnalytics();
  }, [hasSession]);

  async function onLogout() {
    setPendingLogout(true);
    await logout();
    router.replace("/login");
  }

  async function onLogoutEverywhere() {
    setPendingLogout(true);
    await logoutEverywhere();
    router.replace("/login");
  }

  const conversionRate = useMemo(() => {
    if (threadCount === 0) {
      return 0;
    }
    return Math.round((dealInterestCount / threadCount) * 100);
  }, [dealInterestCount, threadCount]);

  const spotlightThreads = useMemo(
    () => [...inquiryThreads, ...proposalThreads].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5),
    [inquiryThreads, proposalThreads]
  );

  if (!hasSession) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#cffafe_0%,#f8fafc_35%,#f1f5f9_100%)]">
      <DeveloperDashboardNavbar
        onSignOut={onLogout}
        onSignOutEverywhere={onLogoutEverywhere}
        pendingSignOut={pendingLogout}
      />

      <section className="mx-auto w-full max-w-7xl space-y-4 p-4 md:p-6">
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.10)]">
          <div className="relative border-b border-neutral-200 bg-[linear-gradient(120deg,#0f172a_0%,#115e59_45%,#0e7490_100%)] p-4 text-white md:p-5">
            <div className="absolute -right-14 -top-14 h-48 w-48 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">Marketplace cockpit</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Developer Command Dashboard</h1>
                <p className="mt-1 text-sm text-cyan-100/95">A Fiverr and Upwork style workspace for leads, proposals, and contract momentum.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                <span className="rounded-full border border-white/30 bg-white/10 px-2.5 py-1">Role: Developer</span>
                <span className="rounded-full border border-white/30 bg-white/10 px-2.5 py-1">Session: Active</span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-4 md:grid-cols-4 md:p-5">
            <article className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Inbox</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{unreadMessageCount}</p>
              <p className="text-xs text-neutral-600">Unread in {threadCount} threads</p>
            </article>
            <article className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Deal signals</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{dealInterestCount}</p>
              <p className="text-xs text-neutral-600">Contract-interest notifications</p>
            </article>
            <article className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Conversion</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{conversionRate}%</p>
              <p className="text-xs text-neutral-600">Deals signaled per thread</p>
            </article>
            <article className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Saved projects</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{savedProjects.length}</p>
              <p className="text-xs text-neutral-600">Shortlisted opportunities</p>
            </article>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
          <section className="space-y-4">
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-neutral-900">Pipeline Board</h2>
                <p className="text-xs font-medium text-neutral-500">Inquiry {"->"} Proposal {"->"} Contract</p>
              </div>
              {analyticsState ? <p className="mt-1 text-xs text-neutral-600">{analyticsState}</p> : null}

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <section className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-900">Inquiry ({inquiryThreads.length})</h3>
                  <ul className="mt-2 space-y-2 text-xs text-amber-900">
                    {inquiryThreads.length === 0 ? <li className="rounded-md border border-amber-200 bg-white px-2 py-2">No active inquiries.</li> : null}
                    {inquiryThreads.slice(0, 4).map((thread) => (
                      <li key={thread.id} className="rounded-md border border-amber-200 bg-white p-2">
                        <p className="font-semibold">Thread {thread.id.slice(0, 8)}</p>
                        <p className="line-clamp-2 text-[11px]">{thread.preview}</p>
                        <p className="text-[11px]">Unread: {thread.unreadCount}</p>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-900">Proposal ({proposalThreads.length})</h3>
                  <ul className="mt-2 space-y-2 text-xs text-sky-900">
                    {proposalThreads.length === 0 ? <li className="rounded-md border border-sky-200 bg-white px-2 py-2">No proposal-stage threads yet.</li> : null}
                    {proposalThreads.slice(0, 4).map((thread) => (
                      <li key={thread.id} className="rounded-md border border-sky-200 bg-white p-2">
                        <p className="font-semibold">Thread {thread.id.slice(0, 8)}</p>
                        <p className="line-clamp-2 text-[11px]">{thread.preview}</p>
                        <p className="text-[11px]">Updated: {new Date(thread.updatedAt).toLocaleDateString()}</p>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Contract ({contractNotifications.length})</h3>
                  <ul className="mt-2 space-y-2 text-xs text-emerald-900">
                    {contractNotifications.length === 0 ? <li className="rounded-md border border-emerald-200 bg-white px-2 py-2">No contract-stage activity yet.</li> : null}
                    {contractNotifications.slice(0, 4).map((item) => (
                      <li key={item.id} className="rounded-md border border-emerald-200 bg-white p-2">
                        <p className="font-semibold">Deal interest</p>
                        <p className="text-[11px]">{new Date(item.createdAt).toLocaleString()}</p>
                        <p className="text-[11px]">{item.isRead ? "Read" : "Unread"}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-neutral-900">Saved Projects</h2>
                <Link href="/projects" className="text-xs font-semibold text-teal-700 hover:text-teal-600">Browse all projects</Link>
              </div>
              {savedState ? <p className="mt-1 text-xs text-neutral-600">{savedState}</p> : null}

              {savedProjects.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-600">
                  No saved projects yet. Browse listings and bookmark opportunities.
                </div>
              ) : (
                <ul className="mt-3 grid gap-2">
                  {savedProjects.map((entry) => (
                    <li key={entry.id} className="rounded-xl border border-neutral-200 bg-neutral-50 p-2.5 text-sm">
                      <a href={`/projects/${entry.project.slug}`} className="font-semibold text-teal-700 hover:text-teal-600">
                        {entry.project.title}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
              <h2 className="text-base font-semibold text-neutral-900">Quick Actions</h2>
              <div className="mt-3 grid gap-2 text-sm">
                <Link href="/projects" className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 font-semibold text-neutral-800 hover:bg-neutral-100">Browse Projects</Link>
                <Link href="/client/projects/new" className="rounded-lg bg-teal-700 px-3 py-2 font-semibold text-white hover:bg-teal-600">Create Project (Client)</Link>
                <Link href="/client/dashboard" className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 font-semibold text-neutral-800 hover:bg-neutral-100">Open Client Dashboard</Link>
                <Link href="/admin/dashboard" className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 font-semibold text-neutral-800 hover:bg-neutral-100">Open Admin Dashboard</Link>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
              <h2 className="text-base font-semibold text-neutral-900">Live Activity</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {spotlightThreads.length === 0 ? (
                  <li className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-neutral-600">No recent thread activity yet.</li>
                ) : null}
                {spotlightThreads.map((thread) => (
                  <li key={thread.id} className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Thread {thread.id.slice(0, 8)}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-neutral-800">{thread.preview}</p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-600">
                      <span>Unread: {thread.unreadCount}</span>
                      <span>{new Date(thread.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
              <h2 className="text-base font-semibold text-neutral-900">Role Sections</h2>
              <p className="mt-1 text-xs text-neutral-600">Switch workspaces quickly.</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Link href="/client/dashboard" className="rounded-full border border-neutral-300 px-3 py-1.5 font-semibold text-neutral-700 hover:bg-neutral-100">Client</Link>
                <Link href="/admin/dashboard" className="rounded-full border border-neutral-300 px-3 py-1.5 font-semibold text-neutral-700 hover:bg-neutral-100">Admin</Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
