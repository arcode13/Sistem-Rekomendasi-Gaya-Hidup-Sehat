'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Bot, User, Send, Loader2, FileText, Clock } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import {
  SourceChatMessage,
  SourceChatContextIndicator,
  BaseChatSession
} from '@/lib/types/api'
import { ModelSelector } from './ModelSelector'
import { ContextIndicator } from '@/components/common/ContextIndicator'
import { SessionManager } from '@/components/source/SessionManager'
import { MessageActions } from '@/components/source/MessageActions'
import { createCompactReferenceLinkComponent, parseSourceReferences } from '@/lib/utils/source-references'
import { useModalManager } from '@/lib/hooks/use-modal-manager'
import { toast } from 'sonner'
import { sourcesApi } from '@/lib/api/sources'

interface NotebookContextStats {
  sourcesFull: number
  tokenCount?: number
  charCount?: number
}

interface ChatPanelProps {
  messages: SourceChatMessage[]
  isStreaming: boolean
  contextIndicators: SourceChatContextIndicator | null
  onSendMessage: (message: string, modelOverride?: string) => void
  modelOverride?: string
  onModelChange?: (model?: string) => void
  // Session management props
  sessions?: BaseChatSession[]
  currentSessionId?: string | null
  onCreateSession?: (title: string) => void
  onSelectSession?: (sessionId: string) => void
  onDeleteSession?: (sessionId: string) => void
  onUpdateSession?: (sessionId: string, title: string) => void
  loadingSessions?: boolean
  // Generic props for reusability
  title?: string
  contextType?: 'source' | 'notebook'
  // Notebook context stats (for notebook chat)
  notebookContextStats?: NotebookContextStats
  notebookId?: string
}

