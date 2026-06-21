// Curated avatar options for the avatar picker.
// Server-validated whitelist — `id` is what the client sends back; `url` is
// derived from it deterministically, so there's no way to smuggle an
// arbitrary external image URL through this endpoint.

export interface AvatarOption {
  id: string;
  url: string;
}

const STYLE_BASE = "https://api.dicebear.com/9.x";

// A mix of styles so picks actually look different from each other,
// not just different colors of the same bot.
const seeds: { style: string; seed: string }[] = [
  // Bottts — robots
  { style: "bottts", seed: "Inferno" },
  { style: "bottts", seed: "Savage" },
  { style: "bottts", seed: "Critic" },
  { style: "bottts", seed: "Venom" },
  { style: "bottts", seed: "Glitch" },
  { style: "bottts", seed: "Cipher" },
  { style: "bottts", seed: "Nitro" },
  { style: "bottts", seed: "Frostbyte" },
  { style: "bottts", seed: "Ronin" },
  // Adventurer — people
  { style: "adventurer", seed: "Roaster" },
  { style: "adventurer", seed: "Blaze" },
  { style: "adventurer", seed: "Echo" },
  { style: "adventurer", seed: "Rebel" },
  { style: "adventurer", seed: "Vortex" },
  { style: "adventurer", seed: "Stormy" },
  { style: "adventurer", seed: "Onyx" },
  { style: "adventurer", seed: "Phantom" },
  { style: "adventurer", seed: "Ash" },
  // Pixel Art — 8-bit characters
  { style: "pixel-art", seed: "ByteSize" },
  { style: "pixel-art", seed: "Pixelot" },
  { style: "pixel-art", seed: "Arcade" },
  { style: "pixel-art", seed: "Retro" },
  { style: "pixel-art", seed: "Quartz" },
  { style: "pixel-art", seed: "Voltage" },
  { style: "pixel-art", seed: "Tetris" },
  { style: "pixel-art", seed: "Joystick" },
  { style: "pixel-art", seed: "Sprite" },
  // Fun Emoji — expressive faces
  { style: "fun-emoji", seed: "Smirk" },
  { style: "fun-emoji", seed: "Clapback" },
  { style: "fun-emoji", seed: "Roast" },
  { style: "fun-emoji", seed: "Sly" },
  { style: "fun-emoji", seed: "Wicked" },
  { style: "fun-emoji", seed: "Chaos" },
  { style: "fun-emoji", seed: "Mood" },
  { style: "fun-emoji", seed: "Salty" },
  { style: "fun-emoji", seed: "Petty" },
];

export const AVATAR_OPTIONS: AvatarOption[] = seeds.map(({ style, seed }) => ({
  id: `${style}:${seed}`,
  url: `${STYLE_BASE}/${style}/svg?seed=${encodeURIComponent(seed)}`,
}));

const byId = new Map(AVATAR_OPTIONS.map((a) => [a.id, a.url]));

/** Returns the avatar URL for a given option id, or null if it's not a valid option. */
export function resolveAvatarId(id: string): string | null {
  return byId.get(id) ?? null;
}
