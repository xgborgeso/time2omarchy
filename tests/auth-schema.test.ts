import { getAuthTables } from "better-auth/db"
import { getTableColumns } from "drizzle-orm"
import { describe, expect, it } from "vitest"
import { USER_FIELDS } from "../src/server/auth"
import { account, session, user, verification } from "../src/server/schema"

/**
 * Better Auth owns these tables; `schema.ts` only has to mirror them.
 *
 * A column it expects and we do not have is invisible until someone has
 * already approved on X — the callback then dies with an internal server
 * error, having spent a metered API read to get there. This compares the two
 * directly rather than trusting a CLI whose version may not match the runtime.
 */
const tables = getAuthTables({
  emailAndPassword: { enabled: false },
  user: { additionalFields: USER_FIELDS },
  socialProviders: { twitter: { clientId: "x", clientSecret: "y" } },
})

const ours = { user, session, account, verification }

describe("Better Auth tables", () => {
  for (const definition of Object.values(tables)) {
    const name = definition.modelName as keyof typeof ours

    it(`has every column Better Auth expects on "${name}"`, () => {
      const columns = Object.values(getTableColumns(ours[name])).map((c) => c.name)
      const expected = Object.entries(definition.fields).map(
        ([key, field]) => field.fieldName ?? key,
      )
      // snake_case in the database, camelCase in Better Auth's own naming.
      const snake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
      for (const field of expected) {
        expect(columns).toContain(snake(field))
      }
    })
  }

  it("keeps one account per provider identity, which Better Auth relies on", () => {
    // getAuthTables asks for a unique index on (issuer, accountId).
    const columns = Object.values(getTableColumns(account)).map((c) => c.name)
    expect(columns).toContain("issuer")
    expect(columns).toContain("account_id")
  })
})
