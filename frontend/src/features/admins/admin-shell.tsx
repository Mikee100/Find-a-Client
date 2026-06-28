"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cog,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users
} from "lucide-react";

import BrandLogo from "@/components/ui/brand-logo";
import FullPageLoader from "@/components/ui/full-page-loader";
import AccountMenu from "@/features/shared/account-menu";
import { getAuthSession, logout, logoutEverywhere } from "@/lib/api";

type AdminNavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  children?: Array<{ label: string; href: string }>;
};

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  {
    label: "Users",
    href: "/admin/users",
    icon: Users,
    children: [
      { label: "Developers", href: "/admin/users/developers" },
      { label: "Clients", href: "/admin/users/clients" }
    ]
  },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Performance", href: "/admin/performance", icon: ShieldCheck },
  { label: "Ranking Debug", href: "/admin/ranking-debug", icon: SlidersHorizontal },
  { label: "Configurations", href: "/admin/configurations", icon: Cog },
  { label: "Settings", href: "/admin/settings", icon: Settings }
];

interface AdminShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

function SideNav({ compact = false, collapsed = false }: { compact?: boolean; collapsed?: boolean }) {
  const pathname = usePathname();
  const [usersOpen, setUsersOpen] = useState(false);
  const usersSectionActive = pathname.startsWith("/admin/users");
  const usersDropdownOpen = usersSectionActive || usersOpen;

  return (
    <nav className={compact ? "flex gap-2 overflow-x-auto pb-2" : "grid gap-1"}>
      {ADMIN_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        const hasChildren = Boolean(item.children?.length);
        const childActive = Boolean(item.children?.some((child) => pathname === child.href));
        const parentActive = active || childActive;

        if (hasChildren && !compact && !collapsed) {
          return (
            <div key={item.href} className="grid gap-1">
              <button
                type="button"
                onClick={() => setUsersOpen((prev) => !prev)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium ${
                  parentActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                <ChevronDown className={`h-4 w-4 transition ${usersDropdownOpen ? "rotate-180" : "rotate-0"}`} />
              </button>

              {usersDropdownOpen ? (
                <div className="ml-4 grid gap-1 border-l border-slate-200 pl-2">
                  <Link
                    href={item.href}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                      pathname === item.href
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    All users
                  </Link>
                  {item.children?.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                        pathname === child.href
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={
              compact
                ? `inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                    parentActive
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`
                : `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                    parentActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  } ${collapsed ? "justify-center px-2" : ""}`
            }
          >
            <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            {!collapsed ? item.label : null}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AdminShell({ title, subtitle, children }: AdminShellProps) {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [pendingSignOut, setPendingSignOut] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);

  useEffect(() => {
    void getAuthSession()
      .then((session) => {
        if (session.role === "ADMIN") {
          setCheckingAuth(false);
          return;
        }

        if (session.role === "CLIENT") {
          router.replace("/client/feed");
          return;
        }

        router.replace("/developer/dashboard");
      })
      .catch(() => {
        router.replace("/login");
      });
  }, [router]);

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

  const subtitleText = useMemo(() => subtitle ?? "Manage platform operations and controls.", [subtitle]);

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <FullPageLoader label="Loading admin workspace" fullScreen={false} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl gap-0">
        <aside
          className={`sticky top-0 hidden h-screen border-r border-slate-200 bg-white py-4 transition-[width,padding] duration-300 lg:block ${
            desktopSidebarCollapsed ? "w-16 px-2" : "w-56 px-3"
          }`}
        >
          <button
            type="button"
            onClick={() => setDesktopSidebarCollapsed((current) => !current)}
            className="absolute right-0 top-12 z-40 flex h-8 w-8 translate-x-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            aria-label={desktopSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={desktopSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {desktopSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          <div className={`mb-6 ${desktopSidebarCollapsed ? "flex justify-center" : ""}`}>
            {desktopSidebarCollapsed ? (
              <Link
                href="/admin/dashboard"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white"
                aria-label="Find a Client Admin"
              >
                FC
              </Link>
            ) : (
              <Link href="/admin/dashboard" className="inline-flex items-center" aria-label="Find a Client Admin">
                <BrandLogo />
              </Link>
            )}
          </div>

          {!desktopSidebarCollapsed ? (
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Admin</p>
          ) : null}
          <SideNav collapsed={desktopSidebarCollapsed} />
        </aside>

        <section className="min-w-0 flex-1 p-4 md:p-6">
          <header className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Control Panel</p>
                <h1 className="mt-1 text-2xl font-semibold text-slate-900">{title}</h1>
                <p className="mt-1 text-sm text-slate-600">{subtitleText}</p>
              </div>
              <AccountMenu
                roleLabel="Admin"
                pendingSignOut={pendingSignOut}
                onSignOut={onSignOut}
                onSignOutEverywhere={onSignOutEverywhere}
                dashboardHref="/admin/dashboard"
                settingsHref="/admin/settings"
              />
            </div>
            <div className="mt-4 lg:hidden">
              <SideNav compact />
            </div>
          </header>

          {children}
        </section>
      </div>
    </main>
  );
}
