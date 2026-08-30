import { eq, inArray } from "drizzle-orm"
import { getDb } from "./db"
import { uploads } from "./schema"

/**
 * Remembers that an account uploaded a file.
 *
 * Called from the upload route once UploadThing confirms the bytes landed, so
 * a key that never reaches this table was never uploaded through us by anyone.
 */
export async function recordUpload(key: string, identityKey: string): Promise<void> {
  await getDb().then((db) =>
    db.insert(uploads).values({ key, identityKey }).onConflictDoNothing(),
  )
}

/**
 * Whether every one of these keys was uploaded by this account.
 *
 * The gate on ranking. Proving a submitted url sits on our upload host says
 * only that somebody uploaded it — every key on the board is public, so that
 * somebody is not necessarily the caller.
 */
export async function ownsUploads(
  identityKey: string,
  keys: readonly string[],
): Promise<boolean> {
  const wanted = [...new Set(keys)]
  if (wanted.length === 0) return true

  const db = await getDb()
  const owned = await db
    .select({ key: uploads.key })
    .from(uploads)
    .where(inArray(uploads.key, wanted))

  // Every key has to be present *and* ours. A key nobody recorded is refused
  // for the same reason as one belonging to somebody else.
  const mine = await db
    .select({ key: uploads.key })
    .from(uploads)
    .where(eq(uploads.identityKey, identityKey))
  const owns = new Set(mine.map((r) => r.key))

  return owned.length === wanted.length && wanted.every((k) => owns.has(k))
}
