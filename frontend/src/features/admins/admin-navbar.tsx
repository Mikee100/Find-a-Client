"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import BrandLogo from "@/components/ui/brand-logo";
import AccountMenu from "@/features/shared/account-menu";
import { logout, logoutEverywhere } from "@/lib/api";

export default function AdminNavbar() {
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
          <Link href="/admin/dashboard" aria-label="Find a Client Admin" className="inline-flex items-center">
            <BrandLogo />
          </Link>
          <span className="rounded-full bg-red-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-700">
            Admin
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Link href="/admin/dashboard" className="rounded-md px-2 py-1 text-neutral-700 hover:bg-neutral-100">
            Dashboard
          </Link>
          <Link href="/admin/dashboard#moderation" className="rounded-md px-2 py-1 text-neutral-700 hover:bg-neutral-100">
            Moderation
          </Link>
          <AccountMenu
            roleLabel="Admin"
            pendingSignOut={pendingSignOut}
            onSignOut={onSignOut}
            onSignOutEverywhere={onSignOutEverywhere}
            dashboardHref="/admin/dashboard"
          />
        </div>
      </nav>
    </header>
  );
}
