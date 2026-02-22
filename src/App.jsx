import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import HealthRibbon from './components/HealthRibbon'
import CommandPalette from './components/CommandPalette'
import Breadcrumb from './components/Breadcrumb'
import ErrorBoundary from './components/ErrorBoundary'
import WhatsNew from './components/WhatsNew'
import { ToastProvider } from './components/Toast'
import { safeGetUser } from './utils/safeStorage'
import LoginScreen from './components/LoginScreen'
import OnboardingWizard from './components/OnboardingWizard'
import WelcomeBack from './components/WelcomeBack'
import AICoPilot from './components/AICoPilot'
import './App.css'

// Code-split each page with React.lazy
const Home = lazy(() => import('./pages/Home'))
const DocumentHub = lazy(() => import('./pages/DocumentHub'))
const ProjectOverview = lazy(() => import('./pages/ProjectOverview'))
const ReviewDashboard = lazy(() => import('./pages/ReviewDashboard'))
const ScenarioGenerator = lazy(() => import('./pages/ScenarioGenerator'))
const ExportEngine = lazy(() => import('./pages/ExportEngine'))
const TestAnalysis = lazy(() => import('./pages/TestAnalysis'))
const TransformationStudio = lazy(() => import('./pages/TransformationStudio'))
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'))

const PAGES = {
  home: { component: Home, label: 'Home' },
  documents: { component: DocumentHub, label: 'Document Hub' },
  overview: { component: ProjectOverview, label: 'Project Overview' },
  review: { component: ReviewDashboard, label: 'Review Dashboard' },
  scenarios: { component: ScenarioGenerator, label: 'Scenario Generator' },
  transform: { component: TransformationStudio, label: 'Transformation Studio' },
  export: { component: ExportEngine, label: 'Export Engine' },
  testanalysis: { component: TestAnalysis, label: 'Test Analysis' },
  analytics: { component: AnalyticsDashboard, label: 'Analytics & Insights' },
}

const ROLE_LANDING = {
  Manager: 'analytics',
  'Test Architect': 'scenarios',
  'Dev Tester': 'review',
  QA: 'documents',
}

const AUTHORIZED_USERS = [
  { name: 'sathishkumar', email: 'sathishkumar.sivalingam@charter.com', role: 'Test Architect' },
  { name: 'senthil', email: 'senthil.kanna@charter.com', role: 'Manager' },
  { name: 'debbie', email: 'debbie.fox@charter.com', role: 'Manager' },
  { name: 'shri', email: 'shrilata.kallurkarvenkatesh@charter.com', role: 'Manager' },
]

function isAuthorizedUser(u) {
  if (!u || !u.name || !u.email || !u.role) return false
  return AUTHORIZED_USERS.some(
    a => a.name === u.name.toLowerCase() && a.email === u.email.toLowerCase() && a.role === u.role
  )
}

const MOBILE_READONLY_ROLES = ['Manager']
const MOBILE_ALLOWED_PAGES = ['home', 'analytics', 'review']

function getUserPrefKey(user, key) {
  if (!user) return key
  return `vpt-${user.email}-${key}`
}

const THEMES = ['dark', 'light', 'high-contrast']

