'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function LoginForm() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/notebooks')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Open Notebook</CardTitle>
          <CardDescription>
            Autentikasi dinonaktifkan. Mengalihkan ke dashboard...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Anda akan dialihkan otomatis.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}