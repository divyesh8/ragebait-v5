import { sql } from "@/lib/db";

export type NotificationType =
  | "battle_created"
  | "battle_joined"
  | "challenged"
  | "battle_ending_soon"
  | "battle_expired"
  | "winner_announced";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  battleId?: string;
  actorId?: string;
}

/** Insert a single notification. Never throws — logs and swallows so a
 *  notification failure never breaks the primary action (e.g. creating
 *  a battle should succeed even if the notify step has a problem). */
export async function createNotification(input: CreateNotificationInput) {
  try {
    await sql`
      INSERT INTO notifications (user_id, type, title, body, battle_id, actor_id)
      VALUES (${input.userId}, ${input.type}, ${input.title}, ${input.body ?? null}, ${input.battleId ?? null}, ${input.actorId ?? null})
    `;
  } catch (err) {
    console.error("createNotification failed:", err);
  }
}

/** Notify every user who follows the given topic category that a new
 *  battle was created in it. Excludes the creator themselves. */
export async function notifyInterestedUsers(opts: {
  topicCategoryId: string | null;
  battleId: string;
  battleTitle: string;
  creatorId: string;
  creatorUsername: string;
}) {
  if (!opts.topicCategoryId) return;

  try {
    const interested = (await sql`
      SELECT user_id FROM user_interests
      WHERE topic_category_id = ${opts.topicCategoryId} AND user_id != ${opts.creatorId}
    `) as { user_id: string }[];

    if (interested.length === 0) return;

    const title = "🔥 New Battle Started";
    const body = `${opts.creatorUsername} created: ${opts.battleTitle}`;

    // Insert one notification per interested user using a parameterized
    // multi-row VALUES list — placeholders only, no string interpolation
    // of user-supplied content, so this is safe against SQL injection.
    const valuesSql = interested
      .map((_row, i) => {
        const base = i * 4;
        return `($${base + 1}, 'battle_created', $${base + 2}, $${base + 3}, $${base + 4})`;
      })
      .join(",");

    const params = interested.flatMap((row) => [row.user_id, title, body, opts.battleId]);

    await sql(
      `INSERT INTO notifications (user_id, type, title, body, battle_id) VALUES ${valuesSql}`,
      params
    );
  } catch (err) {
    console.error("notifyInterestedUsers failed:", err);
  }
}
