"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Card from "@/components/ui/Card";
import AuraBadge from "@/components/ui/AuraBadge";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

interface PublicProfile {
  id: string;
  username: string;
  avatarUrl: string | null;
  aura: number;
  level: number;
  xp: number;
  wins: number;
  losses: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  bio: string | null;
  createdAt: string;
}

interface BattleItem {
  id: string;
  title: string;
  topic: string;
  status: string;
  battle_type: string;
  winner_id: string | null;
  created_at: string;
  creator_id: string;
  creator_username: string;
  opponent_id: string | null;
  opponent_username: string | null;
}

function avatarFor(username: string, avatarUrl: string | null) {
  return avatarUrl || `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(username)}`;
}

const statusStyles: Record<string, string> = {
  active: "text-aura-crimson",
  judging: "text-aura-purple",
  completed: "text-white/40",
};

export default function PublicProfilePage() {
  const params = useParams();
  const username = params?.username as string;
  const { user } = useCurrentUser();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [battles, setBattles] = useState<BattleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    fetch(`/api/profile/${encodeURIComponent(username)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setProfile(data.profile);
          setBattles(data.battles ?? []);
        }
      })
      .catch(() => setError("Could not load profile."))
      .finally(() => setLoading(false));
  }, [username]);

  // If viewing own profile, redirect to the full private profile
  const isOwnProfile = user && profile && user.id === profile.id;

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center text-white/50">
        Loading profile...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-white/60">{error ?? "Profile not found."}</p>
        <Link href="/battles" className="mt-4 inline-block text-aura-blue hover:underline">
          Browse battles
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/battles" className="text-sm text-white/40 hover:text-white">
        ← Back to battles
      </Link>

      {/* Header card */}
      <Card className="mt-6 flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <img
          src={avatarFor(profile.username, profile.avatarUrl)}
          alt={profile.username}
          className="h-20 w-20 rounded-2xl border-2 border-line"
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="font-display text-2xl font-bold">{profile.username}</h1>
            <AuraBadge aura={profile.aura} />
          </div>
          <p className="mt-1 text-xs text-white/40">Level {profile.level}</p>
          {profile.bio && (
            <p className="mt-2 text-sm text-white/70">{profile.bio}</p>
          )}
          {isOwnProfile && (
            <Link
              href="/profile"
              className="mt-3 inline-block text-xs text-aura-blue hover:underline"
            >
              Edit your profile →
            </Link>
          )}
        </div>
      </Card>

      {/* Stats row */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Battles", value: profile.wins + profile.losses },
          { label: "Wins", value: profile.wins },
          { label: "Win Rate", value: `${profile.winRate}%` },
          { label: "Best Streak", value: profile.bestStreak },
        ].map(({ label, value }) => (
          <Card key={label} className="text-center">
            <p className="font-display text-2xl font-bold text-aura-blue">{value}</p>
            <p className="mt-1 text-xs text-white/50">{label}</p>
          </Card>
        ))}
      </div>

      {/* Battle history */}
      <h2 className="mt-8 font-display text-xl font-bold">Battle History</h2>

      {battles.length === 0 ? (
        <Card className="mt-4 text-center">
          <p className="text-white/50">No public battles yet.</p>
        </Card>
      ) : (
        <div className="mt-4 space-y-3">
          {battles.map((b) => {
            const isCreator = b.creator_id === profile.id;
            const opponent = isCreator ? b.opponent_username : b.creator_username;
            const won = b.winner_id === profile.id;
            const lost = b.winner_id && b.winner_id !== profile.id;

            return (
              <Link key={b.id} href={`/battles/${b.id}`}>
                <Card className="flex items-center gap-4 transition-colors hover:border-aura-purple/40">
                  <div
                    className={`h-2 w-2 flex-shrink-0 rounded-full ${
                      won ? "bg-aura-blue" : lost ? "bg-aura-crimson" : "bg-white/20"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.title}</p>
                    <p className="mt-0.5 text-xs text-white/40">
                      {b.topic} · vs {opponent ?? "unknown"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-xs font-semibold uppercase ${
                        statusStyles[b.status] ?? "text-white/30"
                      }`}
                    >
                      {b.status}
                    </span>
                    {b.status === "completed" && (
                      <span
                        className={`text-xs font-bold ${
                          won ? "text-aura-blue" : lost ? "text-aura-crimson" : "text-white/40"
                        }`}
                      >
                        {won ? "WIN" : lost ? "LOSS" : "DRAW"}
                      </span>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Guest CTA */}
      {!user && (
        <Card className="mt-8 border-aura-purple/30 bg-aura-purple/5 text-center">
          <p className="font-display text-lg font-semibold">Want to battle {profile.username}?</p>
          <p className="mt-1 text-sm text-white/60">
            Join Ragebait to challenge players, earn Aura, and climb the leaderboard.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-aura-gradient px-5 py-2 text-sm font-semibold text-void"
            >
              Join the Rage
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-line px-5 py-2 text-sm font-medium text-white hover:border-white/40"
            >
              Log in
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
