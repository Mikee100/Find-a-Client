"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LegacyResetPasswordRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token") ?? "";
    const query = new URLSearchParams();

    if (token) {
      query.set("token", token);
    }

    const suffix = query.toString();
    router.replace(suffix ? `/reset-password?${suffix}` : "/reset-password");
  }, [router, searchParams]);

  return null;
}
