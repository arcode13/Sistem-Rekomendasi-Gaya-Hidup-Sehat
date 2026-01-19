'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, ExternalLink } from 'lucide-react'

interface EmbeddingModelChangeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  oldModelName?: string
  newModelName?: string
}

export function EmbeddingModelChangeDialog({
  open,
  onOpenChange,
  onConfirm,
  oldModelName,
  newModelName
}: EmbeddingModelChangeDialogProps) {
  const router = useRouter()
  const [isConfirming, setIsConfirming] = useState(false)

  const handleConfirmAndRebuild = () => {
    setIsConfirming(true)
    onConfirm()
    // Give a moment for the model to update, then redirect
    setTimeout(() => {
      router.push('/settings')
      onOpenChange(false)
      setIsConfirming(false)
    }, 500)
  }

  const handleConfirmOnly = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <AlertDialogTitle>Perubahan Model Embedding</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-base text-muted-foreground">
              <p>
                Anda akan mengubah model embedding Anda{' '}
                {oldModelName && newModelName && (
                  <>
                    dari <strong>{oldModelName}</strong> ke <strong>{newModelName}</strong>
                  </>
                )}
                .
              </p>

              <div className="bg-muted p-4 rounded-md space-y-2">
                <p className="font-semibold text-foreground">⚠️ Penting: Rebuild Diperlukan</p>
                <p className="text-sm">
                  Mengubah model embedding Anda memerlukan rebuild semua embedding yang ada untuk menjaga konsistensi.
                  Tanpa rebuild, pencarian Anda mungkin mengembalikan hasil yang salah atau tidak lengkap.
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <p className="font-medium text-foreground">Apa yang terjadi selanjutnya:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Model embedding default Anda akan diperbarui</li>
                  <li>Embedding yang ada akan tetap tidak berubah sampai rebuild</li>
                  <li>Konten baru akan menggunakan model embedding baru</li>
                  <li>Anda harus rebuild embedding sesegera mungkin</li>
                </ul>
              </div>

              <p className="text-sm font-medium text-foreground">
                Apakah Anda ingin melanjutkan ke halaman Pengaturan untuk memulai rebuild sekarang?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel disabled={isConfirming}>
            Batal
          </AlertDialogCancel>
          <Button
            variant="outline"
            onClick={handleConfirmOnly}
            disabled={isConfirming}
          >
            Ubah Model Saja
          </Button>
          <AlertDialogAction
            onClick={handleConfirmAndRebuild}
            disabled={isConfirming}
            className="bg-primary"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Ubah & Pergi ke Rebuild
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
