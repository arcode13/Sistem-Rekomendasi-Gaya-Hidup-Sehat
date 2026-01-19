'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, X } from 'lucide-react'
import { ProviderAvailability } from '@/lib/types/models'

interface ProviderStatusProps {
  providers: ProviderAvailability
}

export function ProviderStatus({ providers }: ProviderStatusProps) {
  const allowedProviders = useMemo(() => ['google', 'openai'], [])

  // Combine all providers, with available ones first, limited to allowed list
  const allProviders = useMemo(
    () =>
      [
        ...providers.available.map((p) => ({ name: p, available: true })),
        ...providers.unavailable.map((p) => ({ name: p, available: false })),
      ].filter((provider) => allowedProviders.includes(provider.name.toLowerCase())),
    [providers.available, providers.unavailable, allowedProviders],
  )

  const [expanded, setExpanded] = useState(false)

  const visibleProviders = useMemo(() => {
    if (expanded) {
      return allProviders
    }
    return allProviders.slice(0, 6)
  }, [allProviders, expanded])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Penyedia AI</CardTitle>
        <CardDescription>
          Konfigurasikan penyedia melalui variabel lingkungan untuk mengaktifkan model mereka. 
          <span className="ml-1">
            {providers.available.length} dari {allProviders.length} dikonfigurasi
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 grid-cols-3">
          {visibleProviders.map((provider) => {
            return (
              <div
                key={provider.name}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                  provider.available ? 'bg-card' : 'bg-muted/40'
                }`}
              >
                <div className={`flex items-center justify-center rounded-full p-1.5 ${
                  provider.available
                    ? 'bg-green-500 text-white dark:bg-green-600 dark:text-white'
                    : 'bg-muted-foreground/10 text-muted-foreground'
                }`}>
                  {provider.available ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                </div>

                <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <span
                    className={`truncate text-sm font-medium capitalize ${
                      !provider.available ? 'text-muted-foreground' : 'text-foreground'
                    }`}
                  >
                    {provider.name}
                  </span>

                  {!provider.available ? (
                    <span className="text-xs text-muted-foreground">Belum dikonfigurasi</span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>

        {allProviders.length > 6 ? (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="text-sm font-medium text-primary hover:underline"
            >
              {expanded ? 'Lihat lebih sedikit' : `Lihat semua ${allProviders.length} penyedia`}
            </button>
          </div>
        ) : null}

      </CardContent>
    </Card>
  )
}
