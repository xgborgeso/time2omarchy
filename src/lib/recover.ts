/**
 * Getting an install time back from the machine that ran it.
 *
 * The board used to be for people installing right now: step one was to
 * photograph the boot screen, and missing that screen meant missing the board.
 * Omarchy's installer keeps its own timings in a log and leaves them on disk,
 * so the number outlives the screen — which turns the audience from "installing
 * today" into "has ever installed Omarchy".
 *
 * Three things make this safe to put in front of people rather than in a FAQ:
 * the file is mode 0644, so there is no `sudo` in the instructions; `jq` is in
 * omarchy-base.packages and names omarchy in its Required By, so every box that
 * can read this page already has it; and nothing rotates the file away.
 *
 * This is not stronger proof than a photo — it is a text file, and editing it
 * is easier than editing an image. It is not meant to be. Times are
 * self-reported either way, and the check on them is that every screenshot is
 * public and anyone can report one. What this buys is that you can still enter.
 */

/**
 * Where the installer leaves its record.
 *
 * One constant because the rules name the path in prose and the command reads
 * it, and those two drifting apart would send people to a file that is not
 * there.
 */
export const TIMING_LOG = "/var/log/omarchy-install-timing.json"

/**
 * Prints the install time, labelled.
 *
 * Labelled rather than bare because this output is what gets uploaded in place
 * of a boot screen: a cropped screenshot of `99` says nothing, and one of
 * "omarchy install time: 99s" says all of it. The seconds are what goes in the
 * time field, so the command answers the form's question in the form's units.
 *
 * `round` rather than `floor` to match `formatTime`, which rounds — flooring
 * here would put entries a second under what the board would have shown them.
 *
 * The per-phase `elapsed` values in the file sum to exactly this difference, so
 * this is the installer's own total rather than a second opinion that could
 * disagree with the boot screen somebody else photographed.
 */
export const RECOVER_COMMAND = `jq -r '"omarchy install time: \\((.finished_at-.started_at)|round)s"' ${TIMING_LOG}`

/**
 * What it prints, so nobody has to run it to find out whether it is worth it.
 *
 * A real number off a real machine, not a rounded-looking invention: 99s is
 * what this command returned on the box it was written on.
 */
export const RECOVER_EXAMPLE = "omarchy install time: 99s"
