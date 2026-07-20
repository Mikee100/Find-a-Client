"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppRole, resendVerification, verifyEmail } from "@/lib/api";

function getRedirectPath(role: AppRole): string {
  if (role === "ADMIN") {
    return "/admin/dashboard";
  }

  if (role === "CLIENT") {
    return "/client/feed";
  }

  return "/developers/dashboard";
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryToken = searchParams.get("token")?.trim() ?? "";
  const queryEmail = searchParams.get("email")?.trim().toLowerCase() ?? "";

  const [token, setToken] = useState(queryToken);
  const [email, setEmail] = useState(queryEmail);
  const [pendingVerify, setPendingVerify] = useState(false);
  const [pendingResend, setPendingResend] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const autoAttemptedRef = useRef(false);

  const hasTokenFromLink = useMemo(() => token.length > 0, [token]);

  useEffect(() => {
    if (!queryToken || queryToken.length < 20 || autoAttemptedRef.current) {
      return;
    }

    autoAttemptedRef.current = true;
    setPendingVerify(true);
    setError(null);
    setNotice("Verifying your email from the link...");

    void verifyEmail({ token: queryToken })
      .then((result) => {
        setNotice("Email verified. Redirecting...");
        router.push(getRedirectPath(result.role));
      })
      .catch((submitError) => {
        const message = submitError instanceof Error ? submitError.message : "Unable to verify email.";
        setError(message);
        setNotice(null);
      })
      .finally(() => {
        setPendingVerify(false);
      });
  }, [queryToken, router]);

  async function onVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingVerify(true);
    setError(null);
    setNotice(null);

    try {
      const result = await verifyEmail({ token: token.trim() });
      setNotice("Email verified. Redirecting...");
      router.push(getRedirectPath(result.role));
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unable to verify email.";
      setError(message);
    } finally {
      setPendingVerify(false);
    }
  }

  async function onResend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingResend(true);
    setError(null);
    setNotice(null);

    try {
      await resendVerification({ email: email.trim().toLowerCase() });
      setNotice("If this account exists and is unverified, a new verification link has been sent.");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unable to resend verification email.";
      setError(message);
    } finally {
      setPendingResend(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#F9FAFB] p-4">
      <section className="w-full max-w-md rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        <h1 className="text-2xl font-semibold text-slate-900">Verify your email</h1>
        <p className="mt-1 text-sm text-slate-600">
          Use the token from your email link, or request a new verification email.
        </p>

        {error ? <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {notice ? <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}

        <form onSubmit={onVerify} className="mt-4 grid gap-2">
          <label htmlFor="token" className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            Verification token
          </label>
          <input
            id="token"
            name="token"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            className="rounded-[10px] border border-[#E5E7EB] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
            placeholder="Paste token from email link"
            required
          />
          <button
            type="submit"
            disabled={pendingVerify}
            className="mt-1 rounded-[10px] bg-[#4F46E5] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pendingVerify ? "Verifying..." : "Verify email"}
          </button>
        </form>

        <div className="my-4 border-t border-[#E5E7EB]" />

        <form onSubmit={onResend} className="grid gap-2">
          <label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            Resend verification link
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-[10px] border border-[#E5E7EB] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
            placeholder="name@company.com"
            required
          />
          <button
            type="submit"
            disabled={pendingResend}
            className="rounded-[10px] border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pendingResend ? "Sending..." : "Resend link"}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Remembered your password? <Link href="/login" className="font-semibold text-slate-900">Sign in</Link>
        </p>

        {!hasTokenFromLink ? (
          <p className="mt-2 text-xs text-slate-500">
            Tip: if you opened the email button on this device, the token should be auto-filled from the URL.
          </p>
        ) : null}
      </section>
    </main>
  );
}
