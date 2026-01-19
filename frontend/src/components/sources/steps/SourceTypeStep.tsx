"use client"

import { Control, FieldErrors, UseFormRegister } from "react-hook-form"
import { FormSection } from "@/components/ui/form-section"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Controller } from "react-hook-form"

interface CreateSourceFormData {
  type: 'upload'
  title?: string
  file?: FileList | File
  notebooks?: string[]
  embed: boolean
  async_processing: boolean
}

interface SourceTypeStepProps {
  control: Control<CreateSourceFormData>
  register: UseFormRegister<CreateSourceFormData>
  errors: FieldErrors<CreateSourceFormData>
}

export function SourceTypeStep({ control, register, errors }: SourceTypeStepProps) {
  return (
    <div className="space-y-6">
      <FormSection
        title="Unggah File PDF"
        description="Unggah file PDF untuk ditambahkan sebagai sumber"
      >
        <Controller
          control={control}
          name="type"
          render={({ field }) => {
            if (field.value !== 'upload') {
              field.onChange('upload')
            }
            return <input type="hidden" {...field} value="upload" />
          }}
        />
        <div>
          <Label htmlFor="file" className="mb-2 block">File *</Label>
          <Input
            id="file"
            type="file"
            {...register('file')}
            accept=".pdf"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Didukung: Hanya file PDF
          </p>
          {errors.file && (
            <p className="text-sm text-destructive mt-1">{errors.file.message}</p>
          )}
        </div>
        {errors.type && (
          <p className="text-sm text-destructive mt-1">{errors.type.message}</p>
        )}
      </FormSection>

      <FormSection
        title="Judul (opsional)"
        description="Jika dikosongkan, judul akan dibuat dari konten"
      >
        <Input
          id="title"
          {...register('title')}
          placeholder="Berikan judul deskriptif untuk sumber Anda"
        />
        {errors.title && (
          <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
        )}
      </FormSection>
    </div>
  )
}
