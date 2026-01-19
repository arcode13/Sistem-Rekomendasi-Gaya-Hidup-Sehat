'use client'

import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { ResultCard } from './ResultCard'
import { ReferenceModal } from './ReferenceModal'
import { healthApi, type HealthChatSessionItem } from '@/lib/api/health'
import { sourcesApi } from '@/lib/api/sources'
import { createCompactReferenceLinkComponent, parseSourceReferences } from '@/lib/utils/source-references'
const normalizeReferences = (text: string): string => {
  // Convert bracketed IDs like [abc123] to [source:abc123] so parser can link them
  return text.replace(/\[([a-zA-Z0-9_]{6,})\]/g, '[source:$1]')
}
import type { PredictionResult, ChatMessage, SpeechRecognition, SpeechRecognitionEvent, SpeechRecognitionErrorEvent } from '../types'


interface ChatSectionProps {
  riskLevel: string
  patientData: PredictionResult | null
  sessionId?: string | null
  examinationId?: string
  onNewAnalysis: () => void
  onShowToast: (message: string, type?: 'success' | 'error') => void
  currentUser?: { id: string } | null
}

export function ChatSection({ riskLevel, patientData, sessionId: propSessionId, examinationId, onShowToast }: ChatSectionProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(propSessionId || null)
  const [referenceModal, setReferenceModal] = useState<{ type: 'source', id: string } | null>(null)
  const [referenceTitles, setReferenceTitles] = useState<Map<string, string>>(new Map())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [sessionToDelete, setSessionToDelete] = useState<HealthChatSessionItem | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const isInitialLoadRef = useRef(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition
        recognitionRef.current = new SpeechRecognitionClass()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = false
        recognitionRef.current.lang = 'id-ID'
        
        recognitionRef.current.onstart = () => {
          setIsListening(true)
        }
        
        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript
          if (textareaRef.current) {
            textareaRef.current.value = transcript
            const inputEvent = new Event('input', { bubbles: true })
            textareaRef.current.dispatchEvent(inputEvent)
          }
        }
        
        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error)
          setIsListening(false)
        }
        
        recognitionRef.current.onend = () => {
          setIsListening(false)
        }
      }
    }
  }, [])

  const handleVoiceClick = () => {
    if (!recognitionRef.current) return
    
    if (isListening) {
      try {
        recognitionRef.current.stop()
      } catch (error) {
        console.error('Error stopping recognition:', error)
      }
    } else {
      try {
        recognitionRef.current.start()
      } catch (error) {
        console.error('Error starting recognition:', error)
      }
    }
  }

  useEffect(() => {
    if (propSessionId) {
      setSessionId(propSessionId)
    }
  }, [propSessionId])

  useEffect(() => {
    const loadSessionData = async () => {
      if (sessionId && messages.length === 0) {
        try {
          isInitialLoadRef.current = true
          const session = await healthApi.getSession(sessionId)
          
          if (session.messages && session.messages.length > 0) {
            const loadedMessages: ChatMessage[] = []
            
            session.messages.forEach((msg) => {
              if (msg.type === 'result') {
                const resultContent = msg.content
                if (resultContent && typeof resultContent === 'object' && resultContent !== null) {
                  const resultData = resultContent as Record<string, unknown>
                  const riskLevel = resultData.risk_level as string
                  const validRiskLevel = (riskLevel === 'low' || riskLevel === 'medium' || riskLevel === 'high') ? riskLevel : 'low'
                  const predictionResult: PredictionResult = {
                    risk_level: validRiskLevel as 'low' | 'medium' | 'high',
                    risk_label: (resultData.risk_label as string) || 'Risiko Rendah',
                    patient_info: (resultData.patient_info as PredictionResult['patient_info']) || {
                      age: 0,
                      gender: 1,
                      blood_pressure: '0/0',
                      bmi: 0,
                      bmi_category: 'Normal',
                      bp_category: 'Normal'
                    },
                    recommendation: (resultData.recommendation as string) || '',
                    prob_disease: resultData.prob_disease as number | undefined,
                    examination_id: resultData.examination_id as string | undefined,
                    recommendation_processed_content: resultData.recommendation_processed_content as string | undefined,
                    recommendation_references: resultData.recommendation_references as PredictionResult['recommendation_references']
                  }
                  loadedMessages.push({
                    type: 'result',
                    content: predictionResult
                  })
                }
              } else if (msg.type === 'bot') {
                const contentStrRaw = typeof msg.content === 'string' ? msg.content : String(msg.content)
                const contentStr = normalizeReferences(contentStrRaw)
                
                const msgWithMetrics = msg as { evaluation_metrics?: { context_relevance?: number; answer_relevance?: number; groundedness?: number } }
                const evaluationMetrics = msgWithMetrics.evaluation_metrics
                let meetsThreshold: boolean | undefined = undefined
                let thresholdWarning: string | undefined = undefined
                
                if (evaluationMetrics) {
                  const contextRelevance = evaluationMetrics.context_relevance
                  const answerRelevance = evaluationMetrics.answer_relevance
                  const groundedness = evaluationMetrics.groundedness
                  
                  const failedMetrics: string[] = []
                  
                  if (contextRelevance !== undefined && contextRelevance < 0.70) {
                    failedMetrics.push(`Context Relevance (${(contextRelevance * 100).toFixed(0)}%)`)
                  }
                  if (answerRelevance !== undefined && answerRelevance < 0.80) {
                    failedMetrics.push(`Answer Relevance (${(answerRelevance * 100).toFixed(0)}%)`)
                  }
                  if (groundedness !== undefined && groundedness < 0.70) {
                    failedMetrics.push(`Groundedness (${(groundedness * 100).toFixed(0)}%)`)
                  }
                  
                  if (failedMetrics.length > 0) {
                    meetsThreshold = false
                    thresholdWarning = (
                      "**⚠️ Peringatan Penting:**\n\n" +
                      "Maaf, kualitas saran kesehatan dari AI saat ini belum cukup baik untuk diberikan kepada Anda. " +
                      "Sistem kami mendeteksi bahwa saran yang dihasilkan mungkin kurang akurat atau kurang lengkap.\n\n" +
                      "**Apa yang harus Anda lakukan?**\n\n" +
                      "Untuk mendapatkan saran kesehatan yang lebih tepat dan aman, sangat disarankan untuk:\n\n" +
                      "- Berkonsultasi langsung dengan dokter atau tenaga kesehatan profesional\n" +
                      "- Mendapatkan pemeriksaan kesehatan secara langsung\n" +
                      "- Meminta saran yang disesuaikan dengan kondisi kesehatan Anda"
                    )
                  } else {
                    meetsThreshold = true
                  }
                }
                
                if (meetsThreshold === false && thresholdWarning) {
                  loadedMessages.push({
                    type: 'bot',
                    content: thresholdWarning,
                    processed_content: undefined,
                    references: undefined,
                    evaluation_metrics: evaluationMetrics,
                    meets_threshold: false,
                    threshold_warning: thresholdWarning
                  })
                } else {
                  const botMessage: ChatMessage = {
                    type: 'bot',
                    content: contentStr,
                    evaluation_metrics: evaluationMetrics,
                    meets_threshold: meetsThreshold,
                    threshold_warning: thresholdWarning
                  }
                  
                  if (msg.processed_content) {
                    let processedContentStr = typeof msg.processed_content === 'string' ? msg.processed_content : String(msg.processed_content)
                    processedContentStr = normalizeReferences(processedContentStr)
                    if (!processedContentStr.includes('💡 Rekomendasi Gaya Hidup Sehat:') && !processedContentStr.includes('💡 Rekomendasi Gaya Hidup:')) {
                      processedContentStr = `**Saran AI**\n\n**💡 Rekomendasi Gaya Hidup Sehat:**\n\n${processedContentStr}\n\n**ℹ️ Catatan:** Hasil ini bersifat edukatif dan tidak menggantikan konsultasi medis profesional.`
                    } else if (!processedContentStr.includes('**Saran AI**')) {
                      processedContentStr = `**Saran AI**\n\n${processedContentStr}`
                    }
                    botMessage.processed_content = processedContentStr
                  } else {
                    if ((contentStr.includes('Rekomendasi') || contentStr.includes('rekomendasi')) && !contentStr.includes('💡 Rekomendasi Gaya Hidup Sehat:') && !contentStr.includes('💡 Rekomendasi Gaya Hidup:')) {
                      const updatedContent = `**Saran AI**\n\n**💡 Rekomendasi Gaya Hidup Sehat:**\n\n${contentStr}`
                      if (!updatedContent.includes('**ℹ️ Catatan:**')) {
                        botMessage.content = `${updatedContent}\n\n**ℹ️ Catatan:** Hasil ini bersifat edukatif dan tidak menggantikan konsultasi medis profesional.`
                      } else {
                        botMessage.content = updatedContent
                      }
                    } else if ((contentStr.includes('Rekomendasi') || contentStr.includes('rekomendasi') || contentStr.includes('💡 Rekomendasi')) && !contentStr.includes('**Saran AI**')) {
                      botMessage.content = `**Saran AI**\n\n${contentStr}`
                    }
                  }
                  if (msg.references && Array.isArray(msg.references)) {
                    botMessage.references = msg.references.map((ref) => ({
                      number: (ref as { number?: number }).number || 0,
                      type: ((ref as { type?: string }).type || 'source') as 'source',
                      id: (ref as { id?: string }).id || '',
                      title: (ref as { title?: string }).title || ''
                    }))
                  }
                  loadedMessages.push(botMessage)
                }
              } else if (msg.type === 'user') {
                loadedMessages.push({
                  type: 'user',
                  content: typeof msg.content === 'string' ? msg.content : String(msg.content)
                })
              }
            })
            
            setMessages(loadedMessages)
          }
        } catch (error) {
          console.error('Failed to load session', error)
          onShowToast('Gagal memuat sesi', 'error')
        }
      }
    }
    
    loadSessionData()
  }, [sessionId, messages.length, onShowToast])

  useEffect(() => {
    if (patientData && messages.length === 0 && !sessionId) {
      isInitialLoadRef.current = true
      
      const meetsThreshold = patientData.recommendation_meets_threshold
      const thresholdWarning = patientData.recommendation_threshold_warning
      
      const messagesToSet: ChatMessage[] = [
        {
          type: 'result',
          content: patientData
        }
      ]
      
      if (meetsThreshold === false && thresholdWarning) {
        messagesToSet.push({
          type: 'bot',
          content: thresholdWarning,
          processed_content: undefined,
          references: undefined
        })
      } else {
        const recommendationRaw = patientData.recommendation || ''
        const recommendation = normalizeReferences(recommendationRaw)
        const recommendationText = recommendation 
          ? `**Saran AI**\n\n**💡 Rekomendasi Gaya Hidup Sehat:**\n\n${recommendation}\n\n**ℹ️ Catatan:** Hasil ini bersifat edukatif dan tidak menggantikan konsultasi medis profesional.`
          : `**ℹ️ Catatan:** Hasil ini bersifat edukatif dan tidak menggantikan konsultasi medis profesional.`
        
        let processedContent: string | undefined
        let references: Array<{ number: number; type: 'source'; id: string; title: string }> | undefined
        
        if (patientData.recommendation_processed_content && patientData.recommendation_references && patientData.recommendation_references.length > 0) {
          const recommendationProcessed = normalizeReferences(patientData.recommendation_processed_content)
          processedContent = `**Saran AI**\n\n**💡 Rekomendasi Gaya Hidup Sehat:**\n\n${recommendationProcessed}\n\n**ℹ️ Catatan:** Hasil ini bersifat edukatif dan tidak menggantikan konsultasi medis profesional.`
          references = patientData.recommendation_references.map(ref => ({
            number: ref.number,
            type: ref.type as 'source',
            id: ref.id,
            title: ref.title
          }))
        }
        
        messagesToSet.push({
          type: 'bot',
          content: recommendationText,
          processed_content: processedContent,
          references: references
        })
      }
      
      setMessages(messagesToSet)
    }
  }, [patientData, messages.length, sessionId])

  useEffect(() => {
    if (messages.length === 0) return

    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false
      return
    }

    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const fetchReferenceTitles = async () => {
      const allReferences = new Set<string>()
      
      messages.forEach(msg => {
        if (msg.type === 'bot' && typeof msg.content === 'string') {
          const references = parseSourceReferences(msg.content)
          references.forEach(ref => {
            const key = `${ref.type}:${ref.id}`
            allReferences.add(key)
          })
        }
      })
      
      const newTitles = new Map<string, string>()
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
          } catch (error) {
            console.error('Failed to fetch title for', key, error)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages])

  useEffect(() => {
    const fetchReferenceTitles = async () => {
      const newTitles = new Map<string, string>()
      const allReferences = new Set<string>()
      
      messages.forEach(msg => {
        if (msg.type === 'bot' && typeof msg.content === 'string') {
          const references = parseSourceReferences(msg.content)
          references.forEach(ref => {
            const key = `${ref.type}:${ref.id}`
            allReferences.add(key)
          })
        }
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
            
            newTitles.set(key, title)
          } catch (error) {
            console.error('Failed to fetch title for', key, error)
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
  }, [messages, referenceTitles])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const checkScroll = () => {
      const hasScroll = container.scrollHeight > container.clientHeight
      if (hasScroll) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
        setShowScrollBtn(!isNearBottom)
      } else {
        setShowScrollBtn(false)
      }
    }

    container.addEventListener('scroll', checkScroll)
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        checkScroll()
      })
    })

    return () => container.removeEventListener('scroll', checkScroll)
  }, [messages])

  useEffect(() => {
    if (textareaRef.current) {
      const sendBtn = textareaRef.current.parentElement?.querySelector('.btn-send') as HTMLButtonElement
      if (sendBtn) {
        if (isSending) {
          sendBtn.classList.add('show')
        }
      }
    }
  }, [isSending])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (message: string) => {
    setMessages(prev => [...prev, { type: 'user', content: message }])
    setIsSending(true)

    try {
      const patientDataForChat = patientData ? {
        age: patientData.patient_info.age,
        systolic_bp: parseInt(patientData.patient_info.blood_pressure.split('/')[0]),
        diastolic_bp: parseInt(patientData.patient_info.blood_pressure.split('/')[1]),
        bmi: patientData.patient_info.bmi,
        prob_disease: patientData.prob_disease,
      } : undefined

      const result = await healthApi.chat({
        message: message,
        risk_level: riskLevel,
        patient_data: patientDataForChat,
        examination_id: examinationId || patientData?.examination_id,
        session_id: sessionId || undefined,
      })

      if (result.success) {
        if (result.meets_threshold === false && result.threshold_warning) {
          setMessages(prev => [...prev, { 
            type: 'bot', 
            content: result.threshold_warning || '',
            processed_content: undefined,
            references: undefined
          }])
        } else {
          setMessages(prev => [...prev, { 
            type: 'bot', 
            content: result.answer,
            processed_content: result.processed_content,
            references: result.references
          }])
          
          if (isSensitiveQuestion(message, result.answer)) {
            setTimeout(() => {
              setMessages(prev => [...prev, { type: 'consultation', content: null, consultation_type: 'chat' }])
            }, 500)
          }
        }
        
        if (result.session_id) {
          setSessionId(result.session_id)
        }
      } else {
        const errorMessage = result.error || 'Maaf, terjadi kesalahan. Silakan coba lagi.'
        setMessages(prev => [...prev, { type: 'bot', content: errorMessage }])
        onShowToast(errorMessage)
      }
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, { type: 'bot', content: 'Maaf, gagal terhubung ke server. Silakan coba lagi.' }])
      onShowToast('Maaf, gagal terhubung ke server. Silakan coba lagi.')
    } finally {
      setIsSending(false)
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
        }
      }, 100)
    }
  }

  const isSensitiveQuestion = (question: string, answer: string): boolean => {
    const sensitiveKeywords = [
      'resep obat', 'dosis', 'tablet', 'kapsul', 'suntik', 'injeksi', 'medikasi',
      'obat untuk', 'minum obat', 'obat apa', 'obat yang', 'resep', 'resepkan',
      'beri obat', 'kasih obat', 'obatnya', 'obatnya apa', 'obat apa yang',
      'antibiotik', 'vitamin', 'suplemen', 'obat generik', 'obat paten',
      'diagnosis', 'terapi medis', 'pengobatan spesifik', 'operasi', 'rawat inap',
      'rawat jalan', 'tindakan medis', 'prosedur medis', 'pembedahan',
      'saya sakit', 'saya terkena', 'penyakit saya', 'saya punya penyakit',
      'saya mengidap', 'saya menderita', 'penyakit apa', 'sakit apa',
      'chat dokter', 'konsultasi dokter', 'dokter', 'dokter spesialis',
      'perlu dokter', 'butuh dokter', 'harus ke dokter', 'perlu konsultasi',
      'rumah sakit', 'rs terdekat', 'rs di', 'klinik', 'klinik terdekat',
      'puskesmas', 'tempat berobat', 'dimana berobat', 'ke dokter',
      'cek dokter', 'periksa dokter',
      'penanganan dokter', 'penanganan medis', 'perawatan medis',
      'apa penyakit', 'penyakit apa', 'sakit apa', 'gejala', 'tanda-tanda',
      'penyebab', 'mengapa sakit', 'kenapa sakit', 'cara mengobati',
      'cara menyembuhkan', 'cara mengatasi', 'penyembuhan', 'pengobatan'
    ]
    
    const questionLower = question.toLowerCase()
    const answerLower = answer.toLowerCase()
    
    const hasSensitiveKeyword = sensitiveKeywords.some(keyword =>
      questionLower.includes(keyword) || answerLower.includes(keyword)
    )
    
    const hasExplicitRequest = 
      (questionLower.includes('resep') && questionLower.includes('obat')) ||
      (questionLower.includes('dosis') && (questionLower.includes('obat') || questionLower.includes('minum'))) ||
      (questionLower.includes('diagnosis') && (questionLower.includes('saya') || questionLower.includes('sakit') || questionLower.includes('penyakit'))) ||
      (questionLower.includes('obat') && (questionLower.includes('apa') || questionLower.includes('yang'))) ||
      (questionLower.includes('chat dokter') || questionLower.includes('konsultasi dokter')) ||
      (questionLower.includes('perlu dokter') || questionLower.includes('butuh dokter') || questionLower.includes('harus ke dokter'))
    
    const answerRequiresDoctor = 
      answerLower.includes('konsultasi dokter') ||
      answerLower.includes('perlu dokter') ||
      answerLower.includes('harus ke dokter') ||
      answerLower.includes('penanganan dokter') ||
      answerLower.includes('resep obat') ||
      answerLower.includes('diagnosis')
    
    return hasSensitiveKeyword || hasExplicitRequest || answerRequiresDoctor
  }


  return (
    <div className="chat-section active">
      <div className="chat-container">
          <div className="chat-messages" ref={messagesContainerRef}>
          {messages.map((msg, index) => {
            if (msg.type === 'result' && typeof msg.content !== 'string' && msg.content !== null) {
              return <ResultCard key={index} data={msg.content} />
            } else if (msg.type === 'consultation') {
              return <ConsultationPrompt key={index} />
            } else if (msg.type === 'user' && typeof msg.content === 'string') {
              return (
                <div key={index} className="chat-message user">
                  <div className="chat-message-content">
                    <div className="chat-bubble">{msg.content}</div>
                    <CopyButton content={msg.content} isUser={true} />
                  </div>
                </div>
              )
            } else if (msg.type === 'bot' && typeof msg.content === 'string') {
              const LinkComponent = createCompactReferenceLinkComponent((type, id) => {
                setReferenceModal({ type, id })
              })
              
              if (msg.processed_content && msg.references && msg.references.length > 0) {
                return (
                  <div key={index} className="chat-message bot">
                    <div className="chat-bubble">
                      <ReactMarkdown
                        components={{
                          a: LinkComponent,
                          p: ({ children }) => {
                            const extractText = (node: React.ReactNode): string => {
                              if (typeof node === 'string') return node
                              if (typeof node === 'number') return String(node)
                              if (Array.isArray(node)) return node.map(extractText).join('')
                              if (node && typeof node === 'object' && node !== null && 'props' in node) {
                                const props = (node as { props?: { children?: React.ReactNode } }).props
                                if (props?.children) {
                                  return extractText(props.children)
                                }
                              }
                              return ''
                            }
                            const childrenText = extractText(children)
                            const hasCatatan = childrenText.includes('ℹ️') && childrenText.includes('Catatan') && childrenText.includes('Hasil ini bersifat edukatif')
                            if (hasCatatan) {
                              return <p className="recommendation-note recommendation-note-text mb-1">{children}</p>
                            }
                            return <p className="mb-1">{children}</p>
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
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        }}
                      >
                        {msg.processed_content}
                      </ReactMarkdown>
                    </div>
                    <div className="mt-4 mb-3">
                      <div className="font-semibold mb-2" style={{ color: 'oklch(14.1% .005 285.823)' }}>Referensi:</div>
                      {msg.references.map((item) => {
                        const displayTitle = item.title?.replace(/\.pdf$/i, '') || item.title
                        return (
                          <div key={`${item.type}:${item.id}`} className="mb-1">
                            <button
                              onClick={() => setReferenceModal({ type: item.type as 'source', id: item.id })}
                              className="text-primary hover:underline cursor-pointer inline font-medium text-left"
                              type="button"
                            >
                              [{item.number}] {displayTitle}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                    <CopyButton content={msg.content} isUser={false} />
                  </div>
                )
              }
              
              const references = parseSourceReferences(normalizeReferences(msg.content))
              
              if (references.length === 0) {
                return (
                  <div key={index} className="chat-message bot">
                    <div className="chat-bubble">
                      <ReactMarkdown
                        components={{
                          a: LinkComponent,
                          p: ({ children }) => {
                            const extractText = (node: React.ReactNode): string => {
                              if (typeof node === 'string') return node
                              if (typeof node === 'number') return String(node)
                              if (Array.isArray(node)) return node.map(extractText).join('')
                              if (node && typeof node === 'object' && node !== null && 'props' in node) {
                                const props = (node as { props?: { children?: React.ReactNode } }).props
                                if (props?.children) {
                                  return extractText(props.children)
                                }
                              }
                              return ''
                            }
                            const childrenText = extractText(children)
                            const hasCatatan = childrenText.includes('ℹ️') && childrenText.includes('Catatan') && childrenText.includes('Hasil ini bersifat edukatif')
                            if (hasCatatan) {
                              return <p className="recommendation-note recommendation-note-text mb-1">{children}</p>
                            }
                            return <p className="mb-1">{children}</p>
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
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                    <CopyButton content={msg.content} isUser={false} />
                  </div>
                )
              }
              
              const referenceMap = new Map<string, { number: number; type: 'source'; id: string }>()
              let nextNumber = 1
              
              for (const ref of references) {
                const key = `${ref.type}:${ref.id}`
                if (!referenceMap.has(key)) {
                  referenceMap.set(key, { number: nextNumber++, type: ref.type, id: ref.id })
                }
              }
              
              let processedText = msg.content
              processedText = processedText.replace(/\[\[(\d+)\]/g, '[$1]')
              processedText = processedText.replace(/\[(\d+)\]\]/g, '[$1]')
              const citationReplacements: Array<{ start: number; end: number; number: number; type: string; id: string }> = []
              
              for (let i = references.length - 1; i >= 0; i--) {
                const ref = references[i]
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
                
                citationReplacements.push({
                  start: replaceStart,
                  end: replaceStart + citationLink.length,
                  number: number,
                  type: ref.type,
                  id: ref.id
                })
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
              processedText = processedText.replace(/(\[\d+\]\(#ref-[^)]+\)),\s*(\[\d+\]\(#ref-[^)]+\))\]/g, (match, ref1, ref2) => {
                return `${ref1}, ${ref2}`
              })
              processedText = processedText.replace(/(\[\d+,\s*\d+\]\(#ref-[^)]+\))\]/g, (match, ref) => {
                return ref
              })
              processedText = processedText.replace(/(\[\d+\]),\s*(\[\d+\])\]/g, (match, ref1, ref2) => {
                return `${ref1}, ${ref2}`
              })
              processedText = processedText.replace(/(\[\d+,\s*\d+\])\]/g, (match, ref) => {
                return ref
              })
              processedText = processedText.replace(/\[(\d+)\],\s*\[(\d+)\]\]/g, (match, num1, num2) => {
                return `[${num1}], [${num2}]`
              })
              processedText = processedText.replace(/\]\]/g, ']')
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
              
              const refListItems: Array<{ number: number; title: string; type: string; id: string }> = []
              for (const [, refData] of referenceMap) {
                const key = `${refData.type}:${refData.id}`
                const title = referenceTitles.get(key)
                if (title && title !== key) {
                  refListItems.push({ number: refData.number, title, type: refData.type, id: refData.id })
                }
              }
              
              return (
                <div key={index} className="chat-message bot">
                  <div className="chat-bubble">
                    <ReactMarkdown
                      components={{
                        a: LinkComponent,
                        p: ({ children }) => {
                          const extractText = (node: React.ReactNode): string => {
                            if (typeof node === 'string') return node
                            if (typeof node === 'number') return String(node)
                            if (Array.isArray(node)) return node.map(extractText).join('')
                            if (node && typeof node === 'object' && node !== null && 'props' in node) {
                              const props = (node as { props?: { children?: React.ReactNode } }).props
                              if (props?.children) {
                                return extractText(props.children)
                              }
                            }
                            return ''
                          }
                          const childrenText = extractText(children)
                          const hasCatatan = childrenText.includes('ℹ️') && childrenText.includes('Catatan') && childrenText.includes('Hasil ini bersifat edukatif')
                          if (hasCatatan) {
                            return <p className="recommendation-note recommendation-note-text mb-1">{children}</p>
                          }
                          return <p className="mb-1">{children}</p>
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
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      }}
                    >
                      {processedText}
                    </ReactMarkdown>
                    {refListItems.length > 0 && (
                      <div className="mt-4 mb-3">
                        <div className="font-semibold mb-2">Referensi:</div>
                        {refListItems.map((item) => {
                          const titleWithoutExt = item.title.replace(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|md|epub|csv|zip|rar|jpg|jpeg|png|gif|bmp|svg|webp|ico|tiff|tif)$/i, '')
                          return (
                            <div key={`${item.type}:${item.id}`} className="mb-1">
                              <button
                                onClick={() => setReferenceModal({ type: item.type as 'source', id: item.id })}
                                className="text-primary hover:underline cursor-pointer inline font-medium text-left"
                                type="button"
                              >
                                [{item.number}] {titleWithoutExt}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <CopyButton content={msg.content} isUser={false} />
                </div>
              )
            }
            return null
          })}
            {isSending && (
            <div className="chat-message bot">
              <div className="chat-bubble chat-bubble-loading">
                <span className="loading-spinner-small"></span>
              </div>
            </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-container">
            {showScrollBtn && (
              <button
                className="scroll-to-bottom show"
                onClick={scrollToBottom}
                data-tooltip-top="Scroll ke bawah"
              >
                <i className="fa fa-arrow-down"></i>
              </button>
            )}
            <form className="chat-input-form" onSubmit={(e) => {
              e.preventDefault()
              const input = e.currentTarget.querySelector('textarea') as HTMLTextAreaElement
              if (input && input.value.trim() && !isSending) {
                handleSendMessage(input.value.trim())
                input.value = ''
                if (textareaRef.current) {
                  textareaRef.current.style.height = 'auto'
                  const sendBtn = input.parentElement?.querySelector('.btn-send') as HTMLButtonElement
                  const voiceBtn = input.parentElement?.querySelector('.btn-voice') as HTMLButtonElement
                  // Keep button visible when sending (it will show loading spinner)
                  if (sendBtn && !isSending) sendBtn.classList.remove('show')
                  if (voiceBtn && recognitionRef.current) voiceBtn.classList.add('hidden')
                }
              }
            }}>
              {recognitionRef.current && (
                <button
                  type="button"
                  className={`btn-voice ${isListening ? 'listening' : ''} ${isSending ? 'hidden' : ''}`}
                  onClick={handleVoiceClick}
                  data-tooltip-top="Tekan untuk berbicara"
                >
                  <i className={`fa ${isListening ? 'fa-stop' : 'fa-microphone'}`}></i>
                </button>
              )}
              <textarea
                ref={textareaRef}
                className="chat-input"
                placeholder={isListening ? 'Mendengarkan...' : isSending ? 'Memproses pesan...' : 'Ketik pertanyaan Anda di sini...'}
                rows={1}
                disabled={isSending}
                onInput={(e) => {
                  const textarea = e.currentTarget
                  textarea.style.height = 'auto'
                  const scrollHeight = textarea.scrollHeight
                  const maxHeight = parseFloat(getComputedStyle(textarea).maxHeight)
                  if (scrollHeight <= maxHeight) {
                    textarea.style.height = scrollHeight + 'px'
                    textarea.classList.remove('scrollable')
                  } else {
                    textarea.style.height = maxHeight + 'px'
                    textarea.classList.add('scrollable')
                  }
                  const hasText = textarea.value.trim().length > 0
                  const sendBtn = textarea.parentElement?.querySelector('.btn-send') as HTMLButtonElement
                  const voiceBtn = textarea.parentElement?.querySelector('.btn-voice') as HTMLButtonElement
                  if (sendBtn) {
                    if (isSending) {
                      sendBtn.classList.add('show')
                      if (voiceBtn) voiceBtn.classList.add('hidden')
                    } else if (hasText) {
                      sendBtn.classList.add('show')
                      if (voiceBtn) voiceBtn.classList.add('hidden')
                    } else {
                      sendBtn.classList.remove('show')
                      if (voiceBtn && recognitionRef.current) voiceBtn.classList.remove('hidden')
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    const form = e.currentTarget.closest('form')
                    if (form) {
                      form.requestSubmit()
                    }
                  }
                }}
              />
              <button
                type="submit"
                className={`btn-send ${isSending ? 'show' : ''}`}
                disabled={isSending}
              >
                {isSending ? <span className="btn-send-loading-spinner"></span> : 'Kirim'}
              </button>
            </form>
          </div>
          
          <div className="chat-disclaimer">
            Asisten AI dapat membuat kesalahan. Periksa informasi penting.
          </div>
        </div>

      {sessionToDelete && (
        <div className="modal-overlay active">
          <div className="delete-modal-content">
            <h3>Hapus rekomendasi?</h3>
            <div className="delete-modal-body">
              Ini akan menghapus <strong>{sessionToDelete.title || 'Rekomendasi'}</strong> dari riwayat Anda.
            </div>
            <div className="delete-modal-actions">
              <button
                type="button"
                className="btn-cancel-delete"
                onClick={() => setSessionToDelete(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-confirm-delete"
                onClick={async () => {
                  const target = sessionToDelete
                  setSessionToDelete(null)
                  if (!target) return
                  try {
                    await healthApi.deleteSession(target.id)
                    if (sessionId === target.id) {
                      setSessionId(null)
                      setMessages([])
                    }
                    onShowToast('Rekomendasi berhasil dihapus')
                  } catch (error) {
                    console.error('Failed to delete session', error)
                    onShowToast('Gagal menghapus rekomendasi')
                  }
                }}
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      <button className="btn-doctor" onClick={() => {
        const modal = document.getElementById('doctorModal')
        if (modal) modal.classList.add('active')
      }}>
        <i className="far fa-comment-alt"></i> Butuh Konsultasi Dokter?
      </button>

      <ReferenceModal
        isOpen={!!referenceModal}
        onClose={() => setReferenceModal(null)}
        type={referenceModal?.type || 'source'}
        id={referenceModal?.id || ''}
      />
    </div>
  )
}

function CopyButton({ content, isUser = false }: { content: string; isUser?: boolean }) {
  const [copySuccess, setCopySuccess] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null)

  const cleanContentForCopy = (text: string): string => {
    let cleaned = text
    
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1')
    cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1')
    cleaned = cleaned.replace(/\[source:([a-zA-Z0-9_]+)\]/g, '')
    cleaned = cleaned.replace(/\[(\d+(?:,\s*\d+)*)\]\(#ref-[^)]+\)/g, '')
    cleaned = cleaned.replace(/\[(\d+(?:,\s*\d+)*)\]\(#ref-combined\)/g, '')
    
    cleaned = cleaned.replace(/\s+([.,;:!?])/g, '$1')
    cleaned = cleaned.replace(/\s{2,}/g, ' ')
    
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
    cleaned = cleaned.replace(/(\*\*[^\*]+\*\*:)/g, '\n\n$1\n\n')
    cleaned = cleaned.replace(/(\d+\.\s+[^\n]+)/g, '\n\n$1\n')
    cleaned = cleaned.replace(/(\*\s+[^\n]+)/g, '\n$1')
    cleaned = cleaned.replace(/(Referensi:)/g, '\n\n$1\n')
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
    cleaned = cleaned.trim()
    
    return cleaned
  }

  const cleanContentForSpeech = (text: string): string => {
    let cleaned = text
    
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1')
    cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1')
    cleaned = cleaned.replace(/\[source:([a-zA-Z0-9_]+)\]/g, '')
    cleaned = cleaned.replace(/\[(\d+(?:,\s*\d+)*)\]\(#ref-[^)]+\)/g, '')
    cleaned = cleaned.replace(/\[(\d+(?:,\s*\d+)*)\]\(#ref-combined\)/g, '')
    cleaned = cleaned.replace(/\[(\d+(?:,\s*\d+)*)\]/g, '')
    cleaned = cleaned.replace(/\(#ref-[^)]+\)/g, '')
    cleaned = cleaned.replace(/\n/g, ' ')
    cleaned = cleaned.replace(/\s{2,}/g, ' ')
    cleaned = cleaned.trim()
    
    return cleaned
  }

  const handleCopy = async () => {
    try {
      const cleanedContent = cleanContentForCopy(content)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(cleanedContent)
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = cleanedContent
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      }
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleTTS = () => {
    if (isSpeaking) {
      if (speechSynthesisRef.current) {
        window.speechSynthesis.cancel()
        setIsSpeaking(false)
        speechSynthesisRef.current = null
      }
    } else {
      const cleanedContent = cleanContentForSpeech(content)
      if (cleanedContent && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(cleanedContent)
        utterance.lang = 'id-ID'
        utterance.rate = 1
        utterance.pitch = 1
        utterance.volume = 1

        utterance.onstart = () => {
          setIsSpeaking(true)
        }

        utterance.onend = () => {
          setIsSpeaking(false)
          speechSynthesisRef.current = null
        }

        utterance.onerror = () => {
          setIsSpeaking(false)
          speechSynthesisRef.current = null
        }

        speechSynthesisRef.current = utterance
        window.speechSynthesis.speak(utterance)
      }
    }
  }

  useEffect(() => {
    return () => {
      if (speechSynthesisRef.current) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  return (
    <div className={`chat-message-actions ${isUser ? 'user-actions' : 'bot-actions'}`}>
      {!isUser && (
        <button
          className="chat-tts-btn"
          onClick={handleTTS}
          data-tooltip-top={isSpeaking ? 'Hentikan' : 'Dengarkan'}
        >
          <i className={`fas fa-volume-up ${isSpeaking ? 'speaking' : ''}`}></i>
        </button>
      )}
      <button
        className="chat-copy-btn"
        onClick={handleCopy}
        {...(copySuccess ? {} : { 'data-tooltip-top': 'Salin' })}
      >
        {copySuccess ? (
          <i className="fa fa-check" style={{ color: '#89c54b' }}></i>
        ) : (
          <i className="fa fa-copy"></i>
        )}
      </button>
    </div>
  )
}

function ConsultationPrompt({ type = 'chat' }: { type?: 'recommendation' | 'chat' }) {
  const contactDoctor = () => {
    const modal = document.getElementById('doctorModal')
    if (modal) modal.classList.add('active')
  }

  const findNearestClinic = () => {
    window.open('https://www.google.com/maps/search/rumah+sakit+terdekat', '_blank')
  }

  if (type === 'recommendation') {
    return (
      <div className="consultation-prompt">
        <div className="consultation-prompt-text">
          <strong className="consultation-prompt-title">⚠️ Rekomendasi Anda memerlukan konsultasi medis profesional.</strong><br /><br />
          Untuk mendapatkan rekomendasi kesehatan yang lebih akurat dan sesuai dengan kondisi Anda, sebaiknya berkonsultasi langsung dengan dokter atau tenaga kesehatan profesional.
        </div>
        <div className="consultation-buttons">
          <button className="btn-consultation btn-consultation-primary" onClick={contactDoctor}>
            Hubungi Dokter
          </button>
          <button className="btn-consultation btn-consultation-secondary" onClick={findNearestClinic}>
            Cari RS Terdekat
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="consultation-prompt">
      <div className="consultation-prompt-text">
        <strong className="consultation-prompt-title">⚠️ Pertanyaan Anda memerlukan konsultasi medis profesional.</strong><br /><br />
        Untuk diagnosis, resep obat, atau informasi medis spesifik lainnya, sebaiknya berkonsultasi langsung dengan dokter atau tenaga kesehatan profesional.
      </div>
      <div className="consultation-buttons">
        <button className="btn-consultation btn-consultation-primary" onClick={contactDoctor}>
          Hubungi Dokter
        </button>
        <button className="btn-consultation btn-consultation-secondary" onClick={findNearestClinic}>
          Cari RS Terdekat
        </button>
      </div>
    </div>
  )
}


