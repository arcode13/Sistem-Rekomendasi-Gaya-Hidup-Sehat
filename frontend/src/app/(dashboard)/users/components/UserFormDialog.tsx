'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usersApi } from '@/lib/api/users'
import { UserResponse } from '@/lib/types/api'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

const createUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email('Format email tidak valid'),
  phone: z.string().optional(),
  gender: z.enum(['1', '2']).optional(),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter'),
  role: z.enum(['Pasien', 'Perawat']),
})

const updateUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email('Format email tidak valid'),
  phone: z.string().optional(),
  gender: z.enum(['1', '2']).optional(),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter').optional().or(z.literal('')),
  role: z.enum(['Pasien', 'Perawat']),
})

type CreateUserFormData = z.infer<typeof createUserSchema>
type UpdateUserFormData = z.infer<typeof updateUserSchema>
type UserFormData = CreateUserFormData | UpdateUserFormData

const formatPhoneNumber = (phone: string): string => {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('628')) {
    return cleaned
  } else if (cleaned.startsWith('08')) {
    return '62' + cleaned.substring(1)
  } else if (cleaned.startsWith('8')) {
    return '62' + cleaned
  } else if (cleaned.startsWith('62')) {
    return cleaned
  } else {
    return '628' + cleaned
  }
}

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: UserResponse | null
  onSuccess: () => void
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: UserFormDialogProps) {
  const isEdit = !!user

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<UserFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema) as any,
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      gender: user?.gender?.toString() as '1' | '2' | undefined,
      password: '',
      role: (user?.role || 'Pasien') as 'Pasien' | 'Perawat',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        gender: user?.gender?.toString() as '1' | '2' | undefined,
        password: '',
        role: (user?.role || 'Pasien') as 'Pasien' | 'Perawat',
      })
    }
  }, [open, user, reset])

  const createMutation = useMutation({
    mutationFn: (data: CreateUserFormData) => {
      return usersApi.create({
        name: data.name || null,
        email: data.email,
        phone: data.phone ? formatPhoneNumber(data.phone) : null,
        gender: data.gender ? Number(data.gender) : null,
        password: data.password,
        role: data.role,
      })
    },
    onSuccess: () => {
      toast.success('Pengguna berhasil dibuat')
      onSuccess()
    },
    onError: (error: unknown) => {
      const errorMessage = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : undefined
      toast.error(errorMessage || 'Gagal membuat pengguna')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: UpdateUserFormData) => {
      return usersApi.update(user!.id, {
        name: data.name || null,
        email: data.email,
        phone: data.phone ? formatPhoneNumber(data.phone) : null,
        gender: data.gender ? Number(data.gender) : null,
        password: data.password && data.password.length > 0 ? data.password : undefined,
        role: data.role,
      })
    },
    onSuccess: () => {
      toast.success('Pengguna berhasil diperbarui')
      onSuccess()
    },
    onError: (error: unknown) => {
      const errorMessage = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : undefined
      toast.error(errorMessage || 'Gagal memperbarui pengguna')
    },
  })

  const onSubmit = (data: CreateUserFormData | UpdateUserFormData) => {
    if (isEdit) {
      updateMutation.mutate(data as UpdateUserFormData)
    } else {
      createMutation.mutate(data as CreateUserFormData)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending
  const role = watch('role')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Pengguna' : 'Tambah Pengguna'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Perbarui informasi pengguna' : 'Tambahkan pengguna baru ke sistem'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Nama lengkap"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="email@example.com"
              required
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telepon</Label>
            <Input
              id="phone"
              type="number"
              {...register('phone')}
              placeholder="081234567890"
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Jenis Kelamin</Label>
            <Select
              value={watch('gender')}
              onValueChange={(value) => setValue('gender', value as '1' | '2')}
            >
              <SelectTrigger id="gender">
                <SelectValue placeholder="Pilih jenis kelamin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Perempuan</SelectItem>
                <SelectItem value="2">Laki-laki</SelectItem>
              </SelectContent>
            </Select>
            {errors.gender && (
              <p className="text-sm text-destructive">{errors.gender.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select
              value={role}
              onValueChange={(value) => setValue('role', value as 'Pasien' | 'Perawat')}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Pilih role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pasien">Pasien</SelectItem>
                <SelectItem value="Perawat">Perawat</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-destructive">{errors.role.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Kata Sandi {isEdit ? '(kosongkan jika tidak diubah)' : '*'}
            </Label>
            <Input
              id="password"
              type="password"
              {...register('password')}
              placeholder="Minimal 6 karakter"
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {isEdit ? 'Memperbarui...' : 'Membuat...'}
                </>
              ) : (
                isEdit ? 'Perbarui' : 'Tambah'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

