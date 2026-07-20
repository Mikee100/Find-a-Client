"use client";

import { useState } from "react";
import { getPayoutAccountStatus, PayoutAccountStatus } from "@/lib/api";

export default function DeveloperPayoutSection({ developerId }: { developerId: string }) {
  const [status, setStatus] = useState<PayoutAccountStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkStatus() {
    try {
      setLoading(true);
      setError(null);
      const result = await getPayoutAccountStatus(developerId);
      setStatus(result);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load payout account status.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Payouts</h2>
      <p className="mt-1 text-sm text-slate-600">
        Connect a Stripe payout account so you can receive funds when a client releases a milestone.
      </p>

      {error ? (
        <p className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      {status ? (
        <div className="mt-3 text-sm text-slate-700">
          <p>
            Charges enabled: <strong>{status.chargesEnabled ? "Yes" : "No"}</strong> · Payouts enabled:{" "}
            <strong>{status.payoutsEnabled ? "Yes" : "No"}</strong>
          </p>
          {status.onboardingRequired && status.onboardingUrl ? (
            <a
              href={status.onboardingUrl}
              className="mt-2 inline-block rounded-md border border-slate-200 bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black"
            >
              Finish Stripe onboarding
            </a>
          ) : (
            <p className="mt-2 text-sm text-emerald-700">Your payout account is fully connected.</p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void checkStatus()}
          disabled={loading}
          className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-900 hover:text-slate-900 disabled:opacity-60"
        >
          {loading ? "Checking..." : "Check payout account status"}
        </button>
      )}
    </section>
  );
}
