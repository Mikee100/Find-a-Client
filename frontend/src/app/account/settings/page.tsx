"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAuthSession } from "@/lib/api";

export default function AccountSettingsRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const onboardingSuffix = searchParams.get("onboarding") === "1" ? "?onboarding=1" : "";

    void getAuthSession()
      .then((session) => {
        if (session.role === "CLIENT") {
          router.replace(`/client/settings${onboardingSuffix}`);
          return;
        }

        if (session.role === "ADMIN") {
          router.replace("/admin/dashboard");
          return;
        }

        router.replace(`/developers/settings${onboardingSuffix}`);
      })
      .catch(() => {
        router.replace("/login");
      });
  }, [router, searchParams]);

  return null;
}