// Suspense fallback for lazy-loaded pages
function PageLoader() {
  return (
    <div className="page-loader">
      <div className="page-loader-spinner" />
      <span>Loading...</span>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(() => {
    const parsed = safeGetUser()
    if (!parsed) return null
    if (!isAuthorizedUser(parsed)) {
      localStorage.removeItem('vpt-user')
      return null
    }
    return parsed
  })
  const [showWelcome, setShowWelcome] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [activePage, setActivePage] = useState('home')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)

  const getAutoTheme = () => {
    const hour = new Date().getHours()
    return (hour >= 6 && hour < 18) ? 'light' : 'dark'
  }

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('vpt-user')
    if (saved) {
      const u = JSON.parse(saved)
      const userMode = localStorage.getItem(getUserPrefKey(u, 'theme-mode'))
      if (userMode === 'manual') return localStorage.getItem(getUserPrefKey(u, 'theme')) || 'dark'
    }
    const globalMode = localStorage.getItem('vpt-theme-mode')
    if (globalMode === 'manual') return localStorage.getItem('vpt-theme') || 'dark'
    return getAutoTheme()
  })
  const [themeMode, setThemeMode] = useState(() => {
    const saved = localStorage.getItem('vpt-user')
    if (saved) {
      const u = JSON.parse(saved)
      return localStorage.getItem(getUserPrefKey(u, 'theme-mode')) || 'auto'
    }
    return localStorage.getItem('vpt-theme-mode') || 'auto'
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [scenarioPreFilter, setScenarioPreFilter] = useState(null)
  const mainRef = useRef(null)
  const [hasMoreScroll, setHasMoreScroll] = useState(false)
  const [pageTransition, setPageTransition] = useState(false)
  const [showWhatsNew, setShowWhatsNew] = useState(false)
  const [showCoPilot, setShowCoPilot] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isMobileReadonly = isMobile && user && MOBILE_READONLY_ROLES.includes(user.role)

  const handleNavigate = useCallback((page) => {
    if (isMobileReadonly && !MOBILE_ALLOWED_PAGES.includes(page)) return
    if (page === activePage) return
    setPageTransition(true)
    setTimeout(() => {
      setActivePage(page)
      setPageTransition(false)
      if (mainRef.current) mainRef.current.scrollTop = 0
    }, 150)
  }, [isMobileReadonly, activePage])

  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const checkScroll = () => {
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight
      setHasMoreScroll(remaining > 40)
    }
    const timers = [100, 300, 600, 1000, 2000].map(ms => setTimeout(checkScroll, ms))
    el.addEventListener('scroll', checkScroll, { passive: true })
    const resizeObs = new ResizeObserver(checkScroll)
    resizeObs.observe(el)
    const mutObs = new MutationObserver(checkScroll)
    mutObs.observe(el, { childList: true, subtree: true })
    return () => {
      timers.forEach(clearTimeout)
      el.removeEventListener('scroll', checkScroll)
      resizeObs.disconnect()
      mutObs.disconnect()
    }
  }, [activePage])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    if (user) localStorage.setItem(getUserPrefKey(user, 'theme'), theme)
    localStorage.setItem('vpt-theme', theme)
  }, [theme, user])

  useEffect(() => {
    if (themeMode !== 'auto') return
    const interval = setInterval(() => setTheme(getAutoTheme()), 60000)
    return () => clearInterval(interval)
  }, [themeMode])

  const cycleTheme = () => {
    const idx = THEMES.indexOf(theme)
    const next = THEMES[(idx + 1) % THEMES.length]
    setTheme(next)
    setThemeMode('manual')
    if (user) {
      localStorage.setItem(getUserPrefKey(user, 'theme-mode'), 'manual')
      localStorage.setItem(getUserPrefKey(user, 'theme'), next)
    }
    localStorage.setItem('vpt-theme-mode', 'manual')
  }

  const setSpecificTheme = (t) => {
    setTheme(t)
    setThemeMode('manual')
    if (user) {
      localStorage.setItem(getUserPrefKey(user, 'theme-mode'), 'manual')
      localStorage.setItem(getUserPrefKey(user, 'theme'), t)
    }
    localStorage.setItem('vpt-theme-mode', 'manual')
  }

  const resetToAutoTheme = () => {
    setThemeMode('auto')
    if (user) localStorage.setItem(getUserPrefKey(user, 'theme-mode'), 'auto')
    localStorage.setItem('vpt-theme-mode', 'auto')
    setTheme(getAutoTheme())
  }

  const handleLogin = (userData) => {
    const lastLogin = localStorage.getItem('vpt-last-login')
    const isNewUser = !lastLogin
    localStorage.setItem('vpt-user', JSON.stringify(userData))
    localStorage.setItem('vpt-last-login', new Date().toISOString())
    setUser(userData)

    const userMode = localStorage.getItem(getUserPrefKey(userData, 'theme-mode')) || 'auto'
    setThemeMode(userMode)
    if (userMode === 'manual') {
      const userTheme = localStorage.getItem(getUserPrefKey(userData, 'theme'))
      if (userTheme) setTheme(userTheme)
    } else {
      setTheme(getAutoTheme())
    }

    const landing = ROLE_LANDING[userData.role] || 'documents'
    setActivePage(landing)

    if (isNewUser) {
      setShowOnboarding(true)
    } else {
      setShowWelcome(true)
      setShowWhatsNew(true)
    }
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('vpt-user')
  }

  const handleNavigateToScenario = (moduleFilter) => {
    setScenarioPreFilter(moduleFilter)
    handleNavigate('scenarios')
  }

  // Dynamic health ribbon data from localStorage state
  const getHealthData = () => {
    const docs = JSON.parse(localStorage.getItem('vpt-docs') || '[]')
    const parsedDocs = docs.filter(d => d.status === 'parsed')
    const avgTestability = parsedDocs.length > 0
      ? Math.round(parsedDocs.reduce((s, d) => s + (d.testability || 0), 0) / parsedDocs.length)
      : 0
    const highAmbiguity = parsedDocs.filter(d => (d.ambiguity || 0) > 30).length
    const errorDocs = docs.filter(d => d.status === 'error').length
    return { coverage: avgTestability, gaps: highAmbiguity, errors: errorDocs, docs: docs.length }
  }

  const handleGlobalKeys = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(o => !o) }
    if ((e.metaKey || e.ctrlKey) && e.key >= '0' && e.key <= '8') {
      e.preventDefault()
      const pages = Object.keys(PAGES)
      const idx = parseInt(e.key)
      if (pages[idx]) handleNavigate(pages[idx])
    }
  }, [handleNavigate])

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeys)
    return () => window.removeEventListener('keydown', handleGlobalKeys)
  }, [handleGlobalKeys])

  if (!user) {
    return (
      <ToastProvider>
        <LoginScreen onLogin={handleLogin} theme={theme} onCycleTheme={cycleTheme} />
      </ToastProvider>
    )
  }

  const ActiveComponent = PAGES[activePage].component
  const healthData = getHealthData()

  const breadcrumbItems = [{ label: 'Home', page: 'home' }]
  if (activePage !== 'home') {
    breadcrumbItems.push({ label: PAGES[activePage].label, page: activePage })
  }
  const activeComponentProps = {}
  if (activePage === 'home') {
    activeComponentProps.onNavigate = handleNavigate
    activeComponentProps.user = user
  }
  if (activePage === 'scenarios') {
    activeComponentProps.preFilter = scenarioPreFilter
    activeComponentProps.onClearFilter = () => setScenarioPreFilter(null)
  }
  if (activePage === 'analytics') {
    activeComponentProps.onNavigateToScenario = handleNavigateToScenario
    activeComponentProps.user = user
  }
  if (activePage === 'review') {
    activeComponentProps.isMobileReadonly = isMobileReadonly
  }

  return (
    <ToastProvider>
    <div className={`app-layout ${isMobileReadonly ? 'mobile-companion' : ''}`} role="application" aria-label="VPT TestCraft Studio">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} onNavigate={handleNavigate} />
      <AICoPilot open={showCoPilot} onClose={() => setShowCoPilot(false)} />

      {showWhatsNew && <WhatsNew onClose={() => setShowWhatsNew(false)} />}

      {showOnboarding && (
        <OnboardingWizard
          user={user}
          onClose={() => setShowOnboarding(false)}
          onLoadDemo={() => { localStorage.setItem('vpt-demo', 'true') }}
          onNavigate={handleNavigate}
        />
      )}

      {showWelcome && (
        <WelcomeBack
          user={user}
          onClose={() => setShowWelcome(false)}
          onNavigate={(page) => { handleNavigate(page); setShowWelcome(false) }}
        />
      )}

      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        isMobileReadonly={isMobileReadonly}
      />
      <div className={`main-area ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header
          title={PAGES[activePage].label}
          theme={theme}
          themeMode={themeMode}
          onSetTheme={setSpecificTheme}
          onResetAutoTheme={resetToAutoTheme}
          onOpenCmd={() => setCmdOpen(true)}
          onNavigate={handleNavigate}
          user={user}
          onLogout={handleLogout}
          onMenuToggle={() => setMobileOpen(true)}
          isMobileReadonly={isMobileReadonly}
          onOpenCoPilot={() => setShowCoPilot(true)}
        />
        <HealthRibbon data={healthData} />
        {isMobileReadonly && (
          <div className="mobile-companion-banner">
            <span>📱 Mobile Companion — Read-only view for monitoring</span>
          </div>
        )}
        <main id="main-content" className="page-content" role="main" ref={mainRef}>
          <Breadcrumb items={breadcrumbItems} onNavigate={handleNavigate} />
          <div className={`page-transition ${pageTransition ? 'page-exit' : 'page-enter'}`}>
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <ActiveComponent {...activeComponentProps} />
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
        <div className={`scroll-hint ${hasMoreScroll ? 'scroll-hint-visible' : ''}`}
          onClick={() => mainRef.current?.scrollBy({ top: 300, behavior: 'smooth' })}>
          <span className="scroll-hint-arrow">↓</span>
          <span>Scroll down for more</span>
        </div>
      </div>
    </div>
    </ToastProvider>
  )
}
