/**
 * Who someone is, once X has said so.
 *
 * Identity used to be a handle read off a public post, which meant a rename
 * silently orphaned an entry and a freed handle could be re-registered by
 * someone else. An OAuth sign-in hands over the numeric account id instead,
 * which is the only part of an X account that never changes.
 */

/** `identity_key` is a `source:id` string, so a second provider can never collide. */
const IDENTITY_SOURCE = "x"

/** Who the caller is, resolved from the session before ranking starts. */
export type Identity = {
  /** `identityKeyFor(...)` of the X account id. */
  key: string
  /** The X handle, lowercased. The board displays this. */
  handle: string
}

export function identityKeyFor(xUserId: string): string {
  return `${IDENTITY_SOURCE}:${xUserId}`
}

/** The shape of `GET /2/users/me`, narrowed to the fields this app reads. */
export type XProfile = {
  data: {
    id: string
    name: string
    username: string
    profile_image_url?: string
  }
}

export type XUser = {
  name: string
  handle: string
  email: string
  emailVerified: boolean
  image?: string
}

/**
 * RFC 6761 reserves `.invalid`, so this can never route anywhere. Better Auth
 * requires an address on every user and X only releases one under the
 * `users.email` scope, which a leaderboard has no business asking for.
 */
function placeholderEmail(xUserId: string): string {
  return `${xUserId}@twitter.placeholder.invalid`
}

export function userFromXProfile(profile: XProfile): XUser | null {
  const data = profile?.data
  if (!data?.id || !data.username) return null

  return {
    name: data.name,
    // Stored lowercase because the board matches handles that way; @Ada and
    // @ada are one account.
    handle: data.username.toLowerCase(),
    email: placeholderEmail(data.id),
    emailVerified: false,
    image: data.profile_image_url,
  }
}
