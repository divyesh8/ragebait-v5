"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import AuraBadge from "@/components/ui/AuraBadge";

const navLinks = [
  { href: "/battles", label: "Battles" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/groups", label: "Rage Groups" },
  { href: "/invites", label: "Challenges" },
  { href: "/profile", label: "Profile" },
];

export default function Navbar() {
  const { user, loading } = useCurrentUser();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-void/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-xl font-bold tracking-tight">
          RAGE<span className="text-gradient">BAIT</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-white/70 transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {loading ? null : user ? (
            <>
              <Link href="/profile" className="hidden sm:block">
                <AuraBadge value={user.aura} size="sm" trend="neutral" />
              </Link>
              <span className="hidden text-sm font-medium text-white/70 sm:block">
                {user.username}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-white/50 transition hover:text-white"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden text-sm font-medium text-white/70 transition hover:text-white sm:block"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-aura-gradient px-5 py-2 text-sm font-semibold text-void shadow-glow transition hover:opacity-90"
              >
                Join the Rage
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
