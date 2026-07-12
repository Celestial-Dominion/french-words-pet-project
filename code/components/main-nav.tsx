"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_TABS } from "@/components/nav-tabs";

// Điều hướng ngang cho desktop (ẩn trên mobile — mobile dùng BottomNav).
export default function MainNav() {
  const path = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {NAV_TABS.map((t) => {
        const on = t.match.some((m) => (m === "/" ? path === "/" : path.startsWith(m)));
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              on ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
