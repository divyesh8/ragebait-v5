"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

interface TopicCategory {
  id: string;
  name: string;
  slug: string;
}

const battleTypes = ["casual", "ranked", "friend", "tournament", "group", "event"] as const;
const modes = ["text", "image", "meme"] as const;
const battleStyles = [
  { value: "debate",     label: "Debate" },
  { value: "roast",      label: "Roast" },
  { value: "prediction", label: "Prediction" },
  { value: "opinion",    label: "Opinion" },
  { value: "meme",       label: "Meme Battle" },
] as const;

interface CreateBattleFormProps {
  onCreated: () => void;
  onClose: () => void;
}

export default function CreateBattleForm({ onCreated, onClose }: CreateBattleFormProps) {
  const router = useRouter();

  const [categories, setCategories] = useState<TopicCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Step 1: choose topic
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [customMode, setCustomMode] = useState(false);

  // Custom topic fields
  const [customTopicName, setCustomTopicName] = useState("");
  const [customQuestion, setCustomQuestion] = useState("");
  const [customDescription, setCustomDescription] = useState("");

  // Shared battle fields
  const [battleType, setBattleType] = useState<typeof battleTypes[number]>("casual");
  const [battleStyle, setBattleStyle] = useState<typeof battleStyles[number]["value"]>("debate");
  const [mode, setMode] = useState<typeof modes[number]>("text");
  const [rounds, setRounds] = useState(3);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/topics")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => setError("Could not load topic categories."))
      .finally(() => setCategoriesLoading(false));
  }, []);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null;
  const readyToConfigure = customMode ? customTopicName.trim().length > 0 : !!selectedCategoryId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const title = customMode
      ? (customQuestion.trim() || customTopicName.trim())
      : `${selectedCategory?.name} Battle`;
    const topic = customMode ? customTopicName.trim() : (selectedCategory?.name ?? "");

    if (title.length < 3) {
      setError("Give your battle a title of at least 3 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/battles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          topic,
          description: customMode ? (customDescription.trim() || undefined) : undefined,
          battleType,
          battleStyle,
          topicCategoryId: customMode ? null : selectedCategoryId,
          isCustomTopic: customMode,
          mode,
          rounds,
        }),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 overflow-y-auto">
      <Card className="w-full max-w-lg" glow="purple">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Start a battle</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white" aria-label="Close">
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-aura-crimson/40 bg-aura-crimson/10 px-4 py-3 text-sm text-aura-crimson">
            {error}
          </div>
        )}

        {/* ── Step 1: choose topic ── */}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-white/70">Choose topic</label>
            {categoriesLoading ? (
              <p className="mt-2 text-sm text-white/40">Loading topics...</p>
            ) : (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => { setSelectedCategoryId(cat.id); setCustomMode(false); }}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                      !customMode && selectedCategoryId === cat.id
                        ? "border-aura-purple bg-aura-purple/20 text-white glow-ring-purple"
                        : "border-white/10 bg-white/5 text-white/60 hover:border-aura-purple/40 hover:text-white"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { setCustomMode(true); setSelectedCategoryId(null); }}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                    customMode
                      ? "border-aura-blue bg-aura-blue/20 text-white glow-ring-blue"
                      : "border-dashed border-white/15 bg-white/5 text-white/60 hover:border-aura-blue/40 hover:text-white"
                  }`}
                >
                  + Custom
                </button>
              </div>
            )}
          </div>

          {/* ── Custom topic fields ── */}
          {customMode && (
            <div className="space-y-3 rounded-xl border border-aura-blue/20 bg-aura-blue/5 p-4">
              <div>
                <label htmlFor="customTopicName" className="block text-xs font-medium text-white/60">
                  Topic name
                </label>
                <input
                  id="customTopicName"
                  type="text"
                  required
                  maxLength={60}
                  value={customTopicName}
                  onChange={(e) => setCustomTopicName(e.target.value)}
                  placeholder="e.g. Will AI replace software engineers?"
                  className="mt-1 w-full rounded-lg border border-line bg-surface2 px-3 py-2 text-sm text-white placeholder:text-white/30 focus-visible:border-aura-blue"
                />
              </div>
              <div>
                <label htmlFor="customQuestion" className="block text-xs font-medium text-white/60">
                  Debate question (used as the battle title)
                </label>
                <input
                  id="customQuestion"
                  type="text"
                  maxLength={140}
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder="Will AI replace software engineers?"
                  className="mt-1 w-full rounded-lg border border-line bg-surface2 px-3 py-2 text-sm text-white placeholder:text-white/30 focus-visible:border-aura-blue"
                />
              </div>
              <div>
                <label htmlFor="customDescription" className="block text-xs font-medium text-white/60">
                  Description / context (optional)
                </label>
                <textarea
                  id="customDescription"
                  maxLength={500}
                  rows={2}
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Argue whether AI will reduce programming jobs."
                  className="mt-1 w-full resize-none rounded-lg border border-line bg-surface2 px-3 py-2 text-sm text-white placeholder:text-white/30 focus-visible:border-aura-blue"
                />
              </div>
            </div>
          )}

          {/* ── Battle style ── */}
          <div>
            <label className="block text-sm font-medium text-white/70">Battle style</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {battleStyles.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setBattleStyle(s.value)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                    battleStyle === s.value
                      ? "border-aura-purple bg-aura-purple/20 text-white"
                      : "border-white/10 bg-white/5 text-white/60 hover:border-aura-purple/40 hover:text-white"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="battleType" className="block text-sm font-medium text-white/70">
                  Battle format
                </label>
                <select
                  id="battleType"
                  value={battleType}
                  onChange={(e) => setBattleType(e.target.value as typeof battleType)}
                  className="mt-1.5 w-full rounded-xl border border-line bg-surface2 px-4 py-3 text-sm capitalize text-white focus-visible:border-aura-purple"
                >
                  {battleTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
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
                    <option key={m} value={m}>{m}</option>
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

            <p className="text-xs text-white/30">
              This battle expires in 10 minutes if nobody joins. Once it starts, the timer resets for the match itself.
            </p>

            <Button type="submit" className="w-full" size="lg" disabled={loading || !readyToConfigure}>
              {loading ? "Creating..." : "Create battle"}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