export function ChatPanel({
  messages,
  isStreaming,
  contextIndicators,
  onSendMessage,
  modelOverride,
  onModelChange,
  sessions = [],
  currentSessionId,
  onCreateSession,
  onSelectSession,
  onDeleteSession,
  onUpdateSession,
  loadingSessions = false,
  title = 'Chat dengan Sumber',
  contextType = 'source',
  notebookContextStats,
  notebookId
}: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [sessionManagerOpen, setSessionManagerOpen] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { openModal } = useModalManager()

  const handleReferenceClick = (type: string, id: string) => {
    const modalType = type as 'source'

    try {
      openModal(modalType, id)
    } catch {
      toast.error('Sumber ini tidak dapat ditemukan')
    }
  }

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (input.trim() && !isStreaming) {
      onSendMessage(input.trim(), modelOverride)
      setInput('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Detect platform for correct modifier key
    const isMac = typeof navigator !== 'undefined' && navigator.userAgent.toUpperCase().indexOf('MAC') >= 0
    const isModifierPressed = isMac ? e.metaKey : e.ctrlKey

    if (e.key === 'Enter' && isModifierPressed) {
      e.preventDefault()
      handleSend()
    }
  }

  // Detect platform for placeholder text
  const isMac = typeof navigator !== 'undefined' && navigator.userAgent.toUpperCase().indexOf('MAC') >= 0
  const keyHint = isMac ? '⌘+Enter' : 'Ctrl+Enter'

  return (
    <>
    <Card className="flex flex-col h-full flex-1 overflow-hidden">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            {title}
          </CardTitle>
          {onSelectSession && onCreateSession && onDeleteSession && (
            <Dialog open={sessionManagerOpen} onOpenChange={setSessionManagerOpen}>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={() => setSessionManagerOpen(true)}
                disabled={loadingSessions}
              >
                <Clock className="h-4 w-4" />
                <span className="text-xs">Sesi</span>
              </Button>
              <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden">
                <DialogTitle className="sr-only">Sesi Chat</DialogTitle>
                <SessionManager
                  sessions={sessions}
                  currentSessionId={currentSessionId ?? null}
                  onCreateSession={(title) => onCreateSession?.(title)}
                  onSelectSession={(sessionId) => {
                    onSelectSession(sessionId)
                    setSessionManagerOpen(false)
                  }}
                  onUpdateSession={(sessionId, title) => onUpdateSession?.(sessionId, title)}
                  onDeleteSession={(sessionId) => onDeleteSession?.(sessionId)}
                  loadingSessions={loadingSessions}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 p-0">
        <ScrollArea className="flex-1 min-h-0 px-4" ref={scrollAreaRef}>
          <div className="space-y-4 py-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">
                  Mulai percakapan tentang {contextType === 'source' ? 'sumber' : 'buku catatan'} ini
                </p>
                <p className="text-xs mt-2">Ajukan pertanyaan untuk memahami konten dengan lebih baik</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.type === 'human' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.type === 'ai' && (
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4" />
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col gap-2 max-w-[80%]">
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        message.type === 'human'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {message.type === 'ai' ? (
                        <AIMessageContent
                          content={message.content}
                          processedContent={'processed_content' in message ? (message.processed_content as string | undefined) : undefined}
                          references={'references' in message ? (message.references as Array<{ number: number; type: string; id: string; title: string }> | undefined) : undefined}
                          onReferenceClick={handleReferenceClick}
                        />
                      ) : (
                        <p className="text-sm break-words overflow-wrap-anywhere">{message.content}</p>
                      )}
                    </div>
                    {message.type === 'ai' && (
                      <MessageActions
                        content={message.content}
                        notebookId={notebookId}
                      />
                    )}
                  </div>
                  {message.type === 'human' && (
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            {isStreaming && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                </div>
                <div className="rounded-lg px-4 py-2 bg-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Context Indicators */}
        {contextIndicators && (
          <div className="border-t px-4 py-2">
            <div className="flex flex-wrap gap-2 text-xs">
              {contextIndicators.sources?.length > 0 && (
                <Badge variant="outline" className="gap-1">
                  <FileText className="h-3 w-3" />
                  {contextIndicators.sources.length} sumber
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Notebook Context Indicator */}
        {notebookContextStats && (
          <ContextIndicator
            sourcesFull={notebookContextStats.sourcesFull}
            tokenCount={notebookContextStats.tokenCount}
            charCount={notebookContextStats.charCount}
          />
        )}

        {/* Input Area */}
        <div className="flex-shrink-0 p-4 space-y-3 border-t">
          {/* Model selector */}
          {onModelChange && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Model</span>
              <ModelSelector
                currentModel={modelOverride}
                onModelChange={onModelChange}
                disabled={isStreaming}
              />
            </div>
          )}

          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ajukan pertanyaan tentang ${contextType === 'source' ? 'sumber' : 'buku catatan'} ini... (${keyHint} untuk mengirim)`}
              disabled={isStreaming}
              className="flex-1 min-h-[40px] max-h-[100px] resize-none py-2 px-3"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              size="icon"
              className="h-[40px] w-[40px] flex-shrink-0"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    </>
  )
}

function AIMessageContent({
  content,
  processedContent,
  references,
  onReferenceClick
}: {
  content: string
  processedContent?: string
  references?: Array<{ number: number; type: string; id: string; title: string }>
  onReferenceClick: (type: string, id: string) => void
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

  if (processedContent && references && references.length > 0) {
    return (
      <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none break-words prose-headings:font-semibold prose-a:text-blue-600 prose-a:break-all prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-p:mb-4 prose-p:leading-7 prose-li:mb-2">
        <ReactMarkdown
          components={{
            a: LinkComponent,
            p: ({ children }) => <p className="mb-1">{children}</p>,
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
          {processedContent}
        </ReactMarkdown>
        <div className="mt-4 pt-3">
          <p className="text-sm font-medium mb-2">Referensi:</p>
          <ul className="list-none space-y-1 text-sm">
            {references.map((item) => (
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
      </div>
    )
  }

  const parsedRefs = parseSourceReferences(content)
  
  if (parsedRefs.length === 0) {
    return (
      <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none break-words prose-headings:font-semibold prose-a:text-blue-600 prose-a:break-all prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-p:mb-4 prose-p:leading-7 prose-li:mb-2">
        <ReactMarkdown
          components={{
            a: LinkComponent,
            p: ({ children }) => <p className="mb-1">{children}</p>,
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
          p: ({ children }) => <p className="mb-1">{children}</p>,
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
    </div>
  )
}
