'use client'

import { NotebookResponse } from '@/lib/types/api'
import { formatDistanceToNow } from 'date-fns'
import { id } from 'date-fns/locale'

interface NotebookHeaderProps {
  notebook: NotebookResponse
}

export function NotebookHeader({ notebook }: NotebookHeaderProps) {
  return (
    <div className="border-b pb-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Buku Catatan</h1>
        <div className="text-sm text-muted-foreground">
          Diperbarui {formatDistanceToNow(new Date(notebook.updated), { addSuffix: true, locale: id })}
        </div>
      </div>
    </div>
  )
}