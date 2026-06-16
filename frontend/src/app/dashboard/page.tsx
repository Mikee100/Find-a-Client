"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuthSession } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    void getAuthSession()
      .then((session) => {
        if (session.role === "CLIENT") {
          router.replace("/client/dashboard");
          return;
        }

        if (session.role === "ADMIN") {
          router.replace("/admin/dashboard");
          return;
        }

        router.replace("/developer/dashboard");
      })
      .catch(() => {
        router.replace("/login");
      });
  }, [router]);

  return null;
}
