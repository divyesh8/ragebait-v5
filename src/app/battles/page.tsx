"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import CreateBattleForm from "@/components/battle/CreateBattleForm";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

interface BattleListItem {
  id: string;
  battle_code: string;
  title: string;
  topic: string;
  battle_type: string;
  mode: string;
  status: "waiting" | "active" | "judging" | "completed" | "cancelled" | "expired";
  rounds: number;
  winner_id: string | null;
  ai_summary: string | null;
  created_at: string;
  expires_at: string | null;
  creator_id: string;
  creator_username: string;
  creator_avatar: string;
  opponent_id: string | null;
  opponent_username: string | null;
  opponent_avatar: string | null;
}

const statusStyles: Record<string, string> = {
  waiting: "text-aura-blue",
  active: "text-aura-crimson",
  judging: "text-aura-purple",
  completed: "text-white/40",
  cancelled: "text-white/30",
  expired: "text-white/30",
};

const statusLabels: Record<string, string> = {
  waiting: "Waiting — needs opponent",
  active: "Active",
  judging: "AI Judging",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
};

function avatarFor(username: string, avatarUrl: string | null) {
  return avatarUrl || `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(username)}`;
}

export default function BattlesPage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [battles, setBattles] = useState<BattleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [codeSearching, setCodeSearching] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [feed, setFeed] = useState<"foryou" | "discover">("foryou");

  const loadBattles = useCallback(async (feedMode: "foryou" | "discover") => {
    try {
      const res = await fetch(`/api/battles?feed=${feedMode}`);
      const data = await res.json();
      setBattles(data.battles ?? []);
    } catch {
      setBattles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBattles(feed);
    const interval = setInterval(() => loadBattles(feed), 8000);
    return () => clearInterval(interval);
  }, [loadBattles, feed]);

  async function handleJoin(battleId: string) {
    if (!user) {
      setError("Log in to join a battle.");
      return;
    }
    setJoiningId(battleId);
    setError(null);
    try {
      const res = await fetch(`/api/battles/${battleId}/join`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not join this battle.");
        setJoiningId(null);
        return;
      }
      window.location.href = `/battles/${battleId}`;
    } catch {
      setError("Could not reach the server.");
      setJoiningId(null);
    }
  }

  async function handleCodeSearch(e: React.FormEvent) {
    e.preventDefault();
    const code = codeInput.trim();
    if (!code) return;
    setCodeSearching(true);
    setCodeError(null);
    try {
      const res = await fetch(`/api/battles/code/${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok) {
        setCodeError(data.error ?? "No battle found with that code.");
        return;
      }
      router.push(`/battles/${data.battle.id}`);
    } catch {
      setCodeError("Could not reach the server.");
    } finally {
      setCodeSearching(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">Battles</h1>
          <p className="mt-2 text-white/50">
            Real roast battles, judged by AI. Create one, wait for an opponent, then trade roasts.
          </p>
        </div>
        {user ? (
          <Button size="md" onClick={() => setShowCreate(true)}>
            + Start a battle
          </Button>
        ) : (
          <Link href="/login">
            <Button size="md" variant="secondary">
              Log in to start a battle
            </Button>
          </Link>
        )}
      </div>

      {user && (
        <div className="mb-6 flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-1 w-fit backdrop-blur-md">
          <button
            onClick={() => setFeed("foryou")}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              feed === "foryou" ? "bg-aura-purple text-void shadow-glow-sm" : "text-white/50 hover:text-white"
            }`}
          >
            For You
          </button>
          <button
            onClick={() => setFeed("discover")}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              feed === "discover" ? "bg-aura-purple text-void shadow-glow-sm" : "text-white/50 hover:text-white"
            }`}
          >
            Discover Battles
          </button>
        </div>
      )}

      <form onSubmit={handleCodeSearch} className="mb-10 flex flex-wrap items-center gap-2">
        <input
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
          placeholder="Got a battle code? Enter it here (e.g. X7K2PQ)"
          maxLength={8}
          className="w-72 rounded-full border border-line bg-surface2 px-4 py-2 text-sm font-mono uppercase tracking-wider text-white placeholder:text-white/30 placeholder:font-sans placeholder:tracking-normal placeholder:normal-case focus-visible:border-aura-purple"
        />
        <Button type="submit" variant="secondary" size="sm" disabled={codeSearching}>
          {codeSearching ? "Searching..." : "Find battle"}
        </Button>
        {codeError && <span className="text-xs text-aura-crimson">{codeError}</span>}
      </form>

      {error && (
        <div className="mb-6 rounded-xl border border-aura-crimson/40 bg-aura-crimson/10 px-4 py-3 text-sm text-aura-crimson">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-white/50">Loading battles...</p>
      ) : battles.length === 0 ? (
        <Card className="text-center">
          <p className="text-white/60">
            No battles yet. Be the first to start one!
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {battles.map((battle) => (
            <Card
              key={battle.id}
              glow={battle.status === "active" ? "crimson" : "none"}
              className={`flex flex-col gap-4 transition-opacity ${battle.status === "expired" || battle.status === "cancelled" ? "opacity-50 grayscale" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-surface2 px-3 py-1 text-xs font-medium uppercase tracking-wide text-aura-purple">
                  {battle.topic}
                </span>
                <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                  battle.status === "expired"
                    ? "border border-white/15 bg-white/5 text-white/40"
                    : statusStyles[battle.status]
                }`}>
                  {battle.status === "active" && (
                    <span className="inline-block h-1.5 w-1.5 animate-pulseGlow rounded-full bg-aura-crimson" />
                  )}
                  {statusLabels[battle.status]}
                </span>
              </div>

              <h3 className="font-display text-lg font-semibold leading-snug">
                {battle.title}
              </h3>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-full bg-surface2 px-2.5 py-1">
                  <img
                    src={avatarFor(battle.creator_username, battle.creator_avatar)}
                    alt={battle.creator_username}
                    className="h-5 w-5 rounded-full"
                  />
                  <span className="text-xs text-white/70">{battle.creator_username}</span>
                </div>
                {battle.opponent_username ? (
                  <div className="flex items-center gap-2 rounded-full bg-surface2 px-2.5 py-1">
                    <img
                      src={avatarFor(battle.opponent_username, battle.opponent_avatar)}
                      alt={battle.opponent_username}
                      className="h-5 w-5 rounded-full"
                    />
                    <span className="text-xs text-white/70">{battle.opponent_username}</span>
                  </div>
                ) : (
                  <span className="text-xs text-white/30">Waiting for opponent...</span>
                )}
              </div>

              {battle.ai_summary && (
                <div className="rounded-xl border border-line bg-surface2 p-3 text-xs text-white/60">
                  {battle.ai_summary}
                </div>
              )}

              <div className="mt-auto flex items-center justify-between text-xs text-white/40">
                <div className="flex gap-3">
                  <span className="capitalize">{battle.battle_type} battle</span>
                  <span className="capitalize">{battle.mode}</span>
                </div>
                <span className="font-mono">#{battle.battle_code}</span>
              </div>

              {battle.status === "waiting" && user && battle.creator_id !== user.id ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => handleJoin(battle.id)}
                  disabled={joiningId === battle.id}
                >
                  {joiningId === battle.id ? "Joining..." : "Join battle"}
                </Button>
              ) : (
                <Link href={`/battles/${battle.id}`}>
                  <Button variant="secondary" size="sm" className="w-full">
                    {battle.status === "completed" || battle.status === "judging"
                      ? "View result"
                      : battle.status === "waiting"
                      ? "View battle"
                      : "Open battle"}
                  </Button>
                </Link>
              )}
            </Card>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateBattleForm
          onCreated={() => loadBattles(feed)}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
