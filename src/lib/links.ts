/** Omarchy's official site. Linked wherever the project is named. */
export const OMARCHY_URL = "https://omarchy.org"

/** Whose project this is. Named in the footer, and nowhere else. */
export const AUTHOR_HANDLE = "xgborgeso"

/** This project's source. One constant, so a rename cannot half-apply. */
export const REPO_URL = "https://github.com/xgborgeso/time2omarchy"

/**
 * A prefilled request to add a chip, for when the catalogue misses one.
 * Append the search text to prefill the title.
 */
export const NEW_CPU_ISSUE_URL = `${REPO_URL}/issues/new?template=add-cpu.yml&title=Add+CPU%3A+`

/**
 * The hosted analytics dashboard, when there is one.
 *
 * Empty until a provider is chosen — Datafast and Himetrica both publish a
 * public share url, which is all this needs. Read at build time, so it is a
 * plain string rather than a runtime lookup, and the Analytics page simply
 * shows nothing where the link would be until it is set.
 */
export const ANALYTICS_URL = process.env.NEXT_PUBLIC_ANALYTICS_URL ?? ""

/**
 * Datafast's site id, and the domain it reports under.
 *
 * Not a secret: it ships in the page for every visitor to read, so it is a
 * constant rather than an environment variable — one less thing a deploy can
 * be missing. The cookieless script is deliberate; see the note in `layout`.
 */
export const DATAFAST_SITE_ID = "dfid_okBBZAhFhLC2mtjtSAfWo"
export const DATAFAST_DOMAIN = "time2omarchy.com"
