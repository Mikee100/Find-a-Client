"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { AppRole, resetPassword } from "@/lib/api";

function getRedirectPath(role: AppRole): string {
  if (role === "ADMIN") {
    return "/admin/dashboard";
  }

  if (role === "CLIENT") {
    return "/client/feed";
  }

  return "/developers/dashboard";
}

function getPasswordStrength(password: string): { label: string; tone: string } {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) {
    return { label: "Weak", tone: "text-red-600" };
  }

  if (score <= 4) {
    return { label: "Good", tone: "text-amber-600" };
  }

  return { label: "Strong", tone: "text-emerald-600" };
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryToken = searchParams.get("token")?.trim() ?? "";

  const [token, setToken] = useState(queryToken);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const passwordMismatch = useMemo(
    () => confirmPassword.length > 0 && newPassword !== confirmPassword,
    [newPassword, confirmPassword],
  );

  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
  const tokenProvidedByLink = queryToken.length >= 20;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      setPending(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setPending(false);
      return;
    }

    try {
      const result = await resetPassword({ token: token.trim(), newPassword });
      setNotice("Password reset successful. Redirecting...");
      router.push(getRedirectPath(result.role));
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unable to reset password.";
      setError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#F9FAFB] p-4">
      <section className="w-full max-w-md rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        <h1 className="text-2xl font-semibold text-slate-900">Reset password</h1>
        <p className="mt-1 text-sm text-slate-600">Create a new password to recover your account.</p>

        {error ? <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {notice ? <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}

        <form onSubmit={onSubmit} className="mt-4 grid gap-2">
          {tokenProvidedByLink ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              Reset token detected from email link.
            </div>
          ) : (
            <>
              <label htmlFor="token" className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Reset token</label>
              <input
                id="token"
                name="token"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                className="rounded-[10px] border border-[#E5E7EB] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                placeholder="Paste token from email link"
                required
              />
            </>
          )}

          <label htmlFor="newPassword" className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">New password</label>
          <div className="relative">
            <input
              id="newPassword"
              name="newPassword"
              type={showNewPassword ? "text" : "password"}
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full rounded-[10px] border border-[#E5E7EB] bg-white px-3 py-2 pr-10 text-sm outline-none transition focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
              placeholder="At least 8 characters"
              required
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label={showNewPassword ? "Hide new password" : "Show new password"}
            >
              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className={`text-xs ${strength.tone}`}>
            Password strength: {strength.label}
          </p>

          <label htmlFor="confirmPassword" className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Confirm password</label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={`w-full rounded-[10px] border bg-white px-3 py-2 pr-10 text-sm outline-none transition ${passwordMismatch ? "border-red-400" : "border-[#E5E7EB] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"}`}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={pending || passwordMismatch}
            className="mt-2 rounded-[10px] bg-[#4F46E5] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? "Resetting password..." : "Reset password"}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Back to <Link href="/login" className="font-semibold text-slate-900">sign in</Link>
        </p>
      </section>
    </main>
  );
}
