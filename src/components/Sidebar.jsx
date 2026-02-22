import {
  Home, FileText, ClipboardCheck, Zap, Download, Wrench, BarChart3,
  ChevronLeft, ChevronRight, X, FolderOpen, Search
} from 'lucide-react'
import './Sidebar.css'

const NAV_ITEMS = [
  { id: 'home', icon: Home, label: 'Home', shortcut: '⌘0' },
  { id: 'documents', icon: FileText, label: 'Document Hub', shortcut: '⌘1' },
  { id: 'overview', icon: FolderOpen, label: 'Project Overview', shortcut: '⌘2' },
  { id: 'review', icon: ClipboardCheck, label: 'Review Dashboard', shortcut: '⌘3' },
  { id: 'scenarios', icon: Zap, label: 'Scenario Generator', shortcut: '⌘4' },
  { id: 'transform', icon: Wrench, label: 'Transformation Studio', shortcut: '⌘5' },
  { id: 'export', icon: Download, label: 'Export Engine', shortcut: '⌘6' },
  { id: 'testanalysis', icon: Search, label: 'Test Analysis', shortcut: '⌘7' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics & Insights', shortcut: '⌘8' },
]

export default function Sidebar({ activePage, onNavigate, collapsed, onToggle, mobileOpen, onMobileClose, isMobileReadonly }) {
  const handleNavClick = (id) => {
    onNavigate(id)
    if (mobileOpen && onMobileClose) onMobileClose()
  }

  const MOBILE_ALLOWED = ['home', 'analytics', 'review']
  const visibleItems = isMobileReadonly ? NAV_ITEMS.filter(i => MOBILE_ALLOWED.includes(i.id)) : NAV_ITEMS

  return (
    <>
      {mobileOpen && <div className="sidebar-overlay" onClick={onMobileClose} />}
      <nav
        className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="sidebar-brand" onClick={() => handleNavClick('home')} style={{ cursor: 'pointer' }} role="button" aria-label="Go to Home">
          <div className="brand-icon" aria-hidden="true">
            <img src={import.meta.env.BASE_URL + 'spectrum-logo.svg'} alt="Spectrum" className="brand-spectrum-img" />
          </div>
          {!collapsed && (
            <div className="brand-text">
              <h1 className="brand-title">VPT TestCraft</h1>
              <p className="brand-subtitle">Studio</p>
            </div>
          )}
          {mobileOpen && (
            <button className="mobile-close-btn" onClick={(e) => { e.stopPropagation(); onMobileClose(); }} aria-label="Close sidebar">
              <X size={20} />
            </button>
          )}
        </div>

        <ul className="nav-list" role="menubar" aria-label="Navigation menu">
          {visibleItems.map(item => {
            const Icon = item.icon
            const isActive = activePage === item.id
            return (
              <li key={item.id} role="none">
                <button
                  role="menuitem"
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleNavClick(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                  aria-label={item.label}
                >
                  <Icon size={20} aria-hidden="true" />
                  {!collapsed && (
                    <>
                      <span className="nav-label">{item.label}</span>
                      <kbd className="nav-shortcut" aria-hidden="true">{item.shortcut}</kbd>
                    </>
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        <div className="sidebar-footer">
          <div className="ai-status">
            <div className="ai-dot" aria-hidden="true" />
            {!collapsed && <span>AI Co-Pilot Active</span>}
          </div>
          <button
            className="collapse-btn desktop-only"
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </nav>
    </>
  )
}
