'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { NotebookHeader } from '../components/NotebookHeader'
import { SourcesColumn } from '../components/SourcesColumn'
import { ChatColumn } from '../components/ChatColumn'
import { useNotebook } from '@/lib/hooks/use-notebooks'
import { useSources } from '@/lib/hooks/use-sources'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export type ContextMode = 'off' | 'full'

export interface ContextSelections {
  sources: Record<string, ContextMode>
}

export default function NotebookPage() {
  const params = useParams()

  // Ensure the notebook ID is properly decoded from URL
  const notebookId = decodeURIComponent(params.id as string)

  const { data: notebook, isLoading: notebookLoading } = useNotebook(notebookId)
  const { data: sources, isLoading: sourcesLoading, refetch: refetchSources } = useSources(notebookId)

  // Context selection state
  const [contextSelections, setContextSelections] = useState<ContextSelections>({
    sources: {}
  })

  useEffect(() => {
    if (sources && sources.length > 0) {
      setContextSelections(prev => {
        const newSourceSelections = { ...prev.sources }
        sources.forEach(source => {
          if (!(source.id in newSourceSelections)) {
            const savedMode = source.chat_include as ContextMode
            if (savedMode && ['off', 'full'].includes(savedMode)) {
              newSourceSelections[source.id] = savedMode
            } else {
              newSourceSelections[source.id] = 'full'
            }
          }
        })
        return { ...prev, sources: newSourceSelections }
      })
    }
  }, [sources])


  const handleContextModeChange = async (itemId: string, mode: ContextMode, type: 'source') => {
    setContextSelections(prev => ({
      ...prev,
      sources: {
        ...prev.sources,
        [itemId]: mode
      }
    }))

    try {
      if (type === 'source') {
        const { sourcesApi } = await import('@/lib/api/sources')
        await sourcesApi.update(itemId, { chat_include: mode })
      }
    } catch (error) {
      console.error(`Failed to update ${type} chat_include:`, error)
    }
  }

  if (notebookLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!notebook) {
    return (
      <AppShell>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Buku Catatan Tidak Ditemukan</h1>
          <p className="text-muted-foreground">Buku catatan yang diminta tidak dapat ditemukan.</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 p-6 pb-0">
          <NotebookHeader notebook={notebook} />
        </div>

        <div className="flex-1 p-6 pt-6 overflow-hidden">
          <div className="flex gap-6 h-full min-h-0">
            <div className="w-[600px] flex-shrink-0">
              <div className="flex flex-col h-full min-h-0 overflow-hidden">
                <SourcesColumn
                  sources={sources}
                  isLoading={sourcesLoading}
                  notebookId={notebookId}
                  notebookName={notebook?.name}
                  onRefresh={refetchSources}
                  contextSelections={contextSelections.sources}
                  onContextModeChange={(sourceId, mode) => handleContextModeChange(sourceId, mode, 'source')}
                />
              </div>
            </div>

            <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
              <ChatColumn
                notebookId={notebookId}
                contextSelections={contextSelections}
              />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
