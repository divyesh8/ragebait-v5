import Card from "@/components/ui/Card";
import AuraBadge from "@/components/ui/AuraBadge";
import { mockLeaderboard } from "@/lib/mockData";

const filters = ["Global", "Country", "College", "Friends", "Groups", "Weekly", "Monthly", "Seasonal", "All-Time"];

export default function LeaderboardPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-display text-4xl font-bold">Leaderboard</h1>
      <p className="mt-2 text-white/50">
        Rankings by Aura. Updated live as battles conclude.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {filters.map((f, i) => (
          <span
            key={f}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              i === 0
                ? "bg-aura-gradient text-void"
                : "border border-line bg-surface2 text-white/60 hover:text-white"
            }`}
          >
            {f}
          </span>
        ))}
      </div>

      <Card className="mt-8 overflow-hidden p-0">
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
            {mockLeaderboard.map((entry) => (
              <tr key={entry.rank} className="border-t border-line">
                <td className="px-6 py-4 font-display font-bold text-white/70">
                  {entry.rank <= 3 ? (
                    <span
                      className={
                        entry.rank === 1
                          ? "text-aura-purple"
                          : entry.rank === 2
                          ? "text-aura-blue"
                          : "text-aura-crimson"
                      }
                    >
                      #{entry.rank}
                    </span>
                  ) : (
                    `#${entry.rank}`
                  )}
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
  );
}
