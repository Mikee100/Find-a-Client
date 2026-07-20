"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowLeft, BarChart3, Eye, Heart, MessageSquare, Zap } from "lucide-react";
import DeveloperDashboardNavbar from "@/features/developer/developer-dashboard-navbar";
import FullPageLoader from "@/components/ui/full-page-loader";
import { DeveloperDashboardData, getDeveloperDashboardData, logout, logoutEverywhere } from "@/lib/api";

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export default function DeveloperAnalyticsPage() {
  const router = useRouter();
  const [pendingLogout, setPendingLogout] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DeveloperDashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const dashboardData = await getDeveloperDashboardData();
        if (cancelled) {
          return;
        }
        setData(dashboardData);
      } catch {
        if (!cancelled) {
          router.replace("/login");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [router]);

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

  const unreadMessages = useMemo(
    () => (data ? data.threads.reduce((sum, thread) => sum + thread.unreadCount, 0) : 0),
    [data],
  );

  const unreadNotifications = useMemo(
    () => (data ? data.notifications.filter((item) => !item.isRead).length : 0),
    [data],
  );

  const totalViews = useMemo(
    () => (data ? data.myProjects.reduce((sum, project) => sum + project.viewCount, 0) : 0),
    [data],
  );

  const totalLikes = useMemo(
    () => (data ? data.myProjects.reduce((sum, project) => sum + project.likeCount, 0) : 0),
    [data],
  );

  const publishedCount = useMemo(
    () => (data ? data.myProjects.filter((project) => project.status === "PUBLISHED").length : 0),
    [data],
  );

  const draftCount = useMemo(
    () => (data ? data.myProjects.filter((project) => project.status === "DRAFT").length : 0),
    [data],
  );

  if (loading) {
    return <FullPageLoader label="Loading analytics" />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DeveloperDashboardNavbar
        onSignOut={onLogout}
        onSignOutEverywhere={onLogoutEverywhere}
        pendingSignOut={pendingLogout}
        unreadMessages={unreadMessages}
        unreadNotifications={unreadNotifications}
      />

      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Insights</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Developer Analytics</h1>
          </div>
          <Link href="/developer/dashboard" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"><Eye className="h-4 w-4" /> Total Views</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCompactNumber(totalViews)}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"><Heart className="h-4 w-4" /> Total Likes</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCompactNumber(totalLikes)}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"><BarChart3 className="h-4 w-4" /> Published</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{publishedCount}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"><Activity className="h-4 w-4" /> Drafts</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{draftCount}</p>
          </article>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><MessageSquare className="h-4 w-4 text-slate-600" /> Messages</p>
            <p className="mt-2 text-sm text-slate-600">Unread messages: <span className="font-semibold text-slate-900">{unreadMessages}</span></p>
            <p className="text-sm text-slate-600">Total conversations: <span className="font-semibold text-slate-900">{data?.threads.length ?? 0}</span></p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Zap className="h-4 w-4 text-slate-600" /> Recommendations</p>
            <p className="mt-2 text-sm text-slate-600">Suggested projects for you: <span className="font-semibold text-slate-900">{data?.recommendedProjects.length ?? 0}</span></p>
            <p className="text-sm text-slate-600">Saved projects: <span className="font-semibold text-slate-900">{data?.savedProjects.length ?? 0}</span></p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Activity className="h-4 w-4 text-slate-600" /> Activity</p>
            <p className="mt-2 text-sm text-slate-600">Unread notifications: <span className="font-semibold text-slate-900">{unreadNotifications}</span></p>
            <p className="text-sm text-slate-600">Profile completeness: <span className="font-semibold text-slate-900">{data?.completeness.percentage ?? 0}%</span></p>
          </article>
        </section>
      </main>
    </div>
  );
}
