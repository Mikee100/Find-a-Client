"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  fallbackHref?: string;
  label?: string;
  className?: string;
  size?: "sm" | "md";
  tone?: "default" | "light";
}

export default function BackButton({
  fallbackHref = "/",
  label = "Back",
  className,
  size = "md",
  tone = "default"
}: BackButtonProps) {
  const router = useRouter();

  const handleClick = (): void => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border font-semibold transition",
        size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm",
        tone === "light"
          ? "border-white/40 bg-white/10 text-white hover:bg-white/20"
          : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500 hover:text-neutral-900",
        className
      )}
    >
      <span aria-hidden="true">←</span>
      <span>{label}</span>
    </button>
  );
}
