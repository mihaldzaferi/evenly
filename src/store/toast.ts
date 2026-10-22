import { create } from 'zustand'

export interface Toast {
  id: number
  message: string
  action?: { label: string; run: () => void }
}

interface ToastState {
  toasts: Toast[]
  show: (message: string, action?: Toast['action']) => void
  dismiss: (id: number) => void
}

let next = 1

export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  show: (message, action) => {
    const id = next++
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, action }] }))
    setTimeout(() => get().dismiss(id), action ? 6000 : 3500)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = (message: string, action?: Toast['action']) => useToasts.getState().show(message, action)
