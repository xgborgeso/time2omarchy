/** Omarchy's official site. Linked wherever the project is named. */
export const OMARCHY_URL = "https://omarchy.org"

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
