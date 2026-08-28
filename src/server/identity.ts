/**
 * The signed-in account, in the shape ranking wants.
 *
 * Better Auth owns the session; the X account id lives on the `account` row it
 * writes at sign-in. That id, not the handle, is the identity — see
 * `src/lib/identity.ts`.
 */
import { and, eq } from "drizzle-orm"
import { type Identity, identityKeyFor } from "../lib/identity"
import { getAuth } from "./auth"
import { getDb } from "./db"
import { account } from "./schema"

export async function identityFrom(headers: Headers): Promise<Identity | null> {
  const auth = await getAuth()
  const session = await auth.api.getSession({ headers })
  if (!session) return null

  const db = await getDb()
  const rows = await db
    .select({ accountId: account.accountId })
    .from(account)
    .where(and(eq(account.userId, session.user.id), eq(account.providerId, "twitter")))
    .limit(1)

  const accountId = rows[0]?.accountId
  // A session with no X account behind it cannot verify anything. There is no
  // other way to sign in today, so this only fires if one is added later.
  if (!accountId) return null

  return { key: identityKeyFor(accountId), handle: session.user.handle }
}
