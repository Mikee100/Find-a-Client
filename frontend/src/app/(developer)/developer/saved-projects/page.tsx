"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bookmark } from "lucide-react";
import DeveloperDashboardNavbar from "@/features/developer/developer-dashboard-navbar";
import FullPageLoader from "@/components/ui/full-page-loader";
import { DeveloperDashboardData, getDeveloperDashboardData, logout, logoutEverywhere } from "@/lib/api";

export default function DeveloperSavedProjectsPage() {
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

  if (loading) {
    return <FullPageLoader label="Loading saved projects" />;
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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Library</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Saved Projects</h1>
          </div>
          <Link href="/developer/dashboard" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        {!data?.savedProjects.length ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            You have no saved projects yet. Browse projects and save interesting opportunities.
          </section>
        ) : (
          <section className="grid gap-3">
            {data.savedProjects.map((item) => (
              <article key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Bookmark className="h-4 w-4 text-slate-500" />
                    {item.project.title}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{item.project.status}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/projects/${item.project.slug}`} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                    View in Marketplace
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
