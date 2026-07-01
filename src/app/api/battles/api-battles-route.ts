import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sql } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { battleCreateSchema } from "@/lib/validation";
import { notifyInterestedUsers } from "@/lib/notifications";

const BATTLE_EXPIRY_MINUTES = 10;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid ambiguity

function generateBattleCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)];
  }
  return code;
}

async function generateUniqueBattleCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateBattleCode();
    const existing = await sql`SELECT 1 FROM battles WHERE battle_code = ${code} LIMIT 1`;
    if (existing.length === 0) return code;
  }
  // Astronomically unlikely to ever hit this, but fail loudly rather than silently collide.
  throw new Error("Could not generate a unique battle code.");
}

/** Flips any 'waiting' or 'active' battles past their expiry into 'expired'.
 *  Cheap, indexed, runs on every read. Active battles get locked the same
 *  way waiting ones do — once expires_at passes, the battle becomes
 *  read-only regardless of whether anyone ever joined. */
async function expireStaleBattles() {
  await sql`
    UPDATE battles SET status = 'expired'
    WHERE status IN ('waiting', 'active') AND expires_at < now()
  `;
}

// GET /api/battles?status=waiting|active|completed&feed=foryou|discover
// Omit status to get everything except cancelled/expired.
// feed=foryou (default, only applies when logged in) filters to battles
// whose topic category is in the user's interests. feed=discover ignores
// interests and shows everything, for exploring outside your usual topics.
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const feed = req.nextUrl.searchParams.get("feed");
  const session = await getSessionFromRequest(req);

  try {
    await expireStaleBattles();

    const baseSelect = `
      SELECT
        b.id, b.battle_code, b.title, b.topic, b.description, b.battle_type, b.battle_style,
        b.is_custom_topic, b.topic_category_id, b.mode, b.status,
        b.rounds, b.winner_id, b.ai_summary, b.created_at, b.started_at, b.completed_at, b.expires_at,
        creator.id AS creator_id, creator.username AS creator_username, creator.avatar_url AS creator_avatar,
        opponent.id AS opponent_id, opponent.username AS opponent_username, opponent.avatar_url AS opponent_avatar
      FROM battles b
      JOIN users creator ON creator.id = b.created_by
      LEFT JOIN users opponent ON opponent.id = b.opponent_id
    `;

    let rows;

    if (status && feed === "foryou" && session) {
      rows = await sql(
        `${baseSelect}
         WHERE b.status = $1
           AND (b.topic_category_id IS NULL OR b.topic_category_id IN (
             SELECT topic_category_id FROM user_interests WHERE user_id = $2
           ))
         ORDER BY b.created_at DESC LIMIT 50`,
        [status, session.userId]
      );
    } else if (status) {
      rows = await sql(
        `${baseSelect} WHERE b.status = $1 ORDER BY b.created_at DESC LIMIT 50`,
        [status]
      );
    } else if (feed === "foryou" && session) {
      rows = await sql(
        `${baseSelect}
         WHERE b.status NOT IN ('cancelled', 'expired')
           AND (b.topic_category_id IS NULL OR b.topic_category_id IN (
             SELECT topic_category_id FROM user_interests WHERE user_id = $1
           ))
         ORDER BY b.created_at DESC LIMIT 50`,
        [session.userId]
      );
    } else {
      rows = await sql(
        `${baseSelect} WHERE b.status NOT IN ('cancelled', 'expired') ORDER BY b.created_at DESC LIMIT 50`,
        []
      );
    }

    return NextResponse.json({ battles: rows });
  } catch (err) {
    console.error("List battles error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// POST /api/battles — create a new battle, status 'waiting', auto-expires in 10 minutes if nobody joins
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = battleCreateSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json({ error: firstError?.message ?? "Invalid input." }, { status: 400 });
  }

  const { title, topic, description, battleType, battleStyle, topicCategoryId, isCustomTopic, mode, rounds } = parsed.data;

  try {
    const battleCode = await generateUniqueBattleCode();
    const expiresAt = new Date(Date.now() + BATTLE_EXPIRY_MINUTES * 60 * 1000);

    const rows = await sql`
      INSERT INTO battles (
        title, topic, description, battle_type, battle_style, topic_category_id,
        is_custom_topic, mode, status, created_by, rounds, battle_code, expires_at
      )
      VALUES (
        ${title}, ${topic}, ${description ?? null}, ${battleType}, ${battleStyle}, ${topicCategoryId ?? null},
        ${isCustomTopic ?? false}, ${mode}, 'waiting', ${session.userId}, ${rounds}, ${battleCode}, ${expiresAt.toISOString()}
      )
      RETURNING id, battle_code, title, topic, description, battle_type, battle_style, mode, status, rounds, created_at, expires_at
    `;

    const battle = rows[0];

    // Best-effort: notify anyone following this topic category. Never
    // blocks or fails the battle creation itself.
    if (topicCategoryId) {
      await notifyInterestedUsers({
        topicCategoryId,
        battleId: battle.id,
        battleTitle: title,
        creatorId: session.userId,
        creatorUsername: session.username,
      });
    }

    return NextResponse.json({ battle }, { status: 201 });
  } catch (err) {
    console.error("Create battle error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
