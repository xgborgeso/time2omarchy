import { useMutation } from "@tanstack/react-query"
import { ImageIcon, BadgeCheckIcon as VerifiedIcon } from "lucide-react"
import {
  type DragEvent,
  type FormEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { SpecsFields } from "@/components/SpecsFields"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signIn, signOut, useSession } from "@/lib/auth-client"
import type { Specs, StorageId } from "@/lib/specs"
import { formatTime, isTimeInRange, parseTime } from "@/lib/time"
import { useTRPC } from "@/lib/trpc"
import type { RankSuccess } from "@/lib/types"
import { uploadBootScreen } from "@/lib/upload"
import { cn } from "@/lib/utils"
import { ShareButton } from "./ShareButton"

type Props = {
  onSuccess: (result: RankSuccess) => void
}

export function RankForm({ onSuccess }: Props) {
  const trpc = useTRPC()
  const rank = useMutation(trpc.rank.mutationOptions())
  const { data: session } = useSession()
  /** Signed in, the handle is the account's; typed, it is only a guess. */
  const signedInHandle = session?.user.handle ?? null
  const handleId = useId()
  const timeId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const [typedHandle, setTypedHandle] = useState("")
  const [time, setTime] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [placed, setPlaced] = useState<RankSuccess | null>(null)
  const [specs, setSpecs] = useState<Specs>({ cpuId: null, ramGb: null, storage: null })

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) =>
        i.type.startsWith("image/"),
      )
      const pasted = item?.getAsFile()
      if (pasted) {
        setFile(pasted)
        setError(null)
      }
    }
    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
  }, [])

  const handle = signedInHandle ?? typedHandle

  const parsed = useMemo(() => {
    const seconds = parseTime(time)
    if (seconds == null) return null
    return { seconds, inRange: isTimeInRange(seconds) }
  }, [time])

  function takeFile(next: File | null) {
    setFile(next)
    setError(null)
    setNotice(null)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const next = e.dataTransfer.files[0]
    if (next) takeFile(next)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!file) {
      setError("Add a boot screen")
      return
    }
    if (!specs.cpuId || !specs.ramGb || !specs.storage) {
      // Checked before uploading: a missing spec should not cost a round trip.
      setError("Pick your CPU, memory and drive — every entry needs them.")
      return
    }
    setBusy(true)
    setError(null)
    setNotice(null)
    setPlaced(null)
    try {
      // Storage first: ranking takes a url, not a file.
      const uploaded = await uploadBootScreen(handle, file)
      if (!uploaded.ok) {
        setError(uploaded.error)
        return
      }

      const result = await rank.mutateAsync({
        handle,
        time,
        bootScreenUrl: uploaded.url,
        cpuId: specs.cpuId,
        ramGb: specs.ramGb,
        // The guard above proved these are set, and the select can only ever
        // produce an id the schema accepts.
        storage: specs.storage as StorageId,
      })

      if (!result.ok) {
        setError(result.error)
        return
      }

      if (result.keptBest) {
        setNotice(
          `Your best is still ${formatTime(result.bestTimeSeconds)}. Beat it to replace.`,
        )
      } else if (result.created) {
        setNotice(`You're on the board — ${formatTime(result.bestTimeSeconds)}`)
      } else if (result.improved) {
        setNotice(`New best — ${formatTime(result.bestTimeSeconds)}`)
      } else {
        setNotice(`Updated boot screen — ${formatTime(result.bestTimeSeconds)}`)
      }
      setPlaced(result)
      setTime("")
      setFile(null)
      onSuccess(result)
    } catch (err) {
      // Only transport failures reach here; domain outcomes come back as data.
      setError(err instanceof Error ? err.message : "Ranking failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto mt-10 w-full max-w-[792px] rounded-lg border border-border bg-card p-4"
    >
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label
            htmlFor={handleId}
            className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
          >
            handle
          </Label>
          {signedInHandle ? (
            <div
              id={handleId}
              className="flex h-11 items-center gap-2 rounded-lg border border-primary/40 bg-background px-3"
            >
              <VerifiedIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate text-sm">@{signedInHandle}</span>
            </div>
          ) : (
            <Input
              id={handleId}
              name="handle"
              autoComplete="username"
              placeholder="@handle"
              value={typedHandle}
              onChange={(e) => setTypedHandle(e.target.value)}
              className="h-11"
            />
          )}
        </div>

        <div className="flex w-full flex-col gap-1.5 sm:w-32">
          <Label
            htmlFor={timeId}
            className="flex gap-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
          >
            time
            {parsed ? (
              <span className={parsed.inRange ? "text-primary" : "text-destructive"}>
                → {formatTime(parsed.seconds)}
              </span>
            ) : null}
          </Label>
          <Input
            id={timeId}
            name="time"
            inputMode="text"
            placeholder="43s or 1:12"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-11 tabular-nums"
          />
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex h-11 shrink-0 items-center justify-center gap-2 overflow-hidden rounded-lg border border-dashed px-3.5 text-xs transition-colors",
            dragging
              ? "border-primary bg-muted/50 text-primary"
              : "border-border text-muted-foreground hover:border-primary",
          )}
        >
          {preview ? (
            // biome-ignore lint/performance/noImgElement: boot screens are remote user uploads; next/image needs images.remotePatterns for the host, and the upload pipeline moves to UploadThing next
            <img
              src={preview}
              alt="Selected boot screen"
              className="h-full w-14 object-cover"
            />
          ) : (
            <ImageIcon className="size-4" aria-hidden="true" />
          )}
          <span className="uppercase">{file ? "Change" : "Boot screen"}</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
          className="sr-only"
          onChange={(e) => takeFile(e.target.files?.[0] ?? null)}
        />

        <Button
          type="submit"
          disabled={busy}
          className="h-11 shrink-0 px-6 text-sm font-bold uppercase"
        >
          {busy ? "Ranking…" : "Rank it"}
        </Button>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-xs text-destructive">
          {error}
        </p>
      ) : null}
      {/* Always visible: these are required, and a required field behind a
          disclosure is a trap. */}
      <div className="mt-3">
        <SpecsFields value={specs} onChange={setSpecs} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {signedInHandle ? (
          <>
            Verified as @{signedInHandle}.{" "}
            <button
              type="button"
              onClick={() => signOut()}
              className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            Ranking as a guest.{" "}
            <button
              type="button"
              onClick={() => signIn.social({ provider: "twitter" })}
              className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
            >
              Sign in with X
            </button>{" "}
            for the verified mark — it is also the only way to change an entry later.
          </>
        )}
      </p>

      {notice ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="text-xs text-primary">
            {notice}
          </p>
          {placed ? (
            <ShareButton
              position={{
                rank: placed.entry.rank,
                timeSeconds: placed.entry.timeSeconds,
                total: placed.board.counters.entries,
              }}
            />
          ) : null}
        </div>
      ) : null}
    </form>
  )
}
