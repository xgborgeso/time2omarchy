"use client"

import { useMutation } from "@tanstack/react-query"
import { useEffect } from "react"
import { useTRPC } from "./trpc"

/** Presence expires after 2 minutes, so beat well inside that. */
const HEARTBEAT_MS = 60_000

/**
 * Tells the server someone is here.
 *
 * Split out of the board query so that query can stay a pure read — a page
 * that writes on GET cannot be prerendered or cached. Only the first call
 * counts a view; the heartbeats afterwards keep the visitor "online" without
 * inflating the counter.
 */
export function usePresence(): void {
  const trpc = useTRPC()
  const { mutate } = useMutation(trpc.visit.mutationOptions())

  useEffect(() => {
    mutate({ countView: true })
    const beat = setInterval(() => mutate({ countView: false }), HEARTBEAT_MS)
    return () => clearInterval(beat)
  }, [mutate])
}
