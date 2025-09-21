"use client"

import { useEffect, useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/atoms/dialog"
import { Button } from "@/components/atoms/button"
import { Textarea } from "@/components/atoms/textarea"
import { updateFeedbackAdminNote } from "@/actions/admin/feedback/actions"
import { toast } from "sonner"

const NOTE_LIMIT = 2000

export default function AdminFeedbackNoteButton({
  feedbackId,
  note,
}: {
  feedbackId: string
  note: string | null
}) {
  const [open, setOpen] = useState(false)
  const [displayNote, setDisplayNote] = useState(note ?? "")
  const [value, setValue] = useState(note ?? "")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const next = note ?? ""
    setDisplayNote(next)
    if (!open) {
      setValue(next)
    }
  }, [note, open])

  const preview = displayNote.trim()

  const handleSave = () => {
    const next = value.trim()
    if (next.length > NOTE_LIMIT) {
      toast.error(`Admin note must be ${NOTE_LIMIT} characters or fewer`)
      return
    }

    startTransition(async () => {
      const result = await updateFeedbackAdminNote({
        id: feedbackId,
        note: next.length ? next : undefined,
      })

      if (result?.error) {
        toast.error(result.error)
        return
      }

      setDisplayNote(next)
      toast.success(next.length ? "Saved admin note." : "Cleared admin note.")
      setOpen(false)
    })
  }

  return (
    <div className="flex flex-col gap-1">
      {preview ? (
        <p className="line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">
          {preview}
        </p>
      ) : (
        <span className="text-xs text-muted-foreground">No note yet</span>
      )}

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (nextOpen) {
            setValue(displayNote)
          }
        }}
      >
        <DialogTrigger asChild>
          <Button
            variant={preview.length ? "secondary" : "outline"}
            size="sm"
            className="justify-start"
          >
            {preview.length ? "Edit note" : "Add note"}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Admin note</DialogTitle>
            <DialogDescription>
              Share context the member can see alongside their original
              feedback.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={6}
            maxLength={NOTE_LIMIT}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Add a short update, follow-up question, or resolution summary."
          />
          <p className="text-xs text-muted-foreground text-right">
            {value.trim().length}/{NOTE_LIMIT}
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setValue(displayNote)
                setOpen(false)
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving…" : "Save note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
