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
 * Empty until a *public share* url is configured, and with no development
 * fallback. It fell back to `https://datafa.st` once, which is worse than
 * nothing: signed in, that lands on the owner's private dashboard, so the link
 * looked like it worked while being a closed door to every visitor. The pill
 * and the nav read fine without it, so the honest default is absent.
 *
 * Must be the share link (`datafa.st/share/...`), not the dashboard. Read at
 * build time, so it is a plain string rather than a lookup.
 */
export const ANALYTICS_URL = process.env.NEXT_PUBLIC_ANALYTICS_URL?.trim() || ""

export const DATAFAST_SITE_ID = "dfid_okBBZAhFhLC2mtjtSAfWo"
export const DATAFAST_DOMAIN = "time2omarchy.com"
