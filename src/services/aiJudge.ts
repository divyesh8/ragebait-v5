import {
  analyzeWithRageMind,
  RageMindInput,
  RageMindMessage,
  RageMindReport,
  updateRageMindMemory,
} from "@/services/rageMind";

export interface JudgeScore {
  creativity: number;
  logic: number;
  humor: number;
  originality: number;
  comeback: number;
  entertainment: number;
  relevance?: number;
  counterarguments?: number;
  consistency?: number;
  adaptability?: number;
  confidence?: number;
  audienceImpact?: number;
  topicAdherence?: number;
  conversationFlow?: number;
  total: number;
}

export interface BattleAnalysis {
  strongestArgument: string;
  weakestArgument: string;
  turningPoint: string;
  bestComeback: string;
  finalSummary: string;
  funniestMoment?: string;
  mostCreativeLine?: string;
  overallBattleQuality?: number;
  confidenceScore?: number;
  extremelyClose?: boolean;
  evidence?: string[];
  alternativeInterpretation?: string;
}

export interface JudgeResult {
  scores: Record<"creator" | "opponent", JudgeScore>;
  winner: "creator" | "opponent" | "draw";
  battleAnalysis: BattleAnalysis;
  aiVerdict: string;
  feedback: Record<"creator" | "opponent", string>;
  rageMind?: RageMindReport;
}

export interface JudgeInput {
  battleId?: string;
  topic: string;
  title: string;
  battleType?: string;
  mode?: string;
  creatorId: string;
  opponentId: string;
  creatorName: string;
  opponentName: string;
  messages: {
    user_id: string;
    content: string;
    round: number;
    created_at?: string;
  }[];
}

const JUDGE_TIMEOUT_MS = 11000;

const WEIGHTS: Record<string, Record<string, number>> = {
  roast: {
    humor: 1.45,
    originality: 1.35,
    creativity: 1.25,
    comeback: 1.2,
    audienceImpact: 1.3,
    logic: 0.65,
    relevance: 0.9,
    conversationFlow: 1,
  },
  debate: {
    logic: 1.55,
    counterarguments: 1.35,
    consistency: 1.2,
    relevance: 1.2,
    topicAdherence: 1.15,
    humor: 0.55,
    originality: 0.85,
    confidence: 1,
  },
  prediction: {
    logic: 1.35,
    confidence: 1.2,
    consistency: 1.2,
    relevance: 1.2,
    counterarguments: 1.1,
    creativity: 0.75,
    humor: 0.45,
  },
  meme: {
    creativity: 1.45,
    originality: 1.35,
    audienceImpact: 1.4,
    humor: 1.25,
    relevance: 0.95,
    logic: 0.45,
  },
  mixed: {
    creativity: 1,
    logic: 1,
    humor: 1,
    originality: 1,
    comeback: 1,
    entertainment: 1,
    relevance: 1,
    conversationFlow: 1,
  },
};

export async function runConversationalAiJudge(input: JudgeInput): Promise<JudgeResult> {
  const rageMindInput = toRageMindInput(input);
  const rageMind = await analyzeWithRageMind(rageMindInput);

  let result: JudgeResult;
  if (!process.env.OPENAI_API_KEY) {
    result = fallbackJudge(input, rageMind);
  } else {
    try {
      result = await runAiJudge(input, rageMind);
    } catch (err) {
      console.error("Conversational AI judge failed, using fallback judge:", err);
      result = fallbackJudge(input, rageMind);
    }
  }

  result.rageMind = rageMind;
  await updateRageMindMemory(rageMindInput, rageMind);
  return result;
}

function toRageMindInput(input: JudgeInput): RageMindInput {
  const messages: RageMindMessage[] = input.messages.map((m) => {
    const isCreator = m.user_id === input.creatorId;
    return {
      side: isCreator ? "creator" : "opponent",
      userId: m.user_id,
      username: isCreator ? input.creatorName : input.opponentName,
      content: m.content,
      round: m.round,
      createdAt: m.created_at,
    };
  });

  return {
    battleId: input.battleId,
    title: input.title,
    topic: input.topic,
    battleType: input.battleType,
    mode: input.mode,
    players: [
      { side: "creator", userId: input.creatorId, username: input.creatorName },
      { side: "opponent", userId: input.opponentId, username: input.opponentName },
    ],
    messages,
  };
}

