/**
 * Geometry of the Omarchy wordmark, needed to set it beside text.
 * The asset is `/usr/share/omarchy/logo.svg`; its viewBox is tight to the ink.
 */
const VIEWBOX_WIDTH = 1215
const VIEWBOX_HEIGHT = 285

/**
 * Six of the seven letterforms sit on y=255. Only the R crosses it, descending
 * the remaining 30 units.
 */
const DESCENDER = VIEWBOX_HEIGHT - 255

/** Rendered height for a given width, preserving the aspect ratio. */
export function wordmarkHeight(width: number): number {
  return Math.round((width * VIEWBOX_HEIGHT) / VIEWBOX_WIDTH)
}

/**
 * Pixels to push the wordmark down so its own baseline meets the text baseline.
 * Flex and inline layout both synthesise a replaced element's baseline from the
 * bottom of its box, which rests the R's descender on the text baseline and
 * floats the other six letters above it.
 */
export function wordmarkBaselineOffset(height: number): number {
  return (height * DESCENDER) / VIEWBOX_HEIGHT
}
