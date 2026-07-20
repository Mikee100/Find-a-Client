"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { createMilestone, HireRequestResponse, listMilestonesForHireRequest, MilestoneResponse } from "@/lib/api";
import MilestoneRow from "@/components/milestones/milestone-row";

const MILESTONE_ELIGIBLE_HIRE_REQUEST_STATUSES: HireRequestResponse["status"][] = [
  "ACCEPTED",
  "PROPOSAL_SENT",
  "NEGOTIATING"
];

interface MilestonePanelProps {
  hireRequest: HireRequestResponse;
  viewerRole: "CLIENT" | "DEVELOPER";
}

export default function MilestonePanel({ hireRequest, viewerRole }: MilestonePanelProps) {
  const isClient = viewerRole === "CLIENT";

  const [milestones, setMilestones] = useState<MilestoneResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [createTitle, setCreateTitle] = useState("");
  const [createAmount, setCreateAmount] = useState("");
  const [createCurrency, setCreateCurrency] = useState(
    hireRequest.proposalCurrency ?? hireRequest.budgetCurrency ?? "USD"
  );
  const [createDueDate, setCreateDueDate] = useState("");

  const refresh = useCallback(async () => {
    const items = await listMilestonesForHireRequest(hireRequest.id);
    setMilestones(items);
  }, [hireRequest.id]);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        await refresh();
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Unable to load milestones.");
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    const amount = Number(createAmount);
    if (!createTitle.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Enter a title and a valid amount.");
      return;
    }

    try {
      setActionBusy(true);
      setError(null);
      await createMilestone(hireRequest.id, {
        title: createTitle.trim(),
        amount,
        currency: createCurrency.trim() || undefined,
        dueDate: createDueDate ? new Date(createDueDate).toISOString() : undefined
      });
      await refresh();
      setCreateTitle("");
      setCreateAmount("");
      setCreateDueDate("");
      setCreateOpen(false);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to create milestone.");
    } finally {
      setActionBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Loading milestones...</p>;
  }

  const canCreate = isClient && MILESTONE_ELIGIBLE_HIRE_REQUEST_STATUSES.includes(hireRequest.status);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Milestones & Payments</h2>
      </div>

      {error ? (
        <p className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      <div className="space-y-3">
        {milestones.map((milestone) => (
          <MilestoneRow key={milestone.id} milestone={milestone} viewerRole={viewerRole} onChanged={refresh} />
        ))}

        {milestones.length === 0 && !canCreate ? (
          <p className="text-sm text-slate-500">No milestones have been created for this hire request yet.</p>
        ) : null}
      </div>

      {canCreate ? (
        <div className="mt-3 border-t border-slate-100 pt-3">
          {!createOpen ? (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-900"
            >
              + Add milestone
            </button>
          ) : (
            <form onSubmit={(event) => void handleCreate(event)} className="space-y-2">
              <p className="text-sm text-slate-600">
                {milestones.length === 0
                  ? "No milestones yet. Create one to start funding this work."
                  : "Add another phase to this engagement."}
              </p>
              <input
                type="text"
                value={createTitle}
                onChange={(event) => setCreateTitle(event.target.value)}
                placeholder="Milestone title"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={createAmount}
                  onChange={(event) => setCreateAmount(event.target.value)}
                  placeholder="Amount"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={createCurrency}
                  onChange={(event) => setCreateCurrency(event.target.value.toUpperCase())}
                  placeholder="USD"
                  maxLength={3}
                  className="w-24 rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <input
                type="date"
                value={createDueDate}
                onChange={(event) => setCreateDueDate(event.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={actionBusy}
                  className="rounded-md border border-slate-200 bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
                >
                  Create milestone
                </button>
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-900"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}
