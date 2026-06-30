"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import AuraBadge from "@/components/ui/AuraBadge";

const items = [
  { href: "/",            label: "Home",        icon: HomeIcon },
  { href: "/battles",     label: "Battles",      icon: SwordIcon },
  { href: "/invites",     label: "Challenges",   icon: ShieldIcon },
  { href: "/groups",      label: "Rage Groups",  icon: UsersIcon },
  { href: "/leaderboard", label: "Leaderboard",  icon: ChartIcon },
  { href: "/profile",     label: "Profile",      icon: UserIcon },
  { href: "/settings",    label: "Settings",     icon: GearIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useCurrentUser();

  const avatarUrl = user?.avatar_url ||
    (user ? `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(user.username)}` : "");

  return (
    <aside className="hidden lg:flex sticky top-0 h-screen w-[252px] shrink-0 flex-col px-4 py-6">
      <div className="glass-panel flex h-full flex-col rounded-3xl p-4">
        {/* Logo */}
        <Link href="/" className="mb-8 flex items-center gap-2 px-2 font-display text-lg font-bold tracking-tight">
          RAGE<span className="text-gradient">BAIT</span>
        </Link>

        {/* Nav items */}
        <nav className="flex-1 space-y-1">
          {items.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href) ?? false;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-aura-purple/15 text-white glow-ring-purple"
                    : "text-white/50 hover:bg-white/5 hover:text-white"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-aura-purple shadow-glow" />
                )}
                <Icon className={clsx("h-[18px] w-[18px] shrink-0 transition-colors", active ? "text-aura-purple" : "text-white/40 group-hover:text-white")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User card */}
        {user && (
          <Link
            href="/profile"
            className="mt-4 flex items-center gap-3 rounded-2xl border border-aura-purple/15 bg-white/5 px-3 py-3 transition hover:border-aura-purple/40 hover:bg-white/[0.07]"
          >
            <img src={avatarUrl} alt={user.username} className="h-9 w-9 rounded-xl border border-aura-purple/30" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user.username}</p>
              <AuraBadge value={user.aura} size="xs" trend="neutral" />
            </div>
          </Link>
        )}
      </div>
    </aside>
  );
}

/* ── Inline icon set — keeps bundle light, no external icon lib needed ── */
function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" />
    </svg>
  );
}
function SwordIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" /><path d="M13 19l6-6" /><path d="M16 16l4 4" /><path d="M19 21l2-2" />
    </svg>
  );
}
function ShieldIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
    </svg>
  );
}
function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" />
      <circle cx="17.5" cy="9" r="2.5" /><path d="M14.5 20c.3-2.6 2.2-4.7 4.7-5" />
    </svg>
  );
}
function ChartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 20V10" /><path d="M12 20V4" /><path d="M20 20v-7" />
    </svg>
  );
}
function UserIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}
function GearIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.9 2.9l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.6V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.9-2.9l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.6-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.6-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.9-2.9l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.6V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.6 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.9 2.9l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.6 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.6 1z" />
    </svg>
  );
}
