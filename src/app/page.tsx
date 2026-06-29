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
  opponent_username: string | null;
  opponent_avatar: string | null;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  avatarUrl: string | null;
  aura: number;
  wins: number;
  winRate: number;
}

function avatarFor(username: string, avatarUrl: string | null) {
  return avatarUrl || `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(username)}`;
}

const features = [
  {
    title: "AI Judge",
    desc: "Every battle is scored across humor, creativity, originality, timing, and topic relevance — no human bias.",
    accent: "purple",
  },
  {
    title: "Real Aura Economy",
    desc: "Win or lose real battles and your Aura updates instantly, with a permanent history of every change.",
    accent: "blue",
  },
  {
    title: "Live Battles",
    desc: "Create a battle, wait for a real opponent to join, then trade roasts in real time.",
    accent: "crimson",
  },
  {
    title: "AI Moderation",
    desc: "Hate speech, threats, and harassment are filtered in real time. Roast the bit, not the person.",
    accent: "purple",
  },
];

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

export default function HomePage() {
  const { user } = useCurrentUser();
  const [battles, setBattles] = useState<BattleListItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

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
  const featuredBattles = battles.slice(0, 3);
  const topLeaders = leaderboard.slice(0, 5);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-grid-glow">
        <div className="mx-auto max-w-7xl px-6 pt-20 pb-24 text-center sm:pt-28">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface2 px-4 py-1.5 text-xs font-medium text-white/60 animate-rise">
            <span className="h-2 w-2 animate-pulseGlow rounded-full bg-aura-crimson" />
            {loading ? "Loading battles..." : `${liveBattles.length} battle${liveBattles.length === 1 ? "" : "s"} live right now`}
          </div>

          <h1 className="font-display text-5xl font-bold leading-tight tracking-tight sm:text-7xl animate-rise">
            Win the roast.
            <br />
            <span className="text-gradient">Claim the Aura.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/60 animate-rise">
            Ragebait is an AI-judged arena for roast battles, debates, and meme
            wars. Bring the wit — the AI keeps score, the crowd keeps it fair.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 animate-rise">
            {user ? (
              <>
                <Link href="/battles">
                  <Button size="lg">Start a Battle</Button>
                </Link>
                <Link href="/profile">
                  <Button size="lg" variant="secondary">
                    My Profile
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/signup">
                  <Button size="lg">Create your profile</Button>
                </Link>
                <Link href="/battles">
                  <Button size="lg" variant="secondary">
                    View battles
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Battles strip */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Battles
            </h2>
            <Link
              href="/battles"
              className="text-sm font-medium text-aura-blue hover:underline"
            >
              View all
            </Link>
          </div>

          {loading ? (
            <p className="text-white/50">Loading...</p>
          ) : featuredBattles.length === 0 ? (
            <Card className="text-center">
              <p className="text-white/60">
                No battles yet.{" "}
                <Link href="/signup" className="text-aura-blue hover:underline">
                  Sign up
                </Link>{" "}
                and start the first one.
              </p>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredBattles.map((battle) => (
                <Link key={battle.id} href={`/battles/${battle.id}`}>
                  <Card className="flex h-full flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-surface2 px-3 py-1 text-xs font-medium uppercase tracking-wide text-aura-purple">
                        {battle.topic}
                      </span>
                      {battle.status === "active" ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-aura-crimson">
                          <span className="h-1.5 w-1.5 animate-pulseGlow rounded-full bg-aura-crimson" />
                          LIVE
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-white/40 uppercase">
                          {battle.status}
                        </span>
                      )}
                    </div>

                    <h3 className="font-display text-lg font-semibold leading-snug">
                      {battle.title}
                    </h3>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 rounded-full bg-surface2 px-2.5 py-1">
                        <img src={avatarFor(battle.creator_username, battle.creator_avatar)} alt={battle.creator_username} className="h-5 w-5 rounded-full" />
                        <span className="text-xs text-white/70">{battle.creator_username}</span>
                      </div>
                      {battle.opponent_username && (
                        <div className="flex items-center gap-2 rounded-full bg-surface2 px-2.5 py-1">
                          <img src={avatarFor(battle.opponent_username, battle.opponent_avatar)} alt={battle.opponent_username} className="h-5 w-5 rounded-full" />
                          <span className="text-xs text-white/70">{battle.opponent_username}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto flex items-center justify-between text-xs text-white/40">
                      <span className="capitalize">{battle.battle_type} battle</span>
                      <span className="capitalize">{battle.mode}</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 max-w-2xl">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Built for skill, not hate.
          </h2>
          <p className="mt-4 text-white/60">
            Ragebait rewards humor, timing, and originality — and actively
            shuts down racism, harassment, and personal attacks.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title}>
              <div
                className={`mb-4 h-10 w-10 rounded-xl ${
                  f.accent === "purple"
                    ? "bg-aura-purple/20"
                    : f.accent === "blue"
                    ? "bg-aura-blue/20"
                    : "bg-aura-crimson/20"
                }`}
              />
              <h3 className="font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-white/50">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Leaderboard preview */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Top of the leaderboard
            </h2>
            <Link
              href="/leaderboard"
              className="text-sm font-medium text-aura-blue hover:underline"
            >
              Full rankings
            </Link>
          </div>

          {loading ? (
            <p className="text-white/50">Loading...</p>
          ) : topLeaders.length === 0 ? (
            <Card className="text-center">
              <p className="text-white/60">No users yet.</p>
            </Card>
          ) : (
            <Card className="overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead className="bg-surface2 text-left text-xs uppercase tracking-wide text-white/40">
                  <tr>
                    <th className="px-6 py-3">Rank</th>
                    <th className="px-6 py-3">User</th>
                    <th className="px-6 py-3">Aura</th>
                    <th className="px-6 py-3">Wins</th>
                    <th className="px-6 py-3">Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {topLeaders.map((entry) => (
                    <tr key={entry.username} className="border-t border-line">
                      <td className="px-6 py-4 font-display font-bold text-white/70">
                        #{entry.rank}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={avatarFor(entry.username, entry.avatarUrl)} alt={entry.username} className="h-8 w-8 rounded-full" />
                          <span className="font-medium">{entry.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <AuraBadge value={entry.aura} size="sm" trend="neutral" />
                      </td>
                      <td className="px-6 py-4 text-white/70">{entry.wins}</td>
                      <td className="px-6 py-4 text-white/70">{entry.winRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      </section>

      {/* Topics */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">
          Pick your battlefield
        </h2>
        <div className="mt-8 flex flex-wrap gap-3">
          {topics.map((topic) => (
            <span
              key={topic}
              className="rounded-full border border-line bg-surface2 px-5 py-2.5 text-sm font-medium text-white/70 transition hover:border-aura-purple hover:text-white"
            >
              {topic}
            </span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-line bg-crimson-gradient">
        <div className="mx-auto max-w-7xl px-6 py-16 text-center">
          <h2 className="font-display text-3xl font-bold text-void sm:text-4xl">
            {user
              ? "Your next battle is waiting. Go claim that Aura."
              : "Your Aura starts at zero. Where it goes is up to you."}
          </h2>
          <div className="mt-8">
            {user ? (
              <Link href="/battles">
                <Button size="lg" variant="secondary" className="bg-void text-white">
                  Find a battle
                </Button>
              </Link>
            ) : (
              <Link href="/signup">
                <Button size="lg" variant="secondary" className="bg-void text-white">
                  Create your profile
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
