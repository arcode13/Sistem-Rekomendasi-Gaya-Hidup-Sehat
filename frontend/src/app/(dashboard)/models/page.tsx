'use client'

import { AppShell } from '@/components/layout/AppShell'
import { ProviderStatus } from './components/ProviderStatus'
import { ModelTypeSection } from './components/ModelTypeSection'
import { DefaultModelsSection } from './components/DefaultModelsSection'
import { useModels, useModelDefaults, useProviders } from '@/lib/hooks/use-models'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export default function ModelsPage() {
  const { data: models, isLoading: modelsLoading } = useModels()
  const { data: defaults, isLoading: defaultsLoading } = useModelDefaults()
  const { data: providers, isLoading: providersLoading } = useProviders()

  if (modelsLoading || defaultsLoading || providersLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </AppShell>
    )
  }

  if (!models || !defaults || !providers) {
    return (
      <AppShell>
        <div className="p-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Gagal memuat data model</p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="mb-6 flex-shrink-0">
            <h1 className="text-3xl font-bold">Manajemen Model</h1>
            <p className="mt-2 text-muted-foreground">
              Konfigurasikan model AI untuk berbagai keperluan di Open Notebook
            </p>
          </div>

        <div className="grid gap-6">
          {/* Provider Status */}
          <ProviderStatus providers={providers} />

          {/* Default Models */}
          <DefaultModelsSection models={models} defaults={defaults} />

          {/* Model Types */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ModelTypeSection 
              type="language" 
              models={models} 
              providers={providers}
              isLoading={modelsLoading}
            />
            <ModelTypeSection 
              type="embedding" 
              models={models} 
              providers={providers}
              isLoading={modelsLoading}
            />
          </div>
        </div>
        </div>
      </div>
    </AppShell>
  )
}
