'use client'

import { useState, useEffect } from 'react'
import { sourcesApi } from '@/lib/api/sources'
import { getApiUrl } from '@/lib/config'
import ReactMarkdown from 'react-markdown'
import '../health.css'

interface ReferenceModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'source'
  id: string
}

export function ReferenceModal({ isOpen, onClose, type, id }: ReferenceModalProps) {
  const [content, setContent] = useState<string>('')
  const [title, setTitle] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setContent('')
      setTitle('')
      setError(null)
      setPdfUrl(null)
      return
    }

    const fetchContent = async () => {
      setLoading(true)
      setError(null)
      
      try {
        if (type === 'source') {
          const fullSourceId = id.includes(':') ? id : `source:${id}`
          const data = await sourcesApi.get(fullSourceId)
          const titleText = data.title || 'Referensi'
          setTitle(titleText.replace(/\.pdf$/i, ''))
          
          const sourceIdForDownload = fullSourceId.includes(':') ? fullSourceId.split(':')[1] : fullSourceId
          if (data.asset?.file_path || data.file_available) {
            const apiBaseUrl = await getApiUrl()
            const pdfUrl = `${apiBaseUrl}/api/sources/${encodeURIComponent(sourceIdForDownload)}/view`
            setPdfUrl(pdfUrl)
            setContent('')
          } else {
            let sourceContent = data.full_text || 'Tidak ada konten tersedia'
            sourceContent = sourceContent.replace(/\s*\[?(source|note):([a-zA-Z0-9_]+)\]?/g, '')
            sourceContent = sourceContent.replace(/\s*\*\s*/g, ' ')
            sourceContent = sourceContent.replace(/\s+/g, ' ')
            sourceContent = sourceContent.replace(/\s+([.,!?;:])/g, '$1')
            setContent(sourceContent.trim())
            setPdfUrl(null)
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error 
          ? err.message 
          : (typeof err === 'object' && err !== null && 'response' in err && typeof err.response === 'object' && err.response !== null && 'data' in err.response && typeof err.response.data === 'object' && err.response.data !== null && 'detail' in err.response.data && typeof err.response.data.detail === 'string')
            ? err.response.data.detail
            : 'Gagal memuat konten'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchContent()
  }, [isOpen, type, id])

  if (!isOpen) return null

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div 
        className="modal" 
        onClick={(e) => e.stopPropagation()} 
        style={pdfUrl ? {
          width: '90%',
          maxWidth: '1000px',
          height: '90vh'
        } : {
          maxWidth: '765px'
        }}
      >
        <div className="modal-header">
          <h3>{title || 'Loading...'}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <i className="fa fa-times"></i>
          </button>
        </div>
        
        <div className="modal-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', color: '#6c757d', gap: '12px' }}>
              <i className="fa fa-spinner fa-spin"></i> Memuat konten...
            </div>
          )}
          
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '20px', background: '#f8d7da', color: '#721c24', borderRadius: '8px', border: '1px solid #f5c6cb' }}>
              <i className="fa fa-exclamation-circle"></i> {error}
            </div>
          )}
          
          {!loading && !error && pdfUrl && (
            <iframe
              id="pdfViewer"
              src={pdfUrl}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                flex: 1,
                minHeight: '500px'
              }}
              title={title || 'PDF Viewer'}
            />
          )}
          
          {!loading && !error && !pdfUrl && content && (
            <div className="modal-body-text">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-1">{children}</p>,
                  h1: ({ children }) => <p className="mb-1">{children}</p>,
                  h2: ({ children }) => <p className="mb-1">{children}</p>,
                  h3: ({ children }) => <p className="mb-1">{children}</p>,
                  h4: ({ children }) => <p className="mb-1">{children}</p>,
                  h5: ({ children }) => <p className="mb-1">{children}</p>,
                  h6: ({ children }) => <p className="mb-1">{children}</p>,
                  ul: ({ children }) => <p className="mb-1">{children}</p>,
                  ol: ({ children }) => <p className="mb-1">{children}</p>,
                  li: ({ children }) => <span>{children} </span>,
                  strong: ({ children }) => <strong>{children}</strong>,
                  em: ({ children }) => <em>{children}</em>,
                  blockquote: ({ children }) => <p className="mb-1">{children}</p>,
                  code: ({ children }) => <span>{children}</span>,
                  pre: ({ children }) => <p className="mb-1">{children}</p>,
                  hr: () => <br />,
                  a: ({ children }) => <span>{children}</span>,
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
         </div>
         
         {!pdfUrl && (
           <div className="modal-footer">
             <button className="modal-btn modal-btn-secondary" onClick={onClose}>
               Tutup
             </button>
           </div>
         )}
       </div>
    </div>
  )
}

