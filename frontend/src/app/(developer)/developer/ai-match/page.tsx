"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import DeveloperDashboardNavbar from "@/features/developer/developer-dashboard-navbar";
import FullPageLoader from "@/components/ui/full-page-loader";
import { DeveloperDashboardData, getDeveloperDashboardData, logout, logoutEverywhere } from "@/lib/api";

function formatPrice(value: number | string | null, currency: string): string {
  if (value === null || value === "") {
    return "Contact";
  }

  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) {
    return "Contact";
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(numeric));
}

export default function DeveloperAiMatchPage() {
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

  const profileSkills = useMemo(
    () => new Set((data?.profile.skills ?? []).map((skill) => skill.toLowerCase())),
    [data],
  );

  if (loading) {
    return <FullPageLoader label="Loading AI match" />;
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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Recommendations</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">AI Match</h1>
          </div>
          <Link href="/developer/dashboard" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        {!data?.recommendedProjects.length ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            No project recommendations yet. Add more skills to your profile and publish more portfolio projects to improve matching quality.
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.recommendedProjects.map((project) => {
              const matchedSkills = project.techStack.filter((skill) => profileSkills.has(skill.toLowerCase()));

              return (
                <article key={project.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-semibold text-slate-900">{project.title}</h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                      <Sparkles className="h-3.5 w-3.5" />
                      Match
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm text-slate-600">{project.shortDescription}</p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(matchedSkills.length ? matchedSkills : project.techStack.slice(0, 3)).map((skill) => (
                      <span key={`${project.id}-${skill}`} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>{project.category.replaceAll("_", " ")}</span>
                    <span>{formatPrice(project.price, project.currency)}</span>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <Link href={`/projects/${project.slug}`} className="text-sm font-medium text-slate-800 hover:text-slate-950 hover:underline">
                      View project
                    </Link>
                    <span className="text-xs text-slate-500">{matchedSkills.length} skill matches</span>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
