'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/lib/api/users'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { UserFormDialog } from './components/UserFormDialog'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { UserResponse } from '@/lib/types/api'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [editUser, setEditUser] = useState<UserResponse | null>(null)
  const [deleteUser, setDeleteUser] = useState<UserResponse | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, page, pageSize],
    queryFn: () => usersApi.list({
      search: search || undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      sort_by: 'created',
      sort_order: 'desc',
    }),
  })

  const updateUserMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      usersApi.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Status pengguna diperbarui')
    },
    onError: () => {
      toast.error('Gagal memperbarui status pengguna')
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Pengguna berhasil dihapus')
      setDeleteUser(null)
    },
    onError: () => {
      toast.error('Gagal menghapus pengguna')
    },
  })

  const handleToggleActive = (user: UserResponse) => {
    updateUserMutation.mutate({ id: user.id, is_active: !user.is_active })
  }

  const handleDelete = () => {
    if (deleteUser) {
      deleteUserMutation.mutate(deleteUser.id)
    }
  }

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0

  return (
    <AppShell>
      <div className="p-6 space-y-6 h-full overflow-hidden flex flex-col">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Pengguna</h1>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Pengguna
          </Button>
        </div>

        <Card className="flex flex-col flex-1 min-h-0">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Daftar Pengguna</CardTitle>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama atau email..."
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
                          <TableHead>Nama</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Telepon</TableHead>
                          <TableHead>Jenis Kelamin</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Terdaftar Sejak</TableHead>
                          <TableHead>Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data?.users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>{user.name || '-'}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.phone || '-'}</TableCell>
                            <TableCell>
                              {user.gender === 1 ? 'Perempuan' : user.gender === 2 ? 'Laki-laki' : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.role === 'Perawat' ? 'default' : 'secondary'}>
                                {user.role || 'Pasien'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={user.is_active}
                                onCheckedChange={() => handleToggleActive(user)}
                              />
                            </TableCell>
                            <TableCell>
                              {user.created
                                ? format(new Date(user.created), 'dd MMM yyyy - HH:mm', { locale: id })
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditUser(user)
                                    setIsFormOpen(true)
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteUser(user)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {data && data.users.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Tidak ada pengguna ditemukan
                    </div>
                  )}
                </div>

                {data && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t flex-shrink-0">
                    <div className="text-sm text-muted-foreground">
                      Menampilkan {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, data.total || 0)} dari {data.total || 0} pengguna
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

        <UserFormDialog
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open)
            if (!open) {
              setEditUser(null)
            }
          }}
          user={editUser}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
            setIsFormOpen(false)
            setEditUser(null)
          }}
        />

        <ConfirmDialog
          open={!!deleteUser}
          onOpenChange={(open) => !open && setDeleteUser(null)}
          title="Hapus Pengguna"
          description={`Apakah Anda yakin ingin menghapus pengguna ${deleteUser?.name || deleteUser?.email}?`}
          onConfirm={handleDelete}
          confirmText="Hapus"
          cancelText="Batal"
        />
      </div>
    </AppShell>
  )
}

