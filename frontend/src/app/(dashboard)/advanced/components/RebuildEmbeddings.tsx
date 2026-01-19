'use client'

import { useState, useEffect, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Loader2, AlertCircle, CheckCircle2, XCircle, Clock, RefreshCw, Rocket, AlertTriangle } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { embeddingApi } from '@/lib/api/embedding'
import type { RebuildEmbeddingsRequest, RebuildStatusResponse } from '@/lib/api/embedding'

export function RebuildEmbeddings() {
  const [mode, setMode] = useState<'existing' | 'all'>('existing')
  const [commandId, setCommandId] = useState<string | null>(null)
  const [status, setStatus] = useState<RebuildStatusResponse | null>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

  // Rebuild mutation
  const rebuildMutation = useMutation({
    mutationFn: async (request: RebuildEmbeddingsRequest) => {
      return embeddingApi.rebuildEmbeddings(request)
    },
    onSuccess: (data) => {
      setCommandId(data.command_id)
      // Start polling for status
      startPolling(data.command_id)
    }
  })

  // Start polling for rebuild status
  const startPolling = (cmdId: string) => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
    }

    const interval = setInterval(async () => {
      try {
        const statusData = await embeddingApi.getRebuildStatus(cmdId)
        setStatus(statusData)

        // Stop polling if completed or failed
        if (statusData.status === 'completed' || statusData.status === 'failed') {
          stopPolling()
        }
      } catch (error) {
        console.error('Failed to fetch rebuild status:', error)
      }
    }, 5000) // Poll every 5 seconds

    setPollingInterval(interval)
  }

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }
  }, [pollingInterval])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [stopPolling])

  const handleStartRebuild = () => {
    const request: RebuildEmbeddingsRequest = {
      mode,
      include_sources: true,
    }

    rebuildMutation.mutate(request)
  }

  const handleReset = () => {
    stopPolling()
    setCommandId(null)
    setStatus(null)
    rebuildMutation.reset()
  }

  const isRebuildActive = commandId && status && (status.status === 'queued' || status.status === 'running')

  const progressData = status?.progress
  const stats = status?.stats

  const totalItems = progressData?.total_items ?? progressData?.total ?? 0
  const processedItems = progressData?.processed_items ?? progressData?.processed ?? 0
  const derivedProgressPercent = progressData?.percentage ?? (totalItems > 0 ? (processedItems / totalItems) * 100 : 0)
  const progressPercent = Number.isFinite(derivedProgressPercent) ? derivedProgressPercent : 0

  const sourcesProcessed = stats?.sources_processed ?? stats?.sources ?? 0
  const failedItems = stats?.failed_items ?? stats?.failed ?? 0

  const computedDuration = status?.started_at && status?.completed_at
    ? (new Date(status.completed_at).getTime() - new Date(status.started_at).getTime()) / 1000
    : undefined
  const processingTimeSeconds = stats?.processing_time ?? computedDuration

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Rebuild Embeddings
        </CardTitle>
        <CardDescription>
          Rebuild embedding vektor untuk konten Anda. Gunakan ini saat beralih model embedding atau memperbaiki embedding yang rusak.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration Form */}
        {!isRebuildActive && (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="mode">Mode Rebuild</Label>
              <Select value={mode} onValueChange={(value) => setMode(value as 'existing' | 'all')}>
                <SelectTrigger id="mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="existing">Yang Ada</SelectItem>
                  <SelectItem value="all">Semua</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {mode === 'existing'
                  ? 'Re-embed hanya item yang sudah memiliki embedding (lebih cepat, untuk pergantian model)'
                  : 'Re-embed item yang ada + buat embedding untuk item yang belum ada (lebih lambat, komprehensif)'}
              </p>
            </div>


            <Button
              onClick={handleStartRebuild}
              disabled={rebuildMutation.isPending}
              className="w-full"
            >
              {rebuildMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memulai Rebuild...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  Mulai Rebuild
                </>
              )}
            </Button>

            {rebuildMutation.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Gagal memulai rebuild: {(rebuildMutation.error as Error)?.message || 'Kesalahan tidak diketahui'}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Status Display */}
        {status && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {status.status === 'queued' && <Clock className="h-5 w-5 text-yellow-500" />}
                {status.status === 'running' && <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />}
                {status.status === 'completed' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                {status.status === 'failed' && <XCircle className="h-5 w-5 text-red-500" />}
                <div className="flex flex-col">
                  <span className="font-medium">
                    {status.status === 'queued' && 'Antrian'}
                    {status.status === 'running' && 'Berjalan...'}
                    {status.status === 'completed' && 'Selesai!'}
                    {status.status === 'failed' && 'Gagal'}
                  </span>
                  {status.status === 'running' && (
                    <span className="text-sm text-muted-foreground">
                      Anda dapat meninggalkan halaman ini karena ini akan berjalan di latar belakang
                    </span>
                  )}
                </div>
              </div>
              {(status.status === 'completed' || status.status === 'failed') && (
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Mulai Rebuild Baru
                </Button>
              )}
            </div>

            {progressData && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Kemajuan</span>
                  <span className="font-medium">
                    {processedItems}/{totalItems} item ({progressPercent.toFixed(1)}%)
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                {failedItems > 0 && (
                  <p className="text-sm text-yellow-600 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    {failedItems} item gagal diproses
                  </p>
                )}
              </div>
            )}

            {stats && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Sumber</p>
                  <p className="text-2xl font-bold">{sourcesProcessed}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Waktu</p>
                  <p className="text-2xl font-bold">
                    {processingTimeSeconds !== undefined ? `${processingTimeSeconds.toFixed(1)}s` : '—'}
                  </p>
                </div>
              </div>
            )}

            {status.error_message && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{status.error_message}</AlertDescription>
              </Alert>
            )}

            {status.started_at && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Dimulai: {new Date(status.started_at).toLocaleString('id-ID')}</p>
                {status.completed_at && (
                  <p>Selesai: {new Date(status.completed_at).toLocaleString('id-ID')}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Help Section */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="when">
            <AccordionTrigger>Kapan saya harus rebuild embeddings?</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm">
              <p><strong>Anda harus rebuild embeddings ketika:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Beralih model embedding:</strong> Jika Anda mengubah dari satu model embedding ke model lain, Anda perlu rebuild semua embedding untuk memastikan konsistensi.</li>
                <li><strong>Meningkatkan versi model:</strong> Saat memperbarui ke versi model embedding yang lebih baru, rebuild untuk memanfaatkan peningkatan.</li>
                <li><strong>Memperbaiki embedding yang rusak:</strong> Jika Anda mencurigai beberapa embedding rusak atau hilang, rebuild dapat memulihkannya.</li>
                <li><strong>Setelah impor massal:</strong> Jika Anda mengimpor konten tanpa embedding, gunakan mode &quot;Semua&quot; untuk membuat embedding semuanya.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="time">
            <AccordionTrigger>Berapa lama rebuild memakan waktu?</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm">
              <p><strong>Waktu pemrosesan tergantung pada:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Jumlah item yang akan diproses</li>
                <li>Kecepatan model embedding</li>
                <li>Batas kecepatan API (untuk penyedia cloud)</li>
                <li>Sumber daya sistem</li>
              </ul>
              <p className="mt-2"><strong>Tingkat khas:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>API Cloud</strong> (OpenAI, Google): Kecepatan sedang, mungkin mencapai batas kecepatan dengan dataset besar</li>
                <li><strong>Sumber:</strong> Membuat beberapa chunk per sumber</li>
              </ul>
              <p className="mt-2"><em>Contoh: Rebuild 200 item mungkin memakan waktu 2-5 menit dengan API cloud, atau kurang dari 1 menit dengan model lokal.</em></p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="safe">
            <AccordionTrigger>Apakah aman untuk rebuild saat menggunakan aplikasi?</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm">
              <p><strong>Ya, rebuild aman!</strong> Proses rebuild:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Idempotent:</strong> Menjalankan beberapa kali menghasilkan hasil yang sama</li>
                <li><strong>Tidak menghapus konten:</strong> Hanya mengganti embedding</li>
                <li><strong>Dapat dijalankan kapan saja:</strong> Tidak perlu menghentikan operasi lain</li>
                <li><strong>Menangani kesalahan dengan baik:</strong> Item yang gagal dicatat dan dilewati</li>
              </ul>
              <p className="mt-2 flex items-start gap-1">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-600" />
                <span><strong>Namun:</strong> Rebuild yang sangat besar (ribuan item) mungkin sementara memperlambat pencarian saat pemrosesan.</span>
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}
