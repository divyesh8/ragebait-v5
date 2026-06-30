"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import AuraBadge from "@/components/ui/AuraBadge";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

interface BattleListItem {
  id: string;
  title: string;
  topic: string;
  battle_type: string;
  mode: string;
  status:
    | "open"
    | "waiting"
    | "active"
    | "judging"
    | "completed"
    | "cancelled";
  creator_username: string;
  creator_avatar: string;
  creator_aura?: number;
  opponent_username: string | null;
  opponent_avatar: string | null;
  opponent_aura?: number;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  avatarUrl: string | null;
  aura: number;
  wins: number;
  winRate: number;
}

function avatarFor(username: string, avatarUrl: string | null | undefined) {
  return avatarUrl || `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(username)}`;
}

const topics = [
  "Android vs iPhone",
  "Anime",
  "Football",
  "Cricket",
  "Gaming",
  "Movies",
  "Technology",
  "College Life",
  "Internet Culture",
];

const feedTabs = ["For You", "Trending", "Following", "Communities"] as const;

export default function HomePage() {
  const { user } = useCurrentUser();
  const [battles, setBattles] = useState<BattleListItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedTab, setFeedTab] = useState<(typeof feedTabs)[number]>("For You");

  useEffect(() => {
    Promise.all([
      fetch("/api/battles").then((res) => res.json()),
      fetch("/api/leaderboard").then((res) => res.json()),
    ])
      .then(([battlesData, leaderboardData]) => {
        setBattles(battlesData.battles ?? []);
        setLeaderboard(leaderboardData.leaderboard ?? []);
      })
      .catch(() => {
        setBattles([]);
        setLeaderboard([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const liveBattles = battles.filter((b) => b.status === "active");
  const heroBattle = liveBattles[0] ?? battles[0] ?? null;
  const otherBattles = battles.filter((b) => b.id !== heroBattle?.id).slice(0, 4);
  const topLeaders = leaderboard.slice(0, 5);
  const liveList = liveBattles.slice(0, 3);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">

        {/* ── Main column ── */}
        <div className="min-w-0 space-y-6">

          {/* ── Battle hero ── */}
          {loading ? (
            <div className="h-[420px] animate-pulse rounded-3xl bg-surface2" />
          ) : heroBattle ? (
            <Card className="overflow-hidden p-0" glow="purple">
              <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="font-display text-sm font-bold uppercase tracking-wide text-white">
                    {heroBattle.battle_type} battle
                  </span>
                  {heroBattle.status === "active" && (
                    <span className="flex items-center gap-1.5 rounded-full bg-aura-crimson/15 px-2.5 py-1 text-xs font-semibold text-aura-crimson">
                      <span className="h-1.5 w-1.5 animate-pulseGlow rounded-full bg-aura-crimson" />
                      LIVE
                    </span>
                  )}
                </div>
                <span className="flex items-center gap-1.5 text-xs text-white/40">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="3" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
                  </svg>
                  {liveBattles.length} watching now
                </span>
              </div>

              <div className="grid grid-cols-1 items-center gap-6 px-6 py-8 sm:grid-cols-[1fr_auto_1fr]">
                {/* Creator */}
                <div className="flex flex-col items-center text-center gap-3">
                  <img src={avatarFor(heroBattle.creator_username, heroBattle.creator_avatar)} alt={heroBattle.creator_username} className="h-20 w-20 rounded-2xl border-2 border-aura-purple/50 glow-ring-purple" />
                  <div>
                    <p className="font-display font-bold">{heroBattle.creator_username}</p>
                    <AuraBadge value={heroBattle.creator_aura ?? 0} size="xs" trend="neutral" />
                  </div>
                  <div className="h-1.5 w-full max-w-[140px] overflow-hidden rounded-full bg-white/5">
                    <div className="h-full w-3/5 bg-aura-gradient" />
                  </div>
                </div>

                {/* VS */}
                <div className="flex flex-col items-center gap-2">
                  <span className="font-display text-3xl font-black text-gradient">VS</span>
                  <span className="text-xs text-white/40">{heroBattle.mode}</span>
                </div>

                {/* Opponent */}
                <div className="flex flex-col items-center text-center gap-3">
                  {heroBattle.opponent_username ? (
                    <>
                      <img src={avatarFor(heroBattle.opponent_username, heroBattle.opponent_avatar)} alt={heroBattle.opponent_username} className="h-20 w-20 rounded-2xl border-2 border-aura-blue/50 glow-ring-blue" />
                      <div>
                        <p className="font-display font-bold">{heroBattle.opponent_username}</p>
                        <AuraBadge value={heroBattle.opponent_aura ?? 0} size="xs" trend="neutral" />
                      </div>
                      <div className="h-1.5 w-full max-w-[140px] overflow-hidden rounded-full bg-white/5">
                        <div className="h-full w-2/5 bg-gradient-to-r from-aura-blue to-aura-purple ml-auto" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-dashed border-white/15 text-white/20">?</div>
                      <p className="text-sm text-white/40">Waiting for opponent</p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-4 border-t border-white/5 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-display text-lg font-semibold">{heroBattle.title}</h3>
                <Link href={`/battles/${heroBattle.id}`}>
                  <Button size="sm">Watch battle</Button>
                </Link>
              </div>
            </Card>
          ) : (
            <Card className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="font-display text-lg font-semibold">No battles yet</p>
              <p className="text-sm text-white/50">Be the first to start one.</p>
              <Link href="/battles"><Button size="sm">Start a battle</Button></Link>
            </Card>
          )}

          {/* ── Feed tabs ── */}
          <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 p-1 w-fit backdrop-blur-md">
            {feedTabs.map((t) => (
              <button
                key={t}
                onClick={() => setFeedTab(t)}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  feedTab === t ? "bg-aura-purple text-void shadow-glow-sm" : "text-white/50 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* ── Feed list (real battles) ── */}
          <div className="space-y-4">
            {loading ? (
              <p className="text-white/50">Loading...</p>
            ) : otherBattles.length === 0 ? (
              <Card className="text-center">
                <p className="text-white/60">
                  No more battles right now.{" "}
                  <Link href="/battles" className="text-aura-blue hover:underline">Browse all battles</Link>
                </p>
              </Card>
            ) : (
              otherBattles.map((battle) => (
                <Card key={battle.id} className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-center gap-4 min-w-0">
                    <img src={avatarFor(battle.creator_username, battle.creator_avatar)} alt={battle.creator_username} className="h-11 w-11 shrink-0 rounded-xl" />
                    <div className="min-w-0">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="rounded-full bg-aura-purple/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-aura-purple">
                          {battle.topic}
                        </span>
                        {battle.status === "active" && (
                          <span className="flex items-center gap-1 text-[11px] font-medium text-aura-crimson">
                            <span className="h-1 w-1 rounded-full bg-aura-crimson" /> LIVE
                          </span>
                        )}
                      </div>
                      <p className="truncate font-display text-base font-semibold">{battle.title}</p>
                      <p className="mt-0.5 text-xs text-white/40">
                        {battle.creator_username}{battle.opponent_username ? ` vs ${battle.opponent_username}` : " · waiting for opponent"}
                      </p>
                    </div>
                  </div>
                  <Link href={`/battles/${battle.id}`} className="shrink-0">
                    <Button size="sm" variant="secondary">Join Debate</Button>
                  </Link>
                </Card>
              ))
            )}
          </div>

          {/* ── Topics ── */}
          <Card>
            <h2 className="mb-4 font-display text-lg font-bold">Pick your battlefield</h2>
            <div className="flex flex-wrap gap-2.5">
              {topics.map((topic) => (
                <Link
                  key={topic}
                  href="/battles"
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:border-aura-purple/50 hover:text-white"
                >
                  {topic}
                </Link>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-6">

          {/* Profile panel */}
          {user ? (
            <Card>
              <div className="flex items-center gap-3">
                <img src={avatarFor(user.username, user.avatar_url)} alt={user.username} className="h-14 w-14 rounded-2xl border-2 border-aura-purple/40" />
                <div>
                  <p className="font-display text-lg font-bold">{user.username}</p>
                  <AuraBadge value={user.aura} size="sm" trend="neutral" />
                </div>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <div className="h-full bg-aura-gradient" style={{ width: `${Math.min(100, (user.xp % 1000) / 10)}%` }} />
              </div>
              <p className="mt-1 text-right text-xs text-white/30">Level {user.level}</p>

              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="font-display text-xl font-bold">{user.wins + user.losses}</p>
                  <p className="text-[11px] uppercase tracking-wide text-white/40">Battles</p>
                </div>
                <div>
                  <p className="font-display text-xl font-bold">{user.wins}</p>
                  <p className="text-[11px] uppercase tracking-wide text-white/40">Wins</p>
                </div>
                <div>
                  <p className="font-display text-xl font-bold">
                    {user.wins + user.losses > 0 ? Math.round((user.wins / (user.wins + user.losses)) * 100) : 0}%
                  </p>
                  <p className="text-[11px] uppercase tracking-wide text-white/40">Win Rate</p>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="text-center">
              <p className="font-display font-semibold">Join the Rage</p>
              <p className="mt-1 text-sm text-white/50">Create a profile to start battling.</p>
              <Link href="/signup" className="mt-4 block"><Button size="sm" className="w-full">Sign up</Button></Link>
            </Card>
          )}

          {/* Top players */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-bold">Top Players</h2>
              <Link href="/leaderboard" className="text-xs font-medium text-aura-blue hover:underline">View All</Link>
            </div>
            {loading ? (
              <p className="text-sm text-white/40">Loading...</p>
            ) : topLeaders.length === 0 ? (
              <p className="text-sm text-white/40">No users yet.</p>
            ) : (
              <div className="space-y-3">
                {topLeaders.map((entry) => (
                  <div key={entry.username} className="flex items-center gap-3">
                    <span className="w-4 shrink-0 text-center font-display text-sm font-bold text-white/40">{entry.rank}</span>
                    <img src={avatarFor(entry.username, entry.avatarUrl)} alt={entry.username} className="h-8 w-8 rounded-lg" />
                    <span className="flex-1 truncate text-sm font-medium">{entry.username}</span>
                    <AuraBadge value={entry.aura} size="xs" trend="neutral" />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Live battles */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-bold">Live Battles</h2>
              <Link href="/battles" className="text-xs font-medium text-aura-blue hover:underline">View All</Link>
            </div>
            {loading ? (
              <p className="text-sm text-white/40">Loading...</p>
            ) : liveList.length === 0 ? (
              <p className="text-sm text-white/40">No battles live right now.</p>
            ) : (
              <div className="space-y-3">
                {liveList.map((battle) => (
                  <div key={battle.id} className="flex items-center gap-3">
                    <img src={avatarFor(battle.creator_username, battle.creator_avatar)} alt={battle.creator_username} className="h-9 w-9 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold capitalize">{battle.battle_type} Battle</p>
                      <p className="text-xs text-white/40 capitalize">{battle.topic}</p>
                    </div>
                    <Link href={`/battles/${battle.id}`}>
                      <Button size="xs" variant="secondary">Watch</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
