import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { mockGroups } from "@/lib/mockData";

export default function GroupsPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">Rage Groups</h1>
          <p className="mt-2 text-white/50">
            Communities built around topics. Battle, chat, and climb group
            leaderboards together.
          </p>
        </div>
        <Button size="md">+ Create group</Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {mockGroups.map((group) => (
          <Card key={group.id} className="flex flex-col gap-4">
            <div className="h-24 rounded-xl bg-aura-gradient" />
            <div>
              <h3 className="font-display text-lg font-semibold">{group.name}</h3>
              <p className="mt-1 text-sm text-white/50">{group.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.topics.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-surface2 px-3 py-1 text-xs font-medium text-aura-purple"
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-auto flex items-center justify-between text-xs text-white/40">
              <span>{group.memberCount.toLocaleString()} members</span>
            </div>
            <Button variant="secondary" size="sm" className="w-full">
              Join group
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
