'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { useSettings, useUpdateSettings } from '@/lib/hooks/use-settings'
import { useEffect, useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'

const settingsSchema = z.object({
  default_content_processing_engine_doc: z.enum(['auto', 'docling', 'simple']).optional(),
  default_embedding_option: z.enum(['ask', 'always', 'never']).optional(),
})

type SettingsFormData = z.infer<typeof settingsSchema>

export function SettingsForm() {
  const { data: settings, isLoading, error } = useSettings()
  const updateSettings = useUpdateSettings()
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [hasResetForm, setHasResetForm] = useState(false)
  
  
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty }
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      default_content_processing_engine_doc: undefined,
       default_embedding_option: undefined,
    }
  })


  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  useEffect(() => {
    if (settings && settings.default_content_processing_engine_doc && !hasResetForm) {
      const formData = {
        default_content_processing_engine_doc: settings.default_content_processing_engine_doc as 'auto' | 'docling' | 'simple',
        default_embedding_option: settings.default_embedding_option as 'ask' | 'always' | 'never',
      }
      reset(formData)
      setHasResetForm(true)
    }
  }, [hasResetForm, reset, settings])

  const onSubmit = async (data: SettingsFormData) => {
    await updateSettings.mutateAsync(data)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Gagal memuat pengaturan</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak terduga.'}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pemrosesan Konten</CardTitle>
          <CardDescription>
            Konfigurasikan bagaimana dokumen diproses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="doc_engine">Mesin Pemrosesan Dokumen</Label>
            <Controller
              name="default_content_processing_engine_doc"
              control={control}
              render={({ field }) => (
                <Select
                  key={field.value}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  disabled={field.disabled || isLoading}
                >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih mesin pemrosesan dokumen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Otomatis (Direkomendasikan)</SelectItem>
                      <SelectItem value="docling">Docling</SelectItem>
                      <SelectItem value="simple">Sederhana</SelectItem>
                    </SelectContent>
                  </Select>
              )}
            />
            <Collapsible open={expandedSections.doc} onOpenChange={() => toggleSection('doc')}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDownIcon className={`h-4 w-4 transition-transform ${expandedSections.doc ? 'rotate-180' : ''}`} />
                Bantu saya memilih
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 text-sm text-muted-foreground space-y-2">
                <p>• <strong>Docling</strong> sedikit lebih lambat tetapi lebih akurat, terutama jika dokumen berisi tabel dan gambar.</p>
                <p>• <strong>Sederhana</strong> akan mengekstrak konten apa pun dari dokumen tanpa memformatnya. Cocok untuk dokumen sederhana, tetapi akan kehilangan kualitas pada dokumen yang kompleks.</p>
                <p>• <strong>Otomatis (direkomendasikan)</strong> akan mencoba memproses melalui docling dan default ke sederhana.</p>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Embedding dan Pencarian</CardTitle>
          <CardDescription>
            Konfigurasikan opsi pencarian dan embedding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="embedding">Opsi Embedding Default</Label>
            <Controller
              name="default_embedding_option"
              control={control}
              render={({ field }) => (
                <Select
                  key={field.value}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  disabled={field.disabled || isLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih opsi embedding" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ask">Tanya</SelectItem>
                    <SelectItem value="always">Selalu</SelectItem>
                    <SelectItem value="never">Tidak Pernah</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <Collapsible open={expandedSections.embedding} onOpenChange={() => toggleSection('embedding')}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDownIcon className={`h-4 w-4 transition-transform ${expandedSections.embedding ? 'rotate-180' : ''}`} />
                Bantu saya memilih
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 text-sm text-muted-foreground space-y-2">
                <p>Membuat embedding konten akan memudahkan Anda dan agen AI Anda menemukannya. Untuk penyedia online, Anda mungkin ingin berhati-hati hanya jika Anda memproses banyak konten (seperti ratusan dokumen per hari).</p>
                <p>• Pilih <strong>selalu</strong> jika volume konten Anda tidak terlalu besar</p>
                <p>• Pilih <strong>tanya</strong> jika Anda ingin memutuskan setiap kali</p>
                <p>• Pilih <strong>tidak pernah</strong> jika Anda tidak peduli tentang pencarian vektor atau tidak memiliki penyedia embedding.</p>
                <p>Sebagai referensi, text-embedding-3-small OpenAI berharga sekitar 0.02 untuk 1 juta token -- yang setara dengan sekitar 30 kali halaman Wikipedia untuk Bumi. Dengan Gemini API, Text Embedding 004 gratis dengan batas kecepatan 1500 permintaan per menit.</p>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={!isDirty || updateSettings.isPending}
        >
          {updateSettings.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </Button>
      </div>
    </form>
  )
}
