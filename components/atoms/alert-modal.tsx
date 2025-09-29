"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/atoms/dialog"
import { Button } from "@/components/atoms/button"
import { Trash2 } from "lucide-react"
import { useState } from "react"

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
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
