import { useState, useEffect } from 'react'
import {
  BarChart3, TrendingUp, Target, Clock, Users,
  AlertTriangle, CheckCircle, Zap, Layers, Shield,
  GitBranch, Activity, Eye, Cpu, Sparkles, ChevronDown, ChevronRight,
  GripVertical, Pin, PinOff, EyeOff, Settings, RotateCcw, X
} from 'lucide-react'
import { useToast } from '../components/Toast'
import './AnalyticsDashboard.css'

const COVERAGE_BY_MODULE = [
  { module: 'CDVR Recording', total: 12, covered: 10, pct: 83, scenarios: ['SC-001', 'SC-007'], testCases: ['TC-001', 'TC-002'] },
  { module: 'Playback & Trick Play', total: 8, covered: 5, pct: 63, scenarios: ['SC-004'], testCases: ['TC-002'] },
  { module: 'Storage Management', total: 6, covered: 5, pct: 83, scenarios: ['SC-002', 'SC-008'], testCases: ['TC-003'] },
  { module: 'Cross-Device Sync', total: 5, covered: 3, pct: 60, scenarios: ['SC-005'], testCases: [] },
  { module: 'Parental Controls', total: 4, covered: 3, pct: 75, scenarios: ['SC-006'], testCases: [] },
  { module: 'Conflict Resolution', total: 5, covered: 2, pct: 40, scenarios: ['SC-003'], testCases: ['TC-004'] },
]

const VELOCITY_DATA = [
  { sprint: 'Sprint 18', scenarios: 12, testCases: 28, coverage: 65 },
  { sprint: 'Sprint 19', scenarios: 18, testCases: 42, coverage: 72 },
  { sprint: 'Sprint 20', scenarios: 15, testCases: 35, coverage: 71 },
  { sprint: 'Sprint 21', scenarios: 22, testCases: 48, coverage: 78 },
  { sprint: 'Sprint 22', scenarios: 8, testCases: 24, coverage: 71 },
]

const RISK_ITEMS = [
  { area: 'Concurrent Recording Conflicts', risk: 'high', reason: 'Low coverage (40%), high complexity', effort: '8 hrs', module: 'Conflict Resolution' },
  { area: 'Cross-Device Sync Edge Cases', risk: 'high', reason: 'Network failure scenarios untested', effort: '6 hrs', module: 'Cross-Device Sync' },
  { area: 'Storage Quota Boundary', risk: 'medium', reason: 'Boundary conditions partially covered', effort: '4 hrs', module: 'Storage Management' },
  { area: 'Playback DRM Scenarios', risk: 'medium', reason: 'Key rotation during playback untested', effort: '5 hrs', module: 'Playback & Trick Play' },
]

const DEFECT_PREDICTIONS = [
  { module: 'Conflict Resolution', probability: 89, reason: 'Low coverage + high complexity + 11 historical defects', weighted: 92 },
  { module: 'Cross-Device Sync', probability: 72, reason: 'Network edge cases untested, 4 historical defects', weighted: 78 },
  { module: 'Playback & Trick Play', probability: 55, reason: 'Medium coverage but DRM scenarios missing', weighted: 60 },
]

const STABILITY_INDEX = [
  { module: 'Conflict Resolution', changes: 8, volatility: 'high', regressionRisk: 92 },
  { module: 'Cross-Device Sync', changes: 5, volatility: 'medium', regressionRisk: 68 },
  { module: 'Storage Management', changes: 2, volatility: 'low', regressionRisk: 25 },
  { module: 'CDVR Recording', changes: 1, volatility: 'low', regressionRisk: 15 },
]

