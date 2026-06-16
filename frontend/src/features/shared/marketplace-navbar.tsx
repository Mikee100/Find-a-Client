"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AccountMenu from "@/features/shared/account-menu";
import { logout, logoutEverywhere } from "@/lib/api";

export default function MarketplaceNavbar() {
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
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-lg font-bold tracking-tight text-neutral-900">
            Find a Client
          </Link>
          <span className="rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-700">
            Marketplace
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Link href="/projects" className="rounded-md px-2 py-1 text-neutral-700 hover:bg-neutral-100">
            Projects
          </Link>
          <Link href="/client/projects/new" className="rounded-md px-2 py-1 text-neutral-700 hover:bg-neutral-100">
            Post Project
          </Link>
          <Link href="/developer/dashboard" className="rounded-md px-2 py-1 text-neutral-700 hover:bg-neutral-100">
            Dashboard
          </Link>
          <AccountMenu
            roleLabel="Account"
            pendingSignOut={pendingSignOut}
            onSignOut={onSignOut}
            onSignOutEverywhere={onSignOutEverywhere}
            dashboardHref="/dashboard"
          />
        </div>
      </nav>
    </header>
  );
}
