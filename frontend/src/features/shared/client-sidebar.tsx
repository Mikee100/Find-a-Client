"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarLink = {
  href: string;
  label: string;
};

const LINKS: SidebarLink[] = [
  { href: "/client/feed", label: "Discover Projects" },
  { href: "/client/ai-lab", label: "AI Lab" },
  { href: "/client/likes", label: "Liked Projects" },
  { href: "/client/messages", label: "Messages" },
  { href: "/client/hire-requests", label: "Hire Requests" }
];

export default function ClientSidebar() {
  const pathname = usePathname();

  return (
    <section className="rounded-[20px] border border-[#E5E7EB] bg-white p-4 shadow-[0_6px_20px_rgba(15,23,42,0.04)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#64748B]">Client navigation</p>
      <div className="mt-3 space-y-2">
        {LINKS.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                isActive
                  ? "border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]"
                  : "border-[#E5E7EB] bg-white text-[#111827] hover:border-[#CBD5E1]"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
