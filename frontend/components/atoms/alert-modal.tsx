"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/dialog"
import { Button } from "@/components/atoms/button"

interface AlertModalProps {
  title?: string
  description?: string
  trigger: (open: () => void) => React.ReactNode
  onConfirm: () => void
  loading?: boolean
  confirmText?: string
}

export function AlertModal({
  title = "Are you absolutely sure?",
  description = "This action cannot be undone.",
  trigger,
  onConfirm,
  loading = false,
  confirmText = "Delete",
}: AlertModalProps) {
  const [open, setOpen] = useState(false)

  const handleConfirm = () => {
    onConfirm()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger(() => setOpen(true))}
      <DialogContent className="sm:max-w-md rounded-3xl border border-border bg-white p-6 shadow-xl shadow-black/10">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl font-semibold text-foreground">
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription className="text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogFooter className="mt-6 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            className="border-border/70 text-muted-foreground hover:bg-muted/40"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="gap-2 bg-foreground text-background shadow-none hover:bg-foreground/90"
            onClick={handleConfirm}
            disabled={loading}
          >
            <Trash2 className="h-4 w-4" /> {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
