"use client";

import Link from "next/link";
import { Bell, Menu, MessageSquare, Search } from "lucide-react";
import AccountMenu from "@/features/shared/account-menu";
import BrandLogo from "@/components/ui/brand-logo";

interface DeveloperDashboardNavbarProps {
  onSignOut: () => void;
  onSignOutEverywhere: () => void;
  pendingSignOut: boolean;
  onOpenSidebar?: () => void;
  unreadMessages?: number;
  unreadNotifications?: number;
}

export default function DeveloperDashboardNavbar({
  onSignOut,
  onSignOutEverywhere,
  pendingSignOut,
  onOpenSidebar,
  unreadMessages = 0,
  unreadNotifications = 0
}: DeveloperDashboardNavbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex w-full items-center gap-3 px-4 py-3 md:px-6">
        <div className="flex items-center gap-2">
          {onOpenSidebar ? (
            <button
              type="button"
              onClick={onOpenSidebar}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-slate-900 hover:text-slate-900 lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-4 w-4" />
            </button>
          ) : null}

          <Link href="/" aria-label="Find a Client" className="inline-flex items-center">
            <BrandLogo />
          </Link>
        </div>

        <div className="hidden min-w-0 flex-1 items-center gap-2 border border-slate-200 bg-slate-50 px-3 py-2 md:flex md:max-w-lg">
          <Search className="h-4 w-4 text-slate-500" />
          <input
            aria-label="Search"
            placeholder="Search developers, projects, messages..."
            className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="ml-auto flex items-center gap-2 text-sm">
          <Link href="/developer/hire-requests" className="border border-slate-200 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 transition hover:border-slate-900 hover:text-slate-900">
            Hire Requests
          </Link>

          <Link href="/developer/messages" className="relative border border-slate-200 p-2 text-slate-600 transition hover:border-slate-900 hover:text-slate-900">
            <MessageSquare className="h-4 w-4" />
            {unreadMessages > 0 ? (
              <span className="absolute -right-1 -top-1 rounded-full bg-slate-900 px-1.5 text-[10px] font-semibold text-white">
                {unreadMessages}
              </span>
            ) : null}
          </Link>

          <Link href="/developer/notifications" className="relative border border-slate-200 p-2 text-slate-600 transition hover:border-slate-900 hover:text-slate-900">
            <Bell className="h-4 w-4" />
            {unreadNotifications > 0 ? (
              <span className="absolute -right-1 -top-1 rounded-full bg-slate-900 px-1.5 text-[10px] font-semibold text-white">
                {unreadNotifications}
              </span>
            ) : null}
          </Link>

          <AccountMenu
            roleLabel="Developer"
            pendingSignOut={pendingSignOut}
            onSignOut={onSignOut}
            onSignOutEverywhere={onSignOutEverywhere}
            dashboardHref="/developer/dashboard"
            settingsHref="/developers/settings"
          />
        </div>
      </nav>
    </header>
  );
}
