import { useState, useRef } from 'react'
import {
  Search, Upload, FileText, AlertTriangle, CheckCircle, Sparkles,
  Copy, ChevronDown, ChevronUp, Trash2, Plus, X, Target, Layers
} from 'lucide-react'
import { useToast } from '../components/Toast'
import { chatWithAI } from '../utils/ai'
import './TestAnalysis.css'

const getFileType = (name) => {
  const ext = name.split('.').pop().toLowerCase()
  if (['pdf'].includes(ext)) return 'PDF'
  if (['doc', 'docx'].includes(ext)) return 'Word'
  if (['xls', 'xlsx'].includes(ext)) return 'Excel'
  if (['csv'].includes(ext)) return 'CSV'
  return 'File'
}

export default function TestAnalysis() {
  const toast = useToast()
  const fileInputRef = useRef(null)
  const dupFileInputRef = useRef(null)

  // --- Section 1: Gap Analysis ---
  const [testFiles, setTestFiles] = useState([])
  const [analyzing, setAnalyzing] = useState(false)
  const [gapResult, setGapResult] = useState(null)
  const [expandedGaps, setExpandedGaps] = useState({})

  // --- Section 2: Duplicate Detection ---
  const [dupFiles, setDupFiles] = useState([])
  const [dupAnalyzing, setDupAnalyzing] = useState(false)
  const [dupResult, setDupResult] = useState(null)
  const [expandedDups, setExpandedDups] = useState({})

  // Get docs from Document Hub localStorage
  const getDocHubDocs = () => {
    try {
      return JSON.parse(localStorage.getItem('vpt-docs') || '[]').filter(d => d.status === 'parsed')
    } catch { return [] }
  }

  // Read file content as text
  const readFileText = (file) => new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result || '')
    reader.onerror = () => resolve('')
    reader.readAsText(file)
  })

  // --- Gap Analysis handlers ---
  const handleTestFileUpload = (e) => {
    const files = Array.from(e.target.files || [])
    const newFiles = files.map(f => ({ file: f, name: f.name, type: getFileType(f.name), size: f.size }))
    setTestFiles(prev => [...prev, ...newFiles])
    e.target.value = ''
  }

  const removeTestFile = (idx) => setTestFiles(prev => prev.filter((_, i) => i !== idx))

  const runGapAnalysis = async () => {
    const docHubDocs = getDocHubDocs()
    if (testFiles.length === 0) { toast.info('Upload test scenarios/cases to analyze'); return }
    if (docHubDocs.length === 0) { toast.info('No parsed documents in Document Hub to compare against'); return }

    setAnalyzing(true)
    setGapResult(null)
    try {
      const fileContents = await Promise.all(testFiles.map(async (tf) => {
        const text = await readFileText(tf.file)
        return `--- File: ${tf.name} ---\n${text.substring(0, 3000)}`
      }))

      const docSummaries = docHubDocs.map(d => {
        const reqs = (d.aiRequirements || []).map(r => `${r.id}: ${r.title} - ${r.description || ''}`).join('\n')
        return `Document: ${d.name}\nSummary: ${d.aiSummary || 'N/A'}\nRequirements:\n${reqs || 'None extracted'}`
      }).join('\n\n')

      const prompt = `You are a test analysis expert. Compare the uploaded test scenarios/cases against the project requirements documents.

PROJECT REQUIREMENTS DOCUMENTS:
${docSummaries}

UPLOADED TEST SCENARIOS/CASES:
${fileContents.join('\n\n')}

Analyze and respond in this exact JSON format:
{
  "coverageScore": <number 0-100>,
  "totalRequirements": <number>,
  "coveredRequirements": <number>,
  "gaps": [
    {
      "id": "GAP-001",
      "requirement": "<requirement that is not covered>",
      "severity": "high|medium|low",
      "description": "<why this is a gap>",
      "suggestedTests": ["<test case 1>", "<test case 2>"]
    }
  ],
  "additionalTests": [
    {
      "id": "AT-001",
      "title": "<test case title>",
      "description": "<what to test>",
      "priority": "high|medium|low",
      "coversGap": "GAP-001"
    }
  ],
  "summary": "<2-3 sentence summary of the analysis>"
}`

      const result = await chatWithAI(prompt, 'test-gap-analysis')
      const text = result.response || result.message || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        setGapResult(JSON.parse(jsonMatch[0]))
        toast.success('Gap analysis complete')
      } else {
        toast.info('AI returned analysis but could not parse structured results')
        setGapResult({ summary: text, gaps: [], additionalTests: [], coverageScore: 0, totalRequirements: 0, coveredRequirements: 0 })
      }
    } catch (err) {
      console.error('Gap analysis failed:', err)
      toast.info('AI unavailable — check if the server is running')
    } finally {
      setAnalyzing(false)
    }
  }

  // --- Duplicate Detection handlers ---
  const handleDupFileUpload = (e) => {
    const files = Array.from(e.target.files || [])
    const newFiles = files.map(f => ({ file: f, name: f.name, type: getFileType(f.name), size: f.size }))
    setDupFiles(prev => [...prev, ...newFiles])
    e.target.value = ''
  }

  const removeDupFile = (idx) => setDupFiles(prev => prev.filter((_, i) => i !== idx))

  const runDuplicateDetection = async () => {
    if (dupFiles.length === 0) { toast.info('Upload test case files to check for duplicates'); return }

    setDupAnalyzing(true)
    setDupResult(null)
    try {
      const fileContents = await Promise.all(dupFiles.map(async (df) => {
        const text = await readFileText(df.file)
        return `--- File: ${df.name} ---\n${text.substring(0, 4000)}`
      }))

      const prompt = `You are a test case analysis expert. Analyze the following test cases/scenarios to find duplicates, near-duplicates, and overlapping test coverage.

TEST CASES:
${fileContents.join('\n\n')}

Respond in this exact JSON format:
{
  "totalTestCases": <number>,
  "duplicateGroups": [
    {
      "id": "DUP-001",
      "severity": "exact|near|overlap",
      "tests": ["<test name 1>", "<test name 2>"],
      "reason": "<why these are duplicates>",
      "recommendation": "remove|merge|keep"
    }
  ],
  "stats": {
    "exact": <number of exact duplicate groups>,
    "near": <number of near-duplicate groups>,
    "overlap": <number of overlapping groups>,
    "savingsPercent": <estimated % reduction if duplicates removed>
  },
  "summary": "<2-3 sentence summary>"
}`

      const result = await chatWithAI(prompt, 'duplicate-detection')
      const text = result.response || result.message || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        setDupResult(JSON.parse(jsonMatch[0]))
        toast.success('Duplicate detection complete')
      } else {
        toast.info('AI returned analysis but could not parse structured results')
        setDupResult({ summary: text, duplicateGroups: [], totalTestCases: 0, stats: { exact: 0, near: 0, overlap: 0, savingsPercent: 0 } })
      }
    } catch (err) {
      console.error('Duplicate detection failed:', err)
      toast.info('AI unavailable — check if the server is running')
    } finally {
      setDupAnalyzing(false)
    }
  }

  const toggleGap = (id) => setExpandedGaps(prev => ({ ...prev, [id]: !prev[id] }))
  const toggleDup = (id) => setExpandedDups(prev => ({ ...prev, [id]: !prev[id] }))
  const severityColor = (s) => s === 'high' || s === 'exact' ? 'var(--danger)' : s === 'medium' || s === 'near' ? 'var(--warning)' : 'var(--info)'
  const severityBadge = (s) => s === 'high' || s === 'exact' ? 'badge-danger' : s === 'medium' || s === 'near' ? 'badge-warning' : 'badge-info'
  const docHubDocs = getDocHubDocs()

  return (
    <div className="test-analysis">
      <input type="file" ref={fileInputRef} onChange={handleTestFileUpload} accept=".xlsx,.xls,.csv,.txt,.pdf,.doc,.docx" multiple style={{ display: 'none' }} />
      <input type="file" ref={dupFileInputRef} onChange={handleDupFileUpload} accept=".xlsx,.xls,.csv,.txt,.pdf,.doc,.docx" multiple style={{ display: 'none' }} />

      {/* ===== SECTION 1: Gap Analysis ===== */}
      <section className="card ta-section">
        <div className="card-header">
          <h3 className="card-title"><Target size={18} /> Test Coverage Gap Analysis</h3>
          <span className="ta-doc-count">{docHubDocs.length} parsed doc{docHubDocs.length !== 1 ? 's' : ''} in Document Hub</span>
        </div>

        <div className="ta-upload-area">
          <p className="ta-hint">Upload your manually created test scenarios or test cases. AI will compare them against requirements from Document Hub to find coverage gaps.</p>
          <div className="ta-file-row">
            <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}><Upload size={14} /> Upload Test Files</button>
            {testFiles.length > 0 && (
              <button className="btn btn-sm btn-danger" onClick={() => setTestFiles([])}><Trash2 size={12} /> Clear All</button>
            )}
          </div>
          {testFiles.length > 0 && (
            <div className="ta-file-list">
              {testFiles.map((tf, i) => (
                <div key={i} className="ta-file-chip">
                  <FileText size={13} />
                  <span>{tf.name}</span>
                  <button className="ta-file-remove" onClick={() => removeTestFile(i)} aria-label={`Remove ${tf.name}`}><X size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ta-action-row">
          <button className="btn btn-primary" onClick={runGapAnalysis} disabled={analyzing || testFiles.length === 0}>
            <Sparkles size={14} /> {analyzing ? 'Analyzing...' : 'Run AI Gap Analysis'}
          </button>
          {analyzing && <div className="ta-spinner" />}
        </div>

        {/* Gap Analysis Results */}
        {gapResult && (
          <div className="ta-results animate-in">
            <div className="ta-score-row">
              <div className="ta-score-circle" style={{ borderColor: gapResult.coverageScore > 80 ? 'var(--success)' : gapResult.coverageScore > 50 ? 'var(--warning)' : 'var(--danger)' }}>
                <span className="ta-score-value" style={{ color: gapResult.coverageScore > 80 ? 'var(--success)' : gapResult.coverageScore > 50 ? 'var(--warning)' : 'var(--danger)' }}>{gapResult.coverageScore}%</span>
                <span className="ta-score-label">Coverage</span>
              </div>
              <div className="ta-score-stats">
                <div className="ta-stat"><span className="ta-stat-num">{gapResult.totalRequirements || 0}</span><span className="ta-stat-label">Total Requirements</span></div>
                <div className="ta-stat"><span className="ta-stat-num" style={{ color: 'var(--success)' }}>{gapResult.coveredRequirements || 0}</span><span className="ta-stat-label">Covered</span></div>
                <div className="ta-stat"><span className="ta-stat-num" style={{ color: 'var(--danger)' }}>{(gapResult.totalRequirements || 0) - (gapResult.coveredRequirements || 0)}</span><span className="ta-stat-label">Gaps Found</span></div>
                <div className="ta-stat"><span className="ta-stat-num" style={{ color: 'var(--accent)' }}>{(gapResult.additionalTests || []).length}</span><span className="ta-stat-label">Suggested Tests</span></div>
              </div>
            </div>

            {gapResult.summary && <p className="ta-summary">{gapResult.summary}</p>}

            {/* Gaps List */}
            {(gapResult.gaps || []).length > 0 && (
              <div className="ta-gap-list">
                <h4 className="ta-sub-title"><AlertTriangle size={14} /> Identified Gaps</h4>
                {gapResult.gaps.map((gap) => (
                  <div key={gap.id} className="ta-gap-item" style={{ borderLeftColor: severityColor(gap.severity) }}>
                    <div className="ta-gap-header" onClick={() => toggleGap(gap.id)}>
                      <div className="ta-gap-left">
                        <span className="ta-gap-id">{gap.id}</span>
                        <span className={`badge ${severityBadge(gap.severity)}`}>{gap.severity}</span>
                        <span className="ta-gap-req">{gap.requirement}</span>
                      </div>
                      {expandedGaps[gap.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                    {expandedGaps[gap.id] && (
                      <div className="ta-gap-body animate-in">
                        <p className="ta-gap-desc">{gap.description}</p>
                        {(gap.suggestedTests || []).length > 0 && (
                          <div className="ta-suggested">
                            <span className="ta-suggested-label"><Plus size={12} /> Suggested Tests:</span>
                            <ul>{gap.suggestedTests.map((t, i) => <li key={i}>{t}</li>)}</ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Additional Tests */}
            {(gapResult.additionalTests || []).length > 0 && (
              <div className="ta-additional">
                <h4 className="ta-sub-title"><Plus size={14} /> Recommended Additional Tests</h4>
                <div className="ta-additional-grid">
                  {gapResult.additionalTests.map((at) => (
                    <div key={at.id} className="ta-additional-card">
                      <div className="ta-additional-header">
                        <span className="ta-additional-id">{at.id}</span>
                        <span className={`badge ${severityBadge(at.priority)}`}>{at.priority}</span>
                      </div>
                      <h5 className="ta-additional-title">{at.title}</h5>
                      <p className="ta-additional-desc">{at.description}</p>
                      {at.coversGap && <span className="ta-covers-gap">Covers: {at.coversGap}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ===== SECTION 2: Duplicate Detection ===== */}
      <section className="card ta-section" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title"><Layers size={18} /> Duplicate Test Detector</h3>
        </div>

        <div className="ta-upload-area">
          <p className="ta-hint">Upload test case files to detect exact duplicates, near-duplicates, and overlapping test coverage across your test suite.</p>
          <div className="ta-file-row">
            <button className="btn btn-primary" onClick={() => dupFileInputRef.current?.click()}><Upload size={14} /> Upload Test Cases</button>
            {dupFiles.length > 0 && (
              <button className="btn btn-sm btn-danger" onClick={() => setDupFiles([])}><Trash2 size={12} /> Clear All</button>
            )}
          </div>
          {dupFiles.length > 0 && (
            <div className="ta-file-list">
              {dupFiles.map((df, i) => (
                <div key={i} className="ta-file-chip">
                  <FileText size={13} />
                  <span>{df.name}</span>
                  <button className="ta-file-remove" onClick={() => removeDupFile(i)} aria-label={`Remove ${df.name}`}><X size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ta-action-row">
          <button className="btn btn-primary" onClick={runDuplicateDetection} disabled={dupAnalyzing || dupFiles.length === 0}>
            <Search size={14} /> {dupAnalyzing ? 'Scanning...' : 'Detect Duplicates'}
          </button>
          {dupAnalyzing && <div className="ta-spinner" />}
        </div>

        {/* Duplicate Results */}
        {dupResult && (
          <div className="ta-results animate-in">
            <div className="ta-dup-stats-row">
              <div className="ta-dup-stat">
                <span className="ta-dup-stat-num">{dupResult.totalTestCases || 0}</span>
                <span className="ta-dup-stat-label">Total Tests</span>
              </div>
              <div className="ta-dup-stat">
                <span className="ta-dup-stat-num" style={{ color: 'var(--danger)' }}>{dupResult.stats?.exact || 0}</span>
                <span className="ta-dup-stat-label">Exact Duplicates</span>
              </div>
              <div className="ta-dup-stat">
                <span className="ta-dup-stat-num" style={{ color: 'var(--warning)' }}>{dupResult.stats?.near || 0}</span>
                <span className="ta-dup-stat-label">Near Duplicates</span>
              </div>
              <div className="ta-dup-stat">
                <span className="ta-dup-stat-num" style={{ color: 'var(--info)' }}>{dupResult.stats?.overlap || 0}</span>
                <span className="ta-dup-stat-label">Overlapping</span>
              </div>
              {(dupResult.stats?.savingsPercent || 0) > 0 && (
                <div className="ta-dup-stat">
                  <span className="ta-dup-stat-num" style={{ color: 'var(--success)' }}>{dupResult.stats.savingsPercent}%</span>
                  <span className="ta-dup-stat-label">Potential Savings</span>
                </div>
              )}
            </div>

            {dupResult.summary && <p className="ta-summary">{dupResult.summary}</p>}

            {(dupResult.duplicateGroups || []).length > 0 && (
              <div className="ta-dup-list">
                {dupResult.duplicateGroups.map((grp) => (
                  <div key={grp.id} className="ta-dup-item" style={{ borderLeftColor: severityColor(grp.severity) }}>
                    <div className="ta-dup-header" onClick={() => toggleDup(grp.id)}>
                      <div className="ta-gap-left">
                        <span className="ta-gap-id">{grp.id}</span>
                        <span className={`badge ${severityBadge(grp.severity)}`}>{grp.severity}</span>
                        <span className={`badge badge-${grp.recommendation === 'remove' ? 'danger' : grp.recommendation === 'merge' ? 'warning' : 'success'}`}>{grp.recommendation}</span>
                      </div>
                      {expandedDups[grp.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                    {expandedDups[grp.id] && (
                      <div className="ta-dup-body animate-in">
                        <p className="ta-gap-desc">{grp.reason}</p>
                        <div className="ta-dup-tests">
                          {(grp.tests || []).map((t, i) => (
                            <div key={i} className="ta-dup-test-chip"><Copy size={11} /> {t}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {(dupResult.duplicateGroups || []).length === 0 && (
              <div className="ta-empty-state">
                <CheckCircle size={24} style={{ color: 'var(--success)' }} />
                <p>No duplicates detected — your test suite looks clean.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
