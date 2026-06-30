"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useCurrentUser, invalidateUserCache } from "@/lib/hooks/useCurrentUser";
import AuraBadge from "@/components/ui/AuraBadge";
import clsx from "clsx";

const navLinks = [
  { href: "/battles",     label: "Battles" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/groups",      label: "Rage Groups" },
  { href: "/invites",     label: "Challenges" },
];

export default function Navbar() {
  const { user, loading } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled]       = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Close mobile nav on route change
  useEffect(() => { setMobileOpen(false); setDropdownOpen(false); }, [pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    invalidateUserCache();
    setDropdownOpen(false);
    router.push("/");
    router.refresh();
  }

  const avatarUrl = user?.avatar_url ||
    (user ? `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(user.username)}` : "");

  return (
    <>
      <header className={clsx(
        "sticky top-0 z-50 transition-all duration-300 glass-nav",
        scrolled && "shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
      )}>
        <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-6 py-3 lg:px-8">

          {/* ── Logo (mobile only — sidebar has it on desktop) ── */}
          <Link href="/" className="font-display text-xl font-bold tracking-tight shrink-0 lg:hidden">
            RAGE<span className="text-gradient">BAIT</span>
          </Link>

          {/* ── Search ── */}
          <div className="hidden flex-1 max-w-md md:flex">
            <div className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/40 transition focus-within:border-aura-purple/50 focus-within:bg-white/[0.07]">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="M21 21l-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Search battles, users, topics..."
                className="w-full bg-transparent text-white placeholder:text-white/30 focus:outline-none"
              />
            </div>
          </div>

          {/* ── Desktop nav (collapses once sidebar takes over at lg) ── */}
          <nav className="hidden items-center gap-1 md:flex lg:hidden">
            {navLinks.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link key={link.href} href={link.href} className={clsx(
                  "rounded-xl px-4 py-2 text-sm font-medium transition-all duration-150",
                  active ? "bg-aura-purple/15 text-aura-purple" : "text-white/60 hover:bg-white/5 hover:text-white"
                )}>
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* ── Right side ── */}
          <div className="ml-auto flex items-center gap-2">

            {/* Loading skeleton — prevents flicker */}
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-6 w-16 animate-pulse rounded-full bg-white/10" />
                <div className="h-8 w-24 animate-pulse rounded-xl bg-white/10" />
              </div>

            ) : user ? (
              /* ── Logged in state ── */
              <>
                {/* Aura badge */}
                <Link href="/profile" className="hidden sm:flex">
                  <AuraBadge value={user.aura} size="sm" trend="neutral" />
                </Link>

                {/* Notifications bell */}
                <button className="relative hidden h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/50 transition hover:border-aura-purple/40 hover:text-white sm:flex">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </button>

                {/* Avatar + dropdown */}
                <div ref={dropdownRef} className="relative">
                  <button
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/80 backdrop-blur-md transition-all hover:border-aura-purple/50 hover:bg-white/10"
                  >
                    <img src={avatarUrl} alt={user.username} className="h-5 w-5 rounded-full" />
                    <span className="hidden sm:inline max-w-[90px] truncate">{user.username}</span>
                    <svg className={clsx("h-3 w-3 text-white/30 transition-transform duration-200", dropdownOpen && "rotate-180")} viewBox="0 0 12 12" fill="currentColor">
                      <path d="M6 8L1 3h10z" />
                    </svg>
                  </button>

                  {/* Dropdown menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-aura-purple/15 bg-surface2/90 backdrop-blur-xl py-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.7)] animate-fadeIn">
                      {/* User info header */}
                      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                        <img src={avatarUrl} alt={user.username} className="h-9 w-9 rounded-full" />
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{user.username}</p>
                          <AuraBadge value={user.aura} size="xs" trend="neutral" />
                        </div>
                      </div>
                      <Link href="/profile"  onClick={() => setDropdownOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors">
                        <span>👤</span> Profile
                      </Link>
                      <Link href="/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors">
                        <span>⚙️</span> Settings
                      </Link>
                      <Link href="/battles"  onClick={() => setDropdownOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors">
                        <span>⚔️</span> My Battles
                      </Link>
                      <div className="my-1 border-t border-line" />
                      <button onClick={handleLogout} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-aura-crimson/80 hover:bg-aura-crimson/10 hover:text-aura-crimson transition-colors">
                        <span>🚪</span> Log out
                      </button>
                    </div>
                  )}
                </div>
              </>

            ) : (
              /* ── Logged out state ── */
              <>
                <Link href="/login" className="hidden text-sm font-medium text-white/60 transition hover:text-white sm:block">
                  Log in
                </Link>
                <Link href="/signup" className="rounded-full bg-aura-gradient px-5 py-2 text-sm font-semibold text-void shadow-glow-sm transition hover:opacity-90 active:scale-95">
                  Join the Rage
                </Link>
              </>
            )}

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface2/60 text-white/50 hover:text-white md:hidden"
              aria-label="Menu"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {mobileOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 border-l border-line bg-surface shadow-2xl">
            <div className="flex h-full flex-col p-6">
              <div className="mb-6 flex items-center justify-between">
                <span className="font-display text-lg font-bold">RAGE<span className="text-gradient">BAIT</span></span>
                <button onClick={() => setMobileOpen(false)} className="text-white/40 hover:text-white">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {user && (
                <div className="mb-6 flex items-center gap-3 rounded-2xl border border-line bg-surface2 p-4">
                  <img src={avatarUrl} alt={user.username} className="h-10 w-10 rounded-full" />
                  <div>
                    <p className="font-semibold text-sm">{user.username}</p>
                    <AuraBadge value={user.aura} size="xs" trend="neutral" />
                  </div>
                </div>
              )}

              <nav className="flex-1 space-y-1">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href} className={clsx(
                    "flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-all",
                    pathname.startsWith(link.href) ? "bg-aura-purple/15 text-aura-purple" : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}>
                    {link.label}
                  </Link>
                ))}
                {user && (
                  <>
                    <Link href="/profile"  className={clsx("flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-all", pathname === "/profile"  ? "bg-aura-purple/15 text-aura-purple" : "text-white/60 hover:bg-white/5 hover:text-white")}>Profile</Link>
                    <Link href="/settings" className={clsx("flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-all", pathname === "/settings" ? "bg-aura-purple/15 text-aura-purple" : "text-white/60 hover:bg-white/5 hover:text-white")}>Settings</Link>
                  </>
                )}
              </nav>

              <div className="mt-auto border-t border-line pt-6">
                {user ? (
                  <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-aura-crimson/70 hover:bg-aura-crimson/10 hover:text-aura-crimson">
                    <span>🚪</span> Log out
                  </button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Link href="/login"><button className="w-full rounded-full border border-line bg-surface2 px-6 py-3 text-sm font-semibold text-white">Log in</button></Link>
                    <Link href="/signup"><button className="w-full rounded-full bg-aura-gradient px-6 py-3 text-sm font-bold text-void shadow-glow-sm">Join the Rage</button></Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
