"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { AppRole, login } from "@/lib/api";

function getRedirectPath(role: AppRole): string {
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
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setPending(true);
		setError(null);
		setSuccess(null);

		const formData = new FormData(event.currentTarget);
		const email = String(formData.get("email") ?? "").trim().toLowerCase();
		const password = String(formData.get("password") ?? "");

		if (!email) {
			setPending(false);
			setError("Email is required.");
			return;
		}

		if (!email.includes("@")) {
			setPending(false);
			setError("Please enter a valid email address.");
			return;
		}

		if (!password) {
			setPending(false);
			setError("Password is required.");
			return;
		}

		try {
			const result = await login({ email, password });
			const role = result.role;
			const redirectPath = getRedirectPath(role);

			setSuccess("Signed in successfully. Redirecting...");
			router.push(redirectPath);
		} catch (submitError) {
			const message = submitError instanceof Error ? submitError.message : "Login failed";
			setError(message);
		} finally {
			setPending(false);
		}
	}

	return (
		<main className="grid min-h-screen place-items-center bg-neutral-50 p-4">
			<section className="w-full max-w-md rounded-xl border border-neutral-300 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
				<h1 className="text-2xl font-semibold text-neutral-900">Sign in</h1>
				<p className="mb-4 text-sm text-neutral-600">Use your account credentials to continue.</p>

				{error ? <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
				{success ? <p className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p> : null}

				<form onSubmit={onSubmit} className="grid gap-3">
					<div className="grid gap-1">
						<label htmlFor="email" className="text-xs font-semibold text-neutral-700">
							Email
						</label>
						<input
							id="email"
							name="email"
							type="email"
							autoComplete="email"
							required
							className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-500"
							placeholder="you@example.com"
						/>
					</div>

					<div className="grid gap-1">
						<label htmlFor="password" className="text-xs font-semibold text-neutral-700">
							Password
						</label>
						<div className="flex overflow-hidden rounded-md border border-neutral-300 bg-white focus-within:border-neutral-500">
							<input
								id="password"
								name="password"
								type={showPassword ? "text" : "password"}
								autoComplete="current-password"
								minLength={8}
								required
								className="w-full px-3 py-2 text-sm outline-none"
								placeholder="Enter password"
							/>
							<button
								type="button"
								onClick={() => setShowPassword((prev) => !prev)}
								className="border-l border-neutral-300 px-3 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100"
							>
								{showPassword ? "Hide" : "Show"}
							</button>
						</div>
					</div>

					<div className="flex items-center justify-between text-sm">
						<label className="flex items-center gap-2 text-neutral-700">
							<input type="checkbox" name="remember" className="h-4 w-4" defaultChecked />
							Remember me
						</label>
						<Link href="/register" className="font-medium text-teal-700 hover:underline">
							Need an account?
						</Link>
					</div>

					<button
						type="submit"
						disabled={pending}
						className="rounded-md border border-transparent bg-teal-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
					>
						{pending ? "Signing in..." : "Sign in"}
					</button>
				</form>
			</section>
		</main>
	);
}
