import { useState } from 'react'
import {
  AlertTriangle, CheckCircle, MessageSquare, ThumbsUp,
  ThumbsDown, Flag, Eye, Sparkles, ChevronDown,
  ChevronRight, Shield, Zap, Bug, GitBranch, CheckSquare,
  ArrowUpDown
} from 'lucide-react'
import { useToast } from '../components/Toast'
import { sanitizeComment } from '../utils/sanitize'
import { chatWithAI } from '../utils/ai'
import './ReviewDashboard.css'

const REQUIREMENTS = [
  { id: 'REQ-001', title: 'User shall be able to record up to 200 hours of content', risk: 'low', status: 'approved', gaps: 0, comments: 3, testability: 95, complexity: 'low', untestedBranches: 1, edgeCases: 3, historicalDefects: 2, aiSummary: 'Well-defined with clear acceptance criteria', gapDetails: [] },
  { id: 'REQ-002', title: 'CDVR playback shall support trick-play operations', risk: 'medium', status: 'review', gaps: 2, comments: 5, testability: 78, complexity: 'medium', untestedBranches: 4, edgeCases: 8, historicalDefects: 5, aiSummary: 'Missing DRM key rotation and buffering edge cases', gapDetails: ['No test for DRM key rotation during trick-play', 'Buffering behavior during fast-forward undefined'] },
  { id: 'REQ-003', title: 'System shall handle concurrent recording conflicts gracefully', risk: 'high', status: 'flagged', gaps: 4, comments: 8, testability: 45, complexity: 'high', untestedBranches: 7, edgeCases: 12, historicalDefects: 11, aiSummary: 'Missing concurrency edge cases and conflict priority rules', gapDetails: ['No max concurrent recording limit defined per tier', 'Conflict resolution priority rules missing', 'No test for simultaneous schedule + cancel', 'Storage impact during conflicts undefined'] },
  { id: 'REQ-004', title: 'Recording schedule shall sync across all user devices', risk: 'medium', status: 'review', gaps: 1, comments: 2, testability: 82, complexity: 'medium', untestedBranches: 3, edgeCases: 6, historicalDefects: 4, aiSummary: 'Network failure during sync not addressed', gapDetails: ['No offline sync recovery scenario'] },
  { id: 'REQ-005', title: 'Parental controls shall apply to recorded content', risk: 'low', status: 'approved', gaps: 0, comments: 1, testability: 90, complexity: 'low', untestedBranches: 1, edgeCases: 4, historicalDefects: 1, aiSummary: 'Comprehensive coverage with clear PIN flow', gapDetails: [] },
  { id: 'REQ-006', title: 'Storage quota notifications at 80% and 95% thresholds', risk: 'low', status: 'review', gaps: 1, comments: 4, testability: 88, complexity: 'low', untestedBranches: 2, edgeCases: 5, historicalDefects: 3, aiSummary: 'Missing notification dismissal and snooze behavior', gapDetails: ['Notification snooze/dismiss behavior undefined'] },
]

const RADAR_DATA = [
  { category: 'UI', coverage: 78, angle: 0 },
  { category: 'Backend', coverage: 62, angle: 60 },
  { category: 'Edge Cases', coverage: 35, angle: 120 },
  { category: 'Security', coverage: 28, angle: 180 },
  { category: 'Integration', coverage: 55, angle: 240 },
  { category: 'Performance', coverage: 42, angle: 300 },
]

