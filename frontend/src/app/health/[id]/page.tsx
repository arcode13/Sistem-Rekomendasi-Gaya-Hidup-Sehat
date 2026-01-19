'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChatSection } from '../components/ChatSection'
import { DoctorModal } from '../components/DoctorModal'
import { LoadingOverlay } from '../components/LoadingOverlay'
import { HealthAuthBar } from '../components/HealthAuthBar'
import { HealthSidebarShell } from '../components/HealthSidebarShell'
import { healthApi } from '@/lib/api/health'
import type { HealthUser } from '@/lib/api/healthAuth'
import type { PredictionResult } from '../types'
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store'
import '../health.css'

export default function HealthExaminationPage() {
  const router = useRouter()
  const params = useParams()
  const examinationId = params.id as string
  const { isAuthenticated: isAdminAuthenticated } = useAdminAuthStore()

  const [showLoading, setShowLoading] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [currentRiskLevel, setCurrentRiskLevel] = useState<string>('unknown')
  const [currentPatientData, setCurrentPatientData] = useState<PredictionResult | null>(null)
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [currentUser, setCurrentUser] = useState<HealthUser | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const hasActiveChat = showChat && (!!currentPatientData || !!sessionId)
  const [showNewModal, setShowNewModal] = useState(false)

  useEffect(() => {
    if (isAdminAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAdminAuthenticated, router])

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ message, type })
    window.setTimeout(() => {
      setToastMessage((current) => (current?.message === message ? null : current))
    }, 3000)
  }, [])

  const loadExaminationData = useCallback(async (examId: string) => {
    try {
      setShowLoading(true)

      let sessionId: string | null = null

      try {
        const sessions = await healthApi.listSessions()
        const session = sessions.sessions.find((s) => s.examination_id === examId)
        if (session) {
          sessionId = session.id
        }
      } catch (error) {
        console.error('Failed to list sessions', error)
      }

      if (!sessionId) {
        try {
          const chatResponse = await healthApi.chat({
            message: '',
            risk_level: 'unknown',
            examination_id: examId,
          })

          if (chatResponse.success && chatResponse.session_id) {
            sessionId = chatResponse.session_id
          }
        } catch (error) {
          console.error('Failed to get/create session via chat', error)
        }
      }

      if (sessionId) {
        setSessionId(sessionId)
        setShowChat(true)
        
        const sessionDetail = await healthApi.getSession(sessionId)
        
        if (sessionDetail.messages && sessionDetail.messages.length > 0) {
          const resultMessage = sessionDetail.messages.find(m => m.type === 'result')
          if (resultMessage && typeof resultMessage.content === 'object' && resultMessage.content !== null) {
            const resultData = resultMessage.content as Record<string, unknown>
            const riskLevel = resultData.risk_level as string
            const validRiskLevel = (riskLevel === 'low' || riskLevel === 'medium' || riskLevel === 'high') ? riskLevel : 'low'
            if (validRiskLevel) {
              setCurrentRiskLevel(validRiskLevel)
            }
            if (resultData.patient_info) {
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
              setCurrentPatientData(predictionResult)
            }
          } else {
            const firstBotMessage = sessionDetail.messages.find(m => m.type === 'bot')
            if (firstBotMessage && typeof firstBotMessage.content === 'string') {
              const riskMatch = firstBotMessage.content.match(/risk_level['"]:\s*['"](low|medium|high)['"]/)
              if (riskMatch) {
                setCurrentRiskLevel(riskMatch[1])
              }
            }
          }
        }
      } else {
        showToast('Data pemeriksaan tidak ditemukan', 'error')
        router.push('/')
      }
    } catch (error) {
      console.error('Failed to load examination', error)
      showToast('Gagal memuat data pemeriksaan', 'error')
      router.push('/')
    } finally {
      setShowLoading(false)
    }
  }, [router, showToast])

  useEffect(() => {
    if (isAdminAuthenticated) {
      return
    }
    
    if (examinationId) {
      loadExaminationData(examinationId)
    }
  }, [examinationId, loadExaminationData, isAdminAuthenticated])

  const handleNewAnalysis = () => {
    router.push('/')
  }

  if (isAdminAuthenticated) {
    return null
  }

  return (
    <div className="health-container">
      <LoadingOverlay show={showLoading} />

      <HealthAuthBar
        onUserChange={setCurrentUser}
        hasActiveChat={hasActiveChat}
        onRequestNewRecommendation={() => {
          if (hasActiveChat) {
            setShowNewModal(true)
          }
        }}
        onShowToast={showToast}
        showAuthBar={!currentUser}
      />

      {currentUser ? (
        <HealthSidebarShell 
          onNewAnalysis={handleNewAnalysis}
          currentUser={currentUser}
          onShowToast={showToast}
          hasActiveChat={hasActiveChat}
          onOpenSettings={() => {
            const settingsBtn = document.querySelector('[data-settings-trigger]') as HTMLElement
            if (settingsBtn) settingsBtn.click()
          }}
          onLogout={() => {
            const logoutBtn = document.querySelector('[data-logout-trigger]') as HTMLElement
            if (logoutBtn) logoutBtn.click()
          }}
        >
          <div className={`main-content ${showChat ? 'chat-mode' : ''}`} id="mainContent">
            {showChat && (
              <ChatSection
                riskLevel={currentRiskLevel}
                patientData={currentPatientData}
                sessionId={sessionId}
                examinationId={examinationId}
                onNewAnalysis={handleNewAnalysis}
                onShowToast={showToast}
                currentUser={currentUser}
              />
            )}
          </div>
        </HealthSidebarShell>
      ) : (
        <div className="container-no-sidebar">
          <div className={`main-content-centered ${showChat ? 'chat-mode' : ''}`} id="mainContent">
            {showChat && (
              <ChatSection
                riskLevel={currentRiskLevel}
                patientData={currentPatientData}
                sessionId={sessionId}
                examinationId={examinationId}
                onNewAnalysis={handleNewAnalysis}
                onShowToast={showToast}
                currentUser={currentUser}
              />
            )}
          </div>
        </div>
      )}

      <DoctorModal />

      {toastMessage && (
        <div className={`health-toast show ${toastMessage.type === 'error' ? 'toast-error' : ''}`}>
          <i className={toastMessage.type === 'error' ? 'fas fa-times-circle' : 'fas fa-check-circle'} />
          <span>{toastMessage.message}</span>
        </div>
      )}

      {hasActiveChat && showNewModal && (
        <div className="modal-overlay active">
          <div className="delete-modal-content">
            <h3>Rekomendasi Baru</h3>
            <div className="delete-modal-body">
              <p>Apakah Anda yakin ingin membuat rekomendasi baru? Data saat ini akan hilang.</p>
            </div>
            <div className="delete-modal-actions">
              <button
                type="button"
                className="btn-cancel-delete"
                onClick={() => setShowNewModal(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-confirm-delete"
                onClick={() => {
                  setShowNewModal(false)
                  handleNewAnalysis()
                  showToast('Rekomendasi baru dimulai')
                }}
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

