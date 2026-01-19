import { HealthReferenceItem } from '@/lib/api/health'

export interface HealthFormData {
  age: number
  gender: number
  systolic_blood_pressure: number
  diastolic_blood_pressure: number
  weight: number
  height: number
  cholesterol?: number
  glucose?: number
  smoking?: number
  alcohol?: number
  physical_activity?: number
}

export interface PatientInfo {
  age: number
  gender: number
  blood_pressure: string
  bmi: number
  bmi_category: string
  bp_category: string
  cholesterol?: number
  glucose?: number
  smoking?: number
  alcohol?: number
  physical_activity?: number
}

export interface PredictionResult {
  risk_level: 'low' | 'medium' | 'high'
  risk_label: string
  patient_info: PatientInfo
  recommendation: string
  prob_disease?: number
  examination_id?: string
  recommendation_processed_content?: string
  recommendation_references?: HealthReferenceItem[]
  recommendation_meets_threshold?: boolean
  recommendation_threshold_warning?: string
}


export interface ChatMessage {
  type: 'user' | 'bot' | 'result' | 'consultation'
  content: string | PredictionResult | null
  processed_content?: string
  references?: HealthReferenceItem[]
  evaluation_metrics?: {
    context_relevance?: number
    answer_relevance?: number
    groundedness?: number
  }
  meets_threshold?: boolean
  threshold_warning?: string
  consultation_type?: 'recommendation' | 'chat'
}

export interface SpeechRecognitionEvent {
  results: Array<Array<{ transcript: string }>>
}


export interface SpeechRecognitionErrorEvent {
  error: string
}

export interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition
    }
    webkitSpeechRecognition: {
      new (): SpeechRecognition
    }
  }
}

