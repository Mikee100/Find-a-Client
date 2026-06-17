"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AccountMenu from "@/features/shared/account-menu";
import BrandLogo from "@/components/ui/brand-logo";
import { logout, logoutEverywhere } from "@/lib/api";

export default function ClientDashboardNavbar() {
  const router = useRouter();
  const [pendingSignOut, setPendingSignOut] = useState(false);

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

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="Find a Client" className="inline-flex items-center">
            <BrandLogo />
          </Link>
          <span className="rounded-full bg-sky-50 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
            Client
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Link href="/client/dashboard" className="rounded-md bg-neutral-100 px-2 py-1 font-semibold text-neutral-900">
            Overview
          </Link>
          <Link href="/client/projects/new" className="rounded-md px-2 py-1 text-neutral-700 hover:bg-neutral-100">
            Create Project
          </Link>
          <Link href="/developers" className="rounded-md px-2 py-1 text-neutral-700 hover:bg-neutral-100">
            Find Developers
          </Link>
          <AccountMenu
            roleLabel="Client"
            pendingSignOut={pendingSignOut}
            onSignOut={onSignOut}
            onSignOutEverywhere={onSignOutEverywhere}
            dashboardHref="/client/dashboard"
            settingsHref="/client/settings"
          />
        </div>
      </nav>
    </header>
  );
}
