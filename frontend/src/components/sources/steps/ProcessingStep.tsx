"use client"

import { Control, Controller } from "react-hook-form"
import { FormSection } from "@/components/ui/form-section"
import { Checkbox } from "@/components/ui/checkbox"
import { SettingsResponse } from "@/lib/types/api"

interface CreateSourceFormData {
  type: 'upload'
  title?: string
  file?: FileList | File
  notebooks?: string[]
  embed: boolean
  async_processing: boolean
}

interface ProcessingStepProps {
  control: Control<CreateSourceFormData>
  settings?: SettingsResponse
}

export function ProcessingStep({
  control,
  settings
}: ProcessingStepProps) {
  return (
    <div className="space-y-8">
      <FormSection
        title="Pengaturan Pemrosesan"
        description="Konfigurasikan bagaimana sumber Anda akan diproses dan disimpan."
      >
        <div className="space-y-4">
          {settings?.default_embedding_option === 'ask' && (
            <Controller
              control={control}
              name="embed"
              render={({ field }) => (
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-md hover:bg-muted">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium block">Aktifkan embedding untuk pencarian</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      Memungkinkan sumber ini ditemukan dalam pencarian vektor dan kueri AI
                    </p>
                  </div>
                </label>
              )}
            />
          )}

          {settings?.default_embedding_option === 'always' && (
            <div className="p-3 rounded-md bg-primary/10 border border-primary/30">
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 bg-primary rounded-full mt-0.5 flex-shrink-0"></div>
                <div className="flex-1">
                  <span className="text-sm font-medium block text-primary">Embedding diaktifkan secara otomatis</span>
                  <p className="text-xs text-primary mt-1">
                    Pengaturan Anda dikonfigurasi untuk selalu membuat embedding konten untuk pencarian vektor.
                    Anda dapat mengubah ini di <span className="font-medium">Pengaturan</span>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {settings?.default_embedding_option === 'never' && (
            <div className="p-3 rounded-md bg-muted border border-border">
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 bg-muted-foreground rounded-full mt-0.5 flex-shrink-0"></div>
                <div className="flex-1">
                  <span className="text-sm font-medium block text-foreground">Embedding dinonaktifkan</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pengaturan Anda dikonfigurasi untuk melewatkan embedding. Pencarian vektor tidak akan tersedia untuk sumber ini.
                    Anda dapat mengubah ini di <span className="font-medium">Pengaturan</span>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </FormSection>
    </div>
  )
}
