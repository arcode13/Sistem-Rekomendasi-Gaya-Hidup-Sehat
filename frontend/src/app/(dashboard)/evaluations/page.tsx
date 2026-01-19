'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import apiClient from '@/lib/api/client'
import { Switch } from '@/components/ui/switch'
import { trulensApi } from '@/lib/api/trulens'
import { toast } from 'sonner'

interface MetricSummary {
  avg: number
  min: number
  max: number
  count: number
}



interface AggregatedMetrics {
  success: boolean
  total_evaluations: number
  metrics: {
    context_relevance: MetricSummary
    answer_relevance: MetricSummary
    groundedness: MetricSummary
  }
}

export default function EvaluationsPage() {
  const [aggregatedMetrics, setAggregatedMetrics] = useState<AggregatedMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trulensEnabled, setTrulensEnabled] = useState<boolean | null>(null)
  const [toggleLoading, setToggleLoading] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const aggregatedRes = await apiClient.get(`/trulens/metrics/aggregated`)

      setAggregatedMetrics(aggregatedRes.data)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load evaluation data'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const fetchConfigAndData = async () => {
      try {
        const config = await trulensApi.getConfig()
        setTrulensEnabled(config.enabled)
        if (config.enabled) {
          await loadData()
        } else {
          setAggregatedMetrics(null)
          setLoading(false)
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load evaluation data'
        setError(errorMessage)
        setLoading(false)
      }
    }
    fetchConfigAndData()
  }, [loadData])

  const handleToggle = async (checked: boolean) => {
    if (trulensEnabled === null) return
    try {
      setToggleLoading(true)
      const res = await trulensApi.updateConfig(checked)
      setTrulensEnabled(res.enabled)
      if (res.enabled) {
        await loadData()
      } else {
        setAggregatedMetrics(null)
        setLoading(false)
      }
      toast.success(`TruLens ${res.enabled ? 'diaktifkan' : 'dinonaktifkan'}`)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal memperbarui status TruLens'
      toast.error(errorMessage)
    } finally {
      setToggleLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-500'
    if (score >= 0.6) return 'bg-yellow-500'
    return 'bg-red-500'
  }


  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="p-6 space-y-6 w-full">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold">RAG Evaluations</h1>
                <p className="mt-2 text-muted-foreground">
                  TruLens evaluation metrics
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">TruLens</span>
                <Switch checked={!!trulensEnabled} disabled />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <div className="p-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">RAG Evaluations</h1>
              <p className="mt-2 text-muted-foreground">
                TruLens evaluation metrics untuk health recommendation system
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">TruLens</span>
              <Switch checked={!!trulensEnabled} disabled={toggleLoading} onCheckedChange={handleToggle} />
            </div>
          </div>
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle>Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive">{error}</p>
              <button
                onClick={loadData}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Retry
              </button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">RAG Evaluations</h1>
              <p className="mt-2 text-muted-foreground">
                TruLens evaluation metrics
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {trulensEnabled ? 'Aktif' : 'Nonaktif'}
              </span>
              <Switch
                checked={!!trulensEnabled}
                disabled={toggleLoading || trulensEnabled === null}
                onCheckedChange={handleToggle}
              />
            </div>
          </div>

          {trulensEnabled === false && (
            <Card>
              <CardHeader>
                <CardTitle>TruLens nonaktif</CardTitle>
                <CardDescription>Aktifkan kembali untuk melihat metrik evaluasi.</CardDescription>
              </CardHeader>
            </Card>
          )}

          {trulensEnabled && aggregatedMetrics && (
            <>
              <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Context Relevance</CardTitle>
                <CardDescription>Relevansi context yang diambil</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(aggregatedMetrics.metrics.context_relevance.avg * 100).toFixed(1)}%</div>
                <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                  <span>Min: {(aggregatedMetrics.metrics.context_relevance.min * 100).toFixed(1)}%</span>
                  <span>Max: {(aggregatedMetrics.metrics.context_relevance.max * 100).toFixed(1)}%</span>
                </div>
                <div className="mt-2">
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getScoreColor(aggregatedMetrics.metrics.context_relevance.avg)}`}
                      style={{ width: `${aggregatedMetrics.metrics.context_relevance.avg * 100}%` }}
                    />
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {aggregatedMetrics.metrics.context_relevance.count} evaluations
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Answer Relevance</CardTitle>
                <CardDescription>Relevansi jawaban terhadap query</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(aggregatedMetrics.metrics.answer_relevance.avg * 100).toFixed(1)}%</div>
                <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                  <span>Min: {(aggregatedMetrics.metrics.answer_relevance.min * 100).toFixed(1)}%</span>
                  <span>Max: {(aggregatedMetrics.metrics.answer_relevance.max * 100).toFixed(1)}%</span>
                </div>
                <div className="mt-2">
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getScoreColor(aggregatedMetrics.metrics.answer_relevance.avg)}`}
                      style={{ width: `${aggregatedMetrics.metrics.answer_relevance.avg * 100}%` }}
                    />
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {aggregatedMetrics.metrics.answer_relevance.count} evaluations
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Groundedness</CardTitle>
                <CardDescription>Jawaban didukung oleh context</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(aggregatedMetrics.metrics.groundedness.avg * 100).toFixed(1)}%</div>
                <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                  <span>Min: {(aggregatedMetrics.metrics.groundedness.min * 100).toFixed(1)}%</span>
                  <span>Max: {(aggregatedMetrics.metrics.groundedness.max * 100).toFixed(1)}%</span>
                </div>
                <div className="mt-2">
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getScoreColor(aggregatedMetrics.metrics.groundedness.avg)}`}
                      style={{ width: `${aggregatedMetrics.metrics.groundedness.avg * 100}%` }}
                    />
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {aggregatedMetrics.metrics.groundedness.count} evaluations
                </div>
              </CardContent>
            </Card>
          </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}

