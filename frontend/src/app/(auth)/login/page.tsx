"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { login } from "@/lib/api";
import { AppRole, getRoleFromAccessToken } from "@/lib/auth";

function roleToDashboardPath(role: AppRole | null): string {
  if (role === "ADMIN") {
    return "/admin/dashboard";
  }

  if (role === "CLIENT") {
    return "/client/dashboard";
  }

  return "/developer/dashboard";
}

export default function LoginPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const tokens = await login({ email, password });
      const role = getRoleFromAccessToken(tokens.accessToken);
      router.push(roleToDashboardPath(role));
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Login failed";
      setError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50 p-4">
      <section className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-5xl items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <Link href="/" className="text-lg font-bold tracking-tight text-neutral-900">
            Find a Client
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Marketplace access</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 md:text-4xl">
              Sign in to manage work, messages, and hiring.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-600">
              Continue to your role-based workspace and pick up where your client or developer conversations left off.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {["Discovery", "Messaging", "Saved work"].map((item) => (
              <div key={item} className="rounded-lg border border-neutral-200 bg-white p-3">
                <p className="text-sm font-semibold text-neutral-900">{item}</p>
                <p className="mt-1 text-xs text-neutral-600">Built into the workspace.</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
          <h2 className="text-2xl font-semibold text-neutral-950">Welcome back</h2>
          <p className="mt-1 text-sm text-neutral-600">Use your email and password to continue.</p>

          {error ? (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          <form onSubmit={onSubmit} className="mt-4 grid gap-3">
            <div className="grid gap-1.5">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                minLength={8}
                required
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <button
              className="mt-1 rounded-md border border-transparent bg-teal-700 px-3 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={pending}
            >
              {pending ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-4 text-sm text-neutral-600">
            Need an account?{" "}
            <Link href="/register" className="font-semibold text-teal-700">
              Create one
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
