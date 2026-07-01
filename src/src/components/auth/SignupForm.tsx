"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { refreshUserCache } from "@/lib/hooks/useCurrentUser";

export default function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    dob: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Password strength
  const checks = [
    { label: "8+ characters",    pass: form.password.length >= 8 },
    { label: "Uppercase letter", pass: /[A-Z]/.test(form.password) },
    { label: "Number",           pass: /[0-9]/.test(form.password) },
  ];
  const strength = checks.filter((c) => c.pass).length;
  const strengthColor = strength === 3 ? "bg-aura-green" : strength === 2 ? "bg-aura-blue" : strength === 1 ? "bg-aura-gold" : "bg-white/10";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
        <div className="rounded-xl border border-aura-purple/40 bg-aura-purple/10 px-4 py-3 text-sm text-aura-purple">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="username" className="block text-sm font-medium text-white/70">
          Username
        </label>
        <div className="relative mt-1.5">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
          <input
            id="username"
            type="text"
            autoComplete="username"
            required
            value={form.username}
            onChange={(e) => update("username", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-8 pr-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-aura-purple focus:outline-none transition-colors"
            placeholder="your_username"
          />
        </div>
        <p className="mt-1 text-xs text-white/30">3–20 chars: letters, numbers, underscores only.</p>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-white/70">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-aura-purple focus:outline-none transition-colors"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-white/70">
          Password
        </label>
        <div className="relative mt-1.5">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 pr-12 text-sm text-white placeholder:text-white/30 focus:border-aura-purple focus:outline-none transition-colors"
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
        {/* Strength bar */}
        {form.password && (
          <div className="mt-2 space-y-1.5">
            <div className="flex gap-1">
              {[1,2,3].map((i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor : "bg-white/10"}`} />
              ))}
            </div>
            <div className="flex gap-3">
              {checks.map((c) => (
                <span key={c.label} className={`text-[11px] flex items-center gap-1 ${c.pass ? "text-aura-green" : "text-white/30"}`}>
                  {c.pass ? "✓" : "○"} {c.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/70">
            Confirm
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={form.confirmPassword}
            onChange={(e) => update("confirmPassword", e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-aura-purple focus:outline-none transition-colors"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label htmlFor="dob" className="block text-sm font-medium text-white/70">
            Date of birth
          </label>
          <input
            id="dob"
            type="date"
            required
            value={form.dob}
            onChange={(e) => update("dob", e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:border-aura-purple focus:outline-none transition-colors"
          />
        </div>
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? "Creating account..." : "Create account"}
      </Button>

      <p className="text-center text-xs text-white/30">
        Email verification coming soon — your account is ready immediately.
      </p>
    </form>
  );
}
