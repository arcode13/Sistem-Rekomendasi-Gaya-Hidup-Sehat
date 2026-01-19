'use client'

import { useRouter } from 'next/navigation'
import { NotebookResponse } from '@/lib/types/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { id } from 'date-fns/locale'

interface NotebookCardProps {
  notebook: NotebookResponse
}

export function NotebookCard({ notebook }: NotebookCardProps) {
  const router = useRouter()

  const handleCardClick = () => {
    router.push(`/notebooks/${encodeURIComponent(notebook.id)}`)
  }

  return (
    <Card 
      className="group card-hover"
      onClick={handleCardClick}
      style={{ cursor: 'pointer' }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate group-hover:text-primary transition-colors">
              {notebook.name}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="mt-3 text-xs text-muted-foreground">
          Diperbarui {formatDistanceToNow(new Date(notebook.updated), { addSuffix: true, locale: id })}
        </div>

        <div className="mt-3 flex items-center gap-1.5 border-t pt-3">
          <Badge variant="outline" className="text-xs flex items-center gap-1 px-1.5 py-0.5 text-primary border-primary/50">
            <FileText className="h-3 w-3" />
            <span>{notebook.source_count}</span>
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
