'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { healthAuthApi, type HealthUser, HEALTH_USER_STORAGE_KEY } from '@/lib/api/healthAuth'
import type { HealthRegisterRequest, HealthLoginRequest, HealthUserUpdateRequest } from '@/lib/api/healthAuth'
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store'
import apiClient from '@/lib/api/client'

interface HealthAuthBarProps {
  onUserChange: (user: HealthUser | null) => void
  hasActiveChat: boolean
  onRequestNewRecommendation: () => void
  onShowToast?: (message: string, type?: 'success' | 'error') => void
  showAuthBar?: boolean
}

export function HealthAuthBar({ onUserChange, hasActiveChat, onRequestNewRecommendation, onShowToast, showAuthBar = true }: HealthAuthBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setUser: setAdminUser, logout: logoutAdmin } = useAdminAuthStore()
  const [user, setUser] = useState<HealthUser | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false)
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false)

  const [loginForm, setLoginForm] = useState<HealthLoginRequest>({
    email: '',
    password: '',
  })
  const [loginErrors, setLoginErrors] = useState<{
    email?: string
    password?: string
  }>({})

  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [forgotPasswordError, setForgotPasswordError] = useState<string | undefined>()
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false)

  const [resetPasswordToken, setResetPasswordToken] = useState<string | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('')
  const [resetPasswordErrors, setResetPasswordErrors] = useState<{
    password?: string
    confirmPassword?: string
    general?: string
  }>({})
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(false)

  const [registerForm, setRegisterForm] = useState<HealthRegisterRequest>({
    name: '',
    email: '',
    phone: '',
    gender: undefined,
    password: '',
  })
  const [confirmPassword, setConfirmPassword] = useState('')
  const [registerErrors, setRegisterErrors] = useState<{
    name?: string
    email?: string
    phone?: string
    gender?: string
    password?: string
    confirmPassword?: string
  }>({})

  const [settingsForm, setSettingsForm] = useState<HealthUserUpdateRequest>({
    name: '',
    email: '',
    phone: '',
    gender: undefined,
    password: '',
  })

  const loadUser = useCallback(async () => {
    setIsLoadingUser(true)
    try {
      const adminAuthStorage = localStorage.getItem('admin-auth-storage')
      if (adminAuthStorage) {
        try {
          const parsed = JSON.parse(adminAuthStorage)
          if (parsed?.isAuthenticated && parsed?.user) {
            localStorage.removeItem(HEALTH_USER_STORAGE_KEY)
            setUser(null)
            onUserChange(null)
            setIsLoadingUser(false)
            return
          }
        } catch {
        }
      }

      const stored = localStorage.getItem(HEALTH_USER_STORAGE_KEY)
      if (stored) {
        const userData = JSON.parse(stored) as HealthUser
        if (userData.token) {
          const me = await healthAuthApi.me()
          if (me.role === 'Perawat') {
            localStorage.removeItem(HEALTH_USER_STORAGE_KEY)
            setUser(null)
            onUserChange(null)
            setIsLoadingUser(false)
            return
          }
          setUser(me)
          onUserChange(me)
        } else {
          setUser(null)
          onUserChange(null)
        }
      } else {
        setUser(null)
        onUserChange(null)
      }
    } catch (error) {
      console.error('Failed to load user', error)
      localStorage.removeItem(HEALTH_USER_STORAGE_KEY)
      setUser(null)
      onUserChange(null)
    } finally {
      setIsLoadingUser(false)
    }
  }, [onUserChange])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      setResetPasswordToken(token)
      setShowResetPasswordModal(true)
      const newUrl = window.location.pathname
      router.replace(newUrl, { scroll: false })
    }
  }, [searchParams, router])

  const validateLoginForm = (): boolean => {
    const errors: typeof loginErrors = {}
    
    if (!loginForm.email || loginForm.email.trim() === '') {
      errors.email = 'Email wajib diisi'
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(loginForm.email)) {
        errors.email = 'Format email tidak valid'
      }
    }
    
    if (!loginForm.password || loginForm.password === '') {
      errors.password = 'Kata sandi wajib diisi'
    }
    
    setLoginErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateLoginForm()) {
      return
    }
    
    setIsLoggingIn(true)
    try {
      const response = await healthAuthApi.login(loginForm)
      const userRole = response.user.role || 'Pasien'
      
      if (userRole === 'Perawat') {
        logoutAdmin()
        localStorage.removeItem(HEALTH_USER_STORAGE_KEY)
        setAdminUser({
          id: response.user.id,
          name: response.user.name || null,
          email: response.user.email,
          phone: response.user.phone || null,
          gender: response.user.gender || null,
          role: userRole,
          token: response.token,
        })
        setShowLoginModal(false)
        setLoginForm({ email: '', password: '' })
        setLoginErrors({})
        router.push('/dashboard')
        if (onShowToast) {
          onShowToast('Berhasil masuk sebagai Perawat')
        }
      } else {
        setAdminUser(null)
        localStorage.removeItem('admin-auth-storage')
        const userData: HealthUser = {
          id: response.user.id,
          name: response.user.name,
          email: response.user.email,
          phone: response.user.phone,
          gender: response.user.gender,
          token: response.token,
          role: userRole,
        }
        localStorage.setItem(HEALTH_USER_STORAGE_KEY, JSON.stringify(userData))
        setUser(userData)
        onUserChange(userData)
        setShowLoginModal(false)
        setIsLoggingIn(false)
        setLoginForm({ email: '', password: '' })
        setLoginErrors({})
        if (onShowToast) {
          onShowToast('Berhasil masuk')
        }
      }
    } catch (error) {
      const errorMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined
      
      const errorStr = errorMessage || 'Gagal masuk. Silakan coba lagi.'
      
      if (errorStr.includes('Email tidak ditemukan')) {
        setLoginErrors({ email: 'Email tidak ditemukan' })
        if (onShowToast) {
          onShowToast('Email tidak ditemukan', 'error')
        }
      } else if (errorStr.includes('Password salah')) {
        setLoginErrors({ password: 'Password salah' })
        if (onShowToast) {
          onShowToast('Password salah', 'error')
        }
      } else if (errorStr.includes('Format email tidak valid')) {
        setLoginErrors({ email: 'Format email tidak valid' })
        if (onShowToast) {
          onShowToast('Format email tidak valid', 'error')
        }
      } else if (errorStr.includes('Email wajib diisi')) {
        setLoginErrors({ email: 'Email wajib diisi' })
        if (onShowToast) {
          onShowToast('Email wajib diisi', 'error')
        }
      } else if (errorStr.includes('Kata sandi wajib diisi') || errorStr.includes('password wajib')) {
        setLoginErrors({ password: 'Kata sandi wajib diisi' })
        if (onShowToast) {
          onShowToast('Kata sandi wajib diisi', 'error')
        }
      } else {
        if (onShowToast) {
          onShowToast(errorStr, 'error')
        }
      }
    } finally {
      setIsLoggingIn(false)
    }
  }

  const validateRegisterForm = (): boolean => {
    const errors: typeof registerErrors = {}
    
    if (!registerForm.name || registerForm.name.trim() === '') {
      errors.name = 'Nama lengkap wajib diisi'
    } else if (registerForm.name.trim().length < 2) {
      errors.name = 'Nama lengkap minimal 2 karakter'
    } else if (registerForm.name.trim().length > 100) {
      errors.name = 'Nama lengkap maksimal 100 karakter'
    }
    
    if (!registerForm.email || registerForm.email.trim() === '') {
      errors.email = 'Email wajib diisi'
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(registerForm.email)) {
        errors.email = 'Format email tidak valid'
      }
    }
    
    if (!registerForm.phone || registerForm.phone.trim() === '') {
      errors.phone = 'Nomor telepon wajib diisi'
    } else {
      const phoneRegex = /^[0-9]+$/
      if (!phoneRegex.test(registerForm.phone)) {
        errors.phone = 'Nomor telepon hanya boleh berisi angka'
      } else if (registerForm.phone.length < 9) {
        errors.phone = 'Nomor telepon minimal 9 digit'
      } else if (registerForm.phone.length > 13) {
        errors.phone = 'Nomor telepon maksimal 13 digit'
      }
    }
    
    if (registerForm.gender === undefined || registerForm.gender === null) {
      errors.gender = 'Jenis kelamin wajib dipilih'
    } else if (registerForm.gender !== 1 && registerForm.gender !== 2) {
      errors.gender = 'Jenis kelamin tidak valid'
    }
    
    if (!registerForm.password || registerForm.password === '') {
      errors.password = 'Kata sandi wajib diisi'
    } else if (registerForm.password.length < 6) {
      errors.password = 'Kata sandi minimal 6 karakter'
    } else if (registerForm.password.length > 100) {
      errors.password = 'Kata sandi maksimal 100 karakter'
    }
    
    if (!confirmPassword || confirmPassword === '') {
      errors.confirmPassword = 'Konfirmasi kata sandi wajib diisi'
    } else if (registerForm.password !== confirmPassword) {
      errors.confirmPassword = 'Konfirmasi kata sandi tidak cocok'
    }
    
    setRegisterErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateRegisterForm()) {
      return
    }
    
    setIsRegistering(true)
    try {
      await healthAuthApi.register(registerForm)
      const loginResponse = await healthAuthApi.login({
        email: registerForm.email,
        password: registerForm.password,
      })
      const userRole = loginResponse.user.role || 'Pasien'
      
      if (userRole === 'Perawat') {
        logoutAdmin()
        localStorage.removeItem(HEALTH_USER_STORAGE_KEY)
        setAdminUser({
          id: loginResponse.user.id,
          name: loginResponse.user.name || null,
          email: loginResponse.user.email,
          phone: loginResponse.user.phone || null,
          gender: loginResponse.user.gender || null,
          role: userRole,
          token: loginResponse.token,
        })
        setShowRegisterModal(false)
        setRegisterForm({ name: '', email: '', phone: '', gender: undefined, password: '' })
        setConfirmPassword('')
        setRegisterErrors({})
        router.push('/dashboard')
        if (onShowToast) {
          onShowToast('Berhasil mendaftar sebagai Perawat')
        }
      } else {
        setAdminUser(null)
        localStorage.removeItem('admin-auth-storage')
        const userData: HealthUser = {
          id: loginResponse.user.id,
          name: loginResponse.user.name,
          email: loginResponse.user.email,
          phone: loginResponse.user.phone,
          gender: loginResponse.user.gender,
          token: loginResponse.token,
          role: userRole,
        }
        localStorage.setItem(HEALTH_USER_STORAGE_KEY, JSON.stringify(userData))
        setUser(userData)
        onUserChange(userData)
        setShowRegisterModal(false)
        setIsRegistering(false)
        setRegisterForm({ name: '', email: '', phone: '', gender: undefined, password: '' })
        setConfirmPassword('')
        setRegisterErrors({})
        if (onShowToast) {
          onShowToast('Berhasil mendaftar')
        }
      }
    } catch (error) {
      const errorMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined
      
      const errorStr = errorMessage || 'Gagal mendaftar. Silakan coba lagi.'
      
      if (errorStr.includes('Email sudah terdaftar')) {
        setRegisterErrors({ ...registerErrors, email: 'Email sudah terdaftar' })
        if (onShowToast) {
          onShowToast('Email sudah terdaftar', 'error')
        }
      } else if (errorStr.includes('Nomor telepon sudah terdaftar')) {
        setRegisterErrors({ ...registerErrors, phone: 'Nomor telepon sudah terdaftar' })
        if (onShowToast) {
          onShowToast('Nomor telepon sudah terdaftar', 'error')
        }
      } else if (errorStr.includes('Format email tidak valid')) {
        setRegisterErrors({ ...registerErrors, email: 'Format email tidak valid' })
        if (onShowToast) {
          onShowToast('Format email tidak valid', 'error')
        }
      } else if (errorStr.includes('Email wajib diisi')) {
        setRegisterErrors({ ...registerErrors, email: 'Email wajib diisi' })
        if (onShowToast) {
          onShowToast('Email wajib diisi', 'error')
        }
      } else if (errorStr.includes('Nomor telepon wajib diisi')) {
        setRegisterErrors({ ...registerErrors, phone: 'Nomor telepon wajib diisi' })
        if (onShowToast) {
          onShowToast('Nomor telepon wajib diisi', 'error')
        }
      } else if (errorStr.includes('Nomor telepon hanya boleh berisi angka')) {
        setRegisterErrors({ ...registerErrors, phone: 'Nomor telepon hanya boleh berisi angka' })
        if (onShowToast) {
          onShowToast('Nomor telepon hanya boleh berisi angka', 'error')
        }
      } else if (errorStr.includes('Nomor telepon minimal 9 digit')) {
        setRegisterErrors({ ...registerErrors, phone: 'Nomor telepon minimal 9 digit' })
        if (onShowToast) {
          onShowToast('Nomor telepon minimal 9 digit', 'error')
        }
      } else if (errorStr.includes('Nomor telepon maksimal 13 digit')) {
        setRegisterErrors({ ...registerErrors, phone: 'Nomor telepon maksimal 13 digit' })
        if (onShowToast) {
          onShowToast('Nomor telepon maksimal 13 digit', 'error')
        }
      } else if (errorStr.includes('Kata sandi wajib diisi') || errorStr.includes('password wajib')) {
        setRegisterErrors({ ...registerErrors, password: 'Kata sandi wajib diisi' })
        if (onShowToast) {
          onShowToast('Kata sandi wajib diisi', 'error')
        }
      } else if (errorStr.includes('Kata sandi minimal 6 karakter')) {
        setRegisterErrors({ ...registerErrors, password: 'Kata sandi minimal 6 karakter' })
        if (onShowToast) {
          onShowToast('Kata sandi minimal 6 karakter', 'error')
        }
      } else if (errorStr.includes('Kata sandi maksimal 100 karakter')) {
        setRegisterErrors({ ...registerErrors, password: 'Kata sandi maksimal 100 karakter' })
        if (onShowToast) {
          onShowToast('Kata sandi maksimal 100 karakter', 'error')
        }
      } else if (errorStr.includes('Jenis kelamin tidak valid')) {
        setRegisterErrors({ ...registerErrors, gender: 'Jenis kelamin tidak valid' })
        if (onShowToast) {
          onShowToast('Jenis kelamin tidak valid', 'error')
        }
      } else {
        if (onShowToast) {
          onShowToast(errorStr, 'error')
        }
      }
    } finally {
      setIsRegistering(false)
    }
  }

  const handleLogout = useCallback(() => {
    setShowLogoutModal(false)
    localStorage.removeItem(HEALTH_USER_STORAGE_KEY)
    logoutAdmin()
    setUser(null)
    onUserChange(null)
    if (onShowToast) {
      onShowToast('Berhasil keluar')
    }
    router.push('/')
  }, [onUserChange, onShowToast, logoutAdmin, router])

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdatingSettings(true)
    try {
      const updateData: HealthUserUpdateRequest = {}
      if (settingsForm.name) updateData.name = settingsForm.name
      if (settingsForm.email) updateData.email = settingsForm.email
      if (settingsForm.phone) updateData.phone = settingsForm.phone
      if (settingsForm.gender !== undefined) updateData.gender = settingsForm.gender
      if (settingsForm.password) updateData.password = settingsForm.password

      const updated = await healthAuthApi.updateMe(updateData)
      const stored = localStorage.getItem(HEALTH_USER_STORAGE_KEY)
      if (stored) {
        const userData = JSON.parse(stored) as HealthUser
        const updatedUser: HealthUser = {
          ...userData,
          name: updated.name,
          email: updated.email,
          phone: updated.phone || userData.phone,
          gender: updated.gender || userData.gender,
        }
        localStorage.setItem(HEALTH_USER_STORAGE_KEY, JSON.stringify(updatedUser))
        setUser(updatedUser)
        onUserChange(updatedUser)
        setSettingsForm({
          name: updatedUser.name || '',
          email: updatedUser.email,
          phone: updatedUser.phone || '',
          gender: updatedUser.gender || undefined,
          password: '',
        })
      }
      setShowSettingsModal(false)
      document.body.style.overflow = ''
      if (onShowToast) {
        onShowToast('Pengaturan berhasil disimpan')
      }
    } catch (error) {
      const errorMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined
      if (onShowToast) {
        onShowToast(errorMessage || 'Gagal memperbarui pengaturan.', 'error')
      }
    } finally {
      setIsUpdatingSettings(false)
    }
  }

  useEffect(() => {
    const handleSettingsClick = () => {
      if (user) {
        if (window.innerWidth <= 768) {
          document.body.style.overflow = 'hidden'
        }
        setShowSettingsModal(true)
        setSettingsForm({
          name: user.name || '',
          email: user.email,
          phone: user.phone || '',
          gender: user.gender || undefined,
          password: '',
        })
      }
    }

    const handleLogoutClick = () => {
      if (user && !showLogoutModal) {
        setShowLogoutModal(true)
      }
    }

    const settingsTrigger = document.querySelector('[data-settings-trigger]')
    const logoutTrigger = document.querySelector('[data-logout-trigger]')
    
    if (settingsTrigger) {
      settingsTrigger.addEventListener('click', handleSettingsClick)
    }
    
    if (logoutTrigger) {
      logoutTrigger.addEventListener('click', handleLogoutClick)
    }

    return () => {
      if (settingsTrigger) {
        settingsTrigger.removeEventListener('click', handleSettingsClick)
      }
      if (logoutTrigger) {
        logoutTrigger.removeEventListener('click', handleLogoutClick)
      }
    }
  }, [user, showLogoutModal])

  useEffect(() => {
    if (user) {
      setShowLoginModal(false)
      setShowRegisterModal(false)
      setIsLoggingIn(false)
      setIsRegistering(false)
    }
  }, [user])

  if (isLoadingUser) {
    return null
  }

  if (!user) {
    return (
      <>
        <header className="main-header">
          <div className="header-left">
            <a
              href=""
              className="header-logo-link"
              onClick={(e) => {
                e.preventDefault()
                if (hasActiveChat) {
                  onRequestNewRecommendation()
                }
              }}
            >
              <div className="header-logo-container" data-tooltip-bottom={hasActiveChat ? 'Rekomendasi Baru' : ''}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.svg" alt="Logo" className="header-logo" />
                {hasActiveChat && <i className="fa-solid fa-pen-to-square header-edit-icon"></i>}
              </div>
            </a>
            <span className="header-title">Asisten AI</span>
          </div>
          <div className="header-right">
            <button className="btn-header btn-login" onClick={() => setShowLoginModal(true)}>
              Masuk
            </button>
            <button className="btn-header btn-signup" onClick={() => setShowRegisterModal(true)}>
              Daftar
            </button>
          </div>
        </header>

        {showLoginModal && (
          <div className="modal-overlay active" onClick={() => {
            if (!isLoggingIn) {
              setShowLoginModal(false)
              setIsLoggingIn(false)
              setLoginErrors({})
            }
          }}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Masuk</h3>
                <button className="modal-close" onClick={() => {
                  if (!isLoggingIn) {
                    setShowLoginModal(false)
                    setIsLoggingIn(false)
                    setLoginErrors({})
                  }
                }} disabled={isLoggingIn}>
                  <i className="fa fa-times"></i>
                </button>
              </div>
              <form onSubmit={handleLogin}>
                <div className="modal-body">
                  <div className={`form-group ${loginErrors.email ? 'error' : ''}`}>
                    <label htmlFor="loginEmail">Email</label>
                    <input
                      type="email"
                      id="loginEmail"
                      value={loginForm.email}
                      onChange={(e) => {
                        setLoginForm({ ...loginForm, email: e.target.value })
                        if (loginErrors.email) {
                          setLoginErrors({ ...loginErrors, email: undefined })
                        }
                      }}
                      required
                      placeholder="Masukkan email Anda"
                      disabled={isLoggingIn}
                    />
                    {loginErrors.email && (
                      <div className="error-message">{loginErrors.email}</div>
                    )}
                  </div>
                  <div className={`form-group ${loginErrors.password ? 'error' : ''}`}>
                    <label htmlFor="loginPassword">Kata Sandi</label>
                    <input
                      type="password"
                      id="loginPassword"
                      value={loginForm.password}
                      onChange={(e) => {
                        setLoginForm({ ...loginForm, password: e.target.value })
                        if (loginErrors.password) {
                          setLoginErrors({ ...loginErrors, password: undefined })
                        }
                      }}
                      required
                      placeholder="Masukkan kata sandi Anda"
                      disabled={isLoggingIn}
                    />
                    {loginErrors.password && (
                      <div className="error-message">{loginErrors.password}</div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', margin: '10px 0 20px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLoginModal(false)
                        setShowForgotPasswordModal(true)
                        setLoginForm({ email: '', password: '' })
                        setLoginErrors({})
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#667eea',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        fontSize: '14px',
                        padding: 0
                      }}
                      disabled={isLoggingIn}
                    >
                      Lupa kata sandi?
                    </button>
                  </div>
                  <button type="submit" className="btn-predict" disabled={isLoggingIn}>
                    {isLoggingIn ? (
                      <>
                        <span className="btn-send-loading-spinner"></span> Mohon tunggu
                      </>
                    ) : (
                      'Masuk'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showForgotPasswordModal && (
          <div className="modal-overlay active" onClick={() => {
            if (!isSendingResetEmail) {
              setShowForgotPasswordModal(false)
              setForgotPasswordEmail('')
              setForgotPasswordError(undefined)
              setForgotPasswordSuccess(false)
              setIsSendingResetEmail(false)
            }
          }}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Lupa Kata Sandi</h3>
                <button className="modal-close" onClick={() => {
                  if (!isSendingResetEmail) {
                    setShowForgotPasswordModal(false)
                    setForgotPasswordEmail('')
                    setForgotPasswordError(undefined)
                    setForgotPasswordSuccess(false)
                    setIsSendingResetEmail(false)
                  }
                }} disabled={isSendingResetEmail}>
                  <i className="fa fa-times"></i>
                </button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault()
                if (isSendingResetEmail) return

                setForgotPasswordError(undefined)
                setForgotPasswordSuccess(false)

                if (!forgotPasswordEmail || !forgotPasswordEmail.trim()) {
                  setForgotPasswordError('Email wajib diisi')
                  return
                }

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                if (!emailRegex.test(forgotPasswordEmail)) {
                  setForgotPasswordError('Format email tidak valid')
                  return
                }

                setIsSendingResetEmail(true)
                try {
                  const result = await healthAuthApi.forgotPassword(forgotPasswordEmail)
                  if (result.success) {
                    setForgotPasswordSuccess(true)
                    if (onShowToast) {
                      onShowToast(result.message || 'Email reset kata sandi telah dikirim', 'success')
                    }
                  }
                } catch (error: unknown) {
                  let errorMessage = 'Gagal mengirim email reset kata sandi'
                  if (error && typeof error === 'object') {
                    if ('response' in error && error.response && typeof error.response === 'object' && 'data' in error.response) {
                      const data = error.response.data
                      if (data && typeof data === 'object' && 'detail' in data && typeof data.detail === 'string') {
                        errorMessage = data.detail
                      }
                    } else if ('message' in error && typeof error.message === 'string') {
                      errorMessage = error.message
                    }
                  }
                  setForgotPasswordError(errorMessage)
                  if (onShowToast) {
                    onShowToast(errorMessage, 'error')
                  }
                } finally {
                  setIsSendingResetEmail(false)
                }
              }}>
                <div className="modal-body">
                  {!forgotPasswordSuccess ? (
                    <>
                      <div className={`form-group ${forgotPasswordError ? 'error' : ''}`}>
                        <label htmlFor="forgotPasswordEmail">Email</label>
                        <input
                          type="email"
                          id="forgotPasswordEmail"
                          value={forgotPasswordEmail}
                          onChange={(e) => {
                            setForgotPasswordEmail(e.target.value)
                            if (forgotPasswordError) {
                              setForgotPasswordError(undefined)
                            }
                          }}
                          required
                          placeholder="Masukkan email Anda"
                          disabled={isSendingResetEmail}
                          autoFocus
                        />
                        {forgotPasswordError && (
                          <div className="error-message">{forgotPasswordError}</div>
                        )}
                      </div>
                      <button type="submit" className="btn-predict" disabled={isSendingResetEmail}>
                        {isSendingResetEmail ? (
                          <>
                            <span className="btn-send-loading-spinner"></span> Mengirim...
                          </>
                        ) : (
                          'Kirim Link Reset'
                        )}
                      </button>
                      <div style={{ textAlign: 'center', marginTop: '15px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setShowForgotPasswordModal(false)
                            setShowLoginModal(true)
                            setForgotPasswordEmail('')
                            setForgotPasswordError(undefined)
                            setForgotPasswordSuccess(false)
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#667eea',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            fontSize: '14px',
                            padding: 0
                          }}
                          disabled={isSendingResetEmail}
                        >
                          Kembali
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <div style={{ fontSize: '48px', color: '#4caf50', marginBottom: '20px' }}>
                        <i className="fa fa-check-circle"></i>
                      </div>
                      <h4 style={{ marginBottom: '15px', color: '#333' }}>Email Terkirim!</h4>
                      <p style={{ marginBottom: '25px', color: '#666', lineHeight: '1.6' }}>
                        Kami telah mengirimkan link reset kata sandi ke email <strong>{forgotPasswordEmail}</strong>.
                        Silakan cek inbox email Anda dan ikuti instruksi untuk mereset kata sandi.
                      </p>
                      <p style={{ marginBottom: '25px', color: '#999', fontSize: '13px' }}>
                        Tidak menerima email? Cek folder spam atau coba lagi dalam beberapa saat.
                      </p>
                      <button
                        type="button"
                        className="btn-predict"
                        onClick={() => {
                          setShowForgotPasswordModal(false)
                          setShowLoginModal(true)
                          setForgotPasswordEmail('')
                          setForgotPasswordError(undefined)
                          setForgotPasswordSuccess(false)
                        }}
                      >
                        Kembali
                      </button>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {showResetPasswordModal && (
          <div className="modal-overlay active" onClick={() => {
            if (!isResettingPassword) {
              setShowResetPasswordModal(false)
              setResetPassword('')
              setResetPasswordConfirm('')
              setResetPasswordErrors({})
              setResetPasswordSuccess(false)
              setResetPasswordToken(null)
              setIsResettingPassword(false)
            }
          }}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Reset Kata Sandi</h3>
                <button className="modal-close" onClick={() => {
                  if (!isResettingPassword) {
                    setShowResetPasswordModal(false)
                    setResetPassword('')
                    setResetPasswordConfirm('')
                    setResetPasswordErrors({})
                    setResetPasswordSuccess(false)
                    setResetPasswordToken(null)
                    setIsResettingPassword(false)
                  }
                }} disabled={isResettingPassword}>
                  <i className="fa fa-times"></i>
                </button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault()
                if (isResettingPassword || !resetPasswordToken) return

                setResetPasswordErrors({})
                setResetPasswordSuccess(false)

                const errors: { password?: string; confirmPassword?: string; general?: string } = {}

                if (!resetPassword || !resetPassword.trim()) {
                  errors.password = 'Kata sandi baru wajib diisi'
                } else if (resetPassword.length < 6) {
                  errors.password = 'Kata sandi minimal 6 karakter'
                } else if (resetPassword.length > 100) {
                  errors.password = 'Kata sandi maksimal 100 karakter'
                }

                if (!resetPasswordConfirm || !resetPasswordConfirm.trim()) {
                  errors.confirmPassword = 'Konfirmasi kata sandi wajib diisi'
                } else if (resetPassword !== resetPasswordConfirm) {
                  errors.confirmPassword = 'Kata sandi dan konfirmasi kata sandi tidak sama'
                }

                if (Object.keys(errors).length > 0) {
                  setResetPasswordErrors(errors)
                  if (onShowToast) {
                    const firstError = Object.values(errors)[0]
                    onShowToast(firstError || 'Mohon periksa kembali data yang Anda masukkan', 'error')
                  }
                  return
                }

                setIsResettingPassword(true)
                try {
                  const response = await apiClient.post('/auth/reset-password', {
                    token: resetPasswordToken,
                    new_password: resetPassword
                  })

                  if (response.data.success) {
                    setResetPasswordSuccess(true)
                    if (onShowToast) {
                      onShowToast('Kata sandi berhasil direset. Silakan login dengan kata sandi baru.', 'success')
                    }
                  }
                } catch (error: unknown) {
                  let errorMessage = 'Gagal mereset kata sandi'
                  if (error && typeof error === 'object') {
                    if ('response' in error && error.response && typeof error.response === 'object' && 'data' in error.response) {
                      const data = error.response.data
                      if (data && typeof data === 'object' && 'detail' in data && typeof data.detail === 'string') {
                        errorMessage = data.detail
                      }
                    } else if ('message' in error && typeof error.message === 'string') {
                      errorMessage = error.message
                    }
                  }
                  setResetPasswordErrors({ general: errorMessage })
                  if (onShowToast) {
                    onShowToast(errorMessage, 'error')
                  }
                } finally {
                  setIsResettingPassword(false)
                }
              }}>
                <div className="modal-body">
                  {!resetPasswordSuccess ? (
                    <>
                      {!resetPasswordToken && (
                        <div className="error-message">
                          Token tidak valid. Silakan minta link reset password baru.
                        </div>
                      )}
                      {resetPasswordToken && (
                        <>
                          <div className={`form-group ${resetPasswordErrors.password ? 'error' : ''}`}>
                            <label htmlFor="resetPassword">Kata Sandi Baru</label>
                            <input
                              type="password"
                              id="resetPassword"
                              value={resetPassword}
                              onChange={(e) => {
                                setResetPassword(e.target.value)
                                if (resetPasswordErrors.password) {
                                  setResetPasswordErrors({ ...resetPasswordErrors, password: undefined })
                                }
                              }}
                              required
                              placeholder="Masukkan kata sandi baru"
                              disabled={isResettingPassword}
                              minLength={6}
                              maxLength={100}
                              autoFocus
                            />
                            {resetPasswordErrors.password && (
                              <div className="error-message">{resetPasswordErrors.password}</div>
                            )}
                          </div>
                          <div className={`form-group ${resetPasswordErrors.confirmPassword ? 'error' : ''}`}>
                            <label htmlFor="resetPasswordConfirm">Konfirmasi Kata Sandi</label>
                            <input
                              type="password"
                              id="resetPasswordConfirm"
                              value={resetPasswordConfirm}
                              onChange={(e) => {
                                setResetPasswordConfirm(e.target.value)
                                if (resetPasswordErrors.confirmPassword) {
                                  setResetPasswordErrors({ ...resetPasswordErrors, confirmPassword: undefined })
                                }
                              }}
                              required
                              placeholder="Masukkan ulang kata sandi baru"
                              disabled={isResettingPassword}
                              minLength={6}
                              maxLength={100}
                            />
                            {resetPasswordErrors.confirmPassword && (
                              <div className="error-message">{resetPasswordErrors.confirmPassword}</div>
                            )}
                          </div>
                          {resetPasswordErrors.general && (
                            <div className="error-message">{resetPasswordErrors.general}</div>
                          )}
                          <button type="submit" className="btn-predict" disabled={isResettingPassword}>
                            {isResettingPassword ? (
                              <>
                                <span className="btn-send-loading-spinner"></span> Mereset...
                              </>
                            ) : (
                              'Reset Kata Sandi'
                            )}
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <div style={{ fontSize: '48px', color: '#4caf50', marginBottom: '20px' }}>
                        <i className="fa fa-check-circle"></i>
                      </div>
                      <h4 style={{ marginBottom: '15px', color: '#333' }}>Kata Sandi Berhasil Direset!</h4>
                      <p style={{ marginBottom: '25px', color: '#666', lineHeight: '1.6' }}>
                        Kata sandi Anda telah berhasil direset. Silahkan kembali ke halaman login.
                      </p>
                      <button
                        type="button"
                        className="btn-predict"
                        onClick={() => {
                          setShowResetPasswordModal(false)
                          setShowLoginModal(true)
                          setResetPassword('')
                          setResetPasswordConfirm('')
                          setResetPasswordErrors({})
                          setResetPasswordSuccess(false)
                          setResetPasswordToken(null)
                        }}
                      >
                        Kembali
                      </button>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {showRegisterModal && (
          <div className="modal-overlay active" onClick={() => {
            if (!isRegistering) {
              setShowRegisterModal(false)
              setRegisterForm({ name: '', email: '', phone: '', gender: undefined, password: '' })
              setConfirmPassword('')
              setRegisterErrors({})
              setIsRegistering(false)
            }
          }}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Daftar</h3>
                <button className="modal-close" onClick={() => {
                  if (!isRegistering) {
                    setShowRegisterModal(false)
                    setRegisterForm({ name: '', email: '', phone: '', gender: undefined, password: '' })
                    setConfirmPassword('')
                    setRegisterErrors({})
                    setIsRegistering(false)
                  }
                }} disabled={isRegistering}>
                  <i className="fa fa-times"></i>
                </button>
              </div>
              <form onSubmit={handleRegister}>
                <div className="modal-body">
                  <div className={`form-group ${registerErrors.name ? 'error' : ''}`}>
                    <label htmlFor="registerName">Nama Lengkap</label>
                    <input
                      type="text"
                      id="registerName"
                      value={registerForm.name}
                      onChange={(e) => {
                        setRegisterForm({ ...registerForm, name: e.target.value })
                        if (registerErrors.name) {
                          setRegisterErrors({ ...registerErrors, name: undefined })
                        }
                      }}
                      required
                      placeholder="Masukkan nama lengkap Anda"
                      disabled={isRegistering}
                      minLength={2}
                      maxLength={100}
                    />
                    {registerErrors.name && (
                      <div className="error-message">{registerErrors.name}</div>
                    )}
                  </div>
                  <div className={`form-group ${registerErrors.email ? 'error' : ''}`}>
                    <label htmlFor="registerEmail">Email</label>
                    <input
                      type="email"
                      id="registerEmail"
                      value={registerForm.email}
                      onChange={(e) => {
                        setRegisterForm({ ...registerForm, email: e.target.value })
                        if (registerErrors.email) {
                          setRegisterErrors({ ...registerErrors, email: undefined })
                        }
                      }}
                      required
                      placeholder="Masukkan email Anda"
                      disabled={isRegistering}
                    />
                    {registerErrors.email && (
                      <div className="error-message">{registerErrors.email}</div>
                    )}
                  </div>
                  <div className={`form-group ${registerErrors.phone ? 'error' : ''}`}>
                    <label htmlFor="registerPhone">Nomor Telepon</label>
                    <div className="input-group-prefix">
                      <span className="prefix">+62</span>
                      <input
                        type="tel"
                        id="registerPhone"
                        value={registerForm.phone}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '')
                          setRegisterForm({ ...registerForm, phone: value })
                          if (registerErrors.phone) {
                            setRegisterErrors({ ...registerErrors, phone: undefined })
                          }
                        }}
                        required
                        pattern="[0-9]*"
                        placeholder="81234567890"
                        disabled={isRegistering}
                        minLength={9}
                        maxLength={13}
                      />
                    </div>
                    {registerErrors.phone && (
                      <div className="error-message">{registerErrors.phone}</div>
                    )}
                  </div>
                  <div className={`form-group ${registerErrors.gender ? 'error' : ''}`} id="registerGenderGroup">
                    <label>Jenis Kelamin</label>
                    <div className="radio-group">
                      <div className="radio-option">
                        <input
                          type="radio"
                          id="registerGenderPerempuan"
                          name="registerGender"
                          value="1"
                          required
                          checked={registerForm.gender === 1}
                          onChange={() => {
                            setRegisterForm({ ...registerForm, gender: 1 })
                            if (registerErrors.gender) {
                              setRegisterErrors({ ...registerErrors, gender: undefined })
                            }
                          }}
                          disabled={isRegistering}
                        />
                        <label htmlFor="registerGenderPerempuan">Perempuan</label>
                      </div>
                      <div className="radio-option">
                        <input
                          type="radio"
                          id="registerGenderLakiLaki"
                          name="registerGender"
                          value="2"
                          required
                          checked={registerForm.gender === 2}
                          onChange={() => {
                            setRegisterForm({ ...registerForm, gender: 2 })
                            if (registerErrors.gender) {
                              setRegisterErrors({ ...registerErrors, gender: undefined })
                            }
                          }}
                          disabled={isRegistering}
                        />
                        <label htmlFor="registerGenderLakiLaki">Laki-laki</label>
                      </div>
                    </div>
                    {registerErrors.gender && (
                      <div className="error-message">{registerErrors.gender}</div>
                    )}
                  </div>
                  <div className={`form-group ${registerErrors.password ? 'error' : ''}`}>
                    <label htmlFor="registerPassword">Kata Sandi</label>
                    <input
                      type="password"
                      id="registerPassword"
                      value={registerForm.password}
                      onChange={(e) => {
                        setRegisterForm({ ...registerForm, password: e.target.value })
                        if (registerErrors.password) {
                          setRegisterErrors({ ...registerErrors, password: undefined })
                        }
                        if (registerErrors.confirmPassword && e.target.value === confirmPassword) {
                          setRegisterErrors({ ...registerErrors, confirmPassword: undefined })
                        }
                      }}
                      required
                      placeholder="Masukkan kata sandi Anda (min. 6 karakter)"
                      disabled={isRegistering}
                      minLength={6}
                      maxLength={100}
                    />
                    {registerErrors.password && (
                      <div className="error-message">{registerErrors.password}</div>
                    )}
                  </div>
                  <div className={`form-group ${registerErrors.confirmPassword ? 'error' : ''}`}>
                    <label htmlFor="registerConfirmPassword">Konfirmasi Kata Sandi</label>
                    <input
                      type="password"
                      id="registerConfirmPassword"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        if (registerErrors.confirmPassword) {
                          setRegisterErrors({ ...registerErrors, confirmPassword: undefined })
                        }
                      }}
                      required
                      placeholder="Ulangi password"
                      disabled={isRegistering}
                      minLength={6}
                      maxLength={100}
                    />
                    {registerErrors.confirmPassword && (
                      <div className="error-message">{registerErrors.confirmPassword}</div>
                    )}
                  </div>
                  <button type="submit" className="btn-predict" disabled={isRegistering}>
                    {isRegistering ? (
                      <>
                        <span className="btn-send-loading-spinner"></span> Mohon tunggu
                      </>
                    ) : (
                      'Daftar'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      {showAuthBar && !user && (
        <div className="health-auth-bar">
          <div className="health-auth-left">
            <h3 className="health-auth-title">Sistem Rekomendasi Kesehatan</h3>
          </div>
          <div className="health-auth-right">
            <button className="health-auth-btn ghost" onClick={() => setShowLoginModal(true)}>
              Masuk
            </button>
            <button className="health-auth-btn primary" onClick={() => setShowRegisterModal(true)}>
              Daftar
            </button>
          </div>
        </div>
      )}

      <button data-settings-trigger style={{ display: 'none' }} />
      <button data-logout-trigger style={{ display: 'none' }} />

      {showSettingsModal && (
        <div className="modal-overlay active" onClick={() => {
          if (!isUpdatingSettings) {
            setShowSettingsModal(false)
            setIsUpdatingSettings(false)
            document.body.style.overflow = ''
          }
        }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Pengaturan Akun</h3>
              <button className="modal-close" onClick={() => {
                if (!isUpdatingSettings) {
                  setShowSettingsModal(false)
                  setIsUpdatingSettings(false)
                  document.body.style.overflow = ''
                }
              }} disabled={isUpdatingSettings}>
                <i className="fa fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleUpdateSettings}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="settingsName">Nama Lengkap</label>
                  <input
                    type="text"
                    id="settingsName"
                    value={settingsForm.name}
                    onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                    required
                    placeholder="Masukkan nama lengkap Anda"
                    disabled={isUpdatingSettings}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="settingsEmail">Email</label>
                  <input
                    type="email"
                    id="settingsEmail"
                    value={settingsForm.email}
                    onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                    required
                    placeholder="Masukkan email Anda"
                    disabled={isUpdatingSettings}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="settingsPhone">Nomor Telepon</label>
                  <div className="input-group-prefix">
                    <span className="prefix">+62</span>
                    <input
                      type="tel"
                      id="settingsPhone"
                      value={settingsForm.phone ?? ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value || undefined })}
                      pattern="[0-9]*"
                      placeholder="81234567890"
                      disabled={isUpdatingSettings}
                    />
                  </div>
                </div>
                <div className="form-group" id="settingsGenderGroup">
                  <label>Jenis Kelamin</label>
                  <div className="radio-group">
                    <div className="radio-option">
                      <input
                        type="radio"
                        id="settingsGenderPerempuan"
                        name="settingsGender"
                        value="1"
                        checked={settingsForm.gender === 1}
                        onChange={() => setSettingsForm({ ...settingsForm, gender: 1 })}
                        disabled={isUpdatingSettings}
                      />
                      <label htmlFor="settingsGenderPerempuan">Perempuan</label>
                    </div>
                    <div className="radio-option">
                      <input
                        type="radio"
                        id="settingsGenderLakiLaki"
                        name="settingsGender"
                        value="2"
                        checked={settingsForm.gender === 2}
                        onChange={() => setSettingsForm({ ...settingsForm, gender: 2 })}
                        disabled={isUpdatingSettings}
                      />
                      <label htmlFor="settingsGenderLakiLaki">Laki-laki</label>
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="settingsPassword">Kata Sandi Baru (opsional)</label>
                  <input
                    type="password"
                    id="settingsPassword"
                    value={settingsForm.password}
                    onChange={(e) => setSettingsForm({ ...settingsForm, password: e.target.value })}
                    placeholder="Kosongkan jika tidak ingin mengubah"
                    disabled={isUpdatingSettings}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="settingsConfirmPassword">Konfirmasi Password Baru</label>
                  <input
                    type="password"
                    id="settingsConfirmPassword"
                    placeholder="Ulangi password baru"
                    disabled={isUpdatingSettings}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn modal-btn-secondary" onClick={() => {
                  if (!isUpdatingSettings) {
                    setShowSettingsModal(false)
                    setIsUpdatingSettings(false)
                    document.body.style.overflow = ''
                  }
                }} disabled={isUpdatingSettings}>
                  Batal
                </button>
                <button type="submit" className="modal-btn modal-btn-primary" disabled={isUpdatingSettings}>
                  {isUpdatingSettings ? (
                    <>
                      <span className="btn-send-loading-spinner"></span> Mohon tunggu
                    </>
                  ) : (
                    'Simpan Perubahan'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLogoutModal && (
        <div className="modal-overlay active" onClick={() => setShowLogoutModal(false)}>
          <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Keluar</h3>
            <div className="delete-modal-body">
              <p>Apakah Anda yakin ingin keluar?</p>
            </div>
            <div className="delete-modal-actions">
              <button 
                className="btn-cancel-delete" 
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowLogoutModal(false)
                }}
              >
                Batal
              </button>
              <button 
                className="btn-confirm-delete" 
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleLogout()
                }}
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