const CICD_STATUS = [
  { testCase: 'TC-001', automated: true, pipeline: 'cdvr-e2e', lastRun: 'Passed', time: '2m ago' },
  { testCase: 'TC-002', automated: true, pipeline: 'cdvr-e2e', lastRun: 'Passed', time: '2m ago' },
  { testCase: 'TC-003', automated: false, pipeline: '—', lastRun: '—', time: '—' },
  { testCase: 'TC-004', automated: true, pipeline: 'cdvr-integration', lastRun: 'Failed', time: '15m ago' },
]

// Compute dynamic stat values from data
const TOTAL_REQS = COVERAGE_BY_MODULE.reduce((s, m) => s + m.total, 0)
const TOTAL_SCENARIOS = COVERAGE_BY_MODULE.reduce((s, m) => s + m.scenarios.length, 0)
const TOTAL_TEST_CASES = COVERAGE_BY_MODULE.reduce((s, m) => s + m.testCases.length, 0)
const OVERALL_COVERAGE = COVERAGE_BY_MODULE.length > 0
  ? Math.round(COVERAGE_BY_MODULE.reduce((s, m) => s + m.pct, 0) / COVERAGE_BY_MODULE.length)
  : 0
const HIGH_RISK_COUNT = RISK_ITEMS.filter(r => r.risk === 'high').length
const AUTOMATED_COUNT = CICD_STATUS.filter(c => c.automated).length
const AUTOMATION_RATE = CICD_STATUS.length > 0
  ? Math.round((AUTOMATED_COUNT / CICD_STATUS.length) * 100)
  : 0

// All available stat metrics that can be pinned
const ALL_STATS = [
  { id: 'totalReqs', label: 'Total Requirements', value: String(TOTAL_REQS), trend: '+8 this sprint', icon: Layers, color: 'accent' },
  { id: 'scenarios', label: 'Scenarios Generated', value: String(TOTAL_SCENARIOS), trend: '+3 today', icon: Zap, color: 'success' },
  { id: 'testCases', label: 'Test Cases Created', value: String(TOTAL_TEST_CASES), trend: '+12 this week', icon: CheckCircle, color: 'info' },
  { id: 'coverage', label: 'Overall Coverage', value: `${OVERALL_COVERAGE}%`, trend: '+6% from last sprint', icon: Target, color: 'warning' },
  { id: 'riskItems', label: 'High Risk Items', value: String(HIGH_RISK_COUNT), trend: '-1 this sprint', icon: AlertTriangle, color: 'danger' },
  { id: 'automated', label: 'Automation Rate', value: `${AUTOMATION_RATE}%`, trend: '+5% this month', icon: Cpu, color: 'accent' },
]

// All widget panels
const ALL_WIDGETS = [
  { id: 'coverage-module', label: 'Coverage by Module' },
  { id: 'defect-prediction', label: 'Defect Prediction' },
  { id: 'coverage-trend', label: 'Coverage Trend Timeline' },
  { id: 'efficiency', label: 'Test Efficiency Score' },
  { id: 'stability', label: 'Stability Index' },
  { id: 'cicd', label: 'CI/CD Integration Status' },
  { id: 'risk', label: 'Risk Prioritization' },
  { id: 'gaps', label: 'Coverage Gaps' },
]

// Default layouts per role
const DEFAULT_ROLE_LAYOUTS = {
  Manager: { pinned: ['totalReqs', 'coverage', 'riskItems'], widgets: ['coverage-module', 'defect-prediction', 'risk', 'gaps'] },
  'Test Architect': { pinned: ['coverage', 'scenarios', 'testCases'], widgets: ['coverage-module', 'defect-prediction', 'coverage-trend', 'efficiency', 'stability', 'risk', 'gaps'] },
  QA: { pinned: ['testCases', 'scenarios', 'coverage'], widgets: ['coverage-module', 'coverage-trend', 'cicd', 'risk'] },
  'Dev Tester': { pinned: ['testCases', 'automated', 'coverage'], widgets: ['cicd', 'coverage-module', 'stability', 'efficiency'] },
}

function getLayoutKey(user) {
  if (!user) return 'vpt-analytics-layout'
  return `vpt-${user.email}-analytics-layout`
}

