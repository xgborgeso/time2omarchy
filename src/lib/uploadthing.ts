"use client"

import { generateReactHelpers } from "@uploadthing/react"
import type { AppFileRouter } from "../../app/api/uploadthing/core"

/**
 * Typed against the router, so an endpoint name that does not exist is a
 * compile error rather than a request that fails at runtime.
 */
export const { useUploadThing } = generateReactHelpers<AppFileRouter>()
