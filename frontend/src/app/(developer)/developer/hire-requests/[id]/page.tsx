"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DeveloperDashboardNavbar from "@/features/developer/developer-dashboard-navbar";
import MilestonePanel from "@/components/milestones/milestone-panel";
import { getHireRequestById, HireRequestResponse, logout, logoutEverywhere } from "@/lib/api";

export default function DeveloperHireRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const hireRequestId = params.id;
  const router = useRouter();

  const [hireRequest, setHireRequest] = useState<HireRequestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getHireRequestById(hireRequestId);
        setHireRequest(data);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Unable to load hire request.");
      } finally {
        setLoading(false);
      }
    })();
  }, [hireRequestId]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <DeveloperDashboardNavbar
        onSignOut={() => {
          void onSignOut();
        }}
        onSignOutEverywhere={() => {
          void onSignOutEverywhere();
        }}
        pendingSignOut={pendingSignOut}
      />

      <section className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Developer Workspace</p>
            <h1 className="text-2xl font-semibold tracking-tight">Hire Request</h1>
          </div>
          <Link href="/developer/hire-requests" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Back to hire requests
          </Link>
        </div>

        {error ? <p className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        {loading ? <p className="text-sm text-slate-600">Loading hire request...</p> : null}

        {!loading && hireRequest ? (
          <div className="space-y-4">
            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">{hireRequest.project?.title ?? "Project Offer"}</p>
              <p className="mt-2 text-sm text-slate-700">{hireRequest.brief}</p>
              <div className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
                <p>Client: {hireRequest.client?.fullName || hireRequest.client?.username || hireRequest.clientId}</p>
                <p>Created: {new Date(hireRequest.createdAt).toLocaleString()}</p>
              </div>
            </article>

            <MilestonePanel hireRequest={hireRequest} viewerRole="DEVELOPER" />
          </div>
        ) : null}
      </section>
    </main>
  );
}
