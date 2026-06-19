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
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 md:px-6">
        <Link href="/" aria-label="Find a Client" className="inline-flex items-center">
          <BrandLogo imageClassName="h-7 w-7 rounded-md" textClassName="text-[15px] font-semibold" />
        </Link>

        <div className="flex items-center gap-2">
            <Link
              href="/client/messages"
              className="inline-flex h-8 items-center rounded-md border border-neutral-200 px-2.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
            >
              Messages
            </Link>
            <AccountMenu
              roleLabel="Client"
              pendingSignOut={pendingSignOut}
              onSignOut={onSignOut}
              onSignOutEverywhere={onSignOutEverywhere}
              dashboardHref="/client/feed"
              settingsHref="/client/settings"
              compact
            />
        </div>
      </nav>
    </header>
  );
}
