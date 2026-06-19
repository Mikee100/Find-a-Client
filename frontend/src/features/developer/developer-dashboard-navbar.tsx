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
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex w-full items-center gap-3 px-4 py-3 md:px-6">
        <div className="flex items-center gap-2">
          {onOpenSidebar ? (
            <button
              type="button"
              onClick={onOpenSidebar}
              className="rounded-lg border border-neutral-200 p-2 text-neutral-600 lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-4 w-4" />
            </button>
          ) : null}

          <Link href="/" aria-label="Find a Client" className="inline-flex items-center">
            <BrandLogo />
          </Link>
        </div>

        <div className="hidden min-w-0 flex-1 items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 md:flex md:max-w-lg">
          <Search className="h-4 w-4 text-neutral-500" />
          <input
            aria-label="Search"
            placeholder="Search developers, projects, messages..."
            className="w-full bg-transparent text-sm text-neutral-700 outline-none placeholder:text-neutral-400"
          />
        </div>

        <div className="ml-auto flex items-center gap-2 text-sm">
          <Link href="/developer/messages" className="relative rounded-lg border border-neutral-200 p-2 text-neutral-600">
            <MessageSquare className="h-4 w-4" />
            {unreadMessages > 0 ? (
              <span className="absolute -right-1 -top-1 rounded-full bg-blue-600 px-1.5 text-[10px] font-semibold text-white">
                {unreadMessages}
              </span>
            ) : null}
          </Link>

          <Link href="/developer/dashboard#notifications" className="relative rounded-lg border border-neutral-200 p-2 text-neutral-600">
            <Bell className="h-4 w-4" />
            {unreadNotifications > 0 ? (
              <span className="absolute -right-1 -top-1 rounded-full bg-blue-600 px-1.5 text-[10px] font-semibold text-white">
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
