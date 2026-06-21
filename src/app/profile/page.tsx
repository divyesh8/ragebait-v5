"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import AuraBadge from "@/components/ui/AuraBadge";
import Button from "@/components/ui/Button";
import AvatarPicker from "@/components/profile/AvatarPicker";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useEffect, useState } from "react";

interface AuraTransaction {
  id: string;
  amount: number;
  reason: string;
  battle_id: string | null;
  created_at: string;
}

export default function ProfilePage() {
  const { user, loading } = useCurrentUser();
  const [history, setHistory] = useState<AuraTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setHistoryLoading(false);
      return;
    }
    fetch("/api/aura/history")
      .then((res) => res.json())
      .then((data) => setHistory(data.transactions ?? []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12 text-center text-white/50">
        Loading profile...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">You&apos;re not logged in</h1>
        <p className="mt-2 text-white/50">
          Log in or create an account to see your Aura, stats, and battle history.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/login">
            <Button size="md">Log in</Button>
          </Link>
          <Link href="/signup">
            <Button size="md" variant="secondary">
              Sign up
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const totalBattles = user.wins + user.losses;
  const winRate = totalBattles > 0 ? Math.round((user.wins / totalBattles) * 100) : 0;

  const statItems = [
    { label: "Level", value: user.level },
    { label: "XP", value: user.xp.toLocaleString() },
    { label: "Wins", value: user.wins },
    { label: "Losses", value: user.losses },
    { label: "Win Rate", value: `${winRate}%` },
    { label: "Total Battles", value: totalBattles },
    { label: "Current Streak", value: user.current_streak },
    { label: "Best Streak", value: user.best_streak },
  ];

  const avatarUrl =
    avatarOverride ||
    user.avatar_url ||
    `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(user.username)}`;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {/* Banner + header */}
      <div className="relative h-40 rounded-2xl bg-aura-gradient sm:h-56" />

      <div className="relative -mt-12 flex flex-col items-start gap-4 px-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-end gap-4">
          <div className="group relative">
            <img
              src={avatarUrl}
              alt={user.username}
              className="h-24 w-24 rounded-2xl border-4 border-void bg-surface2 sm:h-28 sm:w-28"
            />
            <button
              onClick={() => setShowAvatarPicker(true)}
              className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/0 text-xs font-medium text-white opacity-0 transition group-hover:bg-black/50 group-hover:opacity-100"
            >
              Change
            </button>
          </div>
          <div className="pb-2">
            <h1 className="font-display text-2xl font-bold sm:text-3xl">
              {user.username}
            </h1>
            <p className="text-sm text-white/40">
              Joined{" "}
              {new Date(user.created_at).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/settings">
            <Button size="sm" variant="secondary">
              Settings
            </Button>
          </Link>
          <Link href="/battles">
            <Button size="sm">+ Start a battle</Button>
          </Link>
        </div>
      </div>

      {showAvatarPicker && (
        <AvatarPicker
          currentAvatarUrl={avatarUrl}
          onSelected={(newUrl) => setAvatarOverride(newUrl)}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}

      <p className="mt-6 max-w-2xl text-white/60">
        {user.bio || "No bio yet."}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <AuraBadge value={user.aura} size="lg" trend="neutral" />
      </div>

      {/* Stats grid */}
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statItems.map((item) => (
          <Card key={item.label} className="text-center">
            <p className="font-display text-2xl font-bold text-gradient">{item.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-white/40">{item.label}</p>
          </Card>
        ))}
      </div>

      {/* Aura history */}
      <div className="mt-10 mb-12">
        <h2 className="font-display text-xl font-bold">Aura history</h2>
        {historyLoading ? (
          <p className="mt-4 text-sm text-white/40">Loading...</p>
        ) : history.length === 0 ? (
          <Card className="mt-4">
            <p className="text-sm text-white/50">
              No Aura transactions yet. Win or lose a battle to start building your history.
            </p>
          </Card>
        ) : (
          <Card className="mt-4 divide-y divide-line p-0">
            {history.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium">{tx.reason}</p>
                  <p className="text-xs text-white/40">
                    {new Date(tx.created_at).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`font-mono text-sm font-semibold ${
                    tx.amount > 0 ? "text-aura-blue" : "text-aura-crimson"
                  }`}
                >
                  {tx.amount > 0 ? "+" : ""}
                  {tx.amount}
                </span>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
