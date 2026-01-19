'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import React, { useState, useEffect, useRef } from 'react'
import { chatsApi } from '@/lib/api/chats'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowLeft, Bot, User } from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import ReactMarkdown from 'react-markdown'
import { format, formatDistanceToNow } from 'date-fns'
import { id } from 'date-fns/locale'
import { createCompactReferenceLinkComponent, parseSourceReferences } from '@/lib/utils/source-references'
import { useModalManager } from '@/lib/hooks/use-modal-manager'
import { sourcesApi } from '@/lib/api/sources'
import { toast } from 'sonner'
import { MessageActions } from '@/components/source/MessageActions'

export default function ChatDetailPage() {
  const params = useParams()
  const router = useRouter()
  const examinationId = decodeURIComponent(params.id as string)
  const { openModal } = useModalManager()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['chatDetail', examinationId],
    queryFn: () => chatsApi.get(examinationId),
  })

  const handleReferenceClick = (type: string, id: string) => {
    const modalType = type as 'source'
    try {
      openModal(modalType, id)
    } catch {
      toast.error('Sumber ini tidak dapat ditemukan')
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data?.chat_sessions])

  const getRiskLevelBadge = (riskLevel: string) => {
    const riskMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
      low: { label: 'Risiko Rendah', variant: 'default' },
      medium: { label: 'Risiko Sedang', variant: 'secondary' },
      high: { label: 'Risiko Tinggi', variant: 'destructive' },
    }
    const risk = riskMap[riskLevel.toLowerCase()] || { label: riskLevel, variant: 'default' }
    return <Badge variant={risk.variant}>{risk.label}</Badge>
  }

  const formatCholesterol = (value?: number | null): string => {
    if (value === null || value === undefined) return '-'
    const map: Record<number, string> = { 1: 'Normal', 2: 'Di Atas Normal', 3: 'Jauh Di Atas Normal' }
    return map[value] || '-'
  }

  const formatGlucose = (value?: number | null): string => {
    if (value === null || value === undefined) return '-'
    const map: Record<number, string> = { 1: 'Normal', 2: 'Di Atas Normal', 3: 'Jauh Di Atas Normal' }
    return map[value] || '-'
  }

  const formatSmoking = (value?: number | null): string => {
    if (value === null || value === undefined) return '-'
    return value === 1 ? 'Merokok' : 'Tidak Merokok'
  }

  const formatAlcohol = (value?: number | null): string => {
    if (value === null || value === undefined) return '-'
    return value === 1 ? 'Ya' : 'Tidak'
  }

  const formatPhysicalActivity = (value?: number | null): string => {
    if (value === null || value === undefined) return '-'
    return value === 1 ? 'Aktif' : 'Tidak Aktif'
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </AppShell>
    )
  }

  if (!data) {
    return (
      <AppShell>
        <div className="p-6">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
          <div className="mt-4 text-center text-muted-foreground">
            Percakapan tidak ditemukan
          </div>
        </div>
      </AppShell>
    )
  }

  const { examination, chat_sessions } = data

  return (
    <AppShell>
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 p-6 pb-0">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
        </div>

        <div className="flex-1 p-6 pt-6 overflow-hidden">
          <div className="flex gap-6 h-full min-h-0">
            <div className="w-[600px] flex-shrink-0">
              <Card className="h-full overflow-y-auto">
                <CardContent className="p-6">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Nama</div>
                        <div className="font-medium">{examination.user_name || '-'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Usia</div>
                        <div className="font-medium">{examination.age} tahun</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Jenis Kelamin</div>
                        <div className="font-medium">
                          {examination.gender === 1 ? 'Perempuan' : examination.gender === 2 ? 'Laki-laki' : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Tinggi Badan</div>
                        <div className="font-medium">{examination.height} cm</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Berat Badan</div>
                        <div className="font-medium">{examination.weight} kg</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Tekanan Darah</div>
                        <div className="font-medium">
                          {examination.systolic_bp}/{examination.diastolic_bp} mmHg
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">BMI</div>
                        <div className="font-medium">{examination.bmi.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Pulse Pressure</div>
                        <div className="font-medium">{examination.pulse_pressure.toFixed(2)} mmHg</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Kolesterol</div>
                        <div className="font-medium">{formatCholesterol(examination.cholesterol)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Glukosa</div>
                        <div className="font-medium">{formatGlucose(examination.glucose)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Kebiasaan Merokok</div>
                        <div className="font-medium">{formatSmoking(examination.smoking)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Konsumsi Alkohol</div>
                        <div className="font-medium">{formatAlcohol(examination.alcohol)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Aktivitas Fisik</div>
                        <div className="font-medium">{formatPhysicalActivity(examination.physical_activity)}</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Tingkat Risiko</div>
                        <div className="mt-2">{getRiskLevelBadge(examination.risk_level)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Probabilitas</div>
                        <div className="font-medium">{(examination.prediction_proba * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Dibuat</div>
                        <div>
                          {examination.created ? (
                            <>
                              <p className="text-sm">
                                {formatDistanceToNow(new Date(examination.created), { addSuffix: true, locale: id })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(examination.created), 'dd MMM yyyy - HH:mm', { locale: id })}
                              </p>
                            </>
                          ) : (
                            '-'
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Diperbarui</div>
                        <div>
                          {examination.updated ? (
                            <>
                              <p className="text-sm">
                                {formatDistanceToNow(new Date(examination.updated), { addSuffix: true, locale: id })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(examination.updated), 'dd MMM yyyy - HH:mm', { locale: id })}
                              </p>
                            </>
                          ) : (
                            '-'
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
              <Card className="flex flex-col flex-1 min-h-0">
                <CardHeader className="flex-shrink-0">
                  <CardTitle>Percakapan</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col min-h-0 p-0">
                  {chat_sessions.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center text-muted-foreground py-8">
                        <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm">Tidak ada percakapan</p>
                      </div>
                    </div>
                  ) : (
                    <ScrollArea className="flex-1 min-h-0 px-4">
                      <div className="space-y-4 py-4">
                        {chat_sessions.map((session) => {
                          return (
                            <div key={session.id} className="space-y-4">
                              {session.messages?.map((message: Record<string, unknown>, index: number) => {
                                const messageTypeRaw = message?.type
                                const messageType = String(messageTypeRaw || '').toLowerCase().trim()
                                
                                if (messageType === 'result') {
                                  return null
                                }
                                
                                const rawContent = message?.content
                                let messageContent = ''
                                if (typeof rawContent === 'string') {
                                  messageContent = rawContent
                                } else if (rawContent && typeof rawContent === 'object') {
                                  if ('recommendation_processed_content' in rawContent) {
                                    messageContent = String((rawContent as Record<string, unknown>).recommendation_processed_content || '')
                                  } else if ('processed_content' in rawContent) {
                                    messageContent = String((rawContent as Record<string, unknown>).processed_content || '')
                                  } else {
                                    return null
                                  }
                                } else {
                                  messageContent = String(rawContent || '')
                                }
                                
                                const isHuman = messageType === 'human' || messageType === 'user' || messageType === 'human_message'
                                const references = (message.references as unknown[]) || []
                                const hasReferences = Array.isArray(references) && references.length > 0
                                
                                const className = `flex gap-3 ${isHuman ? 'justify-start' : 'justify-end'}`
                                
                                return (
                                  <div
                                    key={index}
                                    className={className}
                                  >
                                    {isHuman && (
                                      <div className="flex-shrink-0">
                                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                                          <User className="h-4 w-4 text-primary-foreground" />
                                        </div>
                                      </div>
                                    )}
                                    <div className="flex flex-col gap-2 max-w-[80%]">
                                      <div
                                        className={`rounded-lg px-4 py-2 ${
                                          isHuman
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted'
                                        }`}
                                      >
                                        {isHuman ? (
                                          <p className="text-sm break-words overflow-wrap-anywhere">{messageContent}</p>
                                        ) : (
                                          <AIMessageContent
                                            content={messageContent}
                                            onReferenceClick={handleReferenceClick}
                                          evaluationMetrics={message.evaluation_metrics as { context_relevance: number; answer_relevance: number; groundedness: number } | undefined}
                                          hasExplicitReferences={hasReferences}
                                          />
                                        )}
                                      </div>
                                      {!isHuman && (
                                        <div className="self-end">
                                          <MessageActions
                                            content={messageContent}
                                          />
                                        </div>
                                      )}
                                    </div>
                                    {!isHuman && (
                                      <div className="flex-shrink-0">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                          <Bot className="h-4 w-4" />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function AIMessageContent({
  content,
  onReferenceClick,
  evaluationMetrics,
  hasExplicitReferences,
}: {
  content: string
  onReferenceClick: (type: string, id: string) => void
  evaluationMetrics?: {
    context_relevance: number
    answer_relevance: number
    groundedness: number
  }
  hasExplicitReferences?: boolean
}) {
  const LinkComponent = createCompactReferenceLinkComponent(onReferenceClick)
  const [referenceTitles, setReferenceTitles] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    const fetchReferenceTitles = async () => {
      const parsedRefs = parseSourceReferences(content)
      if (parsedRefs.length === 0) return

      const newTitles = new Map<string, string>()
      const allReferences = new Set<string>()

      parsedRefs.forEach(ref => {
        const key = `${ref.type}:${ref.id}`
        allReferences.add(key)
      })

      for (const key of allReferences) {
        if (!referenceTitles.has(key)) {
          try {
            const [type, id] = key.split(':')
            const fullId = id.includes(':') ? id : `${type}:${id}`
            let title = ''

            if (type === 'source') {
              const data = await sourcesApi.get(fullId)
              title = data.title || key
            }

            if (title) {
              newTitles.set(key, title)
            }
          } catch {
            newTitles.set(key, key)
          }
        }
      }

      if (newTitles.size > 0) {
        setReferenceTitles(prev => {
          const updated = new Map(prev)
          for (const [key, title] of newTitles) {
            updated.set(key, title)
          }
          return updated
        })
      }
    }

    fetchReferenceTitles()
  }, [content, referenceTitles])

  const parsedRefs = parseSourceReferences(content)
  const hasAnyReferences = hasExplicitReferences || parsedRefs.length > 0
  
  if (!hasAnyReferences) {
    return (
      <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none break-words prose-headings:font-semibold prose-a:text-blue-600 prose-a:break-all prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-p:mb-4 prose-p:leading-7 prose-li:mb-2">
        <ReactMarkdown
          components={{
            a: LinkComponent,
            p: ({ children, ...props }) => {
              const getTextContent = (node: React.ReactNode): string => {
                if (typeof node === 'string') return node
                if (typeof node === 'number') return String(node)
                if (Array.isArray(node)) return node.map(getTextContent).join('')
                if (node && typeof node === 'object' && 'props' in node) {
                  const nodeWithProps = node as { props?: { children?: React.ReactNode } }
                  return getTextContent(nodeWithProps.props?.children || '')
                }
                return ''
              }
              const text = getTextContent(children)
              const fullText = text.trim()
              if (fullText.startsWith('💡 Rekomendasi Gaya Hidup Sehat:')) {
                return <p className="text-lg font-semibold mb-5" {...props}>{children}</p>
              }
              if (fullText.startsWith('ℹ️ Catatan:')) {
                return <p className="mt-5 mb-1" {...props}>{children}</p>
              }
              return <p className="mb-1" {...props}>{children}</p>
            },
            h1: ({ children }) => <h1 className="mb-4 mt-6">{children}</h1>,
            h2: ({ children }) => <h2 className="mb-3 mt-5">{children}</h2>,
            h3: ({ children }) => <h3 className="mb-3 mt-4">{children}</h3>,
            h4: ({ children }) => <h4 className="mb-2 mt-4">{children}</h4>,
            h5: ({ children }) => <h5 className="mb-2 mt-3">{children}</h5>,
            h6: ({ children }) => <h6 className="mb-2 mt-3">{children}</h6>,
            li: ({ children }) => <li className="mb-1">{children}</li>,
            ul: ({ children }) => <ul className="mb-4 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="mb-4 space-y-1">{children}</ol>,
          }}
        >
          {content}
        </ReactMarkdown>
        {evaluationMetrics && hasAnyReferences && (
          <div className="mt-3 flex flex-wrap gap-2 items-center not-prose">
            <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              Context: {(evaluationMetrics.context_relevance * 100).toFixed(0)}%
            </span>
            <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              Answer: {(evaluationMetrics.answer_relevance * 100).toFixed(0)}%
            </span>
            <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              Ground: {(evaluationMetrics.groundedness * 100).toFixed(0)}%
            </span>
          </div>
        )}
      </div>
    )
  }

  const referenceMap = new Map<string, { number: number; type: 'source'; id: string }>()
  let nextNumber = 1

  for (const ref of parsedRefs) {
    const key = `${ref.type}:${ref.id}`
    if (!referenceMap.has(key)) {
      referenceMap.set(key, { number: nextNumber++, type: 'source', id: ref.id })
    }
  }

  let processedText = content
  processedText = processedText.replace(/\[\[(\d+)\]/g, '[$1]')
  processedText = processedText.replace(/\[(\d+)\]\]/g, '[$1]')
  
  for (let i = parsedRefs.length - 1; i >= 0; i--) {
    const ref = parsedRefs[i]
    const key = `${ref.type}:${ref.id}`
    const refData = referenceMap.get(key)!
    const number = refData.number

    const refStart = ref.startIndex
    const refEnd = ref.endIndex
    const contextBefore = processedText.substring(Math.max(0, refStart - 2), refStart)
    const contextAfter = processedText.substring(refEnd, Math.min(processedText.length, refEnd + 2))

    let replaceStart = refStart
    let replaceEnd = refEnd

    if (contextBefore === '[[' && contextAfter.startsWith(']]')) {
      replaceStart = refStart - 2
      replaceEnd = refEnd + 2
    } else if (contextBefore.endsWith('[') && contextAfter.startsWith(']')) {
      replaceStart = refStart - 1
      replaceEnd = refEnd + 1
    }

    const citationLink = `[${number}](#ref-${ref.type}-${ref.id})`
    processedText = processedText.substring(0, replaceStart) + citationLink + processedText.substring(replaceEnd)
  }

  let combined = true
  while (combined) {
    const before = processedText
    processedText = processedText.replace(/\[(\d+)\]\(#ref-[^)]+\)\s+\[(\d+)\]\(#ref-[^)]+\)/g, (match, num1, num2) => {
      const nums = [parseInt(num1), parseInt(num2)].sort((a, b) => a - b)
      const uniqueNums = Array.from(new Set(nums))
      return `[${uniqueNums.join(', ')}](#ref-combined)`
    })
    processedText = processedText.replace(/\[(\d+)\]\(#ref-[^)]+\)\s*,\s*\[(\d+)\]\(#ref-[^)]+\)/g, (match, num1, num2) => {
      const nums = [parseInt(num1), parseInt(num2)].sort((a, b) => a - b)
      const uniqueNums = Array.from(new Set(nums))
      return `[${uniqueNums.join(', ')}](#ref-combined)`
    })
    processedText = processedText.replace(/\[([\d,\s]+)\]\(#ref-combined\)\s+\[(\d+)\]\(#ref-[^)]+\)/g, (match, numsStr, num2) => {
      const existingNums = numsStr.split(',').map((n: string) => parseInt(n.trim())).filter((n: number) => !isNaN(n))
      const nums = [...existingNums, parseInt(num2)].sort((a, b) => a - b)
      const uniqueNums = Array.from(new Set(nums))
      return `[${uniqueNums.join(', ')}](#ref-combined)`
    })
    processedText = processedText.replace(/\[(\d+)\]\(#ref-[^)]+\)\s+\[([\d,\s]+)\]\(#ref-combined\)/g, (match, num1, numsStr) => {
      const existingNums = numsStr.split(',').map((n: string) => parseInt(n.trim())).filter((n: number) => !isNaN(n))
      const nums = [parseInt(num1), ...existingNums].sort((a, b) => a - b)
      const uniqueNums = Array.from(new Set(nums))
      return `[${uniqueNums.join(', ')}](#ref-combined)`
    })
    processedText = processedText.replace(/\[([\d,\s]+)\]\(#ref-combined\)\s*,\s*\[(\d+)\]\(#ref-[^)]+\)/g, (match, numsStr, num2) => {
      const existingNums = numsStr.split(',').map((n: string) => parseInt(n.trim())).filter((n: number) => !isNaN(n))
      const nums = [...existingNums, parseInt(num2)].sort((a, b) => a - b)
      const uniqueNums = Array.from(new Set(nums))
      return `[${uniqueNums.join(', ')}](#ref-combined)`
    })
    processedText = processedText.replace(/\[(\d+)\]\(#ref-[^)]+\)\s*,\s*\[([\d,\s]+)\]\(#ref-combined\)/g, (match, num1, numsStr) => {
      const existingNums = numsStr.split(',').map((n: string) => parseInt(n.trim())).filter((n: number) => !isNaN(n))
      const nums = [parseInt(num1), ...existingNums].sort((a, b) => a - b)
      const uniqueNums = Array.from(new Set(nums))
      return `[${uniqueNums.join(', ')}](#ref-combined)`
    })
    processedText = processedText.replace(/\[\[([\d,\s]+)\]\]\(#ref-combined\)/g, (match, numsStr) => {
      return `[${numsStr}](#ref-combined)`
    })
    processedText = processedText.replace(/\[\[(\d+)\]\(#ref-[^)]+\)/g, (match, num) => {
      return `[${num}](#ref-combined)`
    })
    processedText = processedText.replace(/\[(\d+)\]\]\(#ref-[^)]+\)/g, (match, num) => {
      return `[${num}](#ref-combined)`
    })
    combined = before !== processedText
  }

  processedText = processedText.replace(/\[source:[a-zA-Z0-9_]+\]/g, '')
  processedText = processedText.replace(/\[source:[a-zA-Z0-9_]+/g, '')

  const validNumbers = new Set(Array.from(referenceMap.values()).map(ref => ref.number))
  processedText = processedText.replace(/\[(\d+)\]\(#ref-[^)]+\)/g, (match, num) => {
    if (validNumbers.has(parseInt(num))) {
      return match
    }
    return ''
  })
  processedText = processedText.replace(/\[([\d,\s]+)\]\(#ref-combined\)/g, (match, numsStr) => {
    const nums = numsStr.split(',').map((n: string) => parseInt(n.trim())).filter((n: number) => !isNaN(n) && validNumbers.has(n))
    if (nums.length === 0) {
      return ''
    }
    const uniqueNums = Array.from(new Set(nums)) as number[]
    uniqueNums.sort((a, b) => a - b)
    return `[${uniqueNums.join(', ')}](#ref-combined)`
  })

  processedText = processedText.replace(/\[(?![0-9,\s]+\]\(#ref-)/g, '')
  processedText = processedText.replace(/([^\[])(\d+[,\s]*\d*)\]/g, (match, before, nums) => {
    if (before && !before.match(/[\[\(]/)) {
      return `${before}[${nums}]`
    }
    return match
  })
  processedText = processedText.replace(/^(\d+[,\s]*\d*)\]/gm, '[$1]')
  processedText = processedText.replace(/(\s+)(\d+[,\s]*\d*)\]/g, (match, space, nums) => {
    return `${space}[${nums}]`
  })

  const refListItems: Array<{ number: number; title: string; type: string; id: string }> = []
  for (const [, refData] of referenceMap) {
    const key = `${refData.type}:${refData.id}`
    const title = referenceTitles.get(key)
    if (title && title !== key) {
      refListItems.push({ number: refData.number, title, type: refData.type, id: refData.id })
    }
  }

  return (
    <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none break-words prose-headings:font-semibold prose-a:text-blue-600 prose-a:break-all prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-p:mb-4 prose-p:leading-7 prose-li:mb-2">
      <ReactMarkdown
        components={{
          a: LinkComponent,
          p: ({ children, ...props }) => {
            const getTextContent = (node: React.ReactNode): string => {
              if (typeof node === 'string') return node
              if (typeof node === 'number') return String(node)
              if (Array.isArray(node)) return node.map(getTextContent).join('')
              if (node && typeof node === 'object' && 'props' in node) {
                const nodeWithProps = node as { props?: { children?: React.ReactNode } }
                return getTextContent(nodeWithProps.props?.children || '')
              }
              return ''
            }
            const text = getTextContent(children)
            const fullText = text.trim()
            if (fullText.startsWith('💡 Rekomendasi Gaya Hidup Sehat:')) {
              return <p className="text-lg font-semibold mb-5" {...props}>{children}</p>
            }
            if (fullText.startsWith('ℹ️ Catatan:')) {
              return <p className="mt-5 mb-1" {...props}>{children}</p>
            }
            return <p className="mb-1" {...props}>{children}</p>
          },
          h1: ({ children }) => <h1 className="mb-4 mt-6">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-3 mt-5">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-3 mt-4">{children}</h3>,
          h4: ({ children }) => <h4 className="mb-2 mt-4">{children}</h4>,
          h5: ({ children }) => <h5 className="mb-2 mt-3">{children}</h5>,
          h6: ({ children }) => <h6 className="mb-2 mt-3">{children}</h6>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          ul: ({ children }) => <ul className="mb-4 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="mb-4 space-y-1">{children}</ol>,
        }}
      >
        {processedText}
      </ReactMarkdown>
      {refListItems.length > 0 && (
        <div className="mt-4 pt-3">
          <p className="text-sm font-medium mb-2">Referensi:</p>
          <ul className="list-none space-y-1 text-sm">
            {refListItems.map((item) => (
              <li key={`${item.type}:${item.id}`}>
                <button
                  onClick={() => onReferenceClick(item.type, item.id)}
                  className="text-primary hover:underline cursor-pointer text-left text-sm"
                >
                  [{item.number}] {item.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
        {evaluationMetrics && hasAnyReferences && (
          <div className="mt-3 not-prose">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Context: {(evaluationMetrics.context_relevance * 100).toFixed(0)}%
              </span>
              <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Answer: {(evaluationMetrics.answer_relevance * 100).toFixed(0)}%
              </span>
              <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                Ground: {(evaluationMetrics.groundedness * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}
    </div>
  )
}

