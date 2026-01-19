'use client'

import { AppShell } from '@/components/layout/AppShell'
import { SettingsForm } from './components/SettingsForm'
import { RebuildEmbeddings } from '../advanced/components/RebuildEmbeddings'

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="mb-6 flex-shrink-0">
            <h1 className="text-3xl font-bold">Pengaturan</h1>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <SettingsForm />
            <RebuildEmbeddings />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
