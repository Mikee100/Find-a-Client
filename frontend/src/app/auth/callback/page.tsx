"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import FullPageLoader from "@/components/ui/full-page-loader";
import { AppRole, completeOAuthSession, getAuthSession } from "@/lib/api";

function getDefaultRedirect(role: AppRole): string {
  if (role === "ADMIN") {
    return "/admin/dashboard";
  }

  if (role === "CLIENT") {
    return "/client/feed";
  }

  return "/developers/dashboard";
}

function readSafeNextPath(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) {
    return null;
  }

  if (trimmed.startsWith("//")) {
    return null;
  }

  return trimmed;
}

function readOAuthAccessToken(searchParams: URLSearchParams): string | null {
  const queryToken = searchParams.get("access_token")?.trim();
  if (queryToken) {
    return queryToken;
  }

  if (typeof window === "undefined") {
    return null;
  }

  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  if (!hash) {
    return null;
  }

  const hashParams = new URLSearchParams(hash);
  return hashParams.get("access_token")?.trim() ?? null;
}

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const errorMessage = useMemo(() => {
    return searchParams.get("error_description") ?? searchParams.get("error");
  }, [searchParams]);

  useEffect(() => {
    void (async () => {
      if (errorMessage) {
        router.replace(`/login?oauthError=${encodeURIComponent(errorMessage)}`);
        return;
      }

      const safeNext = readSafeNextPath(searchParams.get("next"));
      const intent = searchParams.get("intent");
      const oauthAccessToken = readOAuthAccessToken(searchParams);

      try {
        let resolvedRole: AppRole | null = null;

        if (oauthAccessToken) {
          const oauthSession = await completeOAuthSession(oauthAccessToken);
          resolvedRole = oauthSession.role;
        } else {
          const session = await getAuthSession();
          resolvedRole = session.role;
        }

        if (intent === "github-connect") {
          router.replace(safeNext ?? "/developer/settings?githubConnected=1");
          return;
        }

        router.replace(safeNext ?? getDefaultRedirect(resolvedRole ?? "DEVELOPER"));
      } catch {
        if (intent === "github-connect") {
          router.replace(`/login?oauthNotice=${encodeURIComponent("GitHub returned successfully. Sign in again, then verify ownership in settings.")}`);
          return;
        }

        router.replace(`/login?oauthNotice=${encodeURIComponent("OAuth completed. Please sign in to continue.")}`);
      }
    })();
  }, [errorMessage, router, searchParams]);

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <FullPageLoader label="Completing sign-in" fullScreen={false} />
    </main>
  );
}
