"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import AuraBadge from "@/components/ui/AuraBadge";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

interface BattleListItem {
  id: string;
  title: string;
  topic: string;
  battle_type: string;
  mode: string;
  status: "open" | "waiting" | "active" | "judging" | "completed" | "cancelled";
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
  "Android vs iPhone", "Anime", "Football", "Cricket",
  "Gaming", "Movies", "Technology", "College Life", "Internet Culture",
];

const feedTabs = ["For You", "Trending", "Following", "Communities"] as const;

const RANK_BADGES = ["🥇", "🥈", "🥉", "4", "5"];

export default function HomePage() {
  const { user } = useCurrentUser();
  const [battles, setBattles] = useState<BattleListItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedTab, setFeedTab] = useState<(typeof feedTabs)[number]>("For You");

  useEffect(() => {
    Promise.all([
      fetch("/api/battles").then((r) => r.json()),
      fetch("/api/leaderboard").then((r) => r.json()),
    ])
      .then(([battlesData, leaderboardData]) => {
        setBattles(battlesData.battles ?? []);
        setLeaderboard(leaderboardData.leaderboard ?? []);
      })
      .catch(() => { setBattles([]); setLeaderboard([]); })
      .finally(() => setLoading(false));
  }, []);

  const liveBattles = battles.filter((b) => b.status === "active");
  const heroBattle = liveBattles[0] ?? battles[0] ?? null;
  const otherBattles = battles.filter((b) => b.id !== heroBattle?.id).slice(0, 5);
  const topLeaders = leaderboard.slice(0, 5);
  const liveList = liveBattles.slice(0, 4);

  return (
    <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-5 sm:py-6">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">

        {/* ═══════════════════════════════════════
            MAIN COLUMN
        ═══════════════════════════════════════ */}
        <div className="min-w-0 space-y-5">

          {/* ─── RAGE ARENA (hero battle card) ─── */}
          {loading ? (
            <div className="h-[480px] animate-pulse rounded-3xl bg-white/[0.04]" />
          ) : heroBattle ? (
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#0e0e0e] to-[#050505] shadow-[0_0_80px_rgba(255,30,30,0.12)]">

              {/* Ambient red glow behind arena */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-aura-purple/10 blur-[80px]" />
                <div className="absolute left-1/4 top-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-aura-purple/8 blur-[60px]" />
                <div className="absolute right-1/4 top-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-aura-purple/8 blur-[60px]" />
              </div>

              {/* Top bar */}
              <div className="relative flex items-center justify-between border-b border-white/6 px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="font-display text-xs font-black uppercase tracking-widest text-white/50">
                    {heroBattle.battle_type} Battle
                  </span>
                  {heroBattle.status === "active" && (
                    <span className="flex items-center gap-1.5 rounded-full bg-aura-purple/20 border border-aura-purple/40 px-3 py-1 text-xs font-black uppercase tracking-wide text-aura-purple shadow-[0_0_16px_rgba(255,30,30,0.4)]">
                      <span className="h-1.5 w-1.5 animate-pulseGlow rounded-full bg-aura-purple" />
                      LIVE
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-white/40">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="3" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
                    </svg>
                    {liveBattles.length} watching
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/50 uppercase tracking-wide">
                    {heroBattle.topic}
                  </span>
                </div>
              </div>

              {/* Arena players */}
              <div className="relative grid grid-cols-1 items-center gap-4 px-6 py-10 sm:grid-cols-[1fr_auto_1fr]">

                {/* Creator */}
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-2xl bg-aura-purple/25 blur-xl animate-rageGlow" />
                    <img
                      src={avatarFor(heroBattle.creator_username, heroBattle.creator_avatar)}
                      alt={heroBattle.creator_username}
                      className="relative h-24 w-24 rounded-2xl border-2 border-aura-purple/70 shadow-[0_0_40px_rgba(255,30,30,0.45)]"
                    />
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-aura-purple px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-glow-sm whitespace-nowrap">
                      Challenger
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="font-display text-xl font-black">{heroBattle.creator_username}</p>
                    <AuraBadge value={heroBattle.creator_aura ?? 0} size="xs" trend="neutral" />
                  </div>
                  <div className="w-full max-w-[160px]">
                    <div className="rage-meter-track h-1.5 rounded-full overflow-hidden">
                      <div className="rage-meter-fill h-full rounded-full" style={{ width: "62%" }} />
                    </div>
                  </div>
                </div>

                {/* VS section */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    {/* Pulsing energy ring */}
                    <div className="absolute inset-0 rounded-full border-2 border-aura-purple/40 scale-150 animate-ping opacity-25" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-aura-purple/50 bg-black/60 backdrop-blur-md shadow-[0_0_30px_rgba(255,30,30,0.5)]">
                      <span className="font-display text-2xl font-black text-gradient-rage leading-none tracking-tighter">VS</span>
                    </div>
                  </div>
                  {/* Lightning bolt energy */}
                  <div className="flex items-center gap-1">
                    <div className="h-[2px] w-8 bg-gradient-to-r from-transparent via-aura-purple to-transparent animate-zap" />
                    <span className="text-aura-purple text-sm animate-flicker">⚡</span>
                    <div className="h-[2px] w-8 bg-gradient-to-l from-transparent via-aura-purple to-transparent animate-zap" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">{heroBattle.mode}</span>
                </div>

                {/* Opponent */}
                <div className="flex flex-col items-center gap-4 text-center">
                  {heroBattle.opponent_username ? (
                    <>
                      <div className="relative">
                        <div className="absolute inset-0 rounded-2xl bg-white/10 blur-xl" />
                        <img
                          src={avatarFor(heroBattle.opponent_username, heroBattle.opponent_avatar)}
                          alt={heroBattle.opponent_username}
                          className="relative h-24 w-24 rounded-2xl border-2 border-white/40 shadow-[0_0_40px_rgba(255,255,255,0.18)]"
                        />
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white/15 border border-white/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white whitespace-nowrap">
                          Defender
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="font-display text-xl font-black">{heroBattle.opponent_username}</p>
                        <AuraBadge value={heroBattle.opponent_aura ?? 0} size="xs" trend="neutral" />
                      </div>
                      <div className="w-full max-w-[160px]">
                        <div className="rage-meter-track h-1.5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-white/60 to-white/90 shadow-[0_0_10px_rgba(255,255,255,0.4)]" style={{ width: "45%" }} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] text-3xl text-white/20">?</div>
                      <p className="text-sm font-medium text-white/35">Awaiting opponent</p>
                      <Link href={`/battles/${heroBattle.id}`}>
                        <Button size="sm" variant="primary">Join as Opponent</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom action bar */}
              <div className="relative flex flex-col gap-3 border-t border-white/6 bg-black/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-display text-lg font-black">{heroBattle.title}</h3>
                  <p className="text-xs text-white/40 mt-0.5">Started by {heroBattle.creator_username}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="vote" size="sm">⚔️ Attack</Button>
                  <Button variant="secondary" size="sm">🛡️ Defend</Button>
                  <Link href={`/battles/${heroBattle.id}`}>
                    <Button size="sm">Watch Battle</Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="card-surface rounded-3xl flex flex-col items-center gap-4 py-20 text-center">
              <span className="text-5xl">⚔️</span>
              <p className="font-display text-2xl font-black">No battles yet</p>
              <p className="text-sm text-white/45">Be the first to ignite the arena.</p>
              <Link href="/battles"><Button>Start a Battle</Button></Link>
            </div>
          )}

          {/* ─── FEED TABS ─── */}
          <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/8 bg-white/[0.03] p-1 w-fit backdrop-blur-md">
            {feedTabs.map((t) => (
              <button
                key={t}
                onClick={() => setFeedTab(t)}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition-all duration-200 ${
                  feedTab === t
                    ? "bg-aura-gradient text-white shadow-glow-sm"
                    : "text-white/40 hover:text-white hover:bg-white/5"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* ─── VIRAL DEBATE FEED ─── */}
          <div className="space-y-3">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/[0.03]" />
              ))
            ) : otherBattles.length === 0 ? (
              <div className="card-surface rounded-2xl p-8 text-center">
                <p className="text-white/50 text-sm">
                  No more battles right now.{" "}
                  <Link href="/battles" className="text-aura-purple font-semibold hover:underline">Browse all →</Link>
                </p>
              </div>
            ) : (
              otherBattles.map((battle, i) => (
                <div
                  key={battle.id}
                  className="card-surface group flex flex-col gap-4 rounded-2xl p-5 transition-all duration-300 hover:border-white/18 hover:-translate-y-0.5 hover:shadow-[0_8px_40px_rgba(0,0,0,0.5)] sm:flex-row sm:items-center"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex flex-1 items-center gap-4 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={avatarFor(battle.creator_username, battle.creator_avatar)}
                        alt={battle.creator_username}
                        className="h-12 w-12 rounded-xl border border-white/12 group-hover:border-aura-purple/40 transition-colors"
                      />
                      {battle.status === "active" && (
                        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#0a0a0a] bg-aura-purple shadow-[0_0_6px_rgba(255,30,30,0.9)] animate-pulseGlow" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white/60">
                          {battle.topic}
                        </span>
                        {battle.status === "active" && (
                          <span className="flex items-center gap-1 rounded-full bg-aura-purple/15 border border-aura-purple/30 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-aura-purple">
                            <span className="h-1 w-1 rounded-full bg-aura-purple animate-pulseGlow" /> LIVE
                          </span>
                        )}
                        {i === 0 && (
                          <span className="flex items-center gap-1 rounded-full bg-white/10 border border-white/20 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-white">
                            🔥 TRENDING
                          </span>
                        )}
                      </div>
                      <p className="truncate font-display text-base font-black leading-tight">{battle.title}</p>
                      <p className="mt-0.5 text-xs text-white/35">
                        {battle.creator_username}
                        {battle.opponent_username ? ` ⚔️ ${battle.opponent_username}` : " · waiting for opponent"}
                      </p>
                    </div>
                    {/* Rage meter mini */}
                    <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/30">Rage</span>
                      <div className="rage-meter-track h-1 w-16 rounded-full overflow-hidden">
                        <div className="rage-meter-fill h-full rounded-full" style={{ width: `${40 + Math.random() * 55}%` }} />
                      </div>
                    </div>
                  </div>
                  <Link href={`/battles/${battle.id}`} className="shrink-0">
                    <Button size="sm" variant="secondary" className="group-hover:border-aura-purple/50 group-hover:shadow-glow-sm">
                      Join Debate →
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </div>

          {/* ─── TOPIC BATTLEFIELDS ─── */}
          <div className="card-surface rounded-2xl p-5">
            <h2 className="mb-4 font-display text-lg font-black">
              Pick Your Battlefield
            </h2>
            <div className="flex flex-wrap gap-2">
              {topics.map((topic) => (
                <Link
                  key={topic}
                  href="/battles"
                  className="glossy-highlight rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/60 transition-all hover:border-aura-purple/50 hover:text-white hover:bg-aura-purple/10 hover:shadow-[0_0_16px_rgba(255,30,30,0.25)] active:scale-95"
                >
                  {topic}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════
            RIGHT SIDEBAR
        ═══════════════════════════════════════ */}
        <div className="space-y-5">

          {/* ─── PROFILE PANEL ─── */}
          {user ? (
            <div className="card-surface rounded-2xl overflow-hidden">
              {/* Gradient header */}
              <div className="relative h-16 bg-gradient-to-r from-aura-purple/20 via-aura-crimson/10 to-transparent">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,30,30,0.25),transparent_70%)]" />
              </div>
              <div className="px-5 pb-5 -mt-8">
                <div className="flex items-end gap-3 mb-4">
                  <div className="relative">
                    <img
                      src={avatarFor(user.username, user.avatar_url)}
                      alt={user.username}
                      className="h-16 w-16 rounded-2xl border-2 border-aura-purple/60 shadow-[0_0_24px_rgba(255,30,30,0.4)]"
                    />
                    <span className="absolute -bottom-1 -right-1 rounded-full bg-aura-purple px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-glow-sm">
                      LVL {user.level}
                    </span>
                  </div>
                  <div className="mb-1">
                    <p className="font-display text-lg font-black leading-tight">{user.username}</p>
                    <AuraBadge value={user.aura} size="xs" trend="neutral" />
                  </div>
                </div>

                {/* XP bar */}
                <div className="mb-1 rage-meter-track h-1.5 rounded-full overflow-hidden">
                  <div className="rage-meter-fill h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (user.xp % 1000) / 10)}%` }} />
                </div>
                <p className="text-right text-[10px] font-semibold uppercase tracking-wider text-white/25">
                  {Math.round((user.xp % 1000) / 10)}% to Level {user.level + 1}
                </p>

                {/* Stats */}
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    { val: user.wins + user.losses, label: "Battles" },
                    { val: user.wins, label: "Wins" },
                    { val: `${user.wins + user.losses > 0 ? Math.round((user.wins / (user.wins + user.losses)) * 100) : 0}%`, label: "Win Rate" },
                  ].map(({ val, label }) => (
                    <div key={label} className="rounded-xl border border-white/8 bg-white/[0.03] py-3">
                      <p className="font-display text-xl font-black text-white">{val}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-white/35">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="card-surface rounded-2xl p-6 text-center">
              <div className="mb-3 text-4xl">⚔️</div>
              <p className="font-display text-lg font-black">Enter the Arena</p>
              <p className="mt-1 text-sm text-white/45">Create a profile and start winning.</p>
              <Link href="/signup" className="mt-5 block">
                <Button className="w-full">Join the Rage</Button>
              </Link>
              <Link href="/login" className="mt-2 block text-sm text-white/35 hover:text-white transition-colors">
                Already raging? Log in →
              </Link>
            </div>
          )}

          {/* ─── LEADERBOARD ─── */}
          <div className="card-surface rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-black">🏆 Top Fighters</h2>
              <Link href="/leaderboard" className="text-xs font-bold text-aura-purple hover:text-white hover:underline transition-colors">View All →</Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-xl bg-white/[0.03]" />
                ))}
              </div>
            ) : topLeaders.length === 0 ? (
              <p className="text-sm text-white/35">No fighters yet.</p>
            ) : (
              <div className="space-y-2">
                {topLeaders.map((entry, i) => (
                  <div
                    key={entry.username}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:bg-white/5 ${i === 0 ? "border border-aura-purple/25 bg-aura-purple/5 shadow-[0_0_16px_rgba(255,30,30,0.12)]" : ""}`}
                  >
                    <span className={`w-6 shrink-0 text-center font-display text-sm font-black ${i === 0 ? "text-aura-purple" : i === 1 ? "text-white/70" : "text-white/35"}`}>
                      {RANK_BADGES[i]}
                    </span>
                    <img src={avatarFor(entry.username, entry.avatarUrl)} alt={entry.username} className="h-8 w-8 rounded-lg border border-white/10" />
                    <span className="flex-1 truncate text-sm font-bold">{entry.username}</span>
                    <AuraBadge value={entry.aura} size="xs" trend="neutral" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── LIVE BATTLES ─── */}
          <div className="card-surface rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-black flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-aura-purple animate-pulseGlow shadow-[0_0_8px_rgba(255,30,30,0.9)]" />
                Live Battles
              </h2>
              <Link href="/battles" className="text-xs font-bold text-aura-purple hover:text-white hover:underline transition-colors">View All →</Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-xl bg-white/[0.03]" />
                ))}
              </div>
            ) : liveList.length === 0 ? (
              <p className="text-sm text-white/35">No battles live right now.</p>
            ) : (
              <div className="space-y-2">
                {liveList.map((battle) => (
                  <div key={battle.id} className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5 hover:border-aura-purple/30 hover:bg-aura-purple/5 transition-all">
                    <img src={avatarFor(battle.creator_username, battle.creator_avatar)} alt={battle.creator_username} className="h-9 w-9 shrink-0 rounded-lg border border-white/10" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold capitalize">{battle.battle_type} Battle</p>
                      <p className="text-[11px] text-white/35 capitalize">{battle.topic}</p>
                    </div>
                    <Link href={`/battles/${battle.id}`}>
                      <Button size="xs" variant="secondary">Watch</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
