'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { SpeechRecognition, SpeechRecognitionEvent, SpeechRecognitionErrorEvent } from '../types'

interface ChatInputProps {
  onSend: (message: string) => void
}

export function ChatInput({ onSend }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [showSendBtn, setShowSendBtn] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [showVoiceTooltip, setShowVoiceTooltip] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const autoResize = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    
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
  }, [])

  const toggleSendButton = useCallback(() => {
    const hasText = message.trim().length > 0
    setShowSendBtn(hasText)
  }, [message])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop()
      } catch (error) {
        console.error('Error stopping recognition:', error)
      }
    }
    setIsListening(false)
  }, [isListening])

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
          setMessage(transcript)
        }
        
        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error)
          stopListening()
        }
        
        recognitionRef.current.onend = () => {
          stopListening()
        }
      }
    }
  }, [stopListening])

  useEffect(() => {
    toggleSendButton()
    autoResize()
  }, [message, toggleSendButton, autoResize])

  useEffect(() => {
    if (!isSending && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isSending])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const msg = message.trim()
    if (!msg || isSending) return

    setIsSending(true)
    setMessage('')
    autoResize()

    try {
      await onSend(msg)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start()
      } catch (error) {
        console.error('Error starting recognition:', error)
        stopListening()
      }
    }
  }

  const handleVoiceClick = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const hasVoiceRecognition = recognitionRef.current !== null

  return (
    <form className="chat-input-form" onSubmit={handleSubmit}>
      {hasVoiceRecognition && !isSending && (
        <div className="btn-voice-wrapper">
          <button
            type="button"
            className={`btn-voice ${isListening ? 'listening' : ''}`}
            onClick={handleVoiceClick}
            onMouseEnter={() => setShowVoiceTooltip(true)}
            onMouseLeave={() => setShowVoiceTooltip(false)}
          >
            <i className={`fa ${isListening ? 'fa-stop' : 'fa-microphone'}`}></i>
          </button>
          {showVoiceTooltip && (
            <div className="chat-tooltip tooltip-voice">Tekan untuk berbicara</div>
          )}
        </div>
      )}
      <textarea
        ref={textareaRef}
        className="chat-input"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isListening ? 'Mendengarkan...' : 'Ketik pertanyaan Anda di sini...'}
        rows={1}
        disabled={isSending}
      />
      <button
        type="submit"
        className={`btn-send ${showSendBtn || isSending ? 'show' : ''} ${isSending ? 'btn-loading-spinner' : ''}`}
        disabled={isSending}
      >
        {isSending ? <span className="loading-spinner-small"></span> : 'Kirim'}
      </button>
    </form>
  )
}

