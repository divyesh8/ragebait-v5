"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { refreshUserCache } from "@/lib/hooks/useCurrentUser";

export default function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      // Fetch fresh user data before navigating so Navbar updates immediately
      await refreshUserCache();

      router.push("/profile");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="rounded-xl border border-aura-crimson/40 bg-aura-crimson/10 px-4 py-3 text-sm text-aura-crimson">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="identifier" className="block text-sm font-medium text-white/70">
          Username or email
        </label>
        <input
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          required
          autoFocus
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-line bg-surface2 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-aura-purple focus:outline-none transition-colors"
          placeholder="VoidRoaster or you@example.com"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="block text-sm font-medium text-white/70">
            Password
          </label>
          <a href="#" className="text-xs text-aura-blue hover:underline">
            Forgot password?
          </a>
        </div>
        <div className="relative mt-1.5">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface2 px-4 py-3 pr-12 text-sm text-white placeholder:text-white/30 focus:border-aura-purple focus:outline-none transition-colors"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30 hover:text-white/60"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? "Logging in..." : "Log in"}
      </Button>
    </form>
  );
}
