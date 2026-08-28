"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * Toasts, themed from the app's own tokens rather than sonner's defaults.
 *
 * The board is dark and the palette is set in CSS variables, so the colours
 * come from there — otherwise a toast is the one surface that looks borrowed.
 */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="top-center"
      // Long enough to read and act on, with a way out: an error that vanishes
      // mid-sentence is the same as no error at all.
      duration={6000}
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group rounded-lg border border-border bg-popover text-popover-foreground shadow-lg",
          description: "text-muted-foreground",
          error: "border-destructive bg-destructive/10 text-foreground",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}
