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
 * The site Datafast records this traffic under.
 *
 * Collection only. The figures are private to the owner's dashboard and are
 * never read back into the page, so there is deliberately no public share url
 * here and nothing in the UI links out to one.
 */
export const DATAFAST_SITE_ID = "dfid_okBBZAhFhLC2mtjtSAfWo"
export const DATAFAST_DOMAIN = "time2omarchy.com"
