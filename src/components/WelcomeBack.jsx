import { Sparkles, FileText, Zap, AlertTriangle, X, ChevronRight } from 'lucide-react'
import './WelcomeBack.css'

const RECENT_ACTIVITY = [
  { icon: FileText, text: '3 new requirements added to CDVR project', time: '2h ago', page: 'documents' },
  { icon: Zap, text: 'AI generated 5 scenarios for Pause Live', time: '4h ago', page: 'scenarios' },
  { icon: AlertTriangle, text: 'REQ-003 coverage dropped to 40%', time: '1d ago', page: 'review' },
]

export default function WelcomeBack({ user, onClose, onNavigate }) {
  return (
    <div className="welcome-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Welcome back">
      <div className="welcome-card" onClick={e => e.stopPropagation()}>
        <button className="welcome-close" onClick={onClose} aria-label="Close"><X size={16} /></button>

        <div className="welcome-header">
          <Sparkles size={20} className="welcome-icon" />
          <h3>Welcome back, {user?.name || 'there'}!</h3>
        </div>

        <p className="welcome-summary">Here's what changed since your last visit:</p>

        <div className="welcome-activity">
          {RECENT_ACTIVITY.map((item, i) => {
            const Icon = item.icon
            return (
              <button key={i} className="welcome-item" onClick={() => onNavigate(item.page)}>
                <Icon size={14} className="welcome-item-icon" />
                <div className="welcome-item-body">
                  <span className="welcome-item-text">{item.text}</span>
                  <span className="welcome-item-time">{item.time}</span>
                </div>
                <ChevronRight size={14} className="welcome-item-arrow" />
              </button>
            )
          })}
        </div>

        <div className="welcome-actions">
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate('scenarios')}>
            <Zap size={14} /> Generate Scenarios
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Dismiss</button>
        </div>
      </div>
    </div>
  )
}
