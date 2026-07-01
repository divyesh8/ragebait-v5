"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { AVATAR_OPTIONS } from "@/lib/avatars";

interface AvatarPickerProps {
  currentAvatarUrl: string;
  onSelected: (newAvatarUrl: string) => void;
  onClose: () => void;
}

export default function AvatarPicker({ currentAvatarUrl, onSelected, onClose }: AvatarPickerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarId: selectedId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update avatar.");
        return;
      }
      onSelected(data.avatarUrl);
      onClose();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <Card className="w-full max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Choose an avatar</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white" aria-label="Close">
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-aura-purple/40 bg-aura-purple/10 px-4 py-3 text-sm text-aura-purple">
            {error}
          </div>
        )}

        <div className="grid max-h-96 grid-cols-4 gap-3 overflow-y-auto pr-1 sm:grid-cols-6">
          {AVATAR_OPTIONS.map((opt) => {
            const isSelected = selectedId === opt.id;
            const isCurrent = !selectedId && opt.url === currentAvatarUrl;
            return (
              <button
                key={opt.id}
                onClick={() => setSelectedId(opt.id)}
                className={`relative rounded-xl border-2 p-1 transition ${
                  isSelected || isCurrent
                    ? "border-aura-purple bg-white/[0.04]"
                    : "border-transparent hover:border-white/8"
                }`}
              >
                <img src={opt.url} alt={opt.id} className="aspect-square w-full rounded-lg" />
                {(isSelected || isCurrent) && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-aura-purple text-[10px] text-white">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!selectedId || saving}>
            {saving ? "Saving..." : "Save avatar"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
