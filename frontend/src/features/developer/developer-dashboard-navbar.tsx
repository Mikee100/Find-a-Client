"use client";

import Link from "next/link";
import AccountMenu from "@/features/shared/account-menu";

interface DeveloperDashboardNavbarProps {
  onSignOut: () => void;
  onSignOutEverywhere: () => void;
  pendingSignOut: boolean;
}

export default function DeveloperDashboardNavbar({
  onSignOut,
  onSignOutEverywhere,
  pendingSignOut
}: DeveloperDashboardNavbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-lg font-bold tracking-tight text-neutral-900">
            Find a Client
          </Link>
          <span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
            Developer
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Link href="/developer/dashboard" className="rounded-md bg-neutral-100 px-2 py-1 font-semibold text-neutral-900">
            Overview
          </Link>
          <Link href="/projects" className="rounded-md px-2 py-1 text-neutral-700 hover:bg-neutral-100">
            Browse Projects
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
