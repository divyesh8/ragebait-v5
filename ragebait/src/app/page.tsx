import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import AuraBadge from "@/components/ui/AuraBadge";
import { mockBattles, mockLeaderboard } from "@/lib/mockData";

const liveBattles = mockBattles.filter((b) => b.status === "live");

const features = [
  {
    title: "AI Judge",
    desc: "Every battle is scored across humor, creativity, originality, timing, and topic relevance — no human bias.",
    accent: "purple",
  },
  {
    title: "Hybrid Verdicts",
    desc: "70% AI score, 30% community vote. The crowd gets a say, but can't overrule skill.",
    accent: "blue",
  },
  {
    title: "Aura Economy",
    desc: "Win battles, climb seasons, and build a reputation that can't be bought — Aura is earned, never sold.",
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
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-grid-glow">
        <div className="mx-auto max-w-7xl px-6 pt-20 pb-24 text-center sm:pt-28">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface2 px-4 py-1.5 text-xs font-medium text-white/60 animate-rise">
            <span className="h-2 w-2 animate-pulseGlow rounded-full bg-aura-crimson" />
            {liveBattles.length} battles live right now
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
            <Link href="/signup">
              <Button size="lg">Create your profile</Button>
            </Link>
            <Link href="/battles">
              <Button size="lg" variant="secondary">
                Watch live battles
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Live battles strip */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Live battles
            </h2>
            <Link
              href="/battles"
              className="text-sm font-medium text-aura-blue hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {mockBattles.slice(0, 3).map((battle) => (
              <Card key={battle.id} className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-surface2 px-3 py-1 text-xs font-medium uppercase tracking-wide text-aura-purple">
                    {battle.topic}
                  </span>
                  {battle.status === "live" ? (
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
                  {battle.participants.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 rounded-full bg-surface2 px-2.5 py-1">
                      <img src={p.avatarUrl} alt={p.username} className="h-5 w-5 rounded-full" />
                      <span className="text-xs text-white/70">{p.username}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto flex items-center justify-between text-xs text-white/40">
                  <span>{battle.viewerCount.toLocaleString()} watching</span>
                  <span className="capitalize">{battle.mode} battle</span>
                </div>
              </Card>
            ))}
          </div>
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
                {mockLeaderboard.slice(0, 5).map((entry) => (
                  <tr key={entry.rank} className="border-t border-line">
                    <td className="px-6 py-4 font-display font-bold text-white/70">
                      #{entry.rank}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={entry.avatarUrl} alt={entry.username} className="h-8 w-8 rounded-full" />
                        <span className="font-medium">{entry.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <AuraBadge value={entry.aura} size="sm" trend={entry.trend} />
                    </td>
                    <td className="px-6 py-4 text-white/70">{entry.wins}</td>
                    <td className="px-6 py-4 text-white/70">{entry.winRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
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
            Your Aura starts at zero. Where it goes is up to you.
          </h2>
          <div className="mt-8">
            <Link href="/signup">
              <Button size="lg" variant="secondary" className="bg-void text-white">
                Create your profile
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
