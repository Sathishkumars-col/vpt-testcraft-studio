import { useState, useEffect } from 'react'
import { X, Sparkles, Zap, Shield, Palette, Layout } from 'lucide-react'

const CURRENT_VERSION = '2.4.0'

const CHANGELOG = [
  {
    version: '2.4.0',
    date: '2026-02-21',
    items: [
      { icon: <Zap size={14} />, text: 'Toast notifications replace all alert dialogs — with undo support for deletions' },
      { icon: <Shield size={14} />, text: 'Error boundaries catch and recover from page-level crashes' },
      { icon: <Sparkles size={14} />, text: 'Code splitting with React.lazy — faster initial load' },
      { icon: <Layout size={14} />, text: 'Recently Deleted trash bin for document recovery' },
      { icon: <Zap size={14} />, text: 'Dynamic Health Ribbon — live stats from actual app state' },
      { icon: <Palette size={14} />, text: 'Copy-to-clipboard for test case steps in Transformation Studio' },
    ],
  },
  {
    version: '2.3.0',
    date: '2026-02-20',
    items: [
      { icon: <Sparkles size={14} />, text: 'Breadcrumb navigation and page transitions' },
      { icon: <Palette size={14} />, text: 'Dark, Light, and High-Contrast themes with auto day/night' },
      { icon: <Layout size={14} />, text: 'Customizable Analytics dashboard with drag-and-drop' },
      { icon: <Shield size={14} />, text: 'Mobile companion mode for managers' },
    ],
  },
]

export default function WhatsNew({ onClose }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem('vpt-whats-new-seen')
    if (seen !== CURRENT_VERSION) setVisible(true)
  }, [])

  const dismiss = () => {
    localStorage.setItem('vpt-whats-new-seen', CURRENT_VERSION)
    setVisible(false)
    if (onClose) onClose()
  }

  if (!visible) return null

  return (
    <div className="modal-overlay" onClick={dismiss} role="dialog" aria-modal="true" aria-label="What's New">
      <div className="modal-card modal-wide" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <h3><Sparkles size={18} /> What's New</h3>
          <button className="modal-close" onClick={dismiss} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {CHANGELOG.map(release => (
            <div key={release.version} style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span className="badge badge-accent">v{release.version}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{release.date}</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {release.items.map((item, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }}>{item.icon}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={dismiss}>Got it</button>
        </div>
      </div>
    </div>
  )
}
