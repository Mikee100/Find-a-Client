"use client";

import Link from "next/link";
import AdminShell from "@/features/admins/admin-shell";

export default function AdminDashboardPage() {
  return (
    <AdminShell title="Dashboard" subtitle="Admin overview for moderation and operations.">
      <section className="grid place-items-center p-1 md:p-2">
        <section className="w-full max-w-3xl rounded-xl border border-neutral-300 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <p className="mt-2 text-neutral-600">
            Admin workspace scaffold is ready. Add moderation, approvals, and platform controls here.
          </p>
          <div className="mt-4">
            <Link
              href="/admin/ranking-debug"
              className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Open ranking debug
            </Link>
          </div>
        </section>
      </section>
    </AdminShell>
  );
}
