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
 * Empty in production until it is configured, so nothing links to a page that
 * does not exist. In development it falls back to Datafast's own site: the
 * dashboard has no url yet, and hiding the link until it does would mean the
 * pill and the two nav entries could not be looked at at all while building
 * them. Read at build time, so it is a plain string rather than a lookup.
 */
const CONFIGURED = process.env.NEXT_PUBLIC_ANALYTICS_URL?.trim()
export const ANALYTICS_URL =
  CONFIGURED || (process.env.NODE_ENV === "development" ? "https://datafa.st" : "")

export const DATAFAST_SITE_ID = "dfid_okBBZAhFhLC2mtjtSAfWo"
export const DATAFAST_DOMAIN = "time2omarchy.com"