async function runAiJudge(input: JudgeInput, rageMind: RageMindReport): Promise<JudgeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), JUDGE_TIMEOUT_MS);

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
          { role: "system", content: JUDGE_SYSTEM_PROMPT },
          { role: "user", content: buildJudgePrompt(input, rageMind) },
        ],
        temperature: 0.45,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`OpenAI judge error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("AI Judge returned an empty response.");
  return normalizeAiResponse(JSON.parse(raw), rageMind);
}

const JUDGE_SYSTEM_PROMPT = `You are the production AI Judge for Ragebait.
Judge like an experienced human judge who understands multilingual banter, internet culture,
roast battles, debate technique, sarcasm, memes, double meanings, emotion, and audience reaction.
Decide from the entire conversation, not isolated messages. Profanity is not automatically bad:
friendly banter and competitive roasting can be allowed, while threats, hate, targeted bullying,
and harassment must be penalized heavily. Detect low-effort or obviously AI-generated generic
replies and reflect that in originality/adaptability. Respond only with valid JSON.`;

function buildJudgePrompt(input: JudgeInput, rageMind: RageMindReport): string {
  const transcript = input.messages
    .map((m) => {
      const side = m.user_id === input.creatorId ? "creator" : "opponent";
      const name = side === "creator" ? input.creatorName : input.opponentName;
      return `[${side}, round ${m.round}] ${name}: ${m.content}`;
    })
    .join("\n");
  const weights = WEIGHTS[rageMind.battleStyle] ?? WEIGHTS.mixed;

  return `Battle title: ${input.title}
Topic: ${input.topic}
Type/mode: ${input.battleType ?? "casual"} / ${input.mode ?? "text"}
Detected judging style: ${rageMind.battleStyle}
Score weights to apply: ${JSON.stringify(weights)}

RageMind human-intelligence analysis:
${JSON.stringify(rageMind)}

Full transcript in chronological order:
${transcript}

Use the whole conversation: setup, replies, callbacks, adaptation, missed opportunities, and ending.
Judge mixed-language or transliterated lines by meaning and cultural usage, not grammar.
For each player, score 0-100:
creativity, logic, humor, originality, comeback, entertainment, relevance, counterarguments,
consistency, adaptability, confidence, audienceImpact, topicAdherence, conversationFlow.
Compute total using the supplied weights for the detected style. Pick "draw" only when totals are within 2 points.

