import { useState } from 'react'
import { Sun, Moon, Bell, Search, User, Sparkles, Command, X, Keyboard, Zap, AlertTriangle, CheckCircle, Menu, Contrast } from 'lucide-react'
import './Header.css'

const SHORTCUTS = [
  { keys: '⌘K', desc: 'Open command palette' },
  { keys: '⌘0', desc: 'Home' },
  { keys: '⌘1', desc: 'Document Hub' },
  { keys: '⌘2', desc: 'Project Overview' },
  { keys: '⌘3', desc: 'Review Dashboard' },
  { keys: '⌘4', desc: 'Scenario Generator' },
  { keys: '⌘5', desc: 'Export Engine' },
  { keys: '⌘6', desc: 'Transformation Studio' },
  { keys: '⌘7', desc: 'Analytics & Insights' },
]

const NOTIFICATIONS = [
  { id: 1, type: 'warning', text: 'REQ-003 coverage dropped below 50%', action: 'View in Review Dashboard', page: 'review', time: '5m ago' },
  { id: 2, type: 'success', text: 'Export CDVR_Scenarios_v2.xlsx completed', action: 'Download', page: 'export', time: '12m ago' },
  { id: 3, type: 'info', text: 'AI generated 3 new negative scenarios for SC-003', action: 'Review Scenarios', page: 'scenarios', time: '1h ago' },
]

const THEME_OPTIONS = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'high-contrast', label: 'High Contrast', icon: Contrast },
]

export default function Header({ title, theme, themeMode, onSetTheme, onResetAutoTheme, onOpenCmd, onNavigate, user, onLogout, onMenuToggle, isMobileReadonly, onOpenCoPilot }) {
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showThemePicker, setShowThemePicker] = useState(false)

  const currentThemeIcon = theme === 'light' ? Sun : theme === 'high-contrast' ? Contrast : Moon
  const ThemeIcon = currentThemeIcon

  return (
    <header className="app-header" role="banner">
      <div className="header-left">
        <button className="header-icon-btn mobile-menu-btn" onClick={onMenuToggle} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <div className="header-title-group">
          <h2 className="page-title">{title}</h2>
          <span className="header-tagline">Craft Tests with Intelligence</span>
        </div>
      </div>

      <div className="header-center">
        <button className="search-bar" onClick={onOpenCmd} role="search" aria-label="Open command palette (⌘K)">
          <Search size={16} aria-hidden="true" />
          <span className="search-placeholder">Commands, search, navigate... </span>
          <kbd aria-hidden="true"><Command size={10} />K</kbd>
        </button>
      </div>

      <div className="header-right">
        {!isMobileReadonly && (
          <button className="header-btn ai-copilot-btn" aria-label="AI Co-Pilot" title="AI Co-Pilot" onClick={onOpenCoPilot}>
            <Sparkles size={18} /><span>AI Co-Pilot</span>
          </button>
        )}

        <button className="header-icon-btn" onClick={() => setShowShortcuts(!showShortcuts)} aria-label="Keyboard shortcuts" title="Keyboard shortcuts">
          <Keyboard size={18} />
        </button>

        {/* Theme Picker */}
        <div className="theme-picker-wrapper">
          <button className="header-icon-btn theme-picker-btn" onClick={() => setShowThemePicker(!showThemePicker)} aria-label="Change theme" title={`Theme: ${theme}`}>
            <ThemeIcon size={18} />
          </button>
          {showThemePicker && (
            <div className="theme-picker-panel animate-in">
              <div className="theme-picker-header">
                <span>Theme</span>
                <button className="modal-close" onClick={() => setShowThemePicker(false)}><X size={12} /></button>
              </div>
              {THEME_OPTIONS.map(t => {
                const TIcon = t.icon
                return (
                  <button key={t.id} className={`theme-option ${theme === t.id ? 'active' : ''}`} onClick={() => { onSetTheme(t.id); setShowThemePicker(false) }}>
                    <TIcon size={14} />
                    <span>{t.label}</span>
                    {theme === t.id && <CheckCircle size={12} className="theme-check" />}
                  </button>
                )
              })}
              <div className="theme-picker-divider" />
              <button className={`theme-option ${themeMode === 'auto' ? 'active' : ''}`} onClick={() => { onResetAutoTheme(); setShowThemePicker(false) }}>
                <Zap size={14} />
                <span>Auto (Day/Night)</span>
                {themeMode === 'auto' && <CheckCircle size={12} className="theme-check" />}
              </button>
            </div>
          )}
        </div>

        <div className="notification-wrapper">
          <button className="header-icon-btn notification-btn" aria-label="Notifications" onClick={() => setShowNotifications(!showNotifications)}>
            <Bell size={18} /><span className="notification-dot">{NOTIFICATIONS.length}</span>
          </button>
          {showNotifications && (
            <div className="notification-panel animate-in">
              <div className="notif-header"><h4>Notifications</h4><button className="modal-close" onClick={() => setShowNotifications(false)}><X size={14} /></button></div>
              {NOTIFICATIONS.map(n => (
                <div key={n.id} className={`notif-item notif-${n.type}`}>
                  <div className="notif-icon">{n.type === 'warning' ? <AlertTriangle size={14} /> : n.type === 'success' ? <CheckCircle size={14} /> : <Zap size={14} />}</div>
                  <div className="notif-body">
                    <p className="notif-text">{n.text}</p>
                    <button className="notif-action" onClick={() => { if (onNavigate) onNavigate(n.page); setShowNotifications(false) }}>{n.action} →</button>
                    <span className="notif-time">{n.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="user-menu-wrapper">
          <button className="header-avatar" aria-label="User profile" onClick={() => setShowUserMenu(!showUserMenu)}>
            {user?.name ? user.name.charAt(0).toUpperCase() : <User size={18} />}
          </button>
          {showUserMenu && (
            <div className="user-menu-panel animate-in">
              <div className="user-menu-info">
                <span className="user-menu-name">{user?.name || 'User'}</span>
                <span className="user-menu-email">{user?.email || ''}</span>
                <span className="user-menu-role">{user?.role || 'QA'}</span>
              </div>
              <button className="user-menu-item" onClick={() => { if (onLogout) onLogout(); setShowUserMenu(false) }}>Sign Out</button>
            </div>
          )}
        </div>
      </div>

      {/* Shortcuts Cheat Sheet */}
      {showShortcuts && (
        <div className="shortcuts-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="shortcuts-modal animate-in" onClick={e => e.stopPropagation()}>
            <div className="shortcuts-header"><h3><Keyboard size={18} /> Keyboard Shortcuts</h3><button className="modal-close" onClick={() => setShowShortcuts(false)}><X size={16} /></button></div>
            <div className="shortcuts-list">
              {SHORTCUTS.map(s => (<div key={s.keys} className="shortcut-row"><kbd className="shortcut-key">{s.keys}</kbd><span>{s.desc}</span></div>))}
            </div>
          </div>
        </div>
      )}


    </header>
  )
}
