'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNotebooks } from '@/lib/hooks/use-notebooks'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { AppShell } from '@/components/layout/AppShell'

export default function NotebooksPage() {
  const router = useRouter()
  const { data: notebooks, isLoading } = useNotebooks()

  useEffect(() => {
    if (!isLoading && notebooks && notebooks.length > 0) {
      const firstNotebook = notebooks[0]
      router.replace(`/notebooks/${encodeURIComponent(firstNotebook.id)}`)
    }
  }, [notebooks, isLoading, router])

  if (isLoading) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </AppShell>
    )
  }

  if (!notebooks || notebooks.length === 0) {
    return (
      <AppShell>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Tidak Ada Buku Catatan Ditemukan</h1>
          <p className="text-muted-foreground">Silakan buat buku catatan terlebih dahulu.</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    </AppShell>
  )
}