Return this exact JSON shape:
{
  "scores": {
    "creator": {
      "creativity": 0, "logic": 0, "humor": 0, "originality": 0, "comeback": 0,
      "entertainment": 0, "relevance": 0, "counterarguments": 0, "consistency": 0,
      "adaptability": 0, "confidence": 0, "audienceImpact": 0, "topicAdherence": 0,
      "conversationFlow": 0, "total": 0
    },
    "opponent": {
      "creativity": 0, "logic": 0, "humor": 0, "originality": 0, "comeback": 0,
      "entertainment": 0, "relevance": 0, "counterarguments": 0, "consistency": 0,
      "adaptability": 0, "confidence": 0, "audienceImpact": 0, "topicAdherence": 0,
      "conversationFlow": 0, "total": 0
    }
  },
  "winner": "creator",
  "battle_analysis": {
    "strongest_argument": "",
    "weakest_argument": "",
    "turning_point": "",
    "best_comeback": "",
    "funniest_moment": "",
    "most_creative_line": "",
      "overall_battle_quality": 0,
      "confidence_score": 0,
      "extremely_close": false,
      "evidence": ["specific transcript evidence"],
      "alternative_interpretation": "",
    "final_summary": ""
  },
  "ai_verdict": "",
  "feedback": {
    "creator": "what they did well + what to improve",
    "opponent": "what they did well + what to improve"
  }
}`;
}

function normalizeAiResponse(raw: any, rageMind: RageMindReport): JudgeResult {
  const scores = raw?.scores;
  const analysis = raw?.battle_analysis;
  const feedback = raw?.feedback;
  if (!scores?.creator || !scores?.opponent || !analysis || typeof raw?.ai_verdict !== "string") {
    throw new Error("AI Judge response is missing required fields.");
  }

  const creator = normalizeScore(scores.creator, rageMind.battleStyle);
  const opponent = normalizeScore(scores.opponent, rageMind.battleStyle);
  const winner =
    Math.abs(creator.total - opponent.total) <= 2
      ? "draw"
      : raw.winner === "creator" || raw.winner === "opponent"
      ? raw.winner
      : creator.total > opponent.total
      ? "creator"
      : "opponent";

  return {
    scores: { creator, opponent },
    winner,
    battleAnalysis: {
      strongestArgument: String(analysis.strongest_argument ?? "").slice(0, 500),
      weakestArgument: String(analysis.weakest_argument ?? "").slice(0, 500),
      turningPoint: String(analysis.turning_point ?? "").slice(0, 500),
      bestComeback: String(analysis.best_comeback ?? "").slice(0, 500),
      funniestMoment: String(analysis.funniest_moment ?? rageMind.audienceSimulation.biggestLaugh ?? "").slice(0, 500),
      mostCreativeLine: String(analysis.most_creative_line ?? rageMind.audienceSimulation.mostShareableLine ?? "").slice(0, 500),
      overallBattleQuality: clampScore(analysis.overall_battle_quality),
      confidenceScore: clampScore(analysis.confidence_score || rageMind.confidence.score),
      extremelyClose: Boolean(analysis.extremely_close) || clampScore(analysis.confidence_score || rageMind.confidence.score) < 70,
      evidence: Array.isArray(analysis.evidence) ? analysis.evidence.slice(0, 5).map((x: unknown) => String(x).slice(0, 250)) : [],
      alternativeInterpretation: String(analysis.alternative_interpretation ?? rageMind.confidence.alternativeInterpretation ?? "").slice(0, 400),
      finalSummary: String(analysis.final_summary ?? "").slice(0, 900),
    },
    aiVerdict: String(raw.ai_verdict).slice(0, 450),
    feedback: {
      creator: String(feedback?.creator ?? "").slice(0, 400),
      opponent: String(feedback?.opponent ?? "").slice(0, 400),
    },
  };
}

function normalizeScore(raw: any, style: string): JudgeScore {
  const score: JudgeScore = {
    creativity: clampScore(raw?.creativity),
    logic: clampScore(raw?.logic),
    humor: clampScore(raw?.humor),
    originality: clampScore(raw?.originality),
    comeback: clampScore(raw?.comeback),
    entertainment: clampScore(raw?.entertainment),
    relevance: clampScore(raw?.relevance),
    counterarguments: clampScore(raw?.counterarguments),
    consistency: clampScore(raw?.consistency),
    adaptability: clampScore(raw?.adaptability),
    confidence: clampScore(raw?.confidence),
    audienceImpact: clampScore(raw?.audienceImpact ?? raw?.audience_impact),
    topicAdherence: clampScore(raw?.topicAdherence ?? raw?.topic_adherence),
    conversationFlow: clampScore(raw?.conversationFlow ?? raw?.conversation_flow),
    total: 0,
  };

  score.total = typeof raw?.total === "number" ? clampScore(raw.total) : weightedTotal(score, style);
  return score;
}

function weightedTotal(score: JudgeScore, style: string): number {
  const weights = WEIGHTS[style] ?? WEIGHTS.mixed;
  let weighted = 0;
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const value = Number((score as any)[key]);
    if (Number.isFinite(value)) {
      weighted += value * weight;
      totalWeight += weight;
    }
  }
  if (!totalWeight) {
    return Math.round((score.creativity + score.logic + score.humor + score.originality + score.comeback + score.entertainment) / 6);
  }
  return clampScore(weighted / totalWeight);
}

function fallbackJudge(input: JudgeInput, rageMind: RageMindReport): JudgeResult {
  const creatorMessages = input.messages.filter((m) => m.user_id === input.creatorId).map((m) => m.content);
  const opponentMessages = input.messages.filter((m) => m.user_id === input.opponentId).map((m) => m.content);
  const creator = scoreMessages(creatorMessages, rageMind, "creator");
  const opponent = scoreMessages(opponentMessages, rageMind, "opponent");
  const winner = Math.abs(creator.total - opponent.total) <= 2 ? "draw" : creator.total > opponent.total ? "creator" : "opponent";
  const winnerName = winner === "creator" ? input.creatorName : winner === "opponent" ? input.opponentName : null;
  const strongestSide = creator.total >= opponent.total ? "creator" : "opponent";
  const strongestName = strongestSide === "creator" ? input.creatorName : input.opponentName;
  const strongestMsgs = strongestSide === "creator" ? creatorMessages : opponentMessages;
  const weakestName = strongestSide === "creator" ? input.opponentName : input.creatorName;
  const weakestMsgs = strongestSide === "creator" ? opponentMessages : creatorMessages;

  return {
    scores: { creator, opponent },
    winner,
    battleAnalysis: {
      strongestArgument: `${strongestName}: "${truncate(bestLine(strongestMsgs), 180)}"`,
      weakestArgument: `${weakestName}: "${truncate(worstLine(weakestMsgs), 180)}"`,
      turningPoint: rageMind.contextEngine.momentumShifts[0] ?? "No single turning point was clear.",
      bestComeback: rageMind.audienceSimulation.mostSavageComeback || `${strongestName}: "${truncate(bestLine(strongestMsgs), 180)}"`,
      funniestMoment: rageMind.audienceSimulation.biggestLaugh,
      mostCreativeLine: rageMind.audienceSimulation.mostShareableLine,
      overallBattleQuality: Math.round((creator.total + opponent.total) / 2),
      confidenceScore: rageMind.confidence.score,
      extremelyClose: rageMind.confidence.score < 70 || Math.abs(creator.total - opponent.total) <= 4,
      evidence: [
        rageMind.contextEngine.conversationFlow,
        rageMind.reasoningEngine.reasoning,
        ...rageMind.slangEngine.interpretations.slice(0, 2),
        ...rageMind.fairnessEngine.biasWarnings.slice(0, 1),
      ].filter(Boolean),
      alternativeInterpretation: rageMind.confidence.alternativeInterpretation,
      finalSummary:
        winner === "draw"
          ? `${input.creatorName} and ${input.opponentName} were close across the full conversation, with neither side creating enough separation.`
          : `${winnerName} edged the battle by landing stronger context-aware replies and better audience impact across the transcript.`,
    },
    aiVerdict:
      winner === "draw"
        ? `${input.creatorName} and ${input.opponentName} finish in a draw after a closely matched exchange.`
        : `${winnerName} wins on fuller conversation control, stronger timing, and better audience impact.`,
    feedback: {
      creator: "Keep the best lines tied to the opponent's previous point so the battle feels more adaptive.",
      opponent: "Push for fresher angles each round and answer the strongest point directly.",
    },
    rageMind,
  };
}

function scoreMessages(messages: string[], rageMind: RageMindReport, side: "creator" | "opponent"): JudgeScore {
  const text = messages.join(" ");
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const uniqueRatio = new Set(words).size / Math.max(words.length, 1);
  const avgLength = text.length / Math.max(messages.length, 1);
  const emotionBoost = (rageMind.emotionEngine[side]?.length ?? 0) * 3;
  const personalityBoost = (rageMind.personalityEngine[side]?.length ?? 0) * 2;
  const base = Math.min(88, 38 + avgLength / 5 + uniqueRatio * 35 + emotionBoost + personalityBoost);

  const raw: JudgeScore = {
    creativity: clampScore(base + (rageMind.slangEngine.detected.length ? 5 : 0)),
    logic: clampScore(45 + countHits(text, /\b(because|therefore|logic|evidence|point|reason)\b/gi) * 8),
    humor: clampScore(base + countHits(text, /\b(lol|haha|wild|cook|cooked|ratio|bro)\b/gi) * 5),
    originality: clampScore(35 + uniqueRatio * 60),
    comeback: clampScore(base + countHits(text, /\b(but|you said|your point|actually|still)\b/gi) * 5),
    entertainment: clampScore(base + (rageMind.memeEngine.references.length ? 5 : 0)),
    relevance: clampScore(58 + countHits(text, new RegExp(escapeRegExp(rageMind.battleStyle), "gi")) * 3),
    counterarguments: clampScore(45 + countHits(text, /\b(but|because|actually|your|you said)\b/gi) * 6),
    consistency: clampScore(62 + uniqueRatio * 18),
    adaptability: clampScore(55 + Math.min(25, messages.length * 5)),
    confidence: clampScore(55 + countHits(text, /\b(clearly|obvious|watch|sure|easy)\b/gi) * 5),
    audienceImpact: clampScore(base + countHits(text, /[!?]/g) * 3),
    topicAdherence: 65,
    conversationFlow: 60,
    total: 0,
  };
  raw.total = weightedTotal(raw, rageMind.battleStyle);
  return raw;
}

function bestLine(messages: string[]): string {
  return [...messages].sort((a, b) => b.length - a.length)[0] ?? "";
}

function worstLine(messages: string[]): string {
  return [...messages].sort((a, b) => a.length - b.length)[0] ?? "";
}

function countHits(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
