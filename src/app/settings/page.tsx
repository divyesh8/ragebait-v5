"use client";

import { useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-aura-crimson">{message}</p>;
}

function FieldSuccess({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-aura-blue">{message}</p>;
}

function UsernameSection({ currentUsername }: { currentUsername: string }) {
  const [newUsername, setNewUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const res = await fetch("/api/account/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newUsername, currentPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update username.");
        return;
      }
      setSuccess(`Username changed to @${data.username}.`);
      setNewUsername("");
      setPassword("");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="font-display text-lg font-bold">Username</h2>
      <p className="mt-1 text-sm text-white/40">Currently @{currentUsername}</p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <input
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          placeholder="New username"
          minLength={3}
          maxLength={32}
          required
          className="w-full rounded-xl border border-line bg-surface2 px-4 py-3 text-sm text-white placeholder:text-white/30 focus-visible:border-aura-purple"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Current password"
          required
          className="w-full rounded-xl border border-line bg-surface2 px-4 py-3 text-sm text-white placeholder:text-white/30 focus-visible:border-aura-purple"
        />
        <FieldError message={error} />
        <FieldSuccess message={success} />
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Saving..." : "Update username"}
        </Button>
      </form>
    </Card>
  );
}

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update password.");
        return;
      }
      setSuccess("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="font-display text-lg font-bold">Password</h2>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Current password"
          required
          className="w-full rounded-xl border border-line bg-surface2 px-4 py-3 text-sm text-white placeholder:text-white/30 focus-visible:border-aura-purple"
        />
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password (8+ chars, upper/lower/number)"
          required
          className="w-full rounded-xl border border-line bg-surface2 px-4 py-3 text-sm text-white placeholder:text-white/30 focus-visible:border-aura-purple"
        />
        <input
          type="password"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          placeholder="Confirm new password"
          required
          className="w-full rounded-xl border border-line bg-surface2 px-4 py-3 text-sm text-white placeholder:text-white/30 focus-visible:border-aura-purple"
        />
        <FieldError message={error} />
        <FieldSuccess message={success} />
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Saving..." : "Update password"}
        </Button>
      </form>
    </Card>
  );
}

function EmailSection({ currentEmail }: { currentEmail: string }) {
  const [step, setStep] = useState<"request" | "verify">("request");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const res = await fetch("/api/account/email/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail, currentPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not send verification code.");
        return;
      }
      setSuccess(data.message ?? "Code sent.");
      setStep("verify");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const res = await fetch("/api/account/email/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not verify code.");
        return;
      }
      setSuccess(`Email updated to ${data.email}.`);
      setStep("request");
      setNewEmail("");
      setPassword("");
      setCode("");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="font-display text-lg font-bold">Email</h2>
      <p className="mt-1 text-sm text-white/40">Currently {currentEmail}</p>

      {step === "request" ? (
        <form onSubmit={handleRequest} className="mt-4 space-y-3">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="New email address"
            required
            className="w-full rounded-xl border border-line bg-surface2 px-4 py-3 text-sm text-white placeholder:text-white/30 focus-visible:border-aura-purple"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Current password"
            required
            className="w-full rounded-xl border border-line bg-surface2 px-4 py-3 text-sm text-white placeholder:text-white/30 focus-visible:border-aura-purple"
          />
          <FieldError message={error} />
          <FieldSuccess message={success} />
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? "Sending..." : "Send verification code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="mt-4 space-y-3">
          <p className="text-xs text-white/50">
            Enter the 6-digit code sent to <span className="text-white">{newEmail}</span>.
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
            required
            className="w-full rounded-xl border border-line bg-surface2 px-4 py-3 text-center font-mono text-lg tracking-[0.4em] text-white placeholder:text-white/20 focus-visible:border-aura-purple"
          />
          <FieldError message={error} />
          <FieldSuccess message={success} />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={busy || code.length !== 6}>
              {busy ? "Verifying..." : "Confirm email change"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setStep("request")} disabled={busy}>
              Back
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

export default function SettingsPage() {
  const { user, loading } = useCurrentUser();

  if (loading) {
    return <div className="mx-auto max-w-2xl px-6 py-12 text-center text-white/50">Loading...</div>;
  }

  if (!user) {
    // Middleware already redirects unauthenticated visitors to /login,
    // this is just a safety net for the brief client-side hydration window.
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/profile" className="text-sm text-white/40 hover:text-white">
        ← Back to profile
      </Link>
      <h1 className="mt-4 font-display text-3xl font-bold">Account settings</h1>
      <p className="mt-2 text-white/50">Manage your username, password, and email.</p>

      <div className="mt-8 space-y-6">
        <UsernameSection currentUsername={user.username} />
        <PasswordSection />
        <EmailSection currentEmail={user.email} />
      </div>
    </div>
  );
}
