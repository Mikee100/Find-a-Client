"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import MarketplaceNavbar from "@/features/shared/marketplace-navbar";
import FullPageLoader from "@/components/ui/full-page-loader";
import {
  createHireRequest,
  createMessageThread,
  getAuthSession,
  getDeveloperPublicProfile,
  PublicDeveloperProfile,
  trackProjectInquiry
} from "@/lib/api";

const CURRENCY_OPTIONS: Array<{ code: string; label: string }> = [
  { code: "KES", label: "Kenyan Shilling (KSh)" },
  { code: "USD", label: "US Dollar (USD)" },
  { code: "UGX", label: "Ugandan Shilling (USh)" },
  { code: "TZS", label: "Tanzanian Shilling (TSh)" },
  { code: "SOS", label: "Somali Shilling (Sh)" },
  { code: "RWF", label: "Rwandan Franc (RF)" },
  { code: "BIF", label: "Burundian Franc (FBu)" },
  { code: "SSP", label: "South Sudanese Pound (SSP)" },
  { code: "CDF", label: "Congolese Franc (CDF)" }
];

export default function HireDeveloperPage() {
  const params = useParams<{ username: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const username = params?.username;

  const queryProjectId = searchParams.get("projectId")?.trim() || "";
  const queryProjectSlug = searchParams.get("projectSlug")?.trim() || "";
  const queryProjectTitle = searchParams.get("projectTitle")?.trim() || "";

  const [profile, setProfile] = useState<PublicDeveloperProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [brief, setBrief] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetCurrency, setBudgetCurrency] = useState("KES");
  const [timelineDays, setTimelineDays] = useState("");

  useEffect(() => {
    if (!username) {
      return;
    }

    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getDeveloperPublicProfile(username);
        setProfile(data);

        const projectExists = data.projects.some((project) => project.id === queryProjectId);
        const fallbackProjectId = data.projects[0]?.id || "";
        const resolvedProjectId = projectExists ? queryProjectId : fallbackProjectId;

        setSelectedProjectId(resolvedProjectId);

        const resolvedProject = data.projects.find((project) => project.id === resolvedProjectId);
        const developerName = data.fullName;
        const baselineTitle = resolvedProject?.title || queryProjectTitle || "your showcased work";

        setBrief(`Hi ${developerName}, I would like to hire you for a project similar to \"${baselineTitle}\".`);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Unable to load developer profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, [queryProjectId, queryProjectTitle, username]);

  const selectedProject = useMemo(() => {
    if (!profile) {
      return null;
    }

    return profile.projects.find((project) => project.id === selectedProjectId) || null;
  }, [profile, selectedProjectId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) {
      return;
    }

    const trimmedBrief = brief.trim();
    if (!trimmedBrief) {
      setError("Please add a short project brief before continuing.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const session = await getAuthSession();
      if (session.sub === profile.id) {
        setError("You cannot create a hire request for yourself.");
        return;
      }

      const projectId = selectedProject?.id;
      const projectSlug = selectedProject?.slug || queryProjectSlug || undefined;

      if (projectSlug) {
        await trackProjectInquiry(projectSlug, {
          type: "OFFER_PROJECT",
          message: trimmedBrief
        });
      }

      const thread = await createMessageThread({
        recipientId: profile.id,
        projectId,
        initialMessage: trimmedBrief
      });

      const created = await createHireRequest({
        developerId: profile.id,
        projectId,
        threadId: thread.id,
        brief: trimmedBrief,
        budgetAmount: budgetAmount.trim() ? Number(budgetAmount) : undefined,
        budgetCurrency: budgetCurrency.trim() || undefined,
        timelineDays: timelineDays.trim() ? Number(timelineDays) : undefined
      });

      setSuccess(`Hire request ${created.id.slice(0, 8)} created successfully.`);
      router.push(`/client/hire-requests?created=${encodeURIComponent(created.id)}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to create hire request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-50">
        <MarketplaceNavbar />
        <FullPageLoader label="Preparing hiring form" fullScreen={false} />
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-neutral-50 text-neutral-900">
        <MarketplaceNavbar />
        <section className="mx-auto max-w-4xl px-4 py-6">
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error ?? "Developer not found."}</p>
          <Link href="/developers" className="mt-3 inline-flex rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700">
            Back to developers
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <MarketplaceNavbar />

      <section className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Dedicated Hiring Flow</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Hire {profile.fullName}</h1>
          <p className="mt-1 text-sm text-neutral-600">Submit your project brief and kick off a tracked hire request lifecycle.</p>

          <div className="mt-4 grid gap-2 text-sm md:grid-cols-3">
            <p><span className="font-semibold">Title:</span> {profile.title || "Developer"}</p>
            <p><span className="font-semibold">Availability:</span> {profile.availabilityStatus.replace(/_/g, " ")}</p>
            <p><span className="font-semibold">Primary stack:</span> {profile.primaryStack || "Not set"}</p>
          </div>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">Project Context</label>
              <select
                value={selectedProjectId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  setSelectedProjectId(nextId);
                  const nextProject = profile.projects.find((project) => project.id === nextId);
                  if (nextProject) {
                    setBrief(`Hi ${profile.fullName}, I would like to hire you for a project similar to \"${nextProject.title}\".`);
                  }
                }}
                className="mt-1 h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none"
              >
                {profile.projects.length === 0 ? (
                  <option value="">No linked project selected</option>
                ) : null}
                {profile.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">Project Brief</label>
              <textarea
                value={brief}
                onChange={(event) => setBrief(event.target.value)}
                rows={6}
                className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none"
                placeholder="Describe your scope, expected outcome, and constraints"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">Budget Amount</label>
                <input
                  value={budgetAmount}
                  onChange={(event) => setBudgetAmount(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none"
                  placeholder="5000"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">Currency</label>
                <select
                  value={budgetCurrency}
                  onChange={(event) => setBudgetCurrency(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none"
                >
                  {CURRENCY_OPTIONS.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-600">Timeline (days)</label>
                <input
                  value={timelineDays}
                  onChange={(event) => setTimelineDays(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none"
                  placeholder="30"
                />
              </div>
            </div>

            {error ? <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
            {success ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={submitting || !brief.trim()}
                className="rounded-md border border-cyan-300 bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Create Hire Request"}
              </button>
              <Link href={`/developers/${profile.username}`} className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
                Back to profile
              </Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