export default function AnalyticsDashboard({ onNavigateToScenario, user }) {
  const toast = useToast()
  const [expandedModule, setExpandedModule] = useState(null)
  const [showCustomize, setShowCustomize] = useState(false)
  const [dragItem, setDragItem] = useState(null)
  const [dragOverItem, setDragOverItem] = useState(null)

  const defaultLayout = DEFAULT_ROLE_LAYOUTS[user?.role] || DEFAULT_ROLE_LAYOUTS['QA']

  const [layout, setLayout] = useState(() => {
    const key = getLayoutKey(user)
    const saved = localStorage.getItem(key)
    if (saved) {
      try { return JSON.parse(saved) } catch { /* fall through */ }
    }
    return defaultLayout
  })

  // Save layout on change
  useEffect(() => {
    const key = getLayoutKey(user)
    localStorage.setItem(key, JSON.stringify(layout))
  }, [layout, user])

  const pinnedStats = ALL_STATS.filter(s => layout.pinned.includes(s.id))
  const visibleWidgets = ALL_WIDGETS.filter(w => layout.widgets.includes(w.id))

  const togglePin = (statId) => {
    setLayout(prev => {
      const pinned = prev.pinned.includes(statId)
        ? prev.pinned.filter(id => id !== statId)
        : prev.pinned.length < 4 ? [...prev.pinned, statId] : prev.pinned
      return { ...prev, pinned }
    })
  }

  const toggleWidget = (widgetId) => {
    setLayout(prev => {
      const widgets = prev.widgets.includes(widgetId)
        ? prev.widgets.filter(id => id !== widgetId)
        : [...prev.widgets, widgetId]
      return { ...prev, widgets }
    })
  }

  const resetLayout = () => setLayout(defaultLayout)

  // Drag and drop for widget reorder
  const handleDragStart = (idx) => setDragItem(idx)
  const handleDragOver = (e, idx) => { e.preventDefault(); setDragOverItem(idx) }
  const handleDrop = (idx) => {
    if (dragItem === null || dragItem === idx) { setDragItem(null); setDragOverItem(null); return }
    setLayout(prev => {
      const widgets = [...prev.widgets]
      const [removed] = widgets.splice(dragItem, 1)
      widgets.splice(idx, 0, removed)
      return { ...prev, widgets }
    })
    setDragItem(null)
    setDragOverItem(null)
  }

  const efficiencyScore = { reqPerScenario: 0.75, scenarioPerTC: 0.33, duplicatePct: 4.2, overTesting: 12 }

  const trendMax = Math.max(...VELOCITY_DATA.map(v => v.coverage))
  const trendMin = Math.min(...VELOCITY_DATA.map(v => v.coverage)) - 10
  const trendPoints = VELOCITY_DATA.map((v, i) => {
    const x = (i / (VELOCITY_DATA.length - 1)) * 100
    const y = 100 - ((v.coverage - trendMin) / (trendMax - trendMin)) * 80 - 10
    return `${x},${y}`
  }).join(' ')

  const colorMap = { accent: 'var(--accent)', success: 'var(--success)', info: 'var(--info)', warning: 'var(--warning)', danger: 'var(--danger)' }
  const lightMap = { accent: 'var(--accent-light)', success: 'var(--success-light)', info: 'var(--info-light)', warning: 'var(--warning-light)', danger: 'var(--danger-light)' }

  // Widget render map
  const renderWidget = (widgetId, idx) => {
    const widgetIdx = layout.widgets.indexOf(widgetId)
    const isFullWidth = widgetId === 'coverage-trend' || widgetId === 'cicd'
    const dragProps = {
      draggable: true,
      onDragStart: () => handleDragStart(widgetIdx),
      onDragOver: (e) => handleDragOver(e, widgetIdx),
      onDrop: () => handleDrop(widgetIdx),
      onDragEnd: () => { setDragItem(null); setDragOverItem(null) },
    }

    switch (widgetId) {
      case 'coverage-module': return (
        <section key={widgetId} className={`card widget-card ${dragOverItem === widgetIdx ? 'drag-over' : ''}`} {...dragProps}>
          <div className="card-header"><div className="widget-drag-handle"><GripVertical size={14} /></div><h3 className="card-title"><BarChart3 size={16} /> Coverage by Module</h3></div>
          <div className="module-coverage">
            {COVERAGE_BY_MODULE.map(mod => (
              <div key={mod.module}>
                <div className="module-row clickable-module" tabIndex={0} onClick={() => setExpandedModule(expandedModule === mod.module ? null : mod.module)}>
                  <div className="module-info"><span className="module-name">{expandedModule === mod.module ? <ChevronDown size={12} /> : <ChevronRight size={12} />} {mod.module}</span><span className="module-count">{mod.covered}/{mod.total}</span></div>
                  <div className="module-bar-wrap"><div className="progress-bar" style={{ flex: 1 }}><div className="progress-fill" style={{ width: `${mod.pct}%`, background: mod.pct > 80 ? 'var(--success)' : mod.pct > 60 ? 'var(--warning)' : 'var(--danger)' }} /></div><span className={`module-pct ${mod.pct > 80 ? 'high' : mod.pct > 60 ? 'mid' : 'low'}`}>{mod.pct}%</span></div>
                </div>
                {expandedModule === mod.module && (
                  <div className="module-drilldown animate-in">
                    <div className="drilldown-section"><span className="drilldown-label">Scenarios:</span>{mod.scenarios.length > 0 ? mod.scenarios.map(s => <span key={s} className="drilldown-chip">{s}</span>) : <span className="text-muted">None</span>}</div>
                    <div className="drilldown-section"><span className="drilldown-label">Test Cases:</span>{mod.testCases.length > 0 ? mod.testCases.map(t => <span key={t} className="drilldown-chip">{t}</span>) : <span className="text-muted">None</span>}</div>
                    <div className="drilldown-section"><span className="drilldown-label">Gap:</span><span className="text-muted">{mod.total - mod.covered} requirements uncovered</span></div>
                    {onNavigateToScenario && <button className="btn btn-sm btn-primary drilldown-nav-btn" onClick={() => onNavigateToScenario(mod.module)}><Zap size={12} /> Open in Scenario Generator →</button>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )
      case 'defect-prediction': return (
        <section key={widgetId} className={`card widget-card ${dragOverItem === widgetIdx ? 'drag-over' : ''}`} {...dragProps}>
          <div className="card-header"><div className="widget-drag-handle"><GripVertical size={14} /></div><h3 className="card-title"><AlertTriangle size={16} /> Defect Prediction</h3></div>
          <div className="prediction-list">
            {DEFECT_PREDICTIONS.map((d, i) => (
              <div key={i} className="prediction-item">
                <div className="prediction-header"><span className="prediction-module">{d.module}</span><span className={`prediction-prob ${d.probability > 75 ? 'high' : d.probability > 50 ? 'mid' : 'low'}`}>{d.probability}% likely</span></div>
                <p className="prediction-reason">{d.reason}</p>
                <div className="prediction-bar"><span className="prediction-label">Risk-weighted</span><div className="progress-bar" style={{ flex: 1 }}><div className="progress-fill" style={{ width: `${d.weighted}%`, background: d.weighted > 75 ? 'var(--danger)' : d.weighted > 50 ? 'var(--warning)' : 'var(--success)' }} /></div><span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{d.weighted}%</span></div>
              </div>
            ))}
          </div>
        </section>
      )
      default: return null
    }
  }

  return (
    <div className="analytics-dashboard">
      {/* Customize Button */}
      <div className="analytics-toolbar">
        <span className="analytics-role-tag"><Eye size={14} /> {user?.role || 'QA'} View</span>
        <button className="btn btn-sm btn-secondary" onClick={() => {
          toast.info('Preparing PDF export...')
          setTimeout(() => window.print(), 300)
        }}>
          📄 Export PDF
        </button>
        <button className="btn btn-sm btn-secondary" onClick={() => setShowCustomize(!showCustomize)}>
          <Settings size={14} /> Customize Dashboard
        </button>
      </div>

      {/* Customize Panel */}
      {showCustomize && (
        <div className="customize-panel animate-in">
          <div className="customize-header">
            <h4><Settings size={14} /> Customize Your Dashboard</h4>
            <div className="customize-actions">
              <button className="btn btn-sm btn-secondary" onClick={resetLayout}><RotateCcw size={12} /> Reset to Default</button>
              <button className="modal-close" onClick={() => setShowCustomize(false)}><X size={14} /></button>
            </div>
          </div>
          <div className="customize-body">
            <div className="customize-section">
              <h5>Pinned Metrics (max 4)</h5>
              <div className="customize-chips">
                {ALL_STATS.map(s => (
                  <button key={s.id} className={`customize-chip ${layout.pinned.includes(s.id) ? 'active' : ''}`} onClick={() => togglePin(s.id)}>
                    {layout.pinned.includes(s.id) ? <Pin size={10} /> : <PinOff size={10} />} {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="customize-section">
              <h5>Visible Widgets (drag to reorder below)</h5>
              <div className="customize-chips">
                {ALL_WIDGETS.map(w => (
                  <button key={w.id} className={`customize-chip ${layout.widgets.includes(w.id) ? 'active' : ''}`} onClick={() => toggleWidget(w.id)}>
                    {layout.widgets.includes(w.id) ? <Eye size={10} /> : <EyeOff size={10} />} {w.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pinned Stats */}
      <div className={`grid-${Math.min(pinnedStats.length, 4)} pinned-stats`} style={{ marginBottom: '1.5rem' }}>
        {pinnedStats.map(s => {
          const Icon = s.icon
          return (
            <div key={s.id} className="card stat-card pinned-stat">
              <button className="unpin-btn" onClick={() => togglePin(s.id)} title="Unpin"><PinOff size={10} /></button>
              <div className="stat-icon" style={{ background: lightMap[s.color], color: colorMap[s.color] }}><Icon size={20} /></div>
              <div className="stat-value animate-count" style={{ color: colorMap[s.color] }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-trend positive"><TrendingUp size={12} /> {s.trend}</div>
            </div>
          )
        })}
      </div>

      {/* Widget Grid — drag and drop */}
      <div className="analytics-grid">
        {layout.widgets.map((widgetId, idx) => {
          const widgetIdx = idx
          const isFullWidth = widgetId === 'coverage-trend' || widgetId === 'cicd'
          const dragProps = {
            draggable: true,
            onDragStart: () => handleDragStart(widgetIdx),
            onDragOver: (e) => handleDragOver(e, widgetIdx),
            onDrop: () => handleDrop(widgetIdx),
            onDragEnd: () => { setDragItem(null); setDragOverItem(null) },
          }

          // Render each widget type
          if (widgetId === 'coverage-module') return renderWidget(widgetId, idx)
          if (widgetId === 'defect-prediction') return renderWidget(widgetId, idx)

          if (widgetId === 'coverage-trend') return (
            <section key={widgetId} className={`card widget-card ${dragOverItem === widgetIdx ? 'drag-over' : ''}`} style={{ gridColumn: '1 / -1' }} {...dragProps}>
              <div className="card-header"><div className="widget-drag-handle"><GripVertical size={14} /></div><h3 className="card-title"><Activity size={16} /> Coverage Trend Timeline</h3></div>
              <div className="timeline-chart">
                <div className="trend-line-chart">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="trend-svg">
                    <polyline points={trendPoints} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <defs><linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" /><stop offset="100%" stopColor="transparent" /></linearGradient></defs>
                    {VELOCITY_DATA.map((v, i) => {
                      const x = (i / (VELOCITY_DATA.length - 1)) * 100
                      const y = 100 - ((v.coverage - trendMin) / (trendMax - trendMin)) * 80 - 10
                      return <circle key={i} cx={x} cy={y} r="2" fill="var(--accent)" />
                    })}
                  </svg>
                  <div className="trend-labels">{VELOCITY_DATA.map((v, i) => <span key={i} className="trend-label">{v.sprint.replace('Sprint ', 'S')} ({v.coverage}%)</span>)}</div>
                </div>
                <div className="timeline-bars">
                  {VELOCITY_DATA.map((row, i) => (
                    <div key={i} className="timeline-col"><div className="timeline-bar-group"><div className="tbar scenarios-bar" style={{ height: `${row.scenarios * 2.5}px` }} title={`${row.scenarios} scenarios`} /><div className="tbar testcases-bar" style={{ height: `${row.testCases * 1.2}px` }} title={`${row.testCases} test cases`} /></div><span className="timeline-label">{row.sprint.replace('Sprint ', 'S')}</span></div>
                  ))}
                </div>
                <div className="timeline-legend"><span><span className="legend-swatch scenarios-swatch" /> Scenarios</span><span><span className="legend-swatch testcases-swatch" /> Test Cases</span><span><span className="legend-swatch" style={{ background: 'var(--accent)' }} /> Coverage Trend</span></div>
              </div>
            </section>
          )

          if (widgetId === 'efficiency') return (
            <section key={widgetId} className={`card widget-card ${dragOverItem === widgetIdx ? 'drag-over' : ''}`} {...dragProps}>
              <div className="card-header"><div className="widget-drag-handle"><GripVertical size={14} /></div><h3 className="card-title"><Cpu size={16} /> Test Efficiency Score</h3></div>
              <div className="efficiency-grid">
                <div className="eff-item"><span className="eff-label">Req → Scenario Ratio</span><span className="eff-value">{efficiencyScore.reqPerScenario}</span><span className="eff-desc">0.75 requirements per scenario (good)</span></div>
                <div className="eff-item"><span className="eff-label">Scenario → TC Ratio</span><span className="eff-value">{efficiencyScore.scenarioPerTC}</span><span className="eff-desc">3 test cases per scenario (optimal)</span></div>
                <div className="eff-item"><span className="eff-label">Duplicate %</span><span className="eff-value warning">{efficiencyScore.duplicatePct}%</span><span className="eff-desc">Below 5% threshold ✓</span></div>
                <div className="eff-item"><span className="eff-label">Over-Testing</span><span className="eff-value warning">{efficiencyScore.overTesting}%</span><span className="eff-desc">12% of tests overlap — consider consolidation</span></div>
              </div>
            </section>
          )

          if (widgetId === 'stability') return (
            <section key={widgetId} className={`card widget-card ${dragOverItem === widgetIdx ? 'drag-over' : ''}`} {...dragProps}>
              <div className="card-header"><div className="widget-drag-handle"><GripVertical size={14} /></div><h3 className="card-title"><Shield size={16} /> Stability Index</h3></div>
              <div className="stability-list">
                {STABILITY_INDEX.map((s, i) => (
                  <div key={i} className="stability-item"><div className="stability-header"><span>{s.module}</span><span className={`badge badge-${s.volatility === 'high' ? 'danger' : s.volatility === 'medium' ? 'warning' : 'success'}`}>{s.volatility}</span></div><div className="stability-meta"><span>{s.changes} req changes</span><div className="stability-bar"><div className="progress-bar" style={{ width: '80px' }}><div className="progress-fill" style={{ width: `${s.regressionRisk}%`, background: s.regressionRisk > 70 ? 'var(--danger)' : s.regressionRisk > 40 ? 'var(--warning)' : 'var(--success)' }} /></div><span style={{ fontSize: '0.7rem', fontWeight: 700 }}>{s.regressionRisk}%</span></div></div></div>
                ))}
              </div>
            </section>
          )

          if (widgetId === 'cicd') return (
            <section key={widgetId} className={`card widget-card ${dragOverItem === widgetIdx ? 'drag-over' : ''}`} style={{ gridColumn: '1 / -1' }} {...dragProps}>
              <div className="card-header"><div className="widget-drag-handle"><GripVertical size={14} /></div><h3 className="card-title"><GitBranch size={16} /> CI/CD Integration Status</h3></div>
              <div className="table-wrapper"><table><thead><tr><th>Test Case</th><th>Automated</th><th>Pipeline</th><th>Last Run</th><th>Time</th></tr></thead><tbody>
                {CICD_STATUS.map((c, i) => (
                  <tr key={i}><td><span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>{c.testCase}</span></td><td>{c.automated ? <span className="badge badge-success">Yes</span> : <span className="badge badge-warning">No</span>}</td><td>{c.pipeline}</td><td>{c.lastRun === 'Passed' ? <span className="badge badge-success">Passed</span> : c.lastRun === 'Failed' ? <span className="badge badge-danger">Failed</span> : '—'}</td><td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{c.time}</td></tr>
                ))}
              </tbody></table></div>
            </section>
          )

          if (widgetId === 'risk') return (
            <section key={widgetId} className={`card widget-card ${dragOverItem === widgetIdx ? 'drag-over' : ''}`} {...dragProps}>
              <div className="card-header"><div className="widget-drag-handle"><GripVertical size={14} /></div><h3 className="card-title"><AlertTriangle size={16} /> Risk Prioritization</h3></div>
              <div className="risk-list">
                {RISK_ITEMS.map((item, i) => (
                  <div key={i} className="risk-item">
                    <div className="risk-header"><span className={`badge badge-${item.risk === 'high' ? 'danger' : 'warning'}`}>{item.risk}</span><span className="risk-effort"><Clock size={12} /> {item.effort}</span></div>
                    <p className="risk-area">{item.area}</p><p className="risk-reason">{item.reason}</p>
                    <div className="risk-actions">
                      <button className="btn btn-sm btn-primary" onClick={() => { if (onNavigateToScenario) onNavigateToScenario(item.module) }}><Sparkles size={12} /> Generate Scenarios</button>
                      <button className="btn btn-sm btn-secondary" onClick={() => toast.info(`Creating test case template for "${item.area}"...`)}><Target size={12} /> Create Test Case</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )

          if (widgetId === 'gaps') return (
            <section key={widgetId} className={`card widget-card ${dragOverItem === widgetIdx ? 'drag-over' : ''}`} {...dragProps}>
              <div className="card-header"><div className="widget-drag-handle"><GripVertical size={14} /></div><h3 className="card-title"><Target size={16} /> Coverage Gaps</h3></div>
              <div className="gap-list">
                {[
                  { level: 'danger', title: 'No negative tests for cross-device sync', desc: 'Network failure, timeout, conflict scenarios' },
                  { level: 'danger', title: 'Concurrent recording limit untested', desc: 'Max simultaneous recordings per tier' },
                  { level: 'warning', title: 'Accessibility not covered for DVR UI', desc: 'Screen reader and keyboard navigation' },
                  { level: 'warning', title: 'Performance under load', desc: 'Bulk recording scheduling stress test' },
                ].map((g, i) => (
                  <div key={i} className="gap-item"><div className={`gap-dot ${g.level}`} /><div><p className="gap-title">{g.title}</p><p className="gap-desc">{g.desc}</p></div></div>
                ))}
              </div>
            </section>
          )

          return null
        })}
      </div>
    </div>
  )
}
