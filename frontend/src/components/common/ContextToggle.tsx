'use client'

import { EyeOff, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { ContextMode } from '@/app/(dashboard)/notebooks/[id]/page'

interface ContextToggleProps {
  mode: ContextMode
  onChange: (mode: ContextMode) => void
  className?: string
}

const MODE_CONFIG = {
  off: {
    icon: EyeOff,
    label: 'Tidak disertakan dalam chat',
    color: 'text-muted-foreground',
    bgColor: 'hover:bg-muted'
  },
  full: {
    icon: FileText,
    label: 'Konten lengkap',
    color: 'text-primary',
    bgColor: 'hover:bg-primary/10'
  }
} as const

export function ContextToggle({ mode, onChange, className }: ContextToggleProps) {
  const config = MODE_CONFIG[mode]
  const Icon = config.icon

  // Available modes
  const availableModes: ContextMode[] = ['off', 'full']

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click

    // Cycle to next mode
    const currentIndex = availableModes.indexOf(mode)
    const nextIndex = (currentIndex + 1) % availableModes.length
    onChange(availableModes[nextIndex])
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 w-8 p-0 transition-colors',
              config.bgColor,
              className
            )}
            onClick={handleClick}
          >
            <Icon className={cn('h-4 w-4', config.color)} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{config.label}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Klik untuk beralih
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
