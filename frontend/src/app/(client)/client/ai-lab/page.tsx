"use client";

import { FormEvent, useState } from "react";
import ClientDashboardNavbar from "@/features/client/client-dashboard-navbar";
import ClientSidebar from "@/features/shared/client-sidebar";
import {
  AiClientMatchResponse,
  AiProfileImprovementsResponse,
  AiProposalTemplateResponse,
  getAiClientMatches,
  getAiProfileImprovements,
  getAiProposalTemplate
} from "@/lib/api";

function parseSkills(input: string): string[] {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ClientAiLabPage() {
  const [matchBrief, setMatchBrief] = useState("Need a SaaS dashboard with Next.js frontend, NestJS API, and PostgreSQL.");
  const [matchSkills, setMatchSkills] = useState("next,nestjs,postgres");
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<AiClientMatchResponse | null>(null);

  const [proposalBrief, setProposalBrief] = useState("Build an MVP for a client onboarding portal with scheduling and email notifications.");
  const [proposalTimeline, setProposalTimeline] = useState("6 weeks");
  const [proposalBudget, setProposalBudget] = useState("$6k-$10k");
  const [proposalLoading, setProposalLoading] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [proposalResult, setProposalResult] = useState<AiProposalTemplateResponse | null>(null);

  const [improvementsLoading, setImprovementsLoading] = useState(false);
  const [improvementsError, setImprovementsError] = useState<string | null>(null);
  const [improvementsResult, setImprovementsResult] = useState<AiProfileImprovementsResponse | null>(null);

  async function runMatches(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMatchLoading(true);
    setMatchError(null);

    try {
      const result = await getAiClientMatches({
        brief: matchBrief.trim(),
        requiredSkills: parseSkills(matchSkills),
        limit: 3,
        includeReasoning: true
      });
      setMatchResult(result);
    } catch (error) {
      setMatchError(error instanceof Error ? error.message : "Failed to run AI matching.");
    } finally {
      setMatchLoading(false);
    }
  }

  async function runProfileImprovements() {
    setImprovementsLoading(true);
    setImprovementsError(null);

    try {
      const result = await getAiProfileImprovements();
      setImprovementsResult(result);
    } catch (error) {
      setImprovementsError(error instanceof Error ? error.message : "Failed to fetch profile suggestions.");
    } finally {
      setImprovementsLoading(false);
    }
  }

  async function runProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProposalLoading(true);
    setProposalError(null);

    try {
      const result = await getAiProposalTemplate({
        brief: proposalBrief.trim(),
        timelinePreference: proposalTimeline.trim() || undefined,
        budgetRange: proposalBudget.trim() || undefined
      });
      setProposalResult(result);
    } catch (error) {
      setProposalError(error instanceof Error ? error.message : "Failed to generate proposal template.");
    } finally {
      setProposalLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <ClientDashboardNavbar />

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_1fr] lg:px-6">
        <aside className="hidden lg:block">
          <ClientSidebar />
        </aside>

        <section className="space-y-5">
          <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">AI Lab</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">Test AI Endpoints</h1>
            <p className="mt-1 text-sm text-slate-600">
              Use this page to validate Gemini-backed responses for matching, profile guidance, and proposal generation.
            </p>
          </header>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">Client to developers</h2>
            <form className="mt-3 grid gap-3" onSubmit={runMatches}>
              <textarea
                value={matchBrief}
                onChange={(event) => setMatchBrief(event.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Describe the project brief"
                required
              />
              <input
                value={matchSkills}
                onChange={(event) => setMatchSkills(event.target.value)}
                className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
                placeholder="skills,comma,separated"
              />
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={matchLoading}
                  className="inline-flex h-10 items-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {matchLoading ? "Running..." : "Run Matching"}
                </button>
                {matchError ? <p className="text-sm text-rose-700">{matchError}</p> : null}
              </div>
            </form>
            {matchResult ? (
              <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                {JSON.stringify(matchResult, null, 2)}
              </pre>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">Profile improvements</h2>
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => void runProfileImprovements()}
                disabled={improvementsLoading}
                className="inline-flex h-10 items-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                {improvementsLoading ? "Running..." : "Run Profile Coach"}
              </button>
              {improvementsError ? <p className="text-sm text-rose-700">{improvementsError}</p> : null}
            </div>
            {improvementsResult ? (
              <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                {JSON.stringify(improvementsResult, null, 2)}
              </pre>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">Proposal template</h2>
            <form className="mt-3 grid gap-3" onSubmit={runProposal}>
              <textarea
                value={proposalBrief}
                onChange={(event) => setProposalBrief(event.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Describe the client brief"
                required
              />
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={proposalTimeline}
                  onChange={(event) => setProposalTimeline(event.target.value)}
                  className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
                  placeholder="Timeline preference"
                />
                <input
                  value={proposalBudget}
                  onChange={(event) => setProposalBudget(event.target.value)}
                  className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
                  placeholder="Budget range"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={proposalLoading}
                  className="inline-flex h-10 items-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {proposalLoading ? "Running..." : "Generate Proposal"}
                </button>
                {proposalError ? <p className="text-sm text-rose-700">{proposalError}</p> : null}
              </div>
            </form>
            {proposalResult ? (
              <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                {JSON.stringify(proposalResult, null, 2)}
              </pre>
            ) : null}
          </section>
        </section>
      </section>
    </main>
  );
}
