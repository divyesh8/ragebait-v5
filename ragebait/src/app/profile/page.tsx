import Card from "@/components/ui/Card";
import AuraBadge from "@/components/ui/AuraBadge";
import Button from "@/components/ui/Button";
import { mockAuraHistory, mockUser } from "@/lib/mockData";

const statItems = [
  { label: "Level", value: mockUser.level },
  { label: "XP", value: mockUser.xp.toLocaleString() },
  { label: "Wins", value: mockUser.wins },
  { label: "Losses", value: mockUser.losses },
  { label: "Win Rate", value: `${mockUser.winRate}%` },
  { label: "Total Battles", value: mockUser.totalBattles },
  { label: "Current Streak", value: mockUser.currentStreak },
  { label: "Best Streak", value: mockUser.bestStreak },
];

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {/* Banner + header */}
      <div className="relative h-40 rounded-2xl bg-aura-gradient sm:h-56" />

      <div className="relative -mt-12 flex flex-col items-start gap-4 px-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-end gap-4">
          <img
            src={mockUser.avatarUrl}
            alt={mockUser.username}
            className="h-24 w-24 rounded-2xl border-4 border-void bg-surface2 sm:h-28 sm:w-28"
          />
          <div className="pb-2">
            <h1 className="font-display text-2xl font-bold sm:text-3xl">
              {mockUser.username}
            </h1>
            <p className="text-sm text-white/40">
              Joined {new Date(mockUser.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm">
          Edit profile
        </Button>
      </div>

      <p className="mt-6 max-w-2xl text-white/60">{mockUser.bio}</p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <AuraBadge value={mockUser.aura} size="lg" trend="up" />
        <span className="text-sm text-white/50">
          <span className="font-semibold text-white">{mockUser.followers.toLocaleString()}</span> followers
        </span>
        <span className="text-sm text-white/50">
          <span className="font-semibold text-white">{mockUser.following}</span> following
        </span>
      </div>

      {/* Stats grid */}
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statItems.map((item) => (
          <Card key={item.label} className="text-center">
            <p className="font-display text-2xl font-bold text-gradient">{item.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-white/40">{item.label}</p>
          </Card>
        ))}
      </div>

      {/* Achievements */}
      <div className="mt-10">
        <h2 className="font-display text-xl font-bold">Achievements</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {mockUser.achievements.map((a) => (
            <span
              key={a}
              className="rounded-full border border-line bg-surface2 px-4 py-2 text-sm font-medium text-aura-blue"
            >
              🏆 {a}
            </span>
          ))}
        </div>
      </div>

      {/* Aura history */}
      <div className="mt-10">
        <h2 className="font-display text-xl font-bold">Aura history</h2>
        <Card className="mt-4 divide-y divide-line p-0">
          {mockAuraHistory.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-sm font-medium">{tx.reason}</p>
                <p className="text-xs text-white/40">
                  {new Date(tx.timestamp).toLocaleString()}
                </p>
              </div>
              <span
                className={`font-mono text-sm font-semibold ${
                  tx.amount > 0 ? "text-aura-blue" : "text-aura-crimson"
                }`}
              >
                {tx.amount > 0 ? "+" : ""}
                {tx.amount}
              </span>
            </div>
          ))}
        </Card>
      </div>

      {/* Joined groups */}
      <div className="mt-10 mb-12">
        <h2 className="font-display text-xl font-bold">Rage Groups</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {mockUser.joinedGroups.map((g) => (
            <span
              key={g}
              className="rounded-full border border-line bg-surface2 px-4 py-2 text-sm font-medium text-white/70"
            >
              {g}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
