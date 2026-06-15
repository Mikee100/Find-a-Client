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
    <main className="grid min-h-screen place-items-center p-4">
      <section className="w-full max-w-md rounded-xl border border-neutral-300 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mb-3 text-neutral-600">Use your email and password to continue.</p>

        {error ? <p className="mb-2 text-red-700">{error}</p> : null}

        <form onSubmit={onSubmit} className="grid gap-2">
          <div className="grid gap-1">
            <label htmlFor="email" className="text-xs font-semibold text-neutral-600">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="rounded-md border border-neutral-300 bg-white px-3 py-2"
            />
          </div>

          <div className="grid gap-1">
            <label htmlFor="password" className="text-xs font-semibold text-neutral-600">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              minLength={8}
              required
              className="rounded-md border border-neutral-300 bg-white px-3 py-2"
            />
          </div>

          <button
            className="mt-1 rounded-md border border-transparent bg-teal-700 px-3 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
            type="submit"
            disabled={pending}
          >
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-3 text-neutral-600">
          Need an account? <Link href="/register" className="font-semibold text-teal-700">Create one</Link>
        </p>
      </section>
    </main>
  );
}