import { create } from 'zustand'

// Store de toasts
export const useToastStore = create((set) => ({
  toasts: [],
  add: (toast) => {
    const id = Date.now() + Math.random()
    set(s => ({ toasts: [...s.toasts, { ...toast, id }] }))
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), toast.duration || 3500)
    return id
  },
  remove: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))

// Hook utilitaire
export const useToast = () => {
  const add = useToastStore(s => s.add)
  return {
    success: (msg) => add({ type: 'success', msg }),
    error: (msg) => add({ type: 'error', msg }),
    info: (msg) => add({ type: 'info', msg }),
  }
}

const ICONS = { success: '✅', error: '❌', info: 'ℹ️' }

export default function ToastContainer() {
  const { toasts, remove } = useToastStore()
  if (!toasts.length) return null

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`} onClick={() => remove(t.id)}>
          <span>{ICONS[t.type]}</span>
          <span style={{ flex: 1 }}>{t.msg}</span>
          <span style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}>×</span>
        </div>
      ))}
    </div>
  )
}
