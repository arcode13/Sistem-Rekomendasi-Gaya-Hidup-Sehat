'use client'

import { useState, useEffect } from 'react'
import { getConfig } from '@/lib/config'
import type { HealthFormData } from '../types'

interface HealthFormProps {
  onSubmit: (data: HealthFormData) => void
  onShowToast?: (message: string, type?: 'success' | 'error') => void
}

type HealthFormState = {
  age: string
  gender: number | null
  systolic_blood_pressure: string
  diastolic_blood_pressure: string
  weight: string
  height: string
  cholesterol?: number
  glucose?: number
  smoking?: number
  alcohol?: number
  physical_activity?: number
}

export function HealthForm({ onSubmit, onShowToast }: HealthFormProps) {
  const [formData, setFormData] = useState<HealthFormState>({
    age: '',
    gender: null,
    systolic_blood_pressure: '',
    diastolic_blood_pressure: '',
    weight: '',
    height: ''
  })
  const [genderError, setGenderError] = useState(false)
  const [showOptionalForm, setShowOptionalForm] = useState(false)

   useEffect(() => {
    const autoFillForm = async () => {
      try {
        const config = await getConfig()
        if (config.formAuto) {
          const randomAge = Math.floor(Math.random() * (65 - 18 + 1)) + 18
          const randomGender = Math.random() < 0.5 ? 1 : 2
          const randomSystolic = Math.floor(Math.random() * (140 - 100 + 1)) + 100
          const randomDiastolic = Math.floor(Math.random() * (90 - 60 + 1)) + 60
          const randomWeight = (Math.random() * (100 - 50) + 50).toFixed(1)
          const randomHeight = Math.floor(Math.random() * (180 - 150 + 1)) + 150
          
          setFormData({
            age: randomAge.toString(),
            gender: randomGender,
            systolic_blood_pressure: randomSystolic.toString(),
            diastolic_blood_pressure: randomDiastolic.toString(),
            weight: randomWeight,
            height: randomHeight.toString()
          })
        }
      } catch (error) {
        console.error('Error fetching config for form auto-fill:', error)
      }
    }
    
    autoFillForm()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.gender) {
      setGenderError(true)
      if (onShowToast) {
        onShowToast('Jenis kelamin wajib diisi!', 'error')
      }
      return
    }
    
    if (!formData.age || !formData.systolic_blood_pressure || !formData.diastolic_blood_pressure || !formData.weight || !formData.height) {
      if (onShowToast) {
        onShowToast('Lengkapi semua field wajib terlebih dahulu.', 'error')
      }
      return
    }

    setGenderError(false)
    const submitData: HealthFormData = {
      age: parseInt(formData.age) || 0,
      gender: formData.gender || 0,
      systolic_blood_pressure: parseInt(formData.systolic_blood_pressure) || 0,
      diastolic_blood_pressure: parseInt(formData.diastolic_blood_pressure) || 0,
      weight: parseFloat(formData.weight.replace(',', '.')) || 0,
      height: parseFloat(formData.height.replace(',', '.')) || 0
    }
    
    if (formData.cholesterol !== undefined) submitData.cholesterol = formData.cholesterol
    if (formData.glucose !== undefined) submitData.glucose = formData.glucose
    if (formData.smoking !== undefined) submitData.smoking = formData.smoking
    if (formData.alcohol !== undefined) submitData.alcohol = formData.alcohol
    if (formData.physical_activity !== undefined) submitData.physical_activity = formData.physical_activity
    
    onSubmit(submitData)
  }

  return (
    <div className="form-section">
      <h2>Form Pemeriksaan Kesehatan</h2>
      <form id="healthForm" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="age">Usia (tahun) <span style={{color: '#dc3545'}}>*</span></label>
          <input
            type="number"
            id="age"
            name="age"
            min="1"
            max="120"
            required
            placeholder="Contoh: 45"
            value={formData.age}
            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
          />
        </div>

        <div className={`form-group ${genderError ? 'error' : ''}`} id="genderGroup">
          <label>Jenis Kelamin <span style={{color: '#dc3545'}}>*</span></label>
          <div className="radio-group">
            <div className="radio-option">
              <input
                type="radio"
                id="genderPerempuan"
                name="gender"
                value="1"
                required
                checked={formData.gender === 1}
                onChange={() => setFormData({ ...formData, gender: 1 })}
              />
              <label htmlFor="genderPerempuan">Perempuan</label>
            </div>
            <div className="radio-option">
              <input
                type="radio"
                id="genderLakiLaki"
                name="gender"
                value="2"
                required
                checked={formData.gender === 2}
                onChange={() => setFormData({ ...formData, gender: 2 })}
              />
              <label htmlFor="genderLakiLaki">Laki-laki</label>
            </div>
          </div>
          <div className="error-message">Jenis kelamin wajib diisi</div>
        </div>

        <div className="form-group">
          <label htmlFor="systolic">Tekanan Darah Sistolik (mmHg) <span style={{color: '#dc3545'}}>*</span></label>
          <input
            type="number"
            id="systolic"
            name="systolic"
            min="70"
            max="250"
            required
            placeholder="Contoh: 120"
            value={formData.systolic_blood_pressure}
            onChange={(e) => setFormData({ ...formData, systolic_blood_pressure: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label htmlFor="diastolic">Tekanan Darah Diastolik (mmHg) <span style={{color: '#dc3545'}}>*</span></label>
          <input
            type="number"
            id="diastolic"
            name="diastolic"
            min="40"
            max="150"
            required
            placeholder="Contoh: 80"
            value={formData.diastolic_blood_pressure}
            onChange={(e) => setFormData({ ...formData, diastolic_blood_pressure: e.target.value })}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="weight">Berat Badan (kg) <span style={{color: '#dc3545'}}>*</span></label>
            <input
              type="number"
              id="weight"
              name="weight"
              min="20"
              max="300"
              step="0.1"
              required
              placeholder="Contoh: 70"
            value={formData.weight}
            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="height">Tinggi Badan (cm) <span style={{color: '#dc3545'}}>*</span></label>
            <input
              type="number"
              id="height"
              name="height"
              min="100"
              max="250"
              step="0.1"
              required
              placeholder="Contoh: 170"
            value={formData.height}
            onChange={(e) => setFormData({ ...formData, height: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group" style={{marginTop: '20px'}}>
          <button
            type="button"
            onClick={() => setShowOptionalForm(!showOptionalForm)}
            style={{
              width: '100%',
              padding: '12px',
              background: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: '#495057',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>Form Opsional</span>
            <span style={{fontSize: '18px'}}>{showOptionalForm ? '−' : '+'}</span>
          </button>
        </div>

        {showOptionalForm && (
          <div style={{
            marginTop: '15px',
            padding: '20px',
            background: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <div className="form-group">
              <label><strong>Kolesterol:</strong></label>
              <div className="radio-group">
                <div className="radio-option">
                  <input
                    type="radio"
                    id="cholesterol1"
                    name="cholesterol"
                    value="1"
                    checked={formData.cholesterol === 1}
                    onChange={() => setFormData({ ...formData, cholesterol: 1 })}
                  />
                  <label htmlFor="cholesterol1">Normal</label>
                </div>
                <div className="radio-option">
                  <input
                    type="radio"
                    id="cholesterol2"
                    name="cholesterol"
                    value="2"
                    checked={formData.cholesterol === 2}
                    onChange={() => setFormData({ ...formData, cholesterol: 2 })}
                  />
                  <label htmlFor="cholesterol2">Di Atas Normal</label>
                </div>
                <div className="radio-option">
                  <input
                    type="radio"
                    id="cholesterol3"
                    name="cholesterol"
                    value="3"
                    checked={formData.cholesterol === 3}
                    onChange={() => setFormData({ ...formData, cholesterol: 3 })}
                  />
                  <label htmlFor="cholesterol3">Jauh Di Atas Normal</label>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label><strong>Glukosa:</strong></label>
              <div className="radio-group">
                <div className="radio-option">
                  <input
                    type="radio"
                    id="glucose1"
                    name="glucose"
                    value="1"
                    checked={formData.glucose === 1}
                    onChange={() => setFormData({ ...formData, glucose: 1 })}
                  />
                  <label htmlFor="glucose1">Normal</label>
                </div>
                <div className="radio-option">
                  <input
                    type="radio"
                    id="glucose2"
                    name="glucose"
                    value="2"
                    checked={formData.glucose === 2}
                    onChange={() => setFormData({ ...formData, glucose: 2 })}
                  />
                  <label htmlFor="glucose2">Di Atas Normal</label>
                </div>
                <div className="radio-option">
                  <input
                    type="radio"
                    id="glucose3"
                    name="glucose"
                    value="3"
                    checked={formData.glucose === 3}
                    onChange={() => setFormData({ ...formData, glucose: 3 })}
                  />
                  <label htmlFor="glucose3">Jauh Di Atas Normal</label>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label><strong>Kebiasaan Merokok:</strong></label>
              <div className="radio-group">
                <div className="radio-option">
                  <input
                    type="radio"
                    id="smoking0"
                    name="smoking"
                    value="0"
                    checked={formData.smoking === 0}
                    onChange={() => setFormData({ ...formData, smoking: 0 })}
                  />
                  <label htmlFor="smoking0">Tidak Merokok</label>
                </div>
                <div className="radio-option">
                  <input
                    type="radio"
                    id="smoking1"
                    name="smoking"
                    value="1"
                    checked={formData.smoking === 1}
                    onChange={() => setFormData({ ...formData, smoking: 1 })}
                  />
                  <label htmlFor="smoking1">Merokok</label>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label><strong>Konsumsi Alkohol:</strong></label>
              <div className="radio-group">
                <div className="radio-option">
                  <input
                    type="radio"
                    id="alcohol0"
                    name="alcohol"
                    value="0"
                    checked={formData.alcohol === 0}
                    onChange={() => setFormData({ ...formData, alcohol: 0 })}
                  />
                  <label htmlFor="alcohol0">Tidak</label>
                </div>
                <div className="radio-option">
                  <input
                    type="radio"
                    id="alcohol1"
                    name="alcohol"
                    value="1"
                    checked={formData.alcohol === 1}
                    onChange={() => setFormData({ ...formData, alcohol: 1 })}
                  />
                  <label htmlFor="alcohol1">Ya</label>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label><strong>Aktivitas Fisik:</strong></label>
              <div className="radio-group">
                <div className="radio-option">
                  <input
                    type="radio"
                    id="physical0"
                    name="physical_activity"
                    value="0"
                    checked={formData.physical_activity === 0}
                    onChange={() => setFormData({ ...formData, physical_activity: 0 })}
                  />
                  <label htmlFor="physical0">Tidak Aktif</label>
                </div>
                <div className="radio-option">
                  <input
                    type="radio"
                    id="physical1"
                    name="physical_activity"
                    value="1"
                    checked={formData.physical_activity === 1}
                    onChange={() => setFormData({ ...formData, physical_activity: 1 })}
                  />
                  <label htmlFor="physical1">Aktif</label>
                </div>
              </div>
            </div>
          </div>
        )}

        <button type="submit" className="btn-predict" id="btnPredict" style={{ marginTop: '24px' }}>
          Rekomendasi Gaya Hidup Saya
        </button>
      </form>
    </div>
  )
}

