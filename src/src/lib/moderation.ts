interface ModerationResult {
  allowed: boolean;
  reason?: string;
  source: "openai" | "local";
}

const localRules: { pattern: RegExp; reason: string }[] = [
  {
    pattern: /\b(kill yourself|kys|go die|die in a fire)\b/i,
    reason: "Threats or self-harm encouragement are not allowed.",
  },
  {
    pattern: /\b(dox|doxx|home address|phone number)\b/i,
    reason: "Sharing or threatening private personal information is not allowed.",
  },
  {
    pattern: /\b(rape|sexual assault)\b/i,
    reason: "Sexual violence content is not allowed in battles.",
  },
];

export async function moderateBattleMessage(content: string): Promise<ModerationResult> {
  const localResult = runLocalModeration(content);
  if (!localResult.allowed) return localResult;

  if (!process.env.OPENAI_API_KEY) {
    return localResult;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: content,
      }),
    });

    if (!response.ok) {
      console.error("OpenAI moderation error:", response.status, await response.text());
      return localResult;
    }

    const data = await response.json();
    const result = data.results?.[0];
    if (result?.flagged) {
      return {
        allowed: false,
        reason: "That roast crosses the moderation line. Keep it witty without hate, threats, or harassment.",
        source: "openai",
      };
    }
  } catch (err) {
    console.error("Moderation request failed:", err);
  }

  return localResult;
}

function runLocalModeration(content: string): ModerationResult {
  for (const rule of localRules) {
    if (rule.pattern.test(content)) {
      return { allowed: false, reason: rule.reason, source: "local" };
    }
  }

  return { allowed: true, source: "local" };
}
