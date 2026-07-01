"use client";

import { useEffect, useState, useCallback } from "react";

export interface CurrentUser {
  id: string;
  username: string;
  email: string;
  aura: number;
  level: number;
  xp: number;
  wins: number;
  losses: number;
  current_streak: number;
  best_streak: number;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
}

// ─── Module-level singleton ───────────────────────────────────────────────────
// All components share one cached value and one in-flight request.
// This means the Navbar and Profile page never race each other.

type Listener = (user: CurrentUser | null) => void;

let cachedUser: CurrentUser | null = null;
let fetchState: "idle" | "loading" | "done" = "idle";
let fetchPromise: Promise<void> | null = null;
const listeners = new Set<Listener>();

function notify(user: CurrentUser | null) {
  listeners.forEach((fn) => fn(user));
}

function fetchMe(): Promise<void> {
  if (fetchPromise) return fetchPromise;

  fetchState = "loading";
  fetchPromise = fetch("/api/auth/me", { credentials: "include" })
    .then((res) => {
      if (!res.ok) throw new Error("Not authenticated");
      return res.json();
    })
    .then((data) => {
      cachedUser = data.user ?? null;
    })
    .catch(() => {
      cachedUser = null;
    })
    .finally(() => {
      fetchState = "done";
      fetchPromise = null;
      notify(cachedUser);
    });

  return fetchPromise;
}

// Call this after logout to clear state and notify all listeners
export function invalidateUserCache() {
  cachedUser = null;
  fetchState = "idle";
  fetchPromise = null;
  notify(null);
}

// Call this after login/signup: clears state, re-fetches, then notifies
// Returns a promise that resolves once the fresh user data is loaded
export async function refreshUserCache(): Promise<CurrentUser | null> {
  cachedUser = null;
  fetchState = "idle";
  fetchPromise = null;
  // Notify null immediately so UI can show loading state
  notify(null);
  // Now fetch fresh data
  await fetchMe();
  return cachedUser;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(cachedUser);
  const [loading, setLoading] = useState(fetchState !== "done");

  const refresh = useCallback(async () => {
    // Force a fresh fetch by resetting state
    cachedUser = null;
    fetchState = "idle";
    fetchPromise = null;
    setLoading(true);
    await fetchMe();
    setUser(cachedUser);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Subscribe to future updates
    const listener: Listener = (u) => {
      setUser(u);
      setLoading(false);
    };
    listeners.add(listener);

    // If we already have a result, use it immediately
    if (fetchState === "done") {
      setUser(cachedUser);
      setLoading(false);
    } else {
      // Kick off fetch (or join existing in-flight one)
      fetchMe();
    }

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return { user, loading, refresh };
}
