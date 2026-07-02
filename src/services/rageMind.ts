import { sql } from "@/lib/db";
import { analyzeLanguage, type LanguageAnalysis } from "@/services/languageEngine";
import { analyzeSlang, type SlangAnalysis } from "@/services/slangEngine";
import { analyzeMemes, type MemeAnalysis } from "@/services/memeEngine";
import { analyzeEmotion, type EmotionAnalysis } from "@/services/emotionEngine";
import { analyzePersonality, type PersonalityAnalysis } from "@/services/personalityEngine";
import { analyzePsychology, type PsychologyAnalysis } from "@/services/psychologyEngine";
import { simulateAudience, type AudienceSimulation } from "@/services/audienceEngine";
import { analyzeReasoning, type ReasoningAnalysis } from "@/services/reasoningEngine";
import { generateBattleDNA, type BattleDNA } from "@/services/battleDNA";
import { generatePlayerDNA, type PlayerDNAResult } from "@/services/playerDNA";
import { updatePlayerMemory } from "@/services/memoryEngine";

export type BattleSide = "creator" | "opponent";

export interface RageMindMessage {
  side: BattleSide;
  userId: string;
  username: string;
  content: string;
  round: number;
  createdAt?: string;
}

export interface RageMindPlayer {
  side: BattleSide;
  userId: string;
  username: string;
}

export interface RageMindInput {
  battleId?: string;
  title: string;
  topic: string;
  battleType?: string;
  mode?: string;
  players: RageMindPlayer[];
  messages: RageMindMessage[];
}

export interface RageMindReport {
  transcriptHash: string;
  battleStyle: string;
  languageUnderstanding: LanguageAnalysis;
  slangEngine: SlangAnalysis;
  memeEngine: MemeAnalysis;
  emotionEngine: EmotionAnalysis;
  personalityEngine: PersonalityAnalysis;
  contextEngine: {
    conversationFlow: string;
    momentumShifts: string[];
    hiddenIntentions: string[];
    doubleMeanings: string[];
    sarcasmSignals: string[];
  };
  psychologyEngine: PsychologyAnalysis;
  audienceSimulation: AudienceSimulation;
  reasoningEngine: ReasoningAnalysis;
  battleDNA: BattleDNA;
  playerDNA: PlayerDNAResult;
  fairnessEngine: {
    biasWarnings: string[];
    judgingGuidance: string;
  };
  confidence: {
    score: number;
    reasoning: string;
    alternativeInterpretation?: string;
  };
  memorySignals: Record<BattleSide, string[]>;
  source: "ai" | "local" | "fallback";
}

const RAGEMIND_TIMEOUT_MS = 9000;

const STYLE_ALIASES: Record<string, string> = {
  text: "debate",
  casual: "roast",
  ranked: "debate",
  meme: "meme",
  prediction: "prediction",
};

export async function analyzeWithRageMind(input: RageMindInput): Promise<RageMindReport> {
  const transcriptHash = await hashTranscript(input);
  const cached = input.battleId ? await readCachedReport(input.battleId, transcriptHash) : null;
  if (cached) return cached;

  let report: RageMindReport;
  if (!process.env.OPENAI_API_KEY) {
    report = localRageMind(input, transcriptHash, "local");
  } else {
    try {
      report = await runAiRageMind(input, transcriptHash);
    } catch (err) {
      console.error("RageMind X analysis failed, using local fallback:", err);
      report = localRageMind(input, transcriptHash, "fallback");
    }
  }

  if (input.battleId) {
    await cacheReport(input.battleId, transcriptHash, report);
  }
  return report;
}

export async function updateRageMindMemory(input: RageMindInput, report: RageMindReport) {
  await updatePlayerMemory(input, report);
}

