"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { forgotPassword } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);

    try {
      await forgotPassword({ email: email.trim().toLowerCase() });
      setNotice("If your account exists, a password reset link has been sent.");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unable to request password reset.";
      setError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#F9FAFB] p-4">
      <section className="w-full max-w-md rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        <h1 className="text-2xl font-semibold text-slate-900">Forgot password</h1>
        <p className="mt-1 text-sm text-slate-600">Enter your account email and we will send a reset link.</p>

        {error ? <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {notice ? <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}

        <form onSubmit={onSubmit} className="mt-4 grid gap-2">
          <label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Email</label>
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
            disabled={pending}
            className="mt-1 rounded-[10px] bg-[#4F46E5] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? "Sending reset link..." : "Send reset link"}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Back to <Link href="/login" className="font-semibold text-slate-900">sign in</Link>
        </p>
      </section>
    </main>
  );
}
