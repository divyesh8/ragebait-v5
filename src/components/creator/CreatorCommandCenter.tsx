"use client";

import { useEffect, useMemo, useState } from "react";

type CreatorOverview = {
  generatedAt: string;
  totals: { users: number; battles: number; live_battles: number };
  connectedUsers: Array<{
    id: string;
    username: string;
    email: string;
    profilePicture: string;
    country: string;
    currentPage: string;
    currentBattle: string;
    currentScreen: string;
    mousePosition: string;
    keyboardActivity: string;
    typingStatus: boolean;
    connectionTime: string;
    sessionLength: string;
    lastClick: string;
    device: string;
    browser: string;
    operatingSystem: string;
    screenResolution: string;
    networkQuality: string;
    latency: number;
    onlineStatus: string;
    invisibleMode: boolean;
    premiumStatus: boolean;
    verification: boolean;
    currentAura: number;
    currentXP: number;
    currentCoins: number;
    reportsAgainstUser: number;
    warnings: number;
    currentRank: string;
  }>;
  liveBattles: Array<{ id: string; title: string; topic: string; status: string }>;
  auditPreview: string[];
};

const controlGroups = [
  "User Management",
  "Aura Economy",
  "XP Control",
  "Coins Wallet",
  "Ban Matrix",
  "Live Battles",
  "AI Control",
  "Notifications",
  "Website Control",
  "Feature Flags",
  "Reports",
  "Analytics",
  "Audit Log",
  "Support",
  "Achievements",
  "Badges",
  "Database",
  "Security",
  "Command Console",
  "Universal Search",
];

