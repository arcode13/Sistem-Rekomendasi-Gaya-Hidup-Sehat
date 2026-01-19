'use client'

import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'

interface CreateNotebookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateNotebookDialog({ open, onOpenChange }: CreateNotebookDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
      </DialogContent>
    </Dialog>
  )
}