async function runAiRageMind(input: RageMindInput, transcriptHash: string): Promise<RageMindReport> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RAGEMIND_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: RAGEMIND_SYSTEM_PROMPT },
          { role: "user", content: buildRageMindPrompt(input) },
        ],
        temperature: 0.25,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`OpenAI RageMind X error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("RageMind X returned an empty response.");

  return normalizeReport(JSON.parse(raw), transcriptHash, "ai", input);
}

const RAGEMIND_SYSTEM_PROMPT = `You are RageMind X, the advanced human intelligence engine for Ragebait.
Think like an experienced debate judge, comedian, psychologist, linguist, strategist, and audience at once.
Understand people, not isolated words. Analyze multilingual and mixed-language conversations, code switching,
internet slang, memes, sarcasm, double meanings, cultural references, hidden intent, emotion, pressure,
mind games, conversation memory, audience reaction, fairness, Battle DNA, and Player DNA. Profanity can be
friendly banter, competitive roasting, harassment, or hate depending on intent and context. Never punish
grammar, accent, typing mistakes, short messages, or mixed language by default. Respond only with valid JSON.`;

function buildRageMindPrompt(input: RageMindInput): string {
  return `Battle: ${input.title}
Topic: ${input.topic}
Battle type: ${input.battleType ?? "casual"}
Mode: ${input.mode ?? "text"}

Transcript in exact order:
${input.messages.map((m) => `[${m.side}, round ${m.round}] ${m.username}: ${m.content}`).join("\n")}