export default function CreatorCommandCenter() {
  const [overview, setOverview] = useState<CreatorOverview | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const res = await fetch("/api/creator/overview", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as CreatorOverview;
      if (mounted) setOverview(data);
    }

    load();
    const timer = window.setInterval(load, 8000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const selectedUser = useMemo(
    () => overview?.connectedUsers.find((user) => user.id === selectedUserId) ?? overview?.connectedUsers[0],
    [overview, selectedUserId]
  );

  const totals = overview?.totals ?? { users: 0, battles: 0, live_battles: 0 };

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#050505] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,43,43,0.18),transparent_34%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.08),transparent_28%),linear-gradient(135deg,rgba(255,43,43,0.08),transparent_35%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:44px_44px]" />

      <div className="relative mx-auto grid max-w-[1800px] gap-4 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
        <aside className="rounded-[2rem] border border-red-400/20 bg-white/[0.035] p-4 shadow-[0_0_50px_rgba(255,43,43,0.12)] backdrop-blur-2xl">
          <div className="mb-5 rounded-3xl border border-red-400/30 bg-red-500/10 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-red-200">Founder</p>
            <h1 className="mt-2 font-display text-2xl font-black">Creator Control Panel</h1>
            <p className="mt-2 text-xs text-white/50">Server-authorized command center. No creator controls render for other accounts.</p>
          </div>

          <nav className="space-y-2">
            {controlGroups.map((group, index) => (
              <button
                key={group}
                className="group flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3 text-left text-xs font-bold text-white/60 transition hover:border-red-400/35 hover:bg-red-500/10 hover:text-white"
              >
                <span>{group}</span>
                <span className="h-2 w-2 rounded-full bg-red-400/40 shadow-[0_0_12px_rgba(255,43,43,0.8)] group-hover:bg-red-300" />
              </button>
            ))}
          </nav>
        </aside>

        <main className="space-y-4">
          <header className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 shadow-[0_0_60px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-red-200">Live Command Bar</p>
                <h2 className="mt-2 font-display text-3xl font-black sm:text-4xl">Ragebait Platform Core</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {["Broadcast", "AI Reload", "Maintenance", "Export Audit"].map((action) => (
                  <button
                    key={action}
                    className="rounded-full border border-red-400/25 bg-red-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-red-100 transition hover:border-red-300 hover:bg-red-500/20"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Total Users" value={totals.users} detail="Registered accounts" />
            <StatCard label="Battles" value={totals.battles} detail="All-time battle records" />
            <StatCard label="Live Battles" value={totals.live_battles} detail="Currently active" />
          </div>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-4 backdrop-blur-2xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-red-200">Realtime User Tracker</p>
                <h3 className="mt-1 font-display text-xl font-black">Connected Users</h3>
              </div>
              <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200">
                Live Sync
              </span>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {(overview?.connectedUsers ?? []).map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className="rounded-3xl border border-white/8 bg-black/25 p-4 text-left transition hover:border-red-400/35 hover:bg-red-500/10"
                >
                  <div className="flex items-center gap-3">
                    <img src={user.profilePicture} alt={user.username} className="h-12 w-12 rounded-2xl border border-red-400/35" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{user.username}</p>
                      <p className="truncate text-xs text-white/40">{user.email}</p>
                    </div>
                    <span className="rounded-full bg-red-500/15 px-2 py-1 text-[10px] font-bold text-red-100">{user.currentRank}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/55">
                    <Signal label="Page" value={user.currentPage} />
                    <Signal label="Battle" value={user.currentBattle} />
                    <Signal label="Device" value={`${user.device} • ${user.browser}`} />
                    <Signal label="Latency" value={`${user.latency}ms`} />
                  </div>
                </button>
              ))}
            </div>
          </section>
        </main>

        <aside className="space-y-4">
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-red-200">Profile Drawer</p>
            {selectedUser ? (
              <div className="mt-4">
                <div className="flex items-center gap-3">
                  <img src={selectedUser.profilePicture} alt={selectedUser.username} className="h-14 w-14 rounded-2xl border border-red-400/40" />
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-xl font-black">{selectedUser.username}</h3>
                    <p className="truncate text-xs text-white/45">{selectedUser.id}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <Signal label="Country" value={selectedUser.country} />
                  <Signal label="Screen" value={selectedUser.currentScreen} />
                  <Signal label="Mouse" value={selectedUser.mousePosition} />
                  <Signal label="Typing" value={selectedUser.typingStatus ? "Yes" : "No"} />
                  <Signal label="Session" value={selectedUser.sessionLength} />
                  <Signal label="Last Click" value={selectedUser.lastClick} />
                  <Signal label="OS" value={selectedUser.operatingSystem} />
                  <Signal label="Resolution" value={selectedUser.screenResolution} />
                  <Signal label="Network" value={selectedUser.networkQuality} />
                  <Signal label="Aura" value={selectedUser.currentAura.toLocaleString()} />
                  <Signal label="XP" value={selectedUser.currentXP.toLocaleString()} />
                  <Signal label="Coins" value={selectedUser.currentCoins.toLocaleString()} />
                  <Signal label="Reports" value={selectedUser.reportsAgainstUser} />
                  <Signal label="Warnings" value={selectedUser.warnings} />
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-white/45">No users available yet.</p>
            )}
          </section>

          <section className="rounded-[2rem] border border-red-400/20 bg-red-500/[0.07] p-4 backdrop-blur-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-red-200">High-Risk Actions</p>
            <div className="mt-4 space-y-2">
              {["Force Logout", "Freeze Account", "Permanent Ban", "Reset Economy"].map((action) => (
                <button
                  key={action}
                  disabled
                  title="Requires a dedicated backend action endpoint, reason, audit log, and confirmation."
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left text-xs font-black uppercase tracking-[0.2em] text-white/35"
                >
                  {action} Locked
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-4 backdrop-blur-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-red-200">System Status</p>
            <div className="mt-4 space-y-3 text-sm text-white/60">
              {(overview?.auditPreview ?? ["Loading secure telemetry..."]).map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function StatCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">{label}</p>
      <p className="mt-3 font-display text-4xl font-black text-white">{value.toLocaleString()}</p>
      <p className="mt-2 text-xs text-white/45">{detail}</p>
    </div>
  );
}

function Signal({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
      <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/35">{label}</p>
      <p className="mt-1 truncate font-semibold text-white/80">{value}</p>
    </div>
  );
}
