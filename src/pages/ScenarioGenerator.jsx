import { useState, useEffect } from 'react'
import {
  Zap, Plus, ChevronDown, ChevronRight, CheckCircle,
  XCircle, Sparkles, Layers, GitBranch, Target, Shield,
  RefreshCw, Minus, AlertTriangle, Lightbulb, Skull, Database
} from 'lucide-react'
import { useToast } from '../components/Toast'
import { generateScenarios as aiGenerateScenarios, chatWithAI } from '../utils/ai'
import './ScenarioGenerator.css'

const SCENARIOS = [
  { id: 'SC-001', title: 'CDVR Recording - Happy Path', category: 'E2E', priority: 'P1', type: 'positive', requirement: 'REQ-001', status: 'generated', module: 'CDVR Recording',
    steps: ['Navigate to program guide', 'Select future program', 'Click Record', 'Verify recording scheduled', 'Verify playback after recording completes'],
    branchComplexity: 82, edgeCoverage: 70, regressionImpact: 90, overlaps: ['SC-002'] },
  { id: 'SC-002', title: 'CDVR Recording - Storage Full', category: 'E2E', priority: 'P1', type: 'negative', requirement: 'REQ-006', status: 'generated', module: 'Storage Management',
    steps: ['Fill storage to 100%', 'Attempt new recording', 'Verify error message displayed', 'Verify manage storage option shown'],
    branchComplexity: 55, edgeCoverage: 85, regressionImpact: 65, overlaps: ['SC-001'] },
  { id: 'SC-003', title: 'Concurrent Recording Conflict', category: 'Integration', priority: 'P2', type: 'negative', requirement: 'REQ-003', status: 'review', module: 'Conflict Resolution',
    steps: ['Schedule 2 overlapping recordings', 'Verify conflict notification', 'Select resolution option', 'Verify correct recording proceeds'],
    branchComplexity: 92, edgeCoverage: 40, regressionImpact: 88, overlaps: [] },
  { id: 'SC-004', title: 'Trick Play on CDVR Content', category: 'UI', priority: 'P2', type: 'positive', requirement: 'REQ-002', status: 'generated', module: 'Playback & Trick Play',
    steps: ['Play recorded content', 'Fast forward 2x, 4x, 8x', 'Rewind 2x, 4x, 8x', 'Pause and resume', 'Verify seek bar accuracy'],
    branchComplexity: 68, edgeCoverage: 55, regressionImpact: 72, overlaps: [] },
  { id: 'SC-005', title: 'Cross-Device Recording Sync', category: 'API', priority: 'P1', type: 'positive', requirement: 'REQ-004', status: 'generated', module: 'Cross-Device Sync',
    steps: ['Schedule recording on Device A', 'Verify recording appears on Device B', 'Delete recording on Device B', 'Verify deletion synced to Device A'],
    branchComplexity: 75, edgeCoverage: 60, regressionImpact: 80, overlaps: [] },
  { id: 'SC-006', title: 'Parental Control on Recordings', category: 'E2E', priority: 'P2', type: 'positive', requirement: 'REQ-005', status: 'review', module: 'Parental Controls',
    steps: ['Enable parental controls', 'Record restricted content', 'Attempt playback', 'Verify PIN prompt', 'Enter correct PIN and verify playback'],
    branchComplexity: 45, edgeCoverage: 72, regressionImpact: 55, overlaps: [] },
  { id: 'SC-007', title: 'Recording API - Invalid Token', category: 'Backend', priority: 'P3', type: 'negative', requirement: 'REQ-001', status: 'generated', module: 'CDVR Recording',
    steps: ['Send recording request with expired token', 'Verify 401 response', 'Verify error body format'],
    branchComplexity: 30, edgeCoverage: 90, regressionImpact: 40, overlaps: [] },
  { id: 'SC-008', title: 'Storage Quota 80% Notification', category: 'UI', priority: 'P2', type: 'positive', requirement: 'REQ-006', status: 'generated', module: 'Storage Management',
    steps: ['Fill storage to 79%', 'Add recording to cross 80%', 'Verify notification displayed', 'Verify notification content'],
    branchComplexity: 38, edgeCoverage: 78, regressionImpact: 50, overlaps: ['SC-002'] },
]

