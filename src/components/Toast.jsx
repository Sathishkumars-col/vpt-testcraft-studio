import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { CheckCircle, AlertTriangle, Info, X, XCircle } from 'lucide-react'
import './Toast.css'

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type, exiting: false }])
    if (duration > 0) {
      setTimeout(() => dismissToast(id), duration)
    }
    return id
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300)
  }, [])

  const toast = useCallback((message, type, duration) => addToast(message, type, duration), [addToast])
  toast.success = (msg, dur) => addToast(msg, 'success', dur)
  toast.error = (msg, dur) => addToast(msg, 'error', dur || 6000)
  toast.warning = (msg, dur) => addToast(msg, 'warning', dur)
  toast.info = (msg, dur) => addToast(msg, 'info', dur)
  toast.undo = (msg, onUndo, dur) => {
    const id = addToast(msg, 'undo', dur || 8000)
    // Store undo callback on the toast
    setToasts(prev => prev.map(t => t.id === id ? { ...t, onUndo } : t))
    return id
  }

  const icons = {
    success: <CheckCircle size={16} />,
    error: <XCircle size={16} />,
    warning: <AlertTriangle size={16} />,
    info: <Info size={16} />,
    undo: <Info size={16} />,
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type} ${t.exiting ? 'toast-exit' : 'toast-enter'}`}>
            <span className="toast-icon">{icons[t.type]}</span>
            <span className="toast-message">{t.message}</span>
            {t.type === 'undo' && t.onUndo && (
              <button className="toast-undo-btn" onClick={() => { t.onUndo(); dismissToast(t.id) }}>Undo</button>
            )}
            <button className="toast-close" onClick={() => dismissToast(t.id)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
