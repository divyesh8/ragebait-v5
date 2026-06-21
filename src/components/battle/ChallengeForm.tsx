"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

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

const modes = ["text", "image", "meme"] as const;

interface ChallengeFormProps {
  onSent: () => void;
  onClose: () => void;
}

export default function ChallengeForm({ onSent, onClose }: ChallengeFormProps) {
  const [toUsername, setToUsername] = useState("");
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState(topics[0]);
  const [mode, setMode] = useState<typeof modes[number]>("text");
  const [rounds, setRounds] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toUsername: toUsername.replace(/^@/, ""),
          title,
          topic,
          mode,
          rounds,
          battleType: "friend",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not send challenge.");
        setLoading(false);
        return;
      }
      setSuccess(`Challenge sent to @${toUsername.replace(/^@/, "")}!`);
      onSent();
      setTimeout(onClose, 1200);
    } catch {
      setError("Could not reach the server. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <Card className="w-full max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Challenge a player</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white" aria-label="Close">
            ✕
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-xl border border-aura-crimson/40 bg-aura-crimson/10 px-4 py-3 text-sm text-aura-crimson">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-aura-blue/40 bg-aura-blue/10 px-4 py-3 text-sm text-aura-blue">
              {success}
            </div>
          )}

          <div>
            <label htmlFor="toUsername" className="block text-sm font-medium text-white/70">
              Username to challenge
            </label>
            <input
              id="toUsername"
              type="text"
              required
              value={toUsername}
              onChange={(e) => setToUsername(e.target.value)}
              placeholder="e.g. divyesh"
              className="mt-1.5 w-full rounded-xl border border-line bg-surface2 px-4 py-3 text-sm text-white placeholder:text-white/30 focus-visible:border-aura-purple"
            />
          </div>

          <div>
            <label htmlFor="ctitle" className="block text-sm font-medium text-white/70">
              Battle title
            </label>
            <input
              id="ctitle"
              type="text"
              required
              minLength={3}
              maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Let's settle this once and for all"
              className="mt-1.5 w-full rounded-xl border border-line bg-surface2 px-4 py-3 text-sm text-white placeholder:text-white/30 focus-visible:border-aura-purple"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="ctopic" className="block text-sm font-medium text-white/70">
                Topic
              </label>
              <select
                id="ctopic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line bg-surface2 px-4 py-3 text-sm text-white focus-visible:border-aura-purple"
              >
                {topics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cmode" className="block text-sm font-medium text-white/70">
                Mode
              </label>
              <select
                id="cmode"
                value={mode}
                onChange={(e) => setMode(e.target.value as typeof mode)}
                className="mt-1.5 w-full rounded-xl border border-line bg-surface2 px-4 py-3 text-sm capitalize text-white focus-visible:border-aura-purple"
              >
                {modes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="crounds" className="block text-sm font-medium text-white/70">
              Rounds per player ({rounds})
            </label>
            <input
              id="crounds"
              type="range"
              min={1}
              max={5}
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
              className="mt-1.5 w-full"
            />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Sending..." : "Send challenge"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