const EVIL_TWIN_SCENARIOS = [
  { id: 'ET-001', title: 'Network drop mid-recording schedule', type: 'chaos', steps: ['Begin recording schedule API call', 'Simulate network disconnect at 50% payload', 'Verify partial state rollback', 'Verify retry mechanism activates'] },
  { id: 'ET-002', title: 'Expired auth token during playback', type: 'chaos', steps: ['Start CDVR playback with valid token', 'Token expires mid-stream', 'Verify silent token refresh', 'Verify playback continues without interruption'] },
  { id: 'ET-003', title: 'Database timeout on conflict resolution', type: 'chaos', steps: ['Trigger concurrent recording conflict', 'Simulate DB response timeout (30s)', 'Verify user sees loading state', 'Verify graceful fallback after timeout'] },
  { id: 'ET-004', title: 'Storage write failure mid-recording', type: 'chaos', steps: ['Start recording successfully', 'Simulate disk write failure at 60%', 'Verify partial recording cleanup', 'Verify user notification of failure'] },
]

const DATA_BANK = [
  { id: 'DB-001', name: 'Channel Variants', entries: ['ESPN HD', 'CNN', 'HBO Max', 'Discovery+', 'Spectrum News NY1', 'Fox Sports 1'] },
  { id: 'DB-002', name: 'Account Tiers', entries: ['CDVR Unlimited', 'CDVR 200hr', 'Essential', 'Select Plus', 'Choice'] },
  { id: 'DB-003', name: 'Device Types', entries: ['Roku Ultra', 'Apple TV 4K', 'Xumo Stream Box', 'Samsung Smart TV', 'Xbox Series X'] },
]

const DIFF_EXAMPLE = {
  old: ['Schedule 2 overlapping recordings', 'Verify conflict notification', 'Verify correct recording proceeds'],
  new: ['Schedule 2 overlapping recordings', 'Verify conflict notification with priority indicator', 'Select resolution option (keep higher priority)', 'Verify correct recording proceeds', 'Verify cancelled recording notification sent'],
}

const AI_SUGGESTIONS = [
  { icon: '🎯', text: 'Boundary: Recording at exactly 200 hours limit', priority: 'high' },
  { icon: '🌐', text: 'Missing: Network interruption during recording', priority: 'high' },
  { icon: '🔒', text: 'Security: Unauthorized access to another user\'s recordings', priority: 'medium' },
]

const CATEGORIES = ['All', 'E2E', 'UI', 'Integration', 'Backend', 'API']

