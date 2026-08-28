import { useMutation } from "@tanstack/react-query"
import { ImageIcon } from "lucide-react"
import {
  type DragEvent,
  type FormEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { toast } from "sonner"
import { FIELD_ROW, SpecsFields } from "@/components/SpecsFields"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signIn } from "@/lib/auth-client"
import { errorText } from "@/lib/error-text"
import type { Specs, StorageId } from "@/lib/specs"
import { formatTime, isTimeInRange, parseTime } from "@/lib/time"
import { useTRPC } from "@/lib/trpc"
import type { RankFailure, RankSuccess } from "@/lib/types"
import { uploadBootScreen } from "@/lib/upload"
import { cn } from "@/lib/utils"
import { timeError } from "@/lib/validation"
import { ShareButton } from "./ShareButton"

/** X's mark, at the size the surrounding text is set in. */
function XMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

/**
 * A complaint and the field it is about.
 *
 * A form-level alert alone leaves someone hunting for which field it means,
 * so every message names its field and is rendered beside it.
 */
type FieldError = { message: string; field?: RankFailure["field"] }

/**
 * The complaint about one field, tied to it by id for screen readers.
 *
 * `role="alert"` as well as `aria-describedby`: the first announces it when it
 * appears, the second answers "which field?" for anyone who arrives later.
 */
function FieldMessage({ id, text }: { id: string; text: string | null }) {
  if (!text) return null
  return (
    <p id={id} role="alert" className="text-[11px] text-destructive">
      {text}
    </p>
  )
}

/** One label style for every field, so the two rows read as one form. */
const LABEL = "text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"

type Props = {
  onSuccess: (result: RankSuccess) => void
  /** Replaces the card chrome, for when the form already sits inside one. */
  className?: string
}

export function RankForm({ onSuccess, className }: Props) {
  const trpc = useTRPC()
  const rank = useMutation(trpc.rank.mutationOptions())
  const handleId = useId()
  const timeId = useId()
  const errorId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const [handle, setHandle] = useState("")
  const [time, setTime] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<FieldError | null>(null)
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

  /**
   * Proving an entry is the only thing X is used for, so this hands the
   * handle being ranked to the callback and comes straight back to it.
   */
  async function verifyEntry(target: string) {
    setError(null)
    const result = await signIn.social({
      provider: "twitter",
      callbackURL: `/?verify=${encodeURIComponent(target)}`,
      errorCallbackURL: "/",
    })
    if (result?.error) {
      // Not a validation error: nothing on the form is wrong, so there is no
      // field to attach it to. Reaching X is a system outcome, and system
      // outcomes belong in a toast.
      toast.error(result.error.message ?? "Could not reach X. Try again.")
    }
  }

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
    // Checked in the order the form is read, so the first thing missing is
    // the thing named — and none of it costs an upload first.
    const badTime = timeError(time)
    if (badTime) {
      setError({ message: badTime, field: "time" })
      return
    }
    if (!file) {
      setError({ message: "Add a boot screen", field: "bootScreen" })
      return
    }
    if (!specs.cpuId || !specs.ramGb || !specs.storage) {
      // Checked before uploading: a missing spec should not cost a round trip.
      setError({ message: "Pick your CPU, memory and drive.", field: "form" })
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
        setError({ message: uploaded.error, field: "bootScreen" })
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
        setError({ message: result.error, field: result.field })
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
      setError({ message: errorText(err, "Ranking failed"), field: "form" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className={
        className ??
        "mx-auto mt-10 w-full max-w-[792px] rounded-lg border border-border bg-card p-4"
      }
    >
      {/* Two rows that mean something, then one action. First the run —
          who, how fast, and the proof — then the machine it ran on. */}
      <div className={FIELD_ROW}>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={handleId} className={LABEL}>
            handle
          </Label>
          <Input
            id={handleId}
            name="handle"
            autoComplete="username"
            placeholder="@handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            className="h-11"
            aria-required="true"
            aria-invalid={error?.field === "handle" || undefined}
            aria-describedby={error?.field === "handle" ? errorId : undefined}
          />
          {error?.field === "handle" ? (
            <FieldMessage id={errorId} text={error.message} />
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={timeId} className={cn(LABEL, "flex gap-1")}>
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
            aria-required="true"
            aria-invalid={error?.field === "time" || undefined}
            aria-describedby={error?.field === "time" ? errorId : undefined}
          />
          {error?.field === "time" ? (
            <FieldMessage id={errorId} text={error.message} />
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className={LABEL}>boot screen</span>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            aria-invalid={error?.field === "bootScreen" || undefined}
            aria-describedby={error?.field === "bootScreen" ? errorId : undefined}
            className={cn(
              "flex h-11 items-center justify-center gap-2 overflow-hidden rounded-lg border border-dashed px-3.5 text-xs transition-colors",
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
                className="h-full w-14 shrink-0 object-cover"
              />
            ) : (
              <ImageIcon className="size-4 shrink-0" aria-hidden="true" />
            )}
            <span className="truncate uppercase">{file ? "Change" : "Add"}</span>
          </button>
          {error?.field === "bootScreen" ? (
            <FieldMessage id={errorId} text={error.message} />
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            className="sr-only"
            onChange={(e) => takeFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      {/* Only what belongs to no single field; the rest is rendered beside
          the input it names. */}
      {error && (!error.field || error.field === "form") ? (
        <p role="alert" className="mt-3 text-xs text-destructive">
          {error.message}
        </p>
      ) : null}
      {/* Second, and always visible: these are required, and a required field
          behind a disclosure is a trap. */}
      <div className="mt-3">
        <SpecsFields value={specs} onChange={setSpecs} />
      </div>

      {/* Last on purpose: nothing should invite you to submit before you
          have been asked for everything. */}
      <Button
        type="submit"
        disabled={busy}
        className="mt-4 h-11 w-full text-sm font-bold uppercase"
      >
        {busy ? "Ranking…" : "Rank it"}
      </Button>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Anyone can rank. Only a verified handle can post a faster time later.
      </p>

      {notice ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="text-xs text-primary">
            {notice}
          </p>
          {placed && !placed.entry.verified ? (
            <button
              type="button"
              onClick={() => verifyEntry(handle)}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-primary/40 px-5 text-sm font-bold uppercase text-foreground transition-colors hover:bg-muted/50"
            >
              <XMark className="size-3.5" />
              Verify this entry
            </button>
          ) : null}
          {/* Only a proven entry gets the pre-filled brag. X posts from
              whatever account is logged in there, so an unverified row could
              put "#1 — 35s" in one account's timeline while the board credits
              another. The verify above is the way to this button; a handle
              that proved itself once still has its session and lands here
              straight away when it beats its own time. */}
          {placed?.entry.verified ? (
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
