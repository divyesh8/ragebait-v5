"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

const battleTypes = ["casual", "ranked", "friend", "tournament", "group", "event"] as const;
const modes = ["text", "image", "meme"] as const;

interface CreateBattleFormProps {
  onCreated: () => void;
  onClose: () => void;
}

export default function CreateBattleForm({ onCreated, onClose }: CreateBattleFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState<string>(topics[0]);
  const [customTopic, setCustomTopic] = useState("");
  const isCustomTopic = topic === "__custom__";
  const [battleType, setBattleType] = useState<typeof battleTypes[number]>("casual");
  const [mode, setMode] = useState<typeof modes[number]>("text");
  const [rounds, setRounds] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const resolvedTopic = isCustomTopic ? customTopic.trim() : topic;
    if (isCustomTopic && resolvedTopic.length < 1) {
      setError("Enter a topic name.");
      return;
    }
    if (resolvedTopic.length > 60) {
      setError("Topic must be 60 characters or fewer.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/battles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, topic: resolvedTopic, battleType, mode, rounds }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setLoading(false);
        return;
      }

      onCreated();
      router.push(`/battles/${data.battle.id}`);
    } catch {
      setError("Could not reach the server. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <Card className="w-full max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Start a battle</h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-xl border border-aura-crimson/40 bg-aura-crimson/10 px-4 py-3 text-sm text-aura-crimson">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-white/70">
              Battle title
            </label>
            <input
              id="title"
              type="text"
              required
              minLength={3}
              maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. iOS Loyalist vs Android Purist"
              className="mt-1.5 w-full rounded-xl border border-line bg-surface2 px-4 py-3 text-sm text-white placeholder:text-white/30 focus-visible:border-aura-purple"
            />
          </div>

          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-white/70">
              Topic
            </label>
            <select
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-surface2 px-4 py-3 text-sm text-white focus-visible:border-aura-purple"
            >
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              <option value="__custom__">Custom topic...</option>
            </select>

            {isCustomTopic && (
              <input
                type="text"
                required
                minLength={1}
                maxLength={60}
                autoFocus
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="e.g. Pineapple on Pizza"
                className="mt-2 w-full rounded-xl border border-line bg-surface2 px-4 py-3 text-sm text-white placeholder:text-white/30 focus-visible:border-aura-purple"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="battleType" className="block text-sm font-medium text-white/70">
                Battle type
              </label>
              <select
                id="battleType"
                value={battleType}
                onChange={(e) => setBattleType(e.target.value as typeof battleType)}
                className="mt-1.5 w-full rounded-xl border border-line bg-surface2 px-4 py-3 text-sm capitalize text-white focus-visible:border-aura-purple"
              >
                {battleTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="mode" className="block text-sm font-medium text-white/70">
                Mode
              </label>
              <select
                id="mode"
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
            <label htmlFor="rounds" className="block text-sm font-medium text-white/70">
              Rounds per player ({rounds})
            </label>
            <input
              id="rounds"
              type="range"
              min={1}
              max={5}
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
              className="mt-1.5 w-full"
            />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Creating..." : "Create battle"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
