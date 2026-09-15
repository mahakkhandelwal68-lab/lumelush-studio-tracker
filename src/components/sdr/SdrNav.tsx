"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DashboardIcon,
  LeadsIcon,
  MeetingsIcon,
  PlaybookIcon,
  ChatIcon,
  ReportsIcon,
  SettingsIcon,
} from "@/components/sdr/icons";

const NAV = [
  { href: "/caller", label: "Dashboard", icon: DashboardIcon, exact: true },
  { href: "/caller/leads", label: "Leads", icon: LeadsIcon, exact: false },
  { href: "/caller/meetings", label: "Meetings", icon: MeetingsIcon, exact: false },
  { href: "/caller/playbook", label: "Playbook", icon: PlaybookIcon, exact: false },
  { href: "/caller/chat", label: "Chat", icon: ChatIcon, exact: false },
  { href: "/caller/reports", label: "Reports", icon: ReportsIcon, exact: false },
  { href: "/caller/settings", label: "Settings", icon: SettingsIcon, exact: false },
];

export function SdrNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            data-active={active}
            className="sdr-nav-link flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-center text-xs font-medium transition"
          >
            <Icon className="size-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
