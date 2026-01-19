'use client'

import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LoaderIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { WizardContainer, WizardStep } from '@/components/ui/wizard-container'
import { SourceTypeStep } from './steps/SourceTypeStep'
import { NotebooksStep } from './steps/NotebooksStep'
import { ProcessingStep } from './steps/ProcessingStep'
import { useNotebooks } from '@/lib/hooks/use-notebooks'
import { useCreateSource } from '@/lib/hooks/use-sources'
import { useSettings } from '@/lib/hooks/use-settings'
import { CreateSourceRequest } from '@/lib/types/api'

const createSourceSchema = z.object({
  type: z.enum(['upload']),
  title: z.string().optional(),
  file: z.any().optional(),
  notebooks: z.array(z.string()).optional(),
  embed: z.boolean(),
  async_processing: z.boolean(),
}).refine((data) => {
  if (data.type === 'upload') {
    if (data.file instanceof FileList) {
      return data.file.length > 0
    }
    return !!data.file
  }
  return true
}, {
  message: 'Harap berikan file PDF',
  path: ['file'],
})

type CreateSourceFormData = z.infer<typeof createSourceSchema>

interface AddSourceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultNotebookId?: string
  allowNoNotebook?: boolean
}

const WIZARD_STEPS: readonly WizardStep[] = [
  { number: 1, title: 'Sumber & Konten', description: 'Pilih jenis dan tambahkan konten' },
  { number: 2, title: 'Organisasi', description: 'Pilih buku catatan' },
  { number: 3, title: 'Pemrosesan', description: 'Pilih opsi pemrosesan' },
]

const getEffectiveSteps = (notebookCount: number): WizardStep[] => {
  if (notebookCount <= 1) {
    return [
      { number: 1, title: 'Sumber & Konten', description: 'Pilih jenis dan tambahkan konten' },
      { number: 2, title: 'Pemrosesan', description: 'Pilih opsi pemrosesan' },
    ]
  }
  return [...WIZARD_STEPS]
}

interface ProcessingState {
  message: string
  progress?: number
}