Return this exact JSON shape:
{
  "battle_style": "roast|debate|prediction|meme|mixed",
  "language_understanding": {
    "primary_languages": ["English"],
    "mixed_language": false,
    "code_switching": false,
    "notes": ["specific meaning/context notes"]
  },
  "slang_engine": { "detected": [], "interpretations": [] },
  "meme_engine": { "references": [], "interpretations": [] },
  "emotion_engine": { "creator": [], "opponent": [] },
  "personality_engine": { "creator": [], "opponent": [] },
  "context_engine": {
    "conversation_flow": "",
    "momentum_shifts": [],
    "hidden_intentions": [],
    "double_meanings": [],
    "sarcasm_signals": []
  },
  "psychology_engine": {
    "pressure_signals": [],
    "mind_games": [],
    "confidence_shifts": [],
    "argument_collapse": [],
    "recovery_moments": []
  },
  "audience_simulation": {
    "biggest_laugh": "",
    "most_savage_comeback": "",
    "most_emotional_reply": "",
    "most_convincing_argument": "",
    "most_memorable_moment": "",
    "most_shareable_line": "",
    "engagement_score": 0
  },
  "reasoning_engine": {
    "reasoning": "",
    "evidence": [],
    "ignored_questions": [],
    "repeated_arguments": [],
    "contradictions": []
  },
  "fairness_engine": {
    "bias_warnings": [],
    "judging_guidance": ""
  },
  "confidence": {
    "score": 0,
    "reasoning": "",
    "alternative_interpretation": ""
  },
  "battle_dna": {
    "humor": 0,
    "logic": 0,
    "creativity": 0,
    "originality": 0,
    "aggression": 0,
    "confidence": 0,
    "audience_appeal": 0,
    "emotional_intensity": 0,
    "cultural_density": 0
  },
  "player_dna": {
    "creator": { "label": "", "traits": [], "humor_style": "", "argument_structure": "", "growth_signal": "" },
    "opponent": { "label": "", "traits": [], "humor_style": "", "argument_structure": "", "growth_signal": "" }
  },
  "memory_signals": { "creator": [], "opponent": [] }
}`;
}

function normalizeReport(raw: any, transcriptHash: string, source: RageMindReport["source"], input: RageMindInput): RageMindReport {
  const fallback = localRageMind(input, transcriptHash, source);
  const arr = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((v) => typeof v === "string" && v.trim()).map((v) => String(v).slice(0, 220)) : [];
  const sideRecord = (value: any): Record<BattleSide, string[]> => ({
    creator: arr(value?.creator),
    opponent: arr(value?.opponent),
  });

  return {
    transcriptHash,
    battleStyle: String(raw?.battle_style ?? inferBattleStyle(input)),
    languageUnderstanding: {
      primaryLanguages: arr(raw?.language_understanding?.primary_languages),
      mixedLanguage: Boolean(raw?.language_understanding?.mixed_language),
      codeSwitching: Boolean(raw?.language_understanding?.code_switching),
      notes: arr(raw?.language_understanding?.notes),
    },
    slangEngine: {
      detected: arr(raw?.slang_engine?.detected),
      interpretations: arr(raw?.slang_engine?.interpretations),
    },
    memeEngine: {
      references: arr(raw?.meme_engine?.references),
      interpretations: arr(raw?.meme_engine?.interpretations),
    },
    emotionEngine: sideRecord(raw?.emotion_engine),
    personalityEngine: sideRecord(raw?.personality_engine),
    contextEngine: {
      conversationFlow: String(raw?.context_engine?.conversation_flow ?? fallback.contextEngine.conversationFlow).slice(0, 700),
      momentumShifts: arr(raw?.context_engine?.momentum_shifts),
      hiddenIntentions: arr(raw?.context_engine?.hidden_intentions),
      doubleMeanings: arr(raw?.context_engine?.double_meanings),
      sarcasmSignals: arr(raw?.context_engine?.sarcasm_signals),
    },
    psychologyEngine: {
      pressureSignals: arr(raw?.psychology_engine?.pressure_signals),
      mindGames: arr(raw?.psychology_engine?.mind_games),
      confidenceShifts: arr(raw?.psychology_engine?.confidence_shifts),
      argumentCollapse: arr(raw?.psychology_engine?.argument_collapse),
      recoveryMoments: arr(raw?.psychology_engine?.recovery_moments),
    },
    audienceSimulation: {
      biggestLaugh: String(raw?.audience_simulation?.biggest_laugh ?? fallback.audienceSimulation.biggestLaugh).slice(0, 300),
      mostSavageComeback: String(raw?.audience_simulation?.most_savage_comeback ?? fallback.audienceSimulation.mostSavageComeback).slice(0, 300),
      mostEmotionalReply: String(raw?.audience_simulation?.most_emotional_reply ?? fallback.audienceSimulation.mostEmotionalReply).slice(0, 300),
      mostConvincingArgument: String(raw?.audience_simulation?.most_convincing_argument ?? fallback.audienceSimulation.mostConvincingArgument).slice(0, 300),
      mostMemorableMoment: String(raw?.audience_simulation?.most_memorable_moment ?? fallback.audienceSimulation.mostMemorableMoment).slice(0, 300),
      mostShareableLine: String(raw?.audience_simulation?.most_shareable_line ?? fallback.audienceSimulation.mostShareableLine).slice(0, 300),
      engagementScore: clampScore(raw?.audience_simulation?.engagement_score ?? fallback.audienceSimulation.engagementScore),
    },
    reasoningEngine: {
      reasoning: String(raw?.reasoning_engine?.reasoning ?? fallback.reasoningEngine.reasoning).slice(0, 600),
      evidence: arr(raw?.reasoning_engine?.evidence),
      ignoredQuestions: arr(raw?.reasoning_engine?.ignored_questions),
      repeatedArguments: arr(raw?.reasoning_engine?.repeated_arguments),
      contradictions: arr(raw?.reasoning_engine?.contradictions),
    },
    battleDNA: normalizeBattleDNA(raw?.battle_dna, fallback.battleDNA),
    playerDNA: normalizePlayerDNA(raw?.player_dna, fallback.playerDNA),
    fairnessEngine: {
      biasWarnings: arr(raw?.fairness_engine?.bias_warnings),
      judgingGuidance: String(raw?.fairness_engine?.judging_guidance ?? fallback.fairnessEngine.judgingGuidance).slice(0, 400),
    },
    confidence: {
      score: clampScore(raw?.confidence?.score ?? fallback.confidence.score),
      reasoning: String(raw?.confidence?.reasoning ?? fallback.confidence.reasoning).slice(0, 400),
      alternativeInterpretation: raw?.confidence?.alternative_interpretation
        ? String(raw.confidence.alternative_interpretation).slice(0, 300)
        : fallback.confidence.alternativeInterpretation,
    },
    memorySignals: sideRecord(raw?.memory_signals),
    source,
  };
}

function localRageMind(input: RageMindInput, transcriptHash: string, source: RageMindReport["source"]): RageMindReport {
  const languageUnderstanding = analyzeLanguage(input);
  const slangEngine = analyzeSlang(input);
  const memeEngine = analyzeMemes(input);
  const emotionEngine = analyzeEmotion(input);
  const personalityEngine = analyzePersonality(input);
  const psychologyEngine = analyzePsychology(input);
  const reasoningEngine = analyzeReasoning(input);
  const audienceSimulation = simulateAudience(input);
  const text = input.messages.map((m) => m.content).join("\n");
  const sarcasmSignals = input.messages
    .filter((m) => /\b(sure bro|oh wow|totally makes sense|amazing logic|great logic|wow genius|nice one)\b/i.test(m.content))
    .map((m) => `${m.username}: possible sarcasm, mock praise, or passive aggression in "${truncate(m.content, 90)}"`);
  const partialReport = {
    slangEngine,
    memeEngine,
    emotionEngine,
    personalityEngine,
    reasoningEngine,
    audienceSimulation,
  } as Pick<RageMindReport, "slangEngine" | "memeEngine" | "emotionEngine" | "personalityEngine" | "reasoningEngine" | "audienceSimulation">;
  const battleDNA = generateBattleDNA(input, partialReport);
  const playerDNA = generatePlayerDNA(input, partialReport);

  return {
    transcriptHash,
    battleStyle: inferBattleStyle(input),
    languageUnderstanding,
    slangEngine,
    memeEngine,
    emotionEngine,
    personalityEngine,
    contextEngine: {
      conversationFlow: "RageMind X tracked the full transcript order, callbacks, repeated ideas, ignored questions, and ending momentum.",
      momentumShifts: inferMomentum(input),
      hiddenIntentions: inferHiddenIntentions(input),
      doubleMeanings: inferDoubleMeanings(input),
      sarcasmSignals,
    },
    psychologyEngine,
    audienceSimulation,
    reasoningEngine,
    battleDNA,
    playerDNA,
    fairnessEngine: {
      biasWarnings: languageUnderstanding.mixedLanguage ? ["Mixed language detected; do not penalize code-switching, grammar, or transliteration."] : [],
      judgingGuidance: "Judge quality, intent, topic fit, rebuttal strength, and audience impact. Do not reward hate, threats, targeted bullying, or spam.",
    },
    confidence: {
      score: source === "local" ? 66 : 52,
      reasoning: source === "local" ? "Deterministic RageMind X analysis used because no AI key is configured." : "AI analysis failed, so deterministic RageMind X signals were used.",
      alternativeInterpretation: sarcasmSignals.length || /\b(killed|dead|destroy|cooked)\b/i.test(text)
        ? "Some lines may be figurative battle language or sarcasm depending on prior context."
        : undefined,
    },
    memorySignals: {
      creator: [...personalityEngine.creator, ...emotionEngine.creator, playerDNA.creator.label].slice(0, 8),
      opponent: [...personalityEngine.opponent, ...emotionEngine.opponent, playerDNA.opponent.label].slice(0, 8),
    },
    source,
  };
}

function inferBattleStyle(input: RageMindInput): string {
  const raw = `${input.battleType ?? ""} ${input.mode ?? ""} ${input.title} ${input.topic}`.toLowerCase();
  if (raw.includes("meme")) return "meme";
  if (raw.includes("predict")) return "prediction";
  if (raw.includes("debate")) return "debate";
  if (raw.includes("roast")) return "roast";
  return STYLE_ALIASES[input.mode ?? ""] ?? STYLE_ALIASES[input.battleType ?? ""] ?? "mixed";
}

function inferMomentum(input: RageMindInput): string[] {
  const byRound = new Map<number, RageMindMessage[]>();
  for (const msg of input.messages) byRound.set(msg.round, [...(byRound.get(msg.round) ?? []), msg]);
  const rounds = Array.from(byRound.keys()).sort((a, b) => a - b);
  if (rounds.length < 2) return ["Not enough rounds for a reliable momentum shift."];
  return [`Momentum should be checked around round ${rounds[Math.floor(rounds.length / 2)]}, where callbacks, pressure, and rebuttals usually start deciding the battle.`];
}

function inferHiddenIntentions(input: RageMindInput): string[] {
  return input.messages
    .filter((m) => /\b(admit|you know|scared|cope|caught|exposed)\b/i.test(m.content))
    .map((m) => `${m.username} may be framing the opponent psychologically in round ${m.round}.`);
}

function inferDoubleMeanings(input: RageMindInput): string[] {
  return input.messages
    .filter((m) => /\b(killed|dead|destroy|cooked|fire|smoked)\b/i.test(m.content))
    .map((m) => `${m.username}: "${truncate(m.content, 90)}" may be figurative battle language, not literal harm.`);
}

function normalizeBattleDNA(raw: any, fallback: BattleDNA): BattleDNA {
  return {
    humor: clampScore(raw?.humor ?? fallback.humor),
    logic: clampScore(raw?.logic ?? fallback.logic),
    creativity: clampScore(raw?.creativity ?? fallback.creativity),
    originality: clampScore(raw?.originality ?? fallback.originality),
    aggression: clampScore(raw?.aggression ?? fallback.aggression),
    confidence: clampScore(raw?.confidence ?? fallback.confidence),
    audienceAppeal: clampScore(raw?.audience_appeal ?? raw?.audienceAppeal ?? fallback.audienceAppeal),
    emotionalIntensity: clampScore(raw?.emotional_intensity ?? raw?.emotionalIntensity ?? fallback.emotionalIntensity),
    culturalDensity: clampScore(raw?.cultural_density ?? raw?.culturalDensity ?? fallback.culturalDensity),
  };
}

function normalizePlayerDNA(raw: any, fallback: PlayerDNAResult): PlayerDNAResult {
  const validLabels = ["Master Strategist", "Chaos Roaster", "Comedy Specialist", "Logic Destroyer", "Balanced Thinker", "Adaptive Fighter"];
  const normalizeSide = (side: BattleSide) => {
    const label = String(raw?.[side]?.label || fallback[side].label);
    return {
      label: (validLabels.includes(label) ? label : fallback[side].label) as PlayerDNAResult[BattleSide]["label"],
      traits: Array.isArray(raw?.[side]?.traits) ? raw[side].traits.map((x: unknown) => String(x)).slice(0, 8) : fallback[side].traits,
      humorStyle: String(raw?.[side]?.humor_style ?? raw?.[side]?.humorStyle ?? fallback[side].humorStyle).slice(0, 220),
      argumentStructure: String(raw?.[side]?.argument_structure ?? raw?.[side]?.argumentStructure ?? fallback[side].argumentStructure).slice(0, 220),
      growthSignal: String(raw?.[side]?.growth_signal ?? raw?.[side]?.growthSignal ?? fallback[side].growthSignal).slice(0, 220),
    };
  };
  return {
    creator: normalizeSide("creator"),
    opponent: normalizeSide("opponent"),
  };
}

async function readCachedReport(battleId: string, transcriptHash: string): Promise<RageMindReport | null> {
  try {
    const rows = await sql`
      SELECT payload FROM rage_mind_analysis_cache
      WHERE battle_id = ${battleId} AND transcript_hash = ${transcriptHash}
        AND expires_at > now()
      ORDER BY generated_at DESC
      LIMIT 1
    `;
    return rows[0]?.payload ?? null;
  } catch {
    return null;
  }
}

async function cacheReport(battleId: string, transcriptHash: string, report: RageMindReport) {
  try {
    await sql`
      INSERT INTO rage_mind_analysis_cache (battle_id, transcript_hash, payload, expires_at)
      VALUES (${battleId}, ${transcriptHash}, ${JSON.stringify(report)}, now() + interval '14 days')
      ON CONFLICT (battle_id, transcript_hash) DO UPDATE SET
        payload = EXCLUDED.payload,
        generated_at = now(),
        expires_at = EXCLUDED.expires_at
    `;

    await sql`
      INSERT INTO battle_ragemind_reports (battle_id, transcript_hash, payload, battle_dna)
      VALUES (${battleId}, ${transcriptHash}, ${JSON.stringify(report)}, ${JSON.stringify(report.battleDNA)})
      ON CONFLICT (battle_id) DO UPDATE SET
        transcript_hash = EXCLUDED.transcript_hash,
        payload = EXCLUDED.payload,
        battle_dna = EXCLUDED.battle_dna,
        generated_at = now()
    `;

    await sql`
      INSERT INTO battle_dna_snapshots (battle_id, dna)
      VALUES (${battleId}, ${JSON.stringify(report.battleDNA)})
      ON CONFLICT (battle_id) DO UPDATE SET
        dna = EXCLUDED.dna,
        generated_at = now()
    `;
  } catch (err) {
    console.warn("RageMind X cache write skipped:", err);
  }
}

async function hashTranscript(input: RageMindInput): Promise<string> {
  const data = JSON.stringify({
    title: input.title,
    topic: input.topic,
    battleType: input.battleType,
    mode: input.mode,
    messages: input.messages.map((m) => [m.side, m.userId, m.round, m.content]),
  });

  if (globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(data);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  return String(data.length) + ":" + data.slice(0, 120);
}

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}
