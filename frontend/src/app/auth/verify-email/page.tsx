"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LegacyVerifyEmailRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token") ?? "";
    const email = searchParams.get("email") ?? "";
    const query = new URLSearchParams();

    if (token) {
      query.set("token", token);
    }

    if (email) {
      query.set("email", email);
    }

    const suffix = query.toString();
    router.replace(suffix ? `/verify-email?${suffix}` : "/verify-email");
  }, [router, searchParams]);

  return null;
}
