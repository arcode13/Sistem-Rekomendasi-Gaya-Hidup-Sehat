'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { chatsApi } from '@/lib/api/chats'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

export default function ChatsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const { data, isLoading } = useQuery({
    queryKey: ['chats', search, page, pageSize],
    queryFn: () => chatsApi.list({
      search: search || undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      sort_by: 'created',
      sort_order: 'desc',
    }),
  })

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0

  const getRiskLevelBadge = (riskLevel: string) => {
    const riskMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
      low: { label: 'Risiko Rendah', variant: 'default' },
      medium: { label: 'Risiko Sedang', variant: 'secondary' },
      high: { label: 'Risiko Tinggi', variant: 'destructive' },
    }
    const risk = riskMap[riskLevel.toLowerCase()] || { label: riskLevel, variant: 'default' }
    return <Badge variant={risk.variant}>{risk.label}</Badge>
  }

  return (
    <AppShell>
      <div className="p-6 space-y-6 h-full overflow-hidden flex flex-col">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Percakapan</h1>
        </div>

        <Card className="flex flex-col flex-1 min-h-0">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Daftar Percakapan</CardTitle>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama pengguna..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                    className="pl-10 w-64"
                  />
                </div>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setPage(1)
                  }}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 min-h-0">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto min-h-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pengguna</TableHead>
                          <TableHead>Usia</TableHead>
                          <TableHead>Jenis Kelamin</TableHead>
                          <TableHead>Tingkat Risiko</TableHead>
                          <TableHead>Probabilitas</TableHead>
                          <TableHead>Dibuat</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data?.chats.map((chat) => (
                          <TableRow
                            key={chat.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => router.push(`/chats/${chat.id}`)}
                          >
                            <TableCell>{chat.user_name || '-'}</TableCell>
                            <TableCell>{chat.age}</TableCell>
                            <TableCell>
                              {chat.gender === 1 ? 'Perempuan' : chat.gender === 2 ? 'Laki-laki' : '-'}
                            </TableCell>
                            <TableCell>{getRiskLevelBadge(chat.risk_level)}</TableCell>
                            <TableCell>{(chat.prediction_proba * 100).toFixed(1)}%</TableCell>
                            <TableCell>
                              {chat.created
                                ? format(new Date(chat.created), 'dd MMM yyyy - HH:mm', { locale: id })
                                : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {data && data.chats.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Tidak ada percakapan ditemukan
                    </div>
                  )}
                </div>

                {data && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t flex-shrink-0">
                    <div className="text-sm text-muted-foreground">
                      Menampilkan {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, data.total || 0)} dari {data.total || 0} percakapan
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                        >
                          Sebelumnya
                        </Button>
                        <span className="text-sm">
                          Halaman {page} dari {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                        >
                          Selanjutnya
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