export default function ReviewDashboard() {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('all')
  const [selectedReq, setSelectedReq] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [expandedRisk, setExpandedRisk] = useState(null)
  const [expandedGaps, setExpandedGaps] = useState(null)
  const [sortBy, setSortBy] = useState(null)
  const [requirements, setRequirements] = useState(REQUIREMENTS)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)

  const filtered = activeTab === 'all' ? requirements : requirements.filter(r => r.status === activeTab)

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'coverage-asc') return a.testability - b.testability
    if (sortBy === 'coverage-desc') return b.testability - a.testability
    return 0
  })

  const riskColor = (r) => r === 'high' ? 'danger' : r === 'medium' ? 'warning' : 'success'
  const selectedReqData = requirements.find(r => r.id === selectedReq)

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  const selectAll = () => setSelectedIds(filtered.map(r => r.id))
  const clearSelection = () => setSelectedIds([])

  const cycleSortCoverage = () => {
    if (!sortBy) setSortBy('coverage-asc')
    else if (sortBy === 'coverage-asc') setSortBy('coverage-desc')
    else setSortBy(null)
  }

  // AI-powered gap analysis
  const handleAIGapAnalysis = async () => {
    setAiAnalyzing(true)
    toast.info('AI is analyzing requirements for gaps...')
    try {
      const reqData = requirements.map(r => ({ id: r.id, title: r.title, testability: r.testability, gaps: r.gaps }))
      const data = await chatWithAI(
        `Analyze these requirements for coverage gaps, missing edge cases, and risk areas. For each requirement, provide an updated aiSummary and any new gapDetails. Return JSON array with fields: id, aiSummary, gapDetails (array of strings), risk (low/medium/high). Only return the JSON array.`,
        JSON.stringify(reqData)
      )
      try {
        const parsed = JSON.parse(data.reply.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim())
        if (Array.isArray(parsed)) {
          setRequirements(prev => prev.map(r => {
            const update = parsed.find(p => p.id === r.id)
            if (update) return { ...r, aiSummary: update.aiSummary || r.aiSummary, gapDetails: update.gapDetails || r.gapDetails, risk: update.risk || r.risk, gaps: (update.gapDetails || r.gapDetails).length }
            return r
          }))
          toast.success('AI gap analysis complete — summaries updated')
        }
      } catch {
        toast.info(`AI analysis: ${data.reply.substring(0, 150)}...`)
      }
    } catch (err) {
      toast.error(`AI gap analysis failed: ${err.message}`)
    } finally {
      setAiAnalyzing(false)
    }
  }

  // AI re-generate analysis for selected requirements
  const handleAIRegenerate = async () => {
    toast.info(`Re-generating AI analysis for ${selectedIds.length} requirement(s)...`)
    try {
      const selected = requirements.filter(r => selectedIds.includes(r.id))
      const data = await chatWithAI(
        `Re-analyze these requirements and provide updated scores. Return JSON array with: id, testability (0-100), aiSummary, gapDetails (array), risk (low/medium/high). Only return JSON.`,
        JSON.stringify(selected.map(r => ({ id: r.id, title: r.title })))
      )
      try {
        const parsed = JSON.parse(data.reply.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim())
        if (Array.isArray(parsed)) {
          setRequirements(prev => prev.map(r => {
            const update = parsed.find(p => p.id === r.id)
            if (update) return { ...r, testability: update.testability || r.testability, aiSummary: update.aiSummary || r.aiSummary, gapDetails: update.gapDetails || r.gapDetails, risk: update.risk || r.risk, gaps: (update.gapDetails || r.gapDetails).length }
            return r
          }))
          toast.success(`AI re-analysis complete for ${selectedIds.length} requirement(s)`)
        }
      } catch { toast.info('AI provided analysis in text format') }
    } catch (err) { toast.error(`Re-generate failed: ${err.message}`) }
    setSelectedIds([])
  }

  // AI bridge the gap — generate missing scenarios
  const handleBridgeGap = async (req) => {
    toast.info(`AI generating ${req.gaps} missing scenarios for ${req.id}...`)
    try {
      const data = await chatWithAI(
        `Generate ${req.gaps} missing test scenarios for this requirement. Focus on the gaps identified. Return a brief list of scenario titles and descriptions.`,
        `Requirement: ${req.id} - ${req.title}\nGaps: ${req.gapDetails.join(', ')}\nRisk: ${req.risk}`
      )
      toast.success(`AI suggestions for ${req.id}: ${data.reply.substring(0, 200)}`)
    } catch (err) { toast.error(`Bridge gap failed: ${err.message}`) }
  }

  const radarPoints = RADAR_DATA.map(d => {
    const r = (d.coverage / 100) * 40
    const rad = (d.angle - 90) * Math.PI / 180
    return { ...d, cx: 50 + r * Math.cos(rad), cy: 50 + r * Math.sin(rad) }
  })
  const radarPath = radarPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.cx},${p.cy}`).join(' ') + 'Z'

  return (
    <div className="review-dashboard">
      <section className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="card stat-card"><div className="stat-value animate-count">{requirements.length}</div><div className="stat-label">Total Requirements</div></div>
        <div className="card stat-card"><div className="stat-value animate-count" style={{ color: 'var(--success)' }}>{requirements.filter(r => r.status === 'approved').length}</div><div className="stat-label">Approved</div></div>
        <div className="card stat-card"><div className="stat-value animate-count" style={{ color: 'var(--warning)' }}>{requirements.filter(r => r.status === 'review').length}</div><div className="stat-label">In Review</div></div>
        <div className="card stat-card"><div className="stat-value animate-count" style={{ color: 'var(--danger)' }}>{requirements.filter(r => r.status === 'flagged').length}</div><div className="stat-label">Flagged</div></div>
      </section>

      <div className="review-layout">
        <section className="card review-list-panel">
          <div className="card-header">
            <h3 className="card-title">Requirements Review</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {selectedIds.length > 0 && (
                <div className="batch-actions animate-in">
                  <span className="badge badge-accent">{selectedIds.length} selected</span>
                  <button className="btn btn-sm btn-success" onClick={() => { toast.success(`${selectedIds.length} requirement(s) approved`); setSelectedIds([]) }}><ThumbsUp size={12} /> Approve</button>
                  <button className="btn btn-sm btn-secondary" onClick={() => { toast.info(`Clarification requested for ${selectedIds.length} requirement(s)`); setSelectedIds([]) }}><MessageSquare size={12} /> Request Clarification</button>
                  <button className="btn btn-sm btn-primary" onClick={handleAIRegenerate}><Sparkles size={12} /> Re-generate</button>
                  <button className="btn btn-sm btn-secondary" onClick={clearSelection}>Clear</button>
                </div>
              )}
              <button className="btn btn-sm btn-secondary" onClick={selectAll}><CheckSquare size={14} /> Select All</button>
              <button className="btn btn-sm btn-secondary" onClick={cycleSortCoverage} title="Sort by coverage %">
                <ArrowUpDown size={14} /> Coverage {sortBy === 'coverage-asc' ? '↑' : sortBy === 'coverage-desc' ? '↓' : ''}
              </button>
              <button className="btn btn-sm btn-primary" onClick={handleAIGapAnalysis} disabled={aiAnalyzing}><Sparkles size={14} /> {aiAnalyzing ? 'Analyzing...' : 'AI Gap Analysis'}</button>
            </div>
          </div>

          <div className="tabs" role="tablist">
            {['all', 'approved', 'review', 'flagged'].map(tab => (
              <button key={tab} role="tab" className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)} aria-selected={activeTab === tab}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="req-list" role="list">
            {sorted.map(req => (
              <div key={req.id} className={`req-item ${selectedReq === req.id ? 'selected' : ''} ${selectedIds.includes(req.id) ? 'checked' : ''}`} role="listitem">
                <div className="req-check"><input type="checkbox" checked={selectedIds.includes(req.id)} onChange={() => toggleSelect(req.id)} aria-label={`Select ${req.id}`} /></div>
                <div className="req-body" onClick={() => setSelectedReq(req.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSelectedReq(req.id)}>
                  <div className="req-header">
                    <span className="req-id">{req.id}</span>
                    <span className={`badge badge-${riskColor(req.risk)}`}>{req.risk} risk</span>
                  </div>
                  <p className="req-title">{req.title}</p>
                  {/* Inline AI summary */}
                  <p className="req-ai-summary"><Sparkles size={11} /> {req.aiSummary}</p>
                  <div className="req-meta">
                    <span className={`badge badge-${req.status === 'approved' ? 'success' : req.status === 'flagged' ? 'danger' : 'warning'}`}>{req.status}</span>
                    {/* Clickable gap count */}
                    {req.gaps > 0 ? (
                      <button className="req-stat gap-link" onClick={(e) => { e.stopPropagation(); setExpandedGaps(expandedGaps === req.id ? null : req.id) }}>
                        <AlertTriangle size={12} /> {req.gaps} gaps {expandedGaps === req.id ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                      </button>
                    ) : (
                      <span className="req-stat"><CheckCircle size={12} style={{ color: 'var(--success)' }} /> 0 gaps</span>
                    )}
                    <span className="req-stat"><MessageSquare size={12} /> {req.comments}</span>
                    <div className="testability-bar" title={`Testability: ${req.testability}%`}>
                      <div className="progress-bar" style={{ width: '80px' }}><div className="progress-fill" style={{ width: `${req.testability}%`, background: req.testability > 80 ? 'var(--success)' : req.testability > 60 ? 'var(--warning)' : 'var(--danger)' }} /></div>
                      <span className="testability-pct">{req.testability}%</span>
                    </div>
                  </div>
                  {/* Expanded gap details */}
                  {expandedGaps === req.id && req.gapDetails.length > 0 && (
                    <div className="gap-details-panel animate-in">
                      <h5><AlertTriangle size={12} /> Gap Details for {req.id}</h5>
                      <ul>{req.gapDetails.map((g, i) => <li key={i}>{g}</li>)}</ul>
                    </div>
                  )}
                  {/* Why High Risk + Bridge the Gap */}
                  {req.risk === 'high' && (
                    <div className="risk-expand">
                      <button className="risk-expand-btn" onClick={(e) => { e.stopPropagation(); setExpandedRisk(expandedRisk === req.id ? null : req.id) }}>
                        {expandedRisk === req.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />} Why high risk?
                      </button>
                      {expandedRisk === req.id && (
                        <div className="risk-details animate-in">
                          <div className="risk-driver"><Shield size={12} /> Complexity: <strong>{req.complexity}</strong></div>
                          <div className="risk-driver"><GitBranch size={12} /> Untested branches: <strong>{req.untestedBranches}</strong></div>
                          <div className="risk-driver"><Zap size={12} /> Edge cases: <strong>{req.edgeCases}</strong></div>
                          <div className="risk-driver"><Bug size={12} /> Historical defects: <strong>{req.historicalDefects}</strong></div>
                        </div>
                      )}
                      <button className="btn btn-sm btn-primary bridge-gap-btn" onClick={(e) => { e.stopPropagation(); handleBridgeGap(req) }} style={{ marginTop: '0.35rem' }}>
                        <Sparkles size={12} /> Bridge the Gap — Generate {req.gaps} Missing Scenarios
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="review-right-panels">
          <section className="card review-detail-panel">
            {selectedReqData ? (
              <>
                <div className="card-header">
                  <h3 className="card-title">{selectedReqData.id} Details</h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-sm btn-success" onClick={() => toast.success(`${selectedReqData.id} approved`)}><ThumbsUp size={14} /> Approve</button>
                    <button className="btn btn-sm btn-danger" onClick={() => toast.warning(`${selectedReqData.id} rejected`)}><ThumbsDown size={14} /> Reject</button>
                    <button className="btn btn-sm btn-secondary" onClick={() => toast.info(`${selectedReqData.id} flagged for review`)}><Flag size={14} /> Flag</button>
                  </div>
                </div>
                <div className="detail-content">
                  <div className="ai-insights">
                    <h4><Sparkles size={16} /> AI Insights</h4>
                    <div className="insight-item warning"><AlertTriangle size={14} /><span>Ambiguous: "gracefully" needs specific error handling criteria</span></div>
                    <div className="insight-item info"><Eye size={14} /><span>Missing: No mention of offline recording behavior</span></div>
                    <div className="insight-item success"><CheckCircle size={14} /><span>Well-defined acceptance criteria for storage limits</span></div>
                  </div>
                  <div className="ai-explain">
                    <h4><Sparkles size={16} /> AI Reasoning</h4>
                    <div className="explain-row"><span className="explain-label">Source:</span><span>{selectedReqData.id} — {selectedReqData.title}</span></div>
                    <div className="explain-row"><span className="explain-label">Logic:</span><span>Testability scored low due to vague acceptance criteria and missing boundary definitions</span></div>
                    <div className="explain-row"><span className="explain-label">Risk factors:</span><span>Complexity ({selectedReqData.complexity}), {selectedReqData.untestedBranches} untested branches, {selectedReqData.edgeCases} edge cases</span></div>
                    <div className="explain-row"><span className="explain-label">Assumptions:</span><span>Standard CDVR architecture, single-tenant storage model</span></div>
                  </div>
                  <div className="annotations">
                    <h4>Annotations</h4>
                    <div className="annotation"><strong>@sarah.chen</strong><span className="annotation-time">2h ago</span><p>Need to clarify max concurrent recordings per account tier</p></div>
                    <div className="annotation"><strong>@mike.johnson</strong><span className="annotation-time">1h ago</span><p>Edge case: What happens when recording overlaps with live pause?</p></div>
                    <div className="annotation-input"><input placeholder="Add annotation... (use @ to mention)" onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value.trim()) { const clean = sanitizeComment(e.target.value); if (clean) toast.success(`Annotation added: "${clean}"`); e.target.value = '' } }} /></div>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state"><Eye size={48} /><p>Select a requirement to view details</p></div>
            )}
          </section>

          <section className="card">
            <div className="card-header"><h3 className="card-title">Coverage Radar</h3></div>
            <div className="radar-chart">
              <svg viewBox="0 0 100 100" className="radar-svg">
                {[20, 40].map(r => <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="0.3" strokeDasharray="2" />)}
                {RADAR_DATA.map(d => { const rad = (d.angle - 90) * Math.PI / 180; return <line key={d.category} x1="50" y1="50" x2={50 + 42 * Math.cos(rad)} y2={50 + 42 * Math.sin(rad)} stroke="var(--border)" strokeWidth="0.2" /> })}
                <path d={radarPath} fill="var(--accent-light)" stroke="var(--accent)" strokeWidth="0.5" />
                {radarPoints.map(p => <circle key={p.category} cx={p.cx} cy={p.cy} r="1.5" fill="var(--accent)" />)}
              </svg>
              <div className="radar-labels">
                {RADAR_DATA.map(d => { const rad = (d.angle - 90) * Math.PI / 180; const lx = 50 + 48 * Math.cos(rad); const ly = 50 + 48 * Math.sin(rad); return (<div key={d.category} className="radar-label" style={{ left: `${lx}%`, top: `${ly}%` }}><span>{d.category}</span><span className={`radar-pct ${d.coverage < 40 ? 'low' : d.coverage < 70 ? 'mid' : 'high'}`}>{d.coverage}%</span></div>) })}
              </div>
            </div>
            <div className="radar-alerts">
              <div className="radar-alert danger"><AlertTriangle size={12} /> Security coverage critically low (28%)</div>
              <div className="radar-alert danger"><AlertTriangle size={12} /> Edge case coverage below threshold (35%)</div>
              <div className="radar-alert warning"><AlertTriangle size={12} /> Performance testing needs attention (42%)</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
