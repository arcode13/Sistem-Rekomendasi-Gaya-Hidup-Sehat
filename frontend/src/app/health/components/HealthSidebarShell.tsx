'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { healthApi, type HealthChatSessionItem } from '@/lib/api/health'
import type { HealthUser } from '@/lib/api/healthAuth'

interface HealthSidebarShellProps {
  children: ReactNode
  onNewAnalysis: () => void
  currentUser: HealthUser
  onShowToast: (message: string, type?: 'success' | 'error') => void
  hasActiveChat?: boolean
  onOpenSettings?: () => void
  onLogout?: () => void
}

export function HealthSidebarShell({ 
  children, 
  onNewAnalysis, 
  currentUser,
  onShowToast,
  hasActiveChat = false,
  onOpenSettings,
  onLogout
}: HealthSidebarShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const getExamIdFromPath = (path: string | null): string | null => {
    if (!path) return null
    const segments = path.split('/').filter(Boolean)
    if (segments.length === 1) {
      return segments[0]
    }
    if (segments.length >= 2 && segments[0] === 'health') {
      return segments[1]
    }
    return null
  }
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sessions, setSessions] = useState<HealthChatSessionItem[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [chatToDelete, setChatToDelete] = useState<HealthChatSessionItem | null>(null)
  const [isRenaming, setIsRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameBlurTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    if (saved === 'true') {
      setSidebarCollapsed(true)
    }
  }, [])

  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true)
    const startTime = Date.now()
    try {
      const data = await healthApi.listSessions()
      setSessions(data.sessions)
      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, 1000 - elapsedTime)
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime))
      }
      return data.sessions
    } catch (error) {
      console.error('Failed to load sessions', error)
      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, 1000 - elapsedTime)
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime))
      }
      return []
    } finally {
      setIsLoadingSessions(false)
    }
  }, [])

  useEffect(() => {
    if (currentUser) {
      loadSessions()
    }
  }, [currentUser, loadSessions])

  useEffect(() => {
    const updateActiveSession = async () => {
      const examId = getExamIdFromPath(pathname)
      if (!examId) {
        setActiveSessionId(null)
        return
      }
      const loadedSessions = await loadSessions()
      const session = loadedSessions.find(s => s.examination_id === examId)
      if (session) {
        setActiveSessionId(session.id)
      }
    }
    
    updateActiveSession()
  }, [pathname, loadSessions])

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    localStorage.setItem('sidebarCollapsed', String(newState))
  }

  const openDoctorSidebarModal = () => {
    const modal = document.getElementById('doctorModal')
    if (modal) modal.classList.add('active')
  }


  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleChatItemClick = (session: HealthChatSessionItem, e: React.MouseEvent) => {
    const isMenuClick = (e.target as HTMLElement).closest('.chat-menu-btn') || (e.target as HTMLElement).closest('.chat-menu')
    if (isMenuClick) {
      return
    }
    
    if (session.examination_id) {
      router.push(`/health/${session.examination_id}`)
      setActiveSessionId(session.id)
    } else {
      onShowToast('Sesi tidak memiliki data pemeriksaan', 'error')
    }
    
    if (window.innerWidth <= 768) {
      setSidebarOpen(false)
      document.body.style.overflow = ''
    }
  }

  const handleMenuClick = (e: React.MouseEvent, session: HealthChatSessionItem) => {
    e.stopPropagation()
    e.preventDefault()
    
    const chatItem = (e.currentTarget as HTMLElement).closest('.sidebar-chat-item')
    const isAlreadyOpen = chatItem?.classList.contains('menu-open')
    
    if (isAlreadyOpen) {
      setShowContextMenu(false)
      setActiveChatId(null)
      chatItem?.classList.remove('menu-open')
      return
    }
    
    document.querySelectorAll('.sidebar-chat-item.menu-open').forEach(el => {
      el.classList.remove('menu-open')
    })
    
    setActiveChatId(session.id)
    chatItem?.classList.add('menu-open')
    setShowContextMenu(true)
  }

  const handleRename = () => {
    if (!activeChatId) return
    
    const session = sessions.find(s => s.id === activeChatId)
    if (session) {
      const currentTitle = session.title || ''
      setRenameValue(currentTitle)
      setIsRenaming(activeChatId)
      setShowContextMenu(false)
      document.querySelectorAll('.sidebar-chat-item.menu-open').forEach(el => {
        el.classList.remove('menu-open')
      })
    }
  }

  useEffect(() => {
    if (isRenaming) {
      const session = sessions.find(s => s.id === isRenaming)
      if (session && renameValue === '') {
        setRenameValue(session.title || '')
      }
    }
  }, [isRenaming, sessions, renameValue])

  const handleRenameInputRef = useCallback((input: HTMLInputElement | null) => {
    if (input && isRenaming) {
      setTimeout(() => {
        input.focus()
        input.select()
      }, 0)
    }
  }, [isRenaming])

  const handleRenameSubmit = async () => {
    if (renameBlurTimeoutRef.current) {
      clearTimeout(renameBlurTimeoutRef.current)
      renameBlurTimeoutRef.current = null
    }

    if (!isRenaming) {
      setIsRenaming(null)
      setRenameValue('')
      return
    }

    const session = sessions.find(s => s.id === isRenaming)
    if (!session) {
      setIsRenaming(null)
      setRenameValue('')
      return
    }

    const newText = renameValue.trim() || session.title || 'Tanpa judul'
    
    if (newText === session.title) {
      setIsRenaming(null)
      setRenameValue('')
      return
    }

    try {
      await healthApi.updateSessionTitle(isRenaming, newText)
      const updatedSessions = await loadSessions()
      const updatedSession = updatedSessions.find(s => s.id === isRenaming)
      if (updatedSession) {
        setRenameValue(updatedSession.title || '')
      }
      setIsRenaming(null)
      onShowToast('Nama chat berhasil diubah')
    } catch (error) {
      console.error('Failed to rename session', error)
      onShowToast('Gagal mengubah nama chat', 'error')
      setIsRenaming(null)
      setRenameValue('')
    }
  }

  const handleRenameBlur = () => {
    if (renameBlurTimeoutRef.current) {
      clearTimeout(renameBlurTimeoutRef.current)
    }
    renameBlurTimeoutRef.current = setTimeout(() => {
      handleRenameSubmit()
    }, 200)
  }

  const handleDelete = () => {
    if (!activeChatId) return
    
    const session = sessions.find(s => s.id === activeChatId)
    if (session) {
      setChatToDelete(session)
      setShowDeleteModal(true)
      setShowContextMenu(false)
      document.querySelectorAll('.sidebar-chat-item.menu-open').forEach(el => {
        el.classList.remove('menu-open')
      })
    }
  }

  const confirmDelete = async () => {
    if (!chatToDelete) return

    try {
      await healthApi.deleteSession(chatToDelete.id)
      await loadSessions()
      const examId = getExamIdFromPath(pathname)
      if (examId && chatToDelete.examination_id === examId) {
        router.push('/')
      }
      onShowToast('Chat berhasil dihapus')
      setShowDeleteModal(false)
      setChatToDelete(null)
    } catch (error) {
      console.error('Failed to delete session', error)
      onShowToast('Gagal menghapus chat', 'error')
    }
  }

  useEffect(() => {
    if (showContextMenu && activeChatId && contextMenuRef.current) {
      const menuBtn = document.querySelector(`.sidebar-chat-item[data-id="${activeChatId}"] .chat-menu-btn`) as HTMLElement
      if (menuBtn) {
        requestAnimationFrame(() => {
          if (contextMenuRef.current) {
            const rect = menuBtn.getBoundingClientRect()
            contextMenuRef.current.style.top = `${rect.bottom + 5}px`
            contextMenuRef.current.style.left = `${rect.left}px`
            contextMenuRef.current.style.position = 'fixed'
          }
        })
      }
    }
  }, [showContextMenu, activeChatId])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const menuBtn = target.closest('.chat-menu-btn')
      const isDropdown = target.closest('.chat-dropdown')
      
      if (!menuBtn && !isDropdown) {
        if (showContextMenu) {
          setShowContextMenu(false)
          setActiveChatId(null)
          document.querySelectorAll('.sidebar-chat-item.menu-open').forEach(el => {
            el.classList.remove('menu-open')
          })
        }
      }
      
      if (showProfileDropdown && !sidebarRef.current?.contains(target)) {
        if (!target.closest('.profile-dropdown')) {
          setShowProfileDropdown(false)
        }
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showContextMenu, showProfileDropdown])

  const formatPhone = (phone: string | null | undefined): string => {
    if (!phone) return ''
    if (phone.startsWith('+62')) return phone
    if (phone.startsWith('62')) return `+${phone}`
    return `+62 ${phone}`
  }

  return (
    <>
      <div 
        className={`sidebar-backdrop ${sidebarOpen ? 'show' : ''}`}
        id="sidebarBackdrop"
        onClick={() => {
          setSidebarOpen(false)
          document.body.style.overflow = ''
        }}
      />

      <div 
        ref={sidebarRef}
        className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${sidebarOpen ? 'open' : ''}`}
        id="sidebar"
      >
        <button 
          className="sidebar-close-btn" 
          id="sidebarCloseBtn"
          onClick={() => {
            setSidebarOpen(false)
            document.body.style.overflow = ''
          }}
        >
          <i className="fa fa-times"></i>
        </button>

        <div className="sidebar-header">
          <a href="" className="sidebar-logo-link">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Logo" className="sidebar-logo" />
          </a>
          <button 
            className="sidebar-toggle" 
            id="sidebarToggle" 
            data-tooltip-bottom={sidebarCollapsed ? 'Buka' : 'Tutup'}
            onClick={toggleSidebar}
          >
            <i className={sidebarCollapsed ? 'fa fa-times' : 'fa fa-bars'}></i>
          </button>
        </div>

        <div className="sidebar-content">
          <div className="sidebar-section">
            <button 
              className="btn-new-chat" 
              id="btnNewChat" 
              data-tooltip="Rekomendasi Baru"
              onClick={() => {
                onNewAnalysis()
                if (window.innerWidth <= 768) {
                  setSidebarOpen(false)
                  document.body.style.overflow = ''
                }
              }}
            >
              <i className="fa-solid fa-pen-to-square"></i>
              <span>Rekomendasi Baru</span>
            </button>
            <button 
              className="btn-sidebar-action" 
              id="btnContactDoctor" 
              data-tooltip="Hubungi Dokter"
              onClick={openDoctorSidebarModal}
            >
              <i className="fa fa-user-md"></i>
              <span>Hubungi Dokter</span>
            </button>
            <a 
              href="https://www.google.com/maps/search/rumah+sakit+terdekat" 
              target="_blank" 
              className="btn-sidebar-action btn-sidebar-link" 
              data-tooltip="RS Terdekat"
            >
              <i className="fa fa-hospital"></i>
              <span>RS Terdekat</span>
            </a>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-title">Riwayat Rekomendasi</div>
            <div className="sidebar-chats">
              {isLoadingSessions ? (
                <div className="sidebar-empty-state">
                  <span className="loading-spinner-small"></span>
                </div>
              ) : sessions.length === 0 ? (
                <div className="sidebar-empty-state">Riwayat Rekomendasi masih kosong</div>
              ) : (
                sessions.map((session) => (
                  <div 
                    key={session.id} 
                    className={`sidebar-chat-item ${activeSessionId === session.id ? 'active' : ''}`}
                    data-id={session.id}
                    onClick={(e) => handleChatItemClick(session, e)}
                  >
                    {isRenaming === session.id ? (
                      <input
                        ref={handleRenameInputRef}
                        type="text"
                        className="chat-rename-input"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={handleRenameBlur}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            if (renameBlurTimeoutRef.current) {
                              clearTimeout(renameBlurTimeoutRef.current)
                            }
                            handleRenameSubmit()
                          } else if (e.key === 'Escape') {
                            if (renameBlurTimeoutRef.current) {
                              clearTimeout(renameBlurTimeoutRef.current)
                            }
                            setIsRenaming(null)
                            setRenameValue('')
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="chat-title">{session.title || 'Tanpa judul'}</span>
                    )}
                    <div className="chat-menu">
                      <button 
                        className="chat-menu-btn"
                        onClick={(e) => handleMenuClick(e, session)}
                      >
                        <i className="fa fa-ellipsis-h"></i>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <div 
            className="user-profile" 
            id="userProfileBtn" 
            data-tooltip={currentUser.name}
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
          >
            <div className="user-avatar">{getInitials(currentUser.name || '')}</div>
            <div className="user-info">
              <div className="user-name">{currentUser.name}</div>
              <div className="user-email">{currentUser.email}</div>
            </div>
          </div>
        </div>
      </div>

      {showProfileDropdown && (
        <div className="profile-dropdown show" id="profileDropdown">
          <div className="profile-dropdown-header">
            <div className="user-avatar">{getInitials(currentUser.name || '')}</div>
            <div className="profile-dropdown-info">
              <div className="profile-dropdown-name">{currentUser.name}</div>
              <div className="profile-dropdown-phone">{formatPhone(currentUser.phone)}</div>
            </div>
          </div>
          <div className="profile-dropdown-divider"></div>
          <div className="profile-dropdown-section">
            <button 
              className="profile-dropdown-item" 
              id="btnSettings"
              onClick={() => {
                setShowProfileDropdown(false)
                if (window.innerWidth <= 768) {
                  setSidebarOpen(false)
                  document.body.style.overflow = ''
                }
                if (onOpenSettings) onOpenSettings()
              }}
            >
              <i className="fa fa-cog"></i>
              <span>Pengaturan</span>
            </button>
            <div className="profile-dropdown-divider"></div>
            <button 
              className="profile-dropdown-item logout"
              onClick={() => {
                setShowProfileDropdown(false)
                if (window.innerWidth <= 768) {
                  setSidebarOpen(false)
                  document.body.style.overflow = ''
                }
                if (onLogout) onLogout()
              }}
            >
              <i className="fa fa-sign-out-alt"></i>
              <span>Keluar</span>
            </button>
          </div>
        </div>
      )}

      {showContextMenu && activeChatId && (
        <div className="chat-dropdown show" id="contextMenu" ref={contextMenuRef}>
          <button className="dropdown-item" id="menuRename" onClick={handleRename}>
            <i className="fa fa-pencil-alt"></i> Ganti nama
          </button>
          <button className="dropdown-item delete" id="menuDelete" onClick={handleDelete}>
            <i className="fa fa-trash"></i> Hapus
          </button>
        </div>
      )}

      {showDeleteModal && chatToDelete && (
        <div className="modal-overlay active" id="deleteConfirmModal" onClick={() => setShowDeleteModal(false)}>
          <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Hapus chat?</h3>
            <div className="delete-modal-body">
              Ini akan menghapus <strong id="deleteChatTitle">{chatToDelete.title}</strong>.
            </div>
            <div className="delete-modal-actions">
              <button 
                className="btn-cancel-delete" 
                id="cancelDeleteBtn"
                onClick={() => setShowDeleteModal(false)}
              >
                Batal
              </button>
              <button 
                className="btn-confirm-delete" 
                id="confirmDeleteBtn"
                onClick={confirmDelete}
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}


      <div className="container">
        <div className="top-header" id="topHeader">
          <div className="header-left">
            <button 
              className="mobile-menu-btn" 
              id="mobileMenuBtn"
              onClick={() => {
                setSidebarOpen(true)
                document.body.style.overflow = 'hidden'
              }}
            >
              <i className="fa fa-bars"></i>
            </button>
            <span className="header-title-text">Asisten AI</span>
          </div>
          <div className="header-right" id="topHeaderRight">
            {hasActiveChat && (
              <button 
                className="btn-delete-chat" 
                id="headerDeleteBtn"
                onClick={() => {
                  const examId = getExamIdFromPath(pathname)
                  const currentSession = examId
                    ? sessions.find(s => s.examination_id === examId)
                    : null
                  if (currentSession) {
                    setChatToDelete(currentSession)
                  }
                  setShowDeleteModal(true)
                }}
              >
                <i className="far fa-trash-alt"></i> <span>Hapus</span>
              </button>
            )}
          </div>
        </div>
        {children}
      </div>
    </>
  )
}
