"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type AuthorizationDetails = {
  authorization_id: string;
  client: {
    name: string;
  };
  redirect_uri: string;
  scope?: string;
};

type ExistingGrantDetails = {
  redirect_url: string;
};

function isAuthorizationDetails(value: unknown): value is AuthorizationDetails {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AuthorizationDetails>;
  return Boolean(
    candidate.authorization_id
      && candidate.client
      && typeof candidate.client.name === "string"
      && typeof candidate.redirect_uri === "string"
  );
}

function isExistingGrantDetails(value: unknown): value is ExistingGrantDetails {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ExistingGrantDetails>;
  return typeof candidate.redirect_url === "string";
}

function scopeLabel(scope: string): string {
  switch (scope) {
    case "openid":
      return "Confirm your identity (OpenID Connect)";
    case "email":
      return "Access your email address";
    case "profile":
      return "Access your profile details";
    case "phone":
      return "Access your phone number";
    default:
      return scope;
  }
}

export default function OAuthConsentPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"approve" | "deny" | null>(null);
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);

  const authorizationId = useMemo(() => searchParams.get("authorization_id")?.trim() ?? "", [searchParams]);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      return null;
    }

    return createClient(supabaseUrl, supabaseAnonKey);
  }, [supabaseUrl, supabaseAnonKey]);

  useEffect(() => {
    let active = true;

    async function loadAuthorizationDetails(): Promise<void> {
      if (!authorizationId) {
        setError("Missing authorization_id in the URL.");
        setLoading(false);
        return;
      }

      if (!supabase) {
        setError("Supabase client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
        setLoading(false);
        return;
      }

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (!active) {
        return;
      }

      if (userError) {
        setError(userError.message);
        setLoading(false);
        return;
      }

      if (!user) {
        setError("You are not signed in with a Supabase session. Sign in first, then retry this authorization request.");
        setLoading(false);
        return;
      }

      const { data, error: detailsError } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

      if (!active) {
        return;
      }

      if (detailsError) {
        setError(detailsError.message);
        setLoading(false);
        return;
      }

      if (isExistingGrantDetails(data) && !isAuthorizationDetails(data)) {
        window.location.replace(data.redirect_url);
        return;
      }

      if (!isAuthorizationDetails(data)) {
        setError("Invalid authorization request details.");
        setLoading(false);
        return;
      }

      setDetails(data);
      setLoading(false);
    }

    void loadAuthorizationDetails();

    return () => {
      active = false;
    };
  }, [authorizationId, supabase]);

  async function handleDecision(decision: "approve" | "deny"): Promise<void> {
    if (!details || !supabase) {
      return;
    }

    setSubmitting(decision);
    setError(null);

    const response = decision === "approve"
      ? await supabase.auth.oauth.approveAuthorization(details.authorization_id)
      : await supabase.auth.oauth.denyAuthorization(details.authorization_id);

    if (response.error) {
      setError(response.error.message);
      setSubmitting(null);
      return;
    }

    window.location.replace(response.data.redirect_url);
  }

  const scopes = details?.scope?.trim()
    ? details.scope.split(" ").map((item) => item.trim()).filter(Boolean)
    : [];

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F9FAFB] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-2xl rounded-xl border border-[#E5E7EB] bg-white p-6 text-sm text-slate-700 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          Loading authorization request...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F9FAFB] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-2xl rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] sm:p-8">
        <h1 className="text-2xl font-semibold text-slate-900">Authorize Application</h1>
        <p className="mt-2 text-sm text-slate-600">
          Review this request and choose whether to allow access to your account.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {details && (
          <div className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Application</p>
              <p className="text-sm font-medium text-slate-900">{details.client.name}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Redirect URI</p>
              <p className="break-all text-sm text-slate-900">{details.redirect_uri}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Requested Permissions</p>
              {scopes.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800">
                  {scopes.map((scope) => (
                    <li key={scope}>{scopeLabel(scope)}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-700">No explicit scopes requested (defaults apply).</p>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              void handleDecision("approve");
            }}
            disabled={!details || submitting !== null}
            className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting === "approve" ? "Approving..." : "Approve"}
          </button>

          <button
            type="button"
            onClick={() => {
              void handleDecision("deny");
            }}
            disabled={!details || submitting !== null}
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting === "deny" ? "Denying..." : "Deny"}
          </button>

          <Link href="/" className="text-sm text-slate-600 underline-offset-2 hover:underline">
            Go back home
          </Link>

          {authorizationId && (
            <Link
              href={`/login?redirect=${encodeURIComponent(`/oauth/consent?authorization_id=${authorizationId}`)}`}
              className="text-sm text-slate-600 underline-offset-2 hover:underline"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