export default function ScenarioGenerator({ preFilter, onClearFilter }) {
  const toast = useToast()
  const [scenarios, setScenarios] = useState(SCENARIOS)
  const [activeCategory, setActiveCategory] = useState('All')
  const [expandedId, setExpandedId] = useState(null)
  const [showDiff, setShowDiff] = useState(false)
  const [showNegExpand, setShowNegExpand] = useState(false)
  const [dismissedSuggestions, setDismissedSuggestions] = useState([])
  const [evilTwinMode, setEvilTwinMode] = useState(false)
  const [showDataBank, setShowDataBank] = useState(false)
  const [selectedDataSet, setSelectedDataSet] = useState(null)
  const [moduleFilter, setModuleFilter] = useState(null)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiSuggestionsData, setAiSuggestionsData] = useState(AI_SUGGESTIONS)

  // Handle pre-filter from Analytics navigation
  useEffect(() => {
    if (preFilter) {
      setModuleFilter(preFilter)
    }
  }, [preFilter])

  const clearModuleFilter = () => {
    setModuleFilter(null)
    if (onClearFilter) onClearFilter()
  }

  // AI-powered scenario generation from ingested documents
  const handleAIGenerate = async () => {
    setAiGenerating(true)
    toast.info('AI is generating scenarios from your requirements...')
    try {
      // Pull requirements from localStorage (ingested docs)
      const docs = JSON.parse(localStorage.getItem('vpt-docs') || '[]')
      const parsedDocs = docs.filter(d => d.status === 'parsed')
      if (parsedDocs.length === 0) {
        toast.warning('No parsed documents found. Upload requirements in Document Hub first.')
        setAiGenerating(false)
        return
      }
      const requirements = parsedDocs.flatMap(d => (d.aiRequirements || []).map(r => ({
        id: r.id, title: r.title, description: r.description, risk: r.risk,
      })))
      if (requirements.length === 0) {
        // Fallback: build requirements from doc names/stories
        const fallbackReqs = parsedDocs.map((d, i) => ({
          id: `REQ-${String(i + 1).padStart(3, '0')}`,
          title: d.name,
          description: `Document with ${d.stories} stories and ${d.specs} specs. Testability: ${d.testability}%`,
          risk: d.testability < 60 ? 'high' : d.testability < 80 ? 'medium' : 'low',
        }))
        requirements.push(...fallbackReqs)
      }
      const result = await aiGenerateScenarios(requirements)
      const newScenarios = (result.scenarios || []).map((s, i) => ({
        ...s,
        id: s.id || `SC-${String(scenarios.length + i + 1).padStart(3, '0')}`,
        status: 'generated',
        module: s.requirement || 'AI Generated',
        branchComplexity: s.edgeCoverage || 70,
        overlaps: [],
      }))
      setScenarios(prev => [...prev, ...newScenarios])
      toast.success(`AI generated ${newScenarios.length} new scenarios`)
    } catch (err) {
      console.error('AI scenario generation failed:', err)
      toast.error(`AI generation failed: ${err.message}`)
    } finally {
      setAiGenerating(false)
    }
  }

  // AI-powered suggestions refresh
  const handleAISuggestions = async () => {
    try {
      const docs = JSON.parse(localStorage.getItem('vpt-docs') || '[]')
      const context = `Current scenarios: ${scenarios.length}. Parsed docs: ${docs.filter(d => d.status === 'parsed').length}. Existing scenario titles: ${scenarios.slice(0, 10).map(s => s.title).join(', ')}`
      const data = await chatWithAI('Suggest 3 high-value test scenarios that are missing from the current set. Return each as a JSON array with fields: icon (emoji), text (scenario description), priority (high/medium). Only return the JSON array, no other text.', context)
      try {
        const parsed = JSON.parse(data.reply.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim())
        if (Array.isArray(parsed)) setAiSuggestionsData(parsed)
      } catch { /* keep existing suggestions */ }
    } catch { /* silently fail */ }
  }

  const allScenarios = evilTwinMode ? [...scenarios, ...EVIL_TWIN_SCENARIOS.map(et => ({ ...et, category: 'E2E', priority: 'P1', requirement: 'REQ-003', status: 'generated', module: 'Conflict Resolution', branchComplexity: 95, edgeCoverage: 92, regressionImpact: 88, overlaps: [] }))] : scenarios

  const filtered = allScenarios.filter(s => {
    if (moduleFilter && s.module !== moduleFilter) return false
    if (activeCategory !== 'All' && s.category !== activeCategory) return false
    return true
  })

  const categoryCounts = CATEGORIES.reduce((acc, cat) => { acc[cat] = cat === 'All' ? allScenarios.length : allScenarios.filter(s => s.category === cat).length; return acc }, {})

  const coverageData = [
    { req: 'REQ-001', scenarios: 2, coverage: 85 }, { req: 'REQ-002', scenarios: 1, coverage: 60 },
    { req: 'REQ-003', scenarios: 1, coverage: 45 }, { req: 'REQ-004', scenarios: 1, coverage: 70 },
    { req: 'REQ-005', scenarios: 1, coverage: 75 }, { req: 'REQ-006', scenarios: 2, coverage: 90 },
  ]

  const depthColor = (v) => v > 75 ? 'var(--success)' : v > 50 ? 'var(--warning)' : 'var(--danger)'
  const heatColor = (v) => v > 75 ? 'var(--success)' : v > 50 ? 'var(--warning)' : 'var(--danger)'
  const heatBg = (v) => v > 75 ? 'var(--success-light)' : v > 50 ? 'var(--warning-light)' : 'var(--danger-light)'

  const activeSuggestions = aiSuggestionsData.filter((_, i) => !dismissedSuggestions.includes(i))

  return (
    <div className="scenario-generator">
      {/* Module pre-filter banner */}
      {moduleFilter && (
        <div className="module-filter-banner animate-in">
          <Target size={14} />
          <span>Filtered by module: <strong>{moduleFilter}</strong></span>
          <button className="btn btn-sm btn-secondary" onClick={clearModuleFilter}>Clear Filter ×</button>
        </div>
      )}

      {/* Promoted AI Suggestions Banner */}
      {activeSuggestions.length > 0 && (
        <div className="ai-suggestions-banner animate-in">
          <div className="banner-header"><Lightbulb size={16} /> AI Recommendations — {activeSuggestions.length} high-value scenarios detected</div>
          <div className="banner-items">
            {aiSuggestionsData.map((s, i) => !dismissedSuggestions.includes(i) && (
              <div key={i} className="banner-suggestion">
                <span className="banner-icon">{s.icon}</span>
                <span className="banner-text">{s.text}</span>
                <span className={`badge badge-${s.priority === 'high' ? 'danger' : 'warning'}`}>{s.priority}</span>
                <button className="btn btn-sm btn-primary" onClick={() => { const id = `SC-${String(allScenarios.length + 1).padStart(3, '0')}`; setScenarios(prev => [...prev, { id, title: s.text, category: 'E2E', priority: s.priority === 'high' ? 'P1' : 'P2', type: 'negative', requirement: 'REQ-003', status: 'generated', module: 'CDVR Recording', steps: ['AI-generated step 1', 'AI-generated step 2'], branchComplexity: 70, edgeCoverage: 80, regressionImpact: 75, overlaps: [] }]); setDismissedSuggestions(prev => [...prev, i]) }}><Plus size={12} /> Add</button>
                <button className="btn btn-sm btn-secondary" onClick={() => setDismissedSuggestions(prev => [...prev, i])}>Dismiss</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <section className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="card stat-card"><div className="stat-value animate-count">{allScenarios.length}</div><div className="stat-label">Total Scenarios</div></div>
        <div className="card stat-card"><div className="stat-value animate-count" style={{ color: 'var(--success)' }}>{allScenarios.filter(s => s.type === 'positive').length}</div><div className="stat-label">Positive</div></div>
        <div className="card stat-card"><div className="stat-value animate-count" style={{ color: 'var(--danger)' }}>{allScenarios.filter(s => s.type === 'negative' || s.type === 'chaos').length}</div><div className="stat-label">Negative{evilTwinMode ? ' + Chaos' : ''}</div></div>
        <div className="card stat-card"><div className="stat-value animate-count" style={{ color: 'var(--info)' }}>{allScenarios.length > 0 ? Math.round(allScenarios.reduce((s, sc) => s + (sc.edgeCoverage || 0), 0) / allScenarios.length) : 0}%</div><div className="stat-label">Avg Coverage</div></div>
      </section>

      <div className="scenario-layout">
        <section className="card scenario-list-panel">
          <div className="card-header">
            <h3 className="card-title">Test Scenarios</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Evil Twin Toggle */}
              <label className={`evil-twin-toggle ${evilTwinMode ? 'active' : ''}`} title="Evil Twin Mode — generate chaotic edge cases">
                <input type="checkbox" checked={evilTwinMode} onChange={() => setEvilTwinMode(!evilTwinMode)} />
                <Skull size={14} /> Evil Twin
              </label>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowDataBank(!showDataBank)}><Database size={14} /> Data Bank</button>
              <button className="btn btn-sm btn-primary" onClick={handleAIGenerate} disabled={aiGenerating}><Sparkles size={14} /> {aiGenerating ? 'Generating...' : 'Generate More'}</button>
              <button className="btn btn-sm btn-secondary" onClick={() => { const id = `SC-${String(allScenarios.length + 1).padStart(3, '0')}`; setScenarios(prev => [...prev, { id, title: 'New Manual Scenario', category: 'E2E', priority: 'P2', type: 'positive', requirement: 'REQ-001', status: 'draft', module: 'CDVR Recording', steps: ['Step 1: Define action', 'Step 2: Verify result'], branchComplexity: 50, edgeCoverage: 50, regressionImpact: 50, overlaps: [] }]); toast.success(`${id} added — edit the steps in the expanded view`) }}><Plus size={14} /> Manual Add</button>
            </div>
          </div>

          <div className="category-pills" role="tablist">
            {CATEGORIES.map(cat => (
              <button key={cat} role="tab" className={`category-pill ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)} aria-selected={activeCategory === cat}>
                {cat} <span className="pill-count">{categoryCounts[cat]}</span>
              </button>
            ))}
          </div>

          {/* Data Bank Panel */}
          {showDataBank && (
            <div className="data-bank-panel animate-in">
              <div className="data-bank-header"><Database size={14} /> Parameterization Data Bank</div>
              <p className="data-bank-desc">Link data sets to scenarios so the same test runs against multiple inputs.</p>
              <div className="data-bank-list">
                {DATA_BANK.map(db => (
                  <div key={db.id} className={`data-bank-item ${selectedDataSet === db.id ? 'selected' : ''}`} onClick={() => setSelectedDataSet(selectedDataSet === db.id ? null : db.id)}>
                    <div className="db-item-header">
                      <span className="db-item-name">{db.name}</span>
                      <span className="badge badge-accent">{db.entries.length} entries</span>
                    </div>
                    {selectedDataSet === db.id && (
                      <div className="db-entries">
                        {db.entries.map((e, i) => <span key={i} className="db-entry-chip">{e}</span>)}
                        <button className="btn btn-sm btn-primary" style={{ marginTop: '0.35rem' }} onClick={() => toast.info(`Data set "${db.name}" linked to ${expandedId || 'selected scenario'}. ${db.entries.length} entries will be parameterized.`)}><Plus size={10} /> Link to Selected Scenario</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="scenario-list" role="list">
            {filtered.map(sc => (
              <div key={sc.id} className={`scenario-item ${sc.type === 'chaos' ? 'chaos-item' : ''}`} role="listitem">
                <div className="scenario-header" onClick={() => setExpandedId(expandedId === sc.id ? null : sc.id)} tabIndex={0} role="button" aria-expanded={expandedId === sc.id}>
                  {expandedId === sc.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <div className="scenario-info">
                    <div className="scenario-top">
                      <span className="scenario-id">{sc.id}</span>
                      <span className={`badge badge-${sc.category === 'E2E' ? 'accent' : sc.category === 'UI' ? 'info' : sc.category === 'Backend' || sc.category === 'API' ? 'warning' : 'success'}`}>{sc.category}</span>
                      <span className={`badge ${sc.type === 'positive' ? 'badge-success' : sc.type === 'chaos' ? 'badge-danger' : 'badge-danger'}`}>
                        {sc.type === 'positive' ? <CheckCircle size={10} /> : sc.type === 'chaos' ? <Skull size={10} /> : <XCircle size={10} />}
                        {sc.type}
                      </span>
                      <span className="badge badge-accent">{sc.priority}</span>
                    </div>
                    <p className="scenario-title">{sc.title}</p>
                    <div className="scenario-bottom">
                      <span className="scenario-req"><GitBranch size={12} /> {sc.requirement}</span>
                      {sc.branchComplexity && (
                        <div className="depth-indicators">
                          <span className="depth-chip" title="Branch complexity" style={{ color: depthColor(sc.branchComplexity) }}>🌿 {sc.branchComplexity}</span>
                          <span className="depth-chip" title="Edge case coverage" style={{ color: depthColor(sc.edgeCoverage) }}>⚡ {sc.edgeCoverage}</span>
                          <span className="depth-chip" title="Regression impact" style={{ color: depthColor(sc.regressionImpact) }}>🔄 {sc.regressionImpact}</span>
                        </div>
                      )}
                    </div>
                    {sc.overlaps && sc.overlaps.length > 0 && (
                      <div className="scenario-overlaps">
                        <Layers size={11} /> Overlaps with: {sc.overlaps.map(o => <span key={o} className="overlap-link">{o}</span>)}
                      </div>
                    )}
                  </div>
                </div>
                {expandedId === sc.id && (
                  <div className="scenario-steps animate-in">
                    <h4>Steps:</h4>
                    <ol>{sc.steps.map((step, i) => <li key={i}>{step}</li>)}</ol>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="scenario-side-panels">
          {/* Color-coded Coverage Heatmap */}
          <section className="card">
            <div className="card-header"><h3 className="card-title"><Target size={16} /> Coverage Heatmap</h3></div>
            <div className="coverage-grid" role="table">
              <div className="coverage-header" role="row"><span>Requirement</span><span>Scenarios</span><span>Coverage</span></div>
              {coverageData.map(item => (
                <div key={item.req} className="coverage-row clickable-row" role="row" tabIndex={0} title={`Click to drill into ${item.req}`} style={{ background: heatBg(item.coverage) }}>
                  <span className="coverage-req">{item.req}</span>
                  <span>{item.scenarios}</span>
                  <div className="coverage-bar-wrap">
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${item.coverage}%`, background: heatColor(item.coverage) }} /></div>
                    <span className="coverage-pct" style={{ color: heatColor(item.coverage) }}>{item.coverage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Scenario Diff Viewer */}
          <section className="card">
            <div className="card-header">
              <h3 className="card-title"><RefreshCw size={16} /> Scenario Diff</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowDiff(!showDiff)}>{showDiff ? 'Hide' : 'Show'} Diff</button>
            </div>
            {showDiff && (
              <div className="diff-viewer animate-in">
                <div className="diff-col diff-old"><h5>v1.0 (Previous)</h5>{DIFF_EXAMPLE.old.map((s, i) => <div key={i} className="diff-line">{s}</div>)}</div>
                <div className="diff-col diff-new"><h5>v2.0 (Current)</h5>{DIFF_EXAMPLE.new.map((s, i) => { const isNew = !DIFF_EXAMPLE.old.includes(s); const isModified = DIFF_EXAMPLE.old.some(o => s.startsWith(o.substring(0, 20)) && o !== s); return <div key={i} className={`diff-line ${isNew ? 'diff-added' : ''} ${isModified ? 'diff-modified' : ''}`}>{isNew && <Plus size={12} />}{isModified && <RefreshCw size={12} />}{s}</div> })}</div>
              </div>
            )}
          </section>

          {/* Smart Negative Expansion */}
          <section className="card">
            <div className="card-header">
              <h3 className="card-title"><Sparkles size={16} /> Advanced Negatives</h3>
              <button className="btn btn-sm btn-primary" onClick={() => setShowNegExpand(!showNegExpand)}><Zap size={12} /> {showNegExpand ? 'Hide' : 'Expand'}</button>
            </div>
            {showNegExpand && (
              <div className="neg-expansion animate-in">
                <h5><AlertTriangle size={14} /> Advanced Negative Paths</h5>
                {[
                  { icon: '⏱', label: 'Timeout: Recording API response exceeds 30s threshold' },
                  { icon: '⚠️', label: 'Partial Failure: Recording starts but storage write fails mid-stream' },
                  { icon: '🔒', label: 'Permission Denied: Expired subscription attempts recording' },
                  { icon: '💥', label: 'Boundary Overflow: 201st hour recording on full storage' },
                  { icon: '🔌', label: 'Network Drop: WiFi disconnect during cross-device sync' },
                ].map((neg, i) => (
                  <div key={i} className="neg-item"><span>{neg.icon}</span><span>{neg.label}</span><button className="btn btn-sm btn-primary" onClick={() => { const id = `SC-${String(allScenarios.length + 1).padStart(3, '0')}`; setScenarios(prev => [...prev, { id, title: neg.label, category: 'Backend', priority: 'P2', type: 'negative', requirement: 'REQ-003', status: 'generated', module: 'CDVR Recording', steps: [neg.label], branchComplexity: 80, edgeCoverage: 85, regressionImpact: 70, overlaps: [] }]); toast.success(`${id}: "${neg.label}" added`) }}><Plus size={10} /></button></div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
