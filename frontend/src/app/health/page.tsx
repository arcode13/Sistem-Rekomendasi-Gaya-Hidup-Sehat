'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { HealthForm } from './components/HealthForm'
import { ChatSection } from './components/ChatSection'
import { DoctorModal } from './components/DoctorModal'
import { LoadingOverlay } from './components/LoadingOverlay'
import { HealthAuthBar } from './components/HealthAuthBar'
import { HealthSidebarShell } from './components/HealthSidebarShell'
import { healthApi } from '@/lib/api/health'
import type { HealthUser } from '@/lib/api/healthAuth'
import type { HealthFormData, PredictionResult } from './types'
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store'
import './health.css'

export default function HealthPage() {
  const router = useRouter()
  const { isAuthenticated: isAdminAuthenticated } = useAdminAuthStore()
  const [showLoading, setShowLoading] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [currentRiskLevel, setCurrentRiskLevel] = useState<string>('unknown')
  const [currentPatientData, setCurrentPatientData] = useState<PredictionResult | null>(null)
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [currentUser, setCurrentUser] = useState<HealthUser | null>(null)
  const [sessionId] = useState<string | null>(null)
  const hasActiveChat = showChat && (!!currentPatientData || !!sessionId)
  const [showNewModal, setShowNewModal] = useState(false)

  useEffect(() => {
    if (isAdminAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAdminAuthenticated, router])

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ message, type })
    window.setTimeout(() => {
      setToastMessage((current) => (current?.message === message ? null : current))
    }, 3000)
  }

  const handleFormSubmit = async (formData: HealthFormData) => {
    setShowLoading(true)
    try {
      const predictPayload: {
        age: number
        gender: number
        height: number
        weight: number
        systolic_blood_pressure: number
        diastolic_blood_pressure: number
        cholesterol?: number
        glucose?: number
        smoking?: number
        alcohol?: number
        physical_activity?: number
      } = {
        age: formData.age,
        gender: formData.gender,
        height: formData.height,
        weight: formData.weight,
        systolic_blood_pressure: formData.systolic_blood_pressure,
        diastolic_blood_pressure: formData.diastolic_blood_pressure,
      }
      
      if (formData.cholesterol !== undefined) predictPayload.cholesterol = formData.cholesterol
      if (formData.glucose !== undefined) predictPayload.glucose = formData.glucose
      if (formData.smoking !== undefined) predictPayload.smoking = formData.smoking
      if (formData.alcohol !== undefined) predictPayload.alcohol = formData.alcohol
      if (formData.physical_activity !== undefined) predictPayload.physical_activity = formData.physical_activity
      
      let predictionResponse
      try {
        predictionResponse = await healthApi.predict(predictPayload)
      } catch (error: unknown) {
        setShowLoading(false)
        const errorMessage = (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'data' in error.response && error.response.data && typeof error.response.data === 'object' && 'detail' in error.response.data && typeof error.response.data.detail === 'string') 
          ? error.response.data.detail 
          : (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string')
          ? error.message
          : 'Terjadi kesalahan dalam analisis. Silakan coba lagi.'
        showToast(errorMessage, 'error')
        return
      }

      if (!predictionResponse.success) {
        setShowLoading(false)
        showToast('Terjadi kesalahan dalam analisis. Silakan coba lagi.', 'error')
        return
      }

      const predictionData = predictionResponse.data
      setCurrentRiskLevel(predictionData.risk_level)

      const bmiCategory = getBMICategory(predictionData.bmi)
      const bpCategory = getBPCategory(
        formData.systolic_blood_pressure,
        formData.diastolic_blood_pressure
      )

      const recommendationPayload: {
        age: number
        gender: number
        height: number
        weight: number
        systolic_blood_pressure: number
        diastolic_blood_pressure: number
        bmi: number
        risk_level: string
        prob_disease: number
        cholesterol?: number
        glucose?: number
        smoking?: number
        alcohol?: number
        physical_activity?: number
      } = {
        age: formData.age,
        gender: formData.gender,
        height: formData.height,
        weight: formData.weight,
        systolic_blood_pressure: formData.systolic_blood_pressure,
        diastolic_blood_pressure: formData.diastolic_blood_pressure,
        bmi: predictionData.bmi,
        risk_level: predictionData.risk_level,
        prob_disease: predictionData.probabilities.disease,
      }
      
      if (formData.cholesterol !== undefined) recommendationPayload.cholesterol = formData.cholesterol
      if (formData.glucose !== undefined) recommendationPayload.glucose = formData.glucose
      if (formData.smoking !== undefined) recommendationPayload.smoking = formData.smoking
      if (formData.alcohol !== undefined) recommendationPayload.alcohol = formData.alcohol
      if (formData.physical_activity !== undefined) recommendationPayload.physical_activity = formData.physical_activity
      
      const recommendationResponse = await healthApi.getRecommendation(recommendationPayload)

      let recommendation = ''
      let recommendationProcessedContent: string | undefined
      let recommendationReferences: Array<{ number: number; type: 'source'; id: string; title: string }> | undefined
      let recommendationEvaluationMetrics: { context_relevance: number; answer_relevance: number; groundedness: number } | undefined
      if (recommendationResponse.success) {
        recommendation = recommendationResponse.recommendation
        recommendationProcessedContent = recommendationResponse.processed_content
        recommendationReferences = recommendationResponse.references
        recommendationEvaluationMetrics = recommendationResponse.evaluation_metrics
      } else {
        recommendation = recommendationResponse.error || 'Gagal mendapatkan rekomendasi.'
        showToast(recommendation, 'error')
      }

      const patientInfo: PredictionResult['patient_info'] = {
        age: formData.age,
        gender: formData.gender,
        blood_pressure: `${formData.systolic_blood_pressure}/${formData.diastolic_blood_pressure}`,
        bmi: predictionData.bmi,
        bmi_category: bmiCategory,
        bp_category: bpCategory,
      }
      
      // Add optional fields if they exist
      if (formData.cholesterol !== undefined) {
        patientInfo.cholesterol = formData.cholesterol
      }
      if (formData.glucose !== undefined) {
        patientInfo.glucose = formData.glucose
      }
      if (formData.smoking !== undefined) {
        patientInfo.smoking = formData.smoking
      }
      if (formData.alcohol !== undefined) {
        patientInfo.alcohol = formData.alcohol
      }
      if (formData.physical_activity !== undefined) {
        patientInfo.physical_activity = formData.physical_activity
      }

      const frontendData: PredictionResult = {
        risk_level: predictionData.risk_level as 'low' | 'medium' | 'high',
        risk_label: getRiskLabel(predictionData.risk_level),
        patient_info: patientInfo,
        recommendation: recommendation,
        prob_disease: predictionData.probabilities.disease,
        examination_id: predictionResponse.examination_id,
        recommendation_processed_content: recommendationProcessedContent,
        recommendation_references: recommendationReferences,
        recommendation_meets_threshold: recommendationResponse.meets_threshold,
        recommendation_threshold_warning: recommendationResponse.threshold_warning,
      }

      setCurrentPatientData(frontendData)
      
      if (predictionResponse.examination_id) {
        try {
          const chatResponse = await healthApi.chat({
            message: '',
            risk_level: predictionData.risk_level,
            examination_id: predictionResponse.examination_id,
            patient_data: {
              age: formData.age,
              systolic_bp: formData.systolic_blood_pressure,
              diastolic_bp: formData.diastolic_blood_pressure,
              bmi: predictionData.bmi,
              prob_disease: predictionData.probabilities.disease,
            },
            recommendation: recommendation,
            recommendation_processed_content: recommendationProcessedContent,
            recommendation_references: recommendationReferences,
            recommendation_evaluation_metrics: recommendationEvaluationMetrics,
          })
          
          if (chatResponse.success && chatResponse.session_id) {
            setTimeout(() => {
              setShowLoading(false)
              router.push(`/${predictionResponse.examination_id}`)
            }, 500)
          } else {
            setTimeout(() => {
              setShowLoading(false)
              router.push(`/${predictionResponse.examination_id}`)
            }, 1000)
          }
        } catch (error) {
          console.error('Failed to create session', error)
          setTimeout(() => {
            setShowLoading(false)
            router.push(`/${predictionResponse.examination_id}`)
          }, 1000)
        }
      } else {
        setTimeout(() => {
          setShowLoading(false)
          setShowChat(true)
        }, 1000)
      }
    } catch (error) {
      setShowLoading(false)
      console.error('Error:', error)
      showToast('Gagal terhubung ke server. Silakan coba lagi.', 'error')
    }
  }

  const getBMICategory = (bmi: number): string => {
    if (bmi < 18.5) return 'Kurus'
    if (bmi < 25) return 'Normal'
    if (bmi < 30) return 'Gemuk'
    return 'Obesitas'
  }

  const getBPCategory = (systolic: number, diastolic: number): string => {
    if (systolic < 120 && diastolic < 80) return 'Normal'
    if (systolic < 130 && diastolic < 80) return 'Meningkat'
    if (systolic < 140 || diastolic < 90) return 'Tinggi Tahap 1'
    if (systolic < 180 || diastolic < 120) return 'Tinggi Tahap 2'
    return 'Krisis Hipertensi'
  }

  const getRiskLabel = (riskLevel: string): string => {
    const labels: Record<string, string> = {
      low: 'Risiko Rendah',
      medium: 'Risiko Sedang',
      high: 'Risiko Tinggi',
    }
    return labels[riskLevel] || riskLevel
  }

  const handleNewAnalysis = () => {
    setShowChat(false)
    setCurrentRiskLevel('unknown')
    setCurrentPatientData(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
            {!showChat && <HealthForm onSubmit={handleFormSubmit} onShowToast={showToast} />}

            {showChat && (
              <ChatSection
                riskLevel={currentRiskLevel}
                patientData={currentPatientData}
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
            {!showChat && <HealthForm onSubmit={handleFormSubmit} onShowToast={showToast} />}

            {showChat && (
              <ChatSection
                riskLevel={currentRiskLevel}
                patientData={currentPatientData}
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

