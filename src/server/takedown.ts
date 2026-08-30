import { and, eq, ne, or } from "drizzle-orm"
import { getDb } from "./db"
import { entries } from "./schema"
import { deleteBootScreen } from "./storage"

/**
 * Deletes the files this entry held, unless another entry still points at one.
 *
 * The reference check matters because keys arrive from clients: an entry can
 * end up holding a key it did not upload, and purging it would destroy a file
 * somebody else's row is still using. Moderating one account must not damage
 * another.
 */
async function purgeUnreferenced(
  db: Awaited<ReturnType<typeof getDb>>,
  entryId: string,
  keys: (string | null)[],
): Promise<void> {
  for (const key of keys) {
    if (!key) continue
    const elsewhere = await db
      .select({ id: entries.id })
      .from(entries)
      .where(
        and(
          or(eq(entries.bootScreenKey, key), eq(entries.bootScreenThumbKey, key)),
          ne(entries.id, entryId),
        ),
      )
      .limit(1)
    if (elsewhere[0]) continue
    await deleteBootScreen(key)
  }
}

export type TakedownResult =
  | { ok: true; handle: string; purged: boolean }
  | { ok: false; error: string }

/**
 * Takes an entry off the board.
 *
 * The row stays, so this is one command to undo and the rank survives it.
 * Purging the image is separate and deliberate: a wrong takedown should cost
 * nothing to reverse, and there is no getting the boot screen back.
 */
export async function takedown(handle: string, purge = false): Promise<TakedownResult> {
  const db = await getDb()
  const rows = await db.select().from(entries).where(eq(entries.handle, handle)).limit(1)
  const row = rows[0]
  if (!row) return { ok: false, error: `Nothing on the board under @${handle}.` }

  await db.update(entries).set({ hiddenAt: new Date() }).where(eq(entries.id, row.id))

  if (purge)
    await purgeUnreferenced(db, row.id, [row.bootScreenKey, row.bootScreenThumbKey])
  return { ok: true, handle: row.handle, purged: purge }
}

/** Puts back an entry taken down on a report that did not hold up. */
export async function restore(handle: string): Promise<TakedownResult> {
  const db = await getDb()
  const rows = await db.select().from(entries).where(eq(entries.handle, handle)).limit(1)
  const row = rows[0]
  if (!row) return { ok: false, error: `Nothing on the board under @${handle}.` }
  if (row.hiddenAt == null) {
    return { ok: false, error: `@${handle} is already on the board.` }
  }

  await db.update(entries).set({ hiddenAt: null }).where(eq(entries.id, row.id))
  return { ok: true, handle: row.handle, purged: false }
}
