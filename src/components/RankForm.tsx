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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatTime, isTimeInRange, parseTime } from "@/lib/time"
import { useTRPC } from "@/lib/trpc"
import type { ClaimIssued, RankSuccess } from "@/lib/types"
import { uploadBootScreen } from "@/lib/upload"
import { cn } from "@/lib/utils"
import { ShareButton } from "./ShareButton"

type Props = {
  onSuccess: (result: RankSuccess) => void
}

export function RankForm({ onSuccess }: Props) {
  const trpc = useTRPC()
  const rank = useMutation(trpc.rank.mutationOptions())
  const claimHandle = useMutation(trpc.claim.mutationOptions())
  const handleId = useId()
  const timeId = useId()
  const postUrlId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const [handle, setHandle] = useState("")
  const [time, setTime] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [placed, setPlaced] = useState<RankSuccess | null>(null)
  /** Set once the handle is taken: the post text plus where the proof goes. */
  const [claim, setClaim] = useState<ClaimIssued | null>(null)
  const [postUrl, setPostUrl] = useState("")

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

      const proof =
        claim && postUrl.trim() ? { nonce: claim.nonce, postUrl: postUrl.trim() } : {}
      const result = await rank.mutateAsync({
        handle,
        time,
        bootScreenUrl: uploaded.url,
        ...proof,
      })

      if (!result.ok) {
        setError(result.error)
        // The handle is taken. Proof of ownership is the only way through, so
        // fetch a nonce rather than making them guess what to do next.
        if (result.needsProof && !claim) {
          const issued = await claimHandle.mutateAsync({ handle }).catch(() => null)
          if (issued?.ok) setClaim(issued)
        }
        return
      }

      setClaim(null)
      setPostUrl("")
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
          <Input
            id={handleId}
            name="handle"
            autoComplete="username"
            placeholder="@handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            className="h-11"
          />
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
          {busy ? "Ranking…" : claim ? "Verify & rank" : "Rank it"}
        </Button>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-xs text-destructive">
          {error}
        </p>
      ) : null}
      {claim ? (
        <div className="mt-3 flex flex-col gap-3 rounded-lg border border-primary/40 bg-background p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Prove @{handle} is yours
            </p>
            <p className="mt-1.5 text-xs font-light text-muted-foreground">
              Post this from that account, then paste the link. The code is single-use and
              expires in 15 minutes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded border border-border bg-muted px-3 py-2 text-xs text-foreground">
              {claim.text}
            </code>
            <a
              href={`https://x.com/intent/post?text=${encodeURIComponent(claim.text)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 shrink-0 items-center rounded-lg bg-primary px-4 text-xs font-bold uppercase text-primary-foreground hover:bg-primary/80"
            >
              Post on X
            </a>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor={postUrlId}
              className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
            >
              link to your post
            </Label>
            <Input
              id={postUrlId}
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
              placeholder="https://x.com/you/status/..."
              className="h-11"
            />
          </div>
        </div>
      ) : null}

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
