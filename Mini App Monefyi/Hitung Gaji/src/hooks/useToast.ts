import { useState, useCallback } from 'react'
import type { ToastMessage } from '@/types'

let toastIdCounter = 0

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback(
    (options: Omit<ToastMessage, 'id'>) => {
      const id = `toast-${++toastIdCounter}`
      const duration = options.duration || 3000

      const toast: ToastMessage = {
        ...options,
        id,
        duration,
      }

      setToasts((prev) => {
        // Max 3 active toasts
        const newToasts = [...prev, toast]
        return newToasts.slice(-3)
      })

      // Auto dismiss
      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id))
        }, duration)
      }

      return id
    },
    []
  )

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const dismissAll = useCallback(() => {
    setToasts([])
  }, [])

  return {
    toasts,
    showToast,
    dismissToast,
    dismissAll,
  }
}
