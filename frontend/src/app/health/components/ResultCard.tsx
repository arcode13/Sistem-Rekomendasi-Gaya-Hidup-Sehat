'use client'

import type { PredictionResult } from '../types'

interface ResultCardProps {
  data: PredictionResult
}

export function ResultCard({ data }: ResultCardProps) {
  const riskClass = data.risk_level === 'low' ? 'risk-low' :
                   data.risk_level === 'medium' ? 'risk-medium' : 'risk-high'
  const genderLabel = data.patient_info.gender === 1 ? 'Perempuan' : 'Laki-laki'

  const getCholesterolLabel = (value?: number): string => {
    if (value === undefined) return ''
    const labels: Record<number, string> = {
      1: 'Normal',
      2: 'Di Atas Normal',
      3: 'Jauh Di Atas Normal'
    }
    return labels[value] || ''
  }

  const getGlucoseLabel = (value?: number): string => {
    if (value === undefined) return ''
    const labels: Record<number, string> = {
      1: 'Normal',
      2: 'Di Atas Normal',
      3: 'Jauh Di Atas Normal'
    }
    return labels[value] || ''
  }

  const getSmokingLabel = (value?: number): string => {
    if (value === undefined) return ''
    return value === 1 ? 'Merokok' : 'Tidak Merokok'
  }

  const getAlcoholLabel = (value?: number): string => {
    if (value === undefined) return ''
    return value === 1 ? 'Ya' : 'Tidak'
  }

  const getPhysicalActivityLabel = (value?: number): string => {
    if (value === undefined) return ''
    return value === 1 ? 'Aktif' : 'Tidak Aktif'
  }

  return (
    <div className="result-card">
      <div>
        <span className={`risk-badge ${riskClass}`}>⚠️ {data.risk_label}</span>
      </div>
      <div className="patient-info-wrapper">
        <h3 className="patient-info-title">
          <i className="fa fa-user"></i> <span>Informasi Pasien</span>
        </h3>
        <div className="patient-info-grid-inline">
          <div className="patient-info-item-inline">
            <div className="patient-info-label">Usia</div>
            <div className="patient-info-value">{data.patient_info.age} tahun</div>
          </div>
          <div className="patient-info-item-inline">
            <div className="patient-info-label">Jenis Kelamin</div>
            <div className="patient-info-value">{genderLabel}</div>
          </div>
          <div className="patient-info-item-inline">
            <div className="patient-info-label">Tekanan Darah</div>
            <div className="patient-info-value">{data.patient_info.blood_pressure}</div>
          </div>
          <div className="patient-info-item-inline">
            <div className="patient-info-label">BMI</div>
            <div className="patient-info-value">{data.patient_info.bmi} ({data.patient_info.bmi_category})</div>
          </div>
          <div className="patient-info-item-full">
            <div className="patient-info-label">Kategori Tekanan Darah</div>
            <div className="patient-info-value">{data.patient_info.bp_category}</div>
          </div>
          {data.patient_info.cholesterol !== undefined && (
            <div className="patient-info-item-inline">
              <div className="patient-info-label">Kolesterol</div>
              <div className="patient-info-value">{getCholesterolLabel(data.patient_info.cholesterol)}</div>
            </div>
          )}
          {data.patient_info.glucose !== undefined && (
            <div className="patient-info-item-inline">
              <div className="patient-info-label">Glukosa</div>
              <div className="patient-info-value">{getGlucoseLabel(data.patient_info.glucose)}</div>
            </div>
          )}
          {data.patient_info.smoking !== undefined && (
            <div className="patient-info-item-inline">
              <div className="patient-info-label">Kebiasaan Merokok</div>
              <div className="patient-info-value">{getSmokingLabel(data.patient_info.smoking)}</div>
            </div>
          )}
          {data.patient_info.alcohol !== undefined && (
            <div className="patient-info-item-inline">
              <div className="patient-info-label">Konsumsi Alkohol</div>
              <div className="patient-info-value">{getAlcoholLabel(data.patient_info.alcohol)}</div>
            </div>
          )}
          {data.patient_info.physical_activity !== undefined && (
            <div className="patient-info-item-inline">
              <div className="patient-info-label">Aktivitas Fisik</div>
              <div className="patient-info-value">{getPhysicalActivityLabel(data.patient_info.physical_activity)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

