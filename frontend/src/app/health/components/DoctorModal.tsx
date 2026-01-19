'use client'

import { useEffect } from 'react'

export function DoctorModal() {
  useEffect(() => {
    const modal = document.getElementById('doctorModal')
    if (!modal) return

    const handleClick = (e: MouseEvent) => {
      if (e.target === modal) {
        closeModal()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal()
      }
    }

    const closeBtn = document.getElementById('modalCloseBtn')
    const closeBtnFooter = document.getElementById('modalCloseBtnFooter')

    if (closeBtn) closeBtn.addEventListener('click', closeModal)
    if (closeBtnFooter) closeBtnFooter.addEventListener('click', closeModal)
    modal.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      if (closeBtn) closeBtn.removeEventListener('click', closeModal)
      if (closeBtnFooter) closeBtnFooter.removeEventListener('click', closeModal)
      modal.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const closeModal = () => {
    const modal = document.getElementById('doctorModal')
    if (modal) modal.classList.remove('active')
  }

  return (
    <div className="modal-overlay" id="doctorModal">
      <div className="modal">
        <div className="modal-header">
          <h3>
            <i className="far fa-comment-alt"></i> Konsultasi Dokter
          </h3>
          <button className="modal-close" id="modalCloseBtn">
            <i className="fa fa-times"></i>
          </button>
        </div>
        <div className="modal-body" id="modalBody">
          <p className="modal-body-text">
            Anda dapat menghubungi tenaga kesehatan profesional melalui berbagai layanan berikut:
          </p>
          <ul className="modal-list">
            <li>
              <div className="modal-list-number">1</div>
              <div className="modal-list-content">
                <strong>Layanan Medis Online</strong>
                <div className="modal-list-item-spacing">
                  <a href="https://www.halodoc.com/" target="_blank" rel="noopener noreferrer">Halodoc</a> • <a href="https://www.alodokter.com/" target="_blank" rel="noopener noreferrer">Alodokter</a> • <a href="https://www.gooddoctor.co.id/" target="_blank" rel="noopener noreferrer">Good Doctor</a>
                </div>
              </div>
            </li>
            <li>
              <div className="modal-list-number">2</div>
              <div className="modal-list-content">
                <strong>Hotline Kesehatan</strong>
                <div className="modal-list-item-text">
                  Kemenkes: <strong>119</strong><br />
                  Ambulans: <strong>118</strong>
                </div>
              </div>
            </li>
            <li>
              <div className="modal-list-number">3</div>
              <div className="modal-list-content">
                <strong>Fasilitas Kesehatan Terdekat</strong>
                <div className="modal-list-item-text">
                  Puskesmas atau Rumah Sakit terdekat
                </div>
              </div>
            </li>
          </ul>
        </div>
        <div className="modal-footer">
          <button className="modal-btn modal-btn-secondary" id="modalCloseBtnFooter">Tutup</button>
        </div>
      </div>
    </div>
  )
}