export function AddSourceDialog({ 
  open, 
  onOpenChange, 
  defaultNotebookId,
  allowNoNotebook = false
}: AddSourceDialogProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [processing, setProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState<ProcessingState | null>(null)
  const [selectedNotebooks, setSelectedNotebooks] = useState<string[]>(
    defaultNotebookId ? [defaultNotebookId] : []
  )

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const createSource = useCreateSource()
  const { data: notebooks = [], isLoading: notebooksLoading } = useNotebooks()
  const { data: settings } = useSettings()

  useEffect(() => {
    if (!allowNoNotebook && notebooks.length === 1 && selectedNotebooks.length === 0 && !defaultNotebookId) {
      const notebookId = notebooks[0].id
      setSelectedNotebooks([notebookId])
    }
  }, [notebooks.length, defaultNotebookId, allowNoNotebook, selectedNotebooks.length, notebooks])

  const shouldSkipNotebooksStep = notebooks.length <= 1
  const effectiveSteps = getEffectiveSteps(notebooks.length)
  const maxStep = effectiveSteps.length

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
    reset,
  } = useForm<CreateSourceFormData>({
    resolver: zodResolver(createSourceSchema),
    defaultValues: {
      type: 'upload',
      notebooks: defaultNotebookId ? [defaultNotebookId] : [],
      embed: settings?.default_embedding_option === 'always' || settings?.default_embedding_option === 'ask',
      async_processing: true,
    },
  })

  useEffect(() => {
    if (settings) {
      const embedValue = settings.default_embedding_option === 'always' ||
                         (settings.default_embedding_option === 'ask')

      reset({
        type: 'upload',
        notebooks: defaultNotebookId ? [defaultNotebookId] : [],
        embed: embedValue,
        async_processing: true,
      })
    }
  }, [settings, defaultNotebookId, reset])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const selectedType = watch('type')
  const watchedFile = watch('file')

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!selectedType) return false
        if (selectedType === 'upload') {
          if (watchedFile instanceof FileList) {
            return watchedFile.length > 0
          }
          return !!watchedFile
        }
        return true
      case 2:
      case 3:
        return true
      default:
        return false
    }
  }

  const getActualStep = (logicalStep: number): number => {
    if (shouldSkipNotebooksStep) {
      return logicalStep === 1 ? 1 : 3
    }
    return logicalStep
  }

  const getLogicalStep = (actualStep: number): number => {
    if (shouldSkipNotebooksStep) {
      return actualStep === 1 ? 1 : 2
    }
    return actualStep
  }

  const handleNextStep = (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    const logicalStep = getLogicalStep(currentStep)
    if (logicalStep < maxStep && isStepValid(currentStep)) {
      const nextLogicalStep = logicalStep + 1
      setCurrentStep(getActualStep(nextLogicalStep))
    }
  }

  const handlePrevStep = (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    const logicalStep = getLogicalStep(currentStep)
    if (logicalStep > 1) {
      const prevLogicalStep = logicalStep - 1
      setCurrentStep(getActualStep(prevLogicalStep))
    }
  }

  const handleStepClick = (step: number) => {
    const logicalStep = getLogicalStep(currentStep)
    const clickedLogicalStep = getLogicalStep(step)
    if (clickedLogicalStep <= logicalStep || (clickedLogicalStep === logicalStep + 1 && isStepValid(currentStep))) {
      setCurrentStep(step)
    }
  }

  const handleNotebookToggle = (notebookId: string) => {
    const updated = selectedNotebooks.includes(notebookId)
      ? selectedNotebooks.filter(id => id !== notebookId)
      : [...selectedNotebooks, notebookId]
    setSelectedNotebooks(updated)
  }


  const onSubmit = async (data: CreateSourceFormData) => {
    try {
      setProcessing(true)
      setProcessingStatus({ message: 'Mengirimkan sumber untuk diproses...' })

      const createRequest: CreateSourceRequest = {
        type: data.type,
        notebooks: selectedNotebooks,
        title: data.title,
        embed: data.embed,
        delete_source: false,
        async_processing: true,
      }

      if (data.type === 'upload' && data.file) {
        const file = data.file instanceof FileList ? data.file[0] : data.file
        const requestWithFile = createRequest as CreateSourceRequest & { file?: File }
        requestWithFile.file = file
      }

      await createSource.mutateAsync(createRequest)

      handleClose()
    } catch (error) {
      console.error('Error creating source:', error)
      setProcessingStatus({ 
        message: 'Kesalahan saat membuat sumber. Silakan coba lagi.',
      })
      timeoutRef.current = setTimeout(() => {
        setProcessing(false)
        setProcessingStatus(null)
      }, 3000)
    }
  }

  const handleClose = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    const initialNotebooks = defaultNotebookId 
      ? [defaultNotebookId] 
      : (notebooks.length === 1 ? [notebooks[0].id] : [])

    reset({
      type: 'upload',
      notebooks: initialNotebooks,
      embed: settings?.default_embedding_option === 'always' ||
        (settings?.default_embedding_option === 'ask'),
      async_processing: true,
    })
    setCurrentStep(1)
    setProcessing(false)
    setProcessingStatus(null)
    setSelectedNotebooks(initialNotebooks)

    onOpenChange(false)
  }

  if (processing) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]" showCloseButton={true}>
          <DialogHeader>
            <DialogTitle>Memproses Sumber</DialogTitle>
            <DialogDescription>
              Sumber Anda sedang diproses. Ini mungkin memakan waktu beberapa saat.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <LoaderIcon className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                {processingStatus?.message || 'Memproses...'}
              </span>
            </div>
            
            {processingStatus?.progress && (
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${processingStatus.progress}%` }}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const currentStepValid = isStepValid(currentStep)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>Tambah Sumber Baru</DialogTitle>
          <DialogDescription>
            Tambahkan konten dari unggahan atau teks ke buku catatan Anda.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <WizardContainer
            currentStep={getLogicalStep(currentStep)}
            steps={effectiveSteps}
            onStepClick={(step) => handleStepClick(getActualStep(step))}
            className="border-0"
          >
            {currentStep === 1 && (
              <SourceTypeStep
                // @ts-expect-error - Type inference issue with zod schema
                control={control}
                register={register}
                // @ts-expect-error - Type inference issue with zod schema
                errors={errors}
              />
            )}
            
            {currentStep === 2 && !shouldSkipNotebooksStep && (
              <NotebooksStep
                notebooks={notebooks}
                selectedNotebooks={selectedNotebooks}
                onToggleNotebook={handleNotebookToggle}
                loading={notebooksLoading}
              />
            )}
            
            {((currentStep === 2 && shouldSkipNotebooksStep) || currentStep === 3) && (
              <ProcessingStep
                // @ts-expect-error - Type inference issue with zod schema
                control={control}
                settings={settings}
              />
            )}
          </WizardContainer>

          <div className="flex justify-between items-center px-6 py-4 border-t border-border bg-muted">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
            >
              Batal
            </Button>

            <div className="flex gap-2">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevStep}
                >
                  Kembali
                </Button>
              )}

              {getLogicalStep(currentStep) < maxStep && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => handleNextStep(e)}
                  disabled={!currentStepValid}
                >
                  Lanjut
                </Button>
              )}

              <Button
                type="submit"
                disabled={!currentStepValid || createSource.isPending}
                className="min-w-[120px]"
              >
                {createSource.isPending ? 'Membuat...' : 'Selesai'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
