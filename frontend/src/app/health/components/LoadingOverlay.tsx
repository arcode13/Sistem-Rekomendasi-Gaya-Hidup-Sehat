'use client'

interface LoadingOverlayProps {
  show: boolean
}

export function LoadingOverlay({ show }: LoadingOverlayProps) {
  if (!show) return null

  return (
    <div className={`loading-overlay ${show ? 'active' : ''}`}>
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <div className="loading-text">Merekomendasikan Gaya Hidup Sehat Anda</div>
        <div className="loading-subtext">Mohon tunggu sebentar...</div>
      </div>
    </div>
  )
}

