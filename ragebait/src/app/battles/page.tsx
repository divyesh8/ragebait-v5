import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { mockBattles } from "@/lib/mockData";

const statusStyles: Record<string, string> = {
  live: "text-aura-crimson",
  scheduled: "text-aura-blue",
  completed: "text-white/40",
};

export default function BattlesPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">Battles</h1>
          <p className="mt-2 text-white/50">
            Casual, ranked, friend, tournament, group, and event battles —
            text, image, or meme formats.
          </p>
        </div>
        <Button size="md">+ Start a battle</Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {mockBattles.map((battle) => (
          <Card key={battle.id} className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-surface2 px-3 py-1 text-xs font-medium uppercase tracking-wide text-aura-purple">
                {battle.topic}
              </span>
              <span className={`text-xs font-semibold uppercase ${statusStyles[battle.status]}`}>
                {battle.status === "live" && (
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulseGlow rounded-full bg-aura-crimson" />
                )}
                {battle.status}
              </span>
            </div>

            <h3 className="font-display text-lg font-semibold leading-snug">
              {battle.title}
            </h3>

            <div className="flex items-center gap-2">
              {battle.participants.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-full bg-surface2 px-2.5 py-1">
                  <img src={p.avatarUrl} alt={p.username} className="h-5 w-5 rounded-full" />
                  <span className="text-xs text-white/70">{p.username}</span>
                </div>
              ))}
            </div>

            {battle.aiScore && (
              <div className="rounded-xl border border-line bg-surface2 p-3 text-xs text-white/60">
                AI Score: <span className="font-mono text-aura-blue">{battle.aiScore.total}/100</span>
              </div>
            )}

            <div className="mt-auto flex items-center justify-between text-xs text-white/40">
              <div className="flex gap-3">
                <span className="capitalize">{battle.type} battle</span>
                <span className="capitalize">{battle.mode}</span>
              </div>
              <span>{battle.viewerCount.toLocaleString()} watching</span>
            </div>

            <Button variant="secondary" size="sm" className="w-full">
              {battle.status === "live" ? "Watch now" : battle.status === "scheduled" ? "Set reminder" : "View replay"}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
