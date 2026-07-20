"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CircleHelp, Mail, MessageSquare, Settings } from "lucide-react";
import DeveloperDashboardNavbar from "@/features/developer/developer-dashboard-navbar";
import FullPageLoader from "@/components/ui/full-page-loader";
import { DeveloperDashboardData, getDeveloperDashboardData, logout, logoutEverywhere } from "@/lib/api";

const helpItems = [
  {
    title: "Update your developer profile",
    description: "Keep your stack, bio, and links fresh to improve ranking and project matching.",
    href: "/developers/settings",
    action: "Open settings",
    icon: Settings,
  },
  {
    title: "Review your incoming messages",
    description: "Respond quickly to clients to increase conversion from interest to hire requests.",
    href: "/developer/messages",
    action: "Open messages",
    icon: MessageSquare,
  },
  {
    title: "Contact support",
    description: "Need help with your account or project visibility? Reach out to the team.",
    href: "mailto:support@findaclient.app",
    action: "Email support",
    icon: Mail,
  },
] as const;

export default function DeveloperHelpPage() {
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
    return <FullPageLoader label="Loading help" />;
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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Support</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Help Center</h1>
          </div>
          <Link href="/developer/dashboard" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <CircleHelp className="h-4 w-4 text-slate-600" />
            Quick help links
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {helpItems.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Icon className="h-4 w-4 text-slate-600" />
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                  <Link href={item.href} className="mt-4 inline-flex text-sm font-medium text-slate-800 hover:text-slate-950 hover:underline">
                    {item.action}
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
