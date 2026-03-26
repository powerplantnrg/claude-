export type ToastType = "success" | "error" | "warning" | "info"

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  createdAt: number
}

type Subscriber = (toasts: Toast[]) => void

let toasts: Toast[] = []
const subscribers: Set<Subscriber> = new Set()
let nextId = 0

function notify() {
  const snapshot = [...toasts]
  subscribers.forEach((fn) => fn(snapshot))
}

export function subscribe(fn: Subscriber): () => void {
  subscribers.add(fn)
  fn([...toasts])
  return () => {
    subscribers.delete(fn)
  }
}

export function addToast(type: ToastType, title: string, message?: string): string {
  const id = `toast-${++nextId}-${Date.now()}`
  toasts = [...toasts, { id, type, title, message, createdAt: Date.now() }]
  notify()
  return id
}

export function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id)
  notify()
}

export const toast = {
  success: (title: string, message?: string) => addToast("success", title, message),
  error: (title: string, message?: string) => addToast("error", title, message),
  warning: (title: string, message?: string) => addToast("warning", title, message),
  info: (title: string, message?: string) => addToast("info", title, message),
}
