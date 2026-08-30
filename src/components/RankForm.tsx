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
import { FIELD_ROW, SpecsFields } from "@/components/SpecsFields"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { errorText } from "@/lib/error-text"
import { reencodeBootScreen } from "@/lib/reencode"
import type { Specs, StorageId } from "@/lib/specs"
import { formatTime, isTimeInRange, parseTime } from "@/lib/time"
import { useTRPC } from "@/lib/trpc"
import type { RankFailure, RankSuccess } from "@/lib/types"
import { uploadErrorFrom } from "@/lib/upload-error"
import { useUploadThing } from "@/lib/uploadthing"
import { cn } from "@/lib/utils"
import { timeError } from "@/lib/validation"
import { RankResult } from "./RankResult"

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
  /** Closes whatever is holding the form, once there is nothing left to do. */
  onDone?: () => void
}

export function RankForm({ onSuccess, className, onDone }: Props) {
  const trpc = useTRPC()
  const rank = useMutation(trpc.rank.mutationOptions())
  /**
   * Why the last upload failed, kept because `startUpload` will not tell us
   * twice. It hands the error here and then resolves `undefined`, so by the
   * time the caller sees the missing result the cause is gone.
   */
  const uploadError = useRef<string | null>(null)
  const { startUpload } = useUploadThing("bootScreen", {
    onUploadError: (err) => {
      uploadError.current = uploadErrorFrom(err)
    },
  })
  const timeId = useId()
  const errorId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const [time, setTime] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<FieldError | null>(null)
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

  const parsed = useMemo(() => {
    const seconds = parseTime(time)
    if (seconds == null) return null
    return { seconds, inRange: isTimeInRange(seconds) }
  }, [time])

  function takeFile(next: File | null) {
    setFile(next)
    setError(null)
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
    setPlaced(null)
    try {
      // Redrawn before it leaves the browser: strips the EXIF a phone photo
      // carries, proves the file decodes, and turns four megabytes into a few
      // hundred kilobytes. Nothing downstream can do any of this — the bytes
      // go straight to storage and never pass through this app.
      const clean = await reencodeBootScreen(file)
      if (!clean.ok) {
        setError({ message: clean.error, field: "bootScreen" })
        return
      }

      // Both at once, so one round trip carries the pair.
      uploadError.current = null
      const uploaded = await startUpload([clean.files.full, clean.files.thumb])
      const stored = uploaded?.find((f) => !f.serverData.thumb)?.serverData
      const thumb = uploaded?.find((f) => f.serverData.thumb)?.serverData
      if (!stored || !thumb) {
        // `onUploadError` ran first when there was a cause worth naming; the
        // fallback covers the pair coming back incomplete, which is not an
        // error UploadThing reports.
        setError({
          message: uploadError.current ?? uploadErrorFrom(null),
          field: "bootScreen",
        })
        return
      }

      const result = await rank.mutateAsync({
        time,
        bootScreenUrl: stored.url,
        bootScreenKey: stored.key,
        bootScreenThumbUrl: thumb.url,
        bootScreenThumbKey: thumb.key,
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

  if (placed) {
    return (
      <div
        className={
          className ??
          "mx-auto mt-10 w-full max-w-[792px] rounded-lg border border-border bg-card p-4"
        }
      >
        <RankResult
          placed={placed}
          onAgain={() => setPlaced(null)}
          onClose={() => onDone?.()}
        />
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className={
        className ??
        "mx-auto mt-10 w-full max-w-[792px] rounded-lg border border-border bg-card p-4"
      }
    >
      {/* Two rows that mean something, then one action. First the run — how
          fast, and the proof — then the machine it ran on. The handle is not
          asked for: X already answered it, and the dialog's title says whose
          entry this is. */}
      <div className={FIELD_ROW}>
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

        <div className="flex flex-col gap-1.5 sm:col-span-2">
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
        Beat your own time whenever you like. Only you can change this entry.
      </p>
    </form>
  )
}
