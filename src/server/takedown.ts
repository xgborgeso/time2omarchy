import { eq } from "drizzle-orm"
import { getDb } from "./db"
import { entries } from "./schema"
import { deleteBootScreen } from "./storage"

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

  if (purge) await deleteBootScreen(row.bootScreenKey)
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
