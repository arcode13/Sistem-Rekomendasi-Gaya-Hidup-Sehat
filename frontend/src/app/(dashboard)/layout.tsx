'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { ModalProvider } from '@/components/providers/ModalProvider'
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store'
import { HEALTH_USER_STORAGE_KEY } from '@/lib/api/healthAuth'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated: isAdminAuthenticated } = useAdminAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = () => {
      const healthSession = localStorage.getItem(HEALTH_USER_STORAGE_KEY)
      if (healthSession) {
        try {
          const parsed = JSON.parse(healthSession)
          if (parsed?.token) {
            router.push('/')
            return
          }
        } catch {
        }
      }

      if (!isAdminAuthenticated) {
        router.push('/')
        return
      }

      setIsChecking(false)
    }

    checkAuth()
  }, [isAdminAuthenticated, router])

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!isAdminAuthenticated) {
    return null
  }

  return (
    <ErrorBoundary>
      {children}
      <ModalProvider />
    </ErrorBoundary>
  )
}