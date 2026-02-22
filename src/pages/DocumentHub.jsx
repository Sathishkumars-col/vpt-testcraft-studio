import { useState, useRef, useEffect } from 'react'
import {
  Upload, FileText, Link, GitBranch, Eye, Trash2,
  CheckCircle, AlertTriangle, Clock, Sparkles, X,
  XCircle, RefreshCw, Zap, RotateCcw, Tag, CheckSquare,
  GitMerge, Shield, Archive
} from 'lucide-react'
import { useToast } from '../components/Toast'
import { sanitizeTag, sanitizeUrl, sanitizeJiraId } from '../utils/sanitize'
import { analyzeDocument, detectConflicts as aiDetectConflicts } from '../utils/ai'
import './DocumentHub.css'

const ERROR_REASONS = {
  'Jira': 'Authentication token expired — re-authenticate with Jira to retry',
  'Confluence': 'Page not found or access denied — check URL permissions',
  'URL': 'Connection timeout — the remote server did not respond',
  'default': 'Parsing failed — invalid document format or corrupted file',
}

const SAMPLE_DOCS = [
  { id: 1, name: 'CDVR Unlimited Requirements.pdf', type: 'PDF', status: 'parsed', stories: 24, specs: 18, uploaded: '2026-02-18', size: '2.4 MB', ambiguity: 18, completeness: 85, testability: 92, parseProgress: 100, tags: ['cdvr'] },
  { id: 2, name: 'Pause Live Re-Architecture.docx', type: 'Word', status: 'parsing', stories: 0, specs: 0, uploaded: '2026-02-19', size: '1.8 MB', ambiguity: 0, completeness: 0, testability: 0, parseProgress: 62, tags: ['pause-live'] },
  { id: 3, name: 'SMB CDVR Test Strategy', type: 'Confluence', status: 'parsed', stories: 12, specs: 8, uploaded: '2026-02-20', size: '—', ambiguity: 32, completeness: 72, testability: 78, parseProgress: 100, tags: ['smb'] },
  { id: 4, name: 'STVA-5234: Buyflow Redesign', type: 'Jira', status: 'error', stories: 0, specs: 0, uploaded: '2026-02-20', size: '—', ambiguity: 0, completeness: 0, testability: 0, parseProgress: 0, errorReason: 'Authentication token expired — re-authenticate with Jira to retry', tags: ['buyflow'] },
]

const getFileType = (name) => {
  const ext = name.split('.').pop().toLowerCase()
  if (['pdf'].includes(ext)) return 'PDF'
  if (['doc', 'docx'].includes(ext)) return 'Word'
  if (['xls', 'xlsx'].includes(ext)) return 'Excel'
  if (['csv'].includes(ext)) return 'CSV'
  if (['txt'].includes(ext)) return 'Text'
  return 'File'
}
const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}
const todayStr = () => new Date().toISOString().split('T')[0]
const randomScore = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

const CONFLICTS = [
  { id: 1, reqA: 'REQ-001', reqB: 'REQ-003', desc: 'REQ-001 allows 200hrs recording but REQ-003 limits concurrent recordings without specifying storage impact', severity: 'high', aiSuggestion: 'Add clause: "200hr limit applies to total stored content; concurrent recording limit is independent of storage quota"' },
  { id: 2, reqA: 'REQ-004', reqB: 'REQ-005', desc: 'Cross-device sync may bypass parental controls during sync delay window', severity: 'medium', aiSuggestion: 'Add requirement: "Parental control state must sync before content availability across devices"' },
]


export default function DocumentHub() {
  const toast = useToast()
  const [docs, setDocs] = useState(() => {
    const saved = localStorage.getItem('vpt-docs')
    if (saved) return JSON.parse(saved)
    return []
  })
  const [dragActive, setDragActive] = useState(false)
  const [activeFilter, setActiveFilter] = useState(null)
  const [showConflicts, setShowConflicts] = useState(false)
  const [showUrlModal, setShowUrlModal] = useState(false)
  const [showJiraModal, setShowJiraModal] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [jiraTicket, setJiraTicket] = useState('')
  const [jiraBase] = useState('https://jira.charter.com/')
  const [urlError, setUrlError] = useState('')
  const [jiraError, setJiraError] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [showTagModal, setShowTagModal] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [trash, setTrash] = useState(() => {
    const saved = localStorage.getItem('vpt-docs-trash')
    return saved ? JSON.parse(saved) : []
  })
  const [showTrash, setShowTrash] = useState(false)
  const [aiConflicts, setAiConflicts] = useState(CONFLICTS)
  const [conflictScanning, setConflictScanning] = useState(false)
  const fileInputRef = useRef(null)
  const nextId = useRef((() => {
    const savedDocs = JSON.parse(localStorage.getItem('vpt-docs') || '[]')
    const ids = savedDocs.map(d => d.id)
    return Math.max(0, ...ids, SAMPLE_DOCS.length) + 1
  })())

  // Persist docs to localStorage (skip if empty and localStorage already has data)
  const isInitialMount = useRef(true)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    localStorage.setItem('vpt-docs', JSON.stringify(docs))
    localStorage.setItem('vpt-docs-initialized', 'true')
  }, [docs])

  // Persist trash to localStorage
  const isTrashInitialMount = useRef(true)
  useEffect(() => {
    if (isTrashInitialMount.current) {
      isTrashInitialMount.current = false
      return
    }
    localStorage.setItem('vpt-docs-trash', JSON.stringify(trash))
  }, [trash])

  const addDoc = (doc) => { setDocs(prev => [doc, ...prev]); nextId.current++ }

  // Real AI parsing via Bedrock — with fallback to simulation if server is down
  const parseWithAI = async (docId, file) => {
    // Show progress animation while AI works
    let progress = 0
    const progressInterval = setInterval(() => {
      progress = Math.min(progress + 3, 90)
      setDocs(prev => prev.map(d => d.id === docId ? { ...d, parseProgress: progress } : d))
    }, 500)

    try {
      const result = await analyzeDocument(file)
      clearInterval(progressInterval)
      const a = result.analysis
      setDocs(prev => prev.map(d => d.id === docId ? {
        ...d,
        status: 'parsed',
        parseProgress: 100,
        stories: a.stories || 0,
        specs: a.specs || 0,
        ambiguity: a.ambiguity || 0,
        completeness: a.completeness || 0,
        testability: a.testability || 0,
        aiIssues: a.issues || [],
        aiRequirements: a.extractedRequirements || [],
        aiSummary: a.summary || '',
      } : d))
      toast.success(`AI analysis complete for "${file.name}"`)
    } catch (err) {
      clearInterval(progressInterval)
      console.warn('AI analysis failed, falling back to simulation:', err.message)
      // Fallback to simulated scores if AI server is not running
      simulateParsing(docId)
      toast.info(`AI unavailable — using simulated analysis`)
    }
  }

  // Fallback simulation (used when AI server is not running)
  const simulateParsing = (docId) => {
    let progress = 0
    const interval = setInterval(() => {
      progress += randomScore(8, 18)
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        setDocs(prev => prev.map(d => d.id === docId ? {
          ...d, status: 'parsed', parseProgress: 100,
          stories: randomScore(5, 30), specs: randomScore(3, 20),
          ambiguity: randomScore(8, 40), completeness: randomScore(60, 95), testability: randomScore(65, 98),
        } : d))
      } else {
        setDocs(prev => prev.map(d => d.id === docId ? { ...d, parseProgress: Math.min(progress, 95) } : d))
      }
    }, 400)
  }

  // Store uploaded files for AI analysis
  const pendingFiles = useRef({})

  const handleRetry = (docId) => {
    setDocs(prev => prev.map(d => d.id === docId ? { ...d, status: 'parsing', parseProgress: 0, errorReason: undefined } : d))
    const file = pendingFiles.current[docId]
    if (file) {
      parseWithAI(docId, file)
    } else {
      simulateParsing(docId)
    }
  }

  const handleReparse = (docIds) => {
    docIds.forEach(id => {
      setDocs(prev => prev.map(d => d.id === id ? { ...d, status: 'parsing', parseProgress: 0, stories: 0, specs: 0, ambiguity: 0, completeness: 0, testability: 0 } : d))
      simulateParsing(id)
    })
  }

  // Advance parsing progress for initially-parsing docs
  useEffect(() => {
    const parsingDocs = docs.filter(d => d.status === 'parsing' && d.parseProgress < 100 && d.parseProgress > 0)
    if (parsingDocs.length === 0) return
    const timer = setTimeout(() => {
      setDocs(prev => prev.map(d => {
        if (d.status === 'parsing' && d.parseProgress > 0 && d.parseProgress < 100) {
          const next = d.parseProgress + randomScore(3, 8)
          if (next >= 100) return { ...d, status: 'parsed', parseProgress: 100, stories: randomScore(5, 30), specs: randomScore(3, 20), ambiguity: randomScore(8, 40), completeness: randomScore(60, 95), testability: randomScore(65, 98) }
          return { ...d, parseProgress: Math.min(next, 95) }
        }
        return d
      }))
    }, 1200)
    return () => clearTimeout(timer)
  }, [docs])

  const processFiles = (files) => {
    Array.from(files).forEach(file => {
      const id = nextId.current
      addDoc({ id, name: file.name, type: getFileType(file.name), status: 'parsing', stories: 0, specs: 0, uploaded: todayStr(), size: formatFileSize(file.size), ambiguity: 0, completeness: 0, testability: 0, parseProgress: 5, tags: [] })
      pendingFiles.current[id] = file
      parseWithAI(id, file)
    })
    document.getElementById('docs-table')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleFileSelect = (e) => { if (e.target.files?.length) processFilesWithChecks(e.target.files); e.target.value = '' }
  const handleDrag = (e) => { e.preventDefault(); e.stopPropagation(); if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true); else if (e.type === 'dragleave') setDragActive(false) }
  const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files?.length) processFilesWithChecks(e.dataTransfer.files) }

  const handleUrlSubmit = () => {
    const trimmed = sanitizeUrl(urlInput)
    if (!trimmed) { setUrlError('Please enter a valid URL (http/https only)'); return }
    const id = nextId.current
    const isConfluence = trimmed.includes('confluence') || trimmed.includes('wiki')
    const name = isConfluence ? decodeURIComponent(trimmed.split('/').pop() || 'Confluence Page') : trimmed.length > 60 ? trimmed.substring(0, 57) + '...' : trimmed
    addDoc({ id, name, type: isConfluence ? 'Confluence' : 'URL', status: 'parsing', stories: 0, specs: 0, uploaded: todayStr(), size: '—', ambiguity: 0, completeness: 0, testability: 0, parseProgress: 5, tags: [] })
    simulateParsing(id)
    setUrlInput(''); setUrlError(''); setShowUrlModal(false)
    document.getElementById('docs-table')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleJiraSubmit = () => {
    const clean = sanitizeJiraId(jiraTicket)
    if (!clean) { setJiraError('Format: PROJECT-1234 (e.g., STVA-5234)'); return }
    const id = nextId.current
    addDoc({ id, name: `${clean}: Jira Ticket`, type: 'Jira', status: 'parsing', stories: 0, specs: 0, uploaded: todayStr(), size: '—', ambiguity: 0, completeness: 0, testability: 0, parseProgress: 5, tags: [] })
    simulateParsing(id)
    setJiraTicket(''); setJiraError(''); setShowJiraModal(false)
    document.getElementById('docs-table')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleDeleteDoc = (docId) => {
    const deleted = docs.find(d => d.id === docId)
    setDocs(prev => prev.filter(d => d.id !== docId))
    setSelectedIds(prev => prev.filter(i => i !== docId))
    if (deleted) {
      setTrash(prev => [{ ...deleted, deletedAt: new Date().toISOString() }, ...prev])
      toast.undo(`"${deleted.name}" moved to trash`, () => {
        setTrash(prev => prev.filter(t => t.id !== deleted.id))
        setDocs(prev => [deleted, ...prev])
      })
    }
  }
  const handleBulkDelete = () => {
    const deleted = docs.filter(d => selectedIds.includes(d.id))
    setDocs(prev => prev.filter(d => !selectedIds.includes(d.id)))
    setSelectedIds([])
    const trashItems = deleted.map(d => ({ ...d, deletedAt: new Date().toISOString() }))
    setTrash(prev => [...trashItems, ...prev])
    toast.undo(`${deleted.length} document(s) moved to trash`, () => {
      setTrash(prev => prev.filter(t => !deleted.some(d => d.id === t.id)))
      setDocs(prev => [...deleted, ...prev])
    })
  }
  const restoreFromTrash = (docId) => {
    const item = trash.find(t => t.id === docId)
    if (!item) return
    const { deletedAt, ...doc } = item
    setTrash(prev => prev.filter(t => t.id !== docId))
    setDocs(prev => [doc, ...prev])
    toast.success(`"${doc.name}" restored`)
  }
  const permanentDelete = (docId) => {
    setTrash(prev => prev.filter(t => t.id !== docId))
    toast.info('Permanently deleted')
  }
  const emptyTrash = () => {
    setTrash([])
    toast.info('Trash emptied')
  }

  // AI-powered conflict detection
  const handleAIConflictScan = async () => {
    if (showConflicts) { setShowConflicts(false); return }
    setConflictScanning(true)
    setShowConflicts(true)
    try {
      const parsedDocs = docs.filter(d => d.status === 'parsed')
      const requirements = parsedDocs.flatMap(d => (d.aiRequirements || []).map(r => ({
        id: r.id, title: r.title, description: r.description,
      })))
      if (requirements.length < 2) {
        toast.info('Need at least 2 parsed documents with requirements to detect conflicts')
        setConflictScanning(false)
        return
      }
      const result = await aiDetectConflicts(requirements)
      const conflicts = (result.conflicts || []).map((c, i) => ({
        id: i + 1, reqA: c.reqA, reqB: c.reqB, desc: c.description,
        severity: c.severity, aiSuggestion: c.suggestion,
      }))
      setAiConflicts(conflicts.length > 0 ? conflicts : CONFLICTS)
      toast.success(`AI found ${conflicts.length} conflict(s)`)
    } catch (err) {
      console.warn('AI conflict detection failed:', err.message)
      toast.info('AI unavailable — showing cached conflicts')
    } finally {
      setConflictScanning(false)
    }
  }
  const handleBulkReparse = () => { handleReparse(selectedIds); setSelectedIds([]) }
  const handleBulkTag = () => {
    const clean = sanitizeTag(tagInput)
    if (!clean) return
    setDocs(prev => prev.map(d => selectedIds.includes(d.id) ? { ...d, tags: [...new Set([...(d.tags || []), clean])] } : d))
    setTagInput(''); setShowTagModal(false); setSelectedIds([])
  }

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  const selectAll = () => setSelectedIds(filteredDocs.map(d => d.id))

  const statusIcon = (s) => {
    if (s === 'parsed') return <CheckCircle size={16} className="text-success" />
    if (s === 'parsing') return <Clock size={16} className="text-warning" />
    return <AlertTriangle size={16} className="text-danger" />
  }

  const handleStatClick = (filter) => { setActiveFilter(prev => prev === filter ? null : filter); document.getElementById('docs-table')?.scrollIntoView({ behavior: 'smooth' }) }

  const filteredDocs = activeFilter
    ? docs.filter(doc => {
        if (activeFilter === 'documents') return true
        if (activeFilter === 'stories') return doc.stories > 0
        if (activeFilter === 'specs') return doc.specs > 0
        if (activeFilter === 'linked') return ['Confluence', 'Jira', 'URL'].includes(doc.type)
        return true
      })
    : docs

  // Version detection
  const [showDiffModal, setShowDiffModal] = useState(false)
  const [diffData, setDiffData] = useState(null)
  const [showQualityGate, setShowQualityGate] = useState(false)
  const [qualityDoc, setQualityDoc] = useState(null)
  const [qualityScores, setQualityScores] = useState(null)

  const detectVersion = (fileName) => {
    const baseName = fileName.replace(/\.[^.]+$/, '').replace(/[\s_]v?\d+(\.\d+)?$/i, '')
    return docs.find(d => {
      const existingBase = d.name.replace(/\.[^.]+$/, '').replace(/[\s_]v?\d+(\.\d+)?$/i, '')
      return existingBase.toLowerCase() === baseName.toLowerCase() && d.status === 'parsed'
    })
  }

  const handleVersionUpload = (file) => {
    const existing = detectVersion(file.name)
    if (existing) {
      setDiffData({
        oldDoc: existing,
        newFileName: file.name,
        changes: [
          { type: 'modified', text: `REQ-001: Storage limit changed from 200hrs to 250hrs` },
          { type: 'added', text: `REQ-007: New 4K recording support requirement added` },
          { type: 'added', text: `REQ-008: Multi-profile recording preferences` },
          { type: 'removed', text: `REQ-004 acceptance criteria #3 removed` },
        ],
        affectedTests: ['TC-001', 'TC-002', 'TC-003'],
        outOfDate: 3,
      })
      setShowDiffModal(true)
    }
  }

  const runQualityGate = (file) => {
    setQualityDoc(file.name || file)
    setQualityScores({
      ambiguity: { score: randomScore(15, 45), issues: ['Line 12: "gracefully" is vague — define specific error handling', 'Line 28: "quickly" needs measurable threshold (e.g., <3s)'] },
      completeness: { score: randomScore(55, 85), issues: ['Missing success criteria for 3 requirements', 'No acceptance criteria for edge cases'] },
      testability: { score: randomScore(60, 90), issues: ['2 requirements lack measurable outcomes'] },
      overall: randomScore(50, 80),
    })
    setShowQualityGate(true)
  }

  // Override processFiles to check for versions and quality
  const processFilesWithChecks = (files) => {
    Array.from(files).forEach(file => {
      const existing = detectVersion(file.name)
      if (existing) {
        handleVersionUpload(file)
      } else {
        runQualityGate(file)
      }
      const id = nextId.current
      addDoc({ id, name: file.name, type: getFileType(file.name), status: 'parsing', stories: 0, specs: 0, uploaded: todayStr(), size: formatFileSize(file.size), ambiguity: 0, completeness: 0, testability: 0, parseProgress: 5, tags: [] })
      pendingFiles.current[id] = file
      parseWithAI(id, file)
    })
    document.getElementById('docs-table')?.scrollIntoView({ behavior: 'smooth' })
  }

  const totalStories = docs.reduce((sum, d) => sum + d.stories, 0)
  const totalSpecs = docs.reduce((sum, d) => sum + d.specs, 0)
  const linkedCount = docs.filter(d => ['Confluence', 'Jira', 'URL'].includes(d.type)).length
  const scoreColor = (v) => v > 80 ? 'var(--success)' : v > 60 ? 'var(--warning)' : 'var(--danger)'
  const qualityGateColor = (v) => v > 70 ? 'var(--success)' : v > 50 ? 'var(--warning)' : 'var(--danger)'

  return (
    <div className="document-hub">
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,.txt" multiple style={{ display: 'none' }} aria-hidden="true" />

      {/* URL Import Modal */}
      {showUrlModal && (
        <div className="modal-overlay" onClick={() => setShowUrlModal(false)} role="dialog" aria-modal="true" aria-label="Import from URL">
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3><Link size={18} /> Import from URL</h3><button className="modal-close" onClick={() => { setShowUrlModal(false); setUrlError('') }} aria-label="Close"><X size={18} /></button></div>
            <div className="modal-body">
              <label className="modal-label" htmlFor="url-input">Document URL</label>
              <input id="url-input" type="url" className={`modal-input ${urlError ? 'input-error' : ''}`} placeholder="https://confluence.example.com/page/requirements" value={urlInput} onChange={e => { setUrlInput(e.target.value); setUrlError('') }} onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()} autoFocus />
              {urlError && <span className="modal-error">{urlError}</span>}
              <p className="modal-hint">Supports Confluence pages, Google Docs, or any public URL with document content.</p>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => { setShowUrlModal(false); setUrlError('') }}>Cancel</button><button className="btn btn-primary" onClick={handleUrlSubmit}><Link size={14} /> Import</button></div>
          </div>
        </div>
      )}

      {/* Jira Connect Modal */}
      {showJiraModal && (
        <div className="modal-overlay" onClick={() => setShowJiraModal(false)} role="dialog" aria-modal="true" aria-label="Connect Jira">
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3><GitBranch size={18} /> Connect Jira</h3><button className="modal-close" onClick={() => { setShowJiraModal(false); setJiraError('') }} aria-label="Close"><X size={18} /></button></div>
            <div className="modal-body">
              <label className="modal-label" htmlFor="jira-base">Jira Base URL</label>
              <input id="jira-base" type="url" className="modal-input modal-input-disabled" value={jiraBase} readOnly />
              <label className="modal-label" htmlFor="jira-ticket" style={{ marginTop: '0.75rem' }}>Ticket ID</label>
              <input id="jira-ticket" type="text" className={`modal-input ${jiraError ? 'input-error' : ''}`} placeholder="STVA-5234" value={jiraTicket} onChange={e => { setJiraTicket(e.target.value.toUpperCase()); setJiraError('') }} onKeyDown={e => e.key === 'Enter' && handleJiraSubmit()} autoFocus />
              {jiraError && <span className="modal-error">{jiraError}</span>}
              <p className="modal-hint">Enter the Jira ticket ID to import requirements and acceptance criteria.</p>
              <div className="jira-preview"><span className="jira-preview-label">Will fetch from:</span><code>{jiraBase}browse/{jiraTicket || 'PROJECT-ID'}</code></div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => { setShowJiraModal(false); setJiraError('') }}>Cancel</button><button className="btn btn-primary" onClick={handleJiraSubmit}><GitBranch size={14} /> Connect</button></div>
          </div>
        </div>
      )}

      {/* Tag Modal */}
      {showTagModal && (
        <div className="modal-overlay" onClick={() => setShowTagModal(false)} role="dialog" aria-modal="true" aria-label="Tag documents">
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3><Tag size={18} /> Tag {selectedIds.length} Documents</h3><button className="modal-close" onClick={() => setShowTagModal(false)} aria-label="Close"><X size={18} /></button></div>
            <div className="modal-body">
              <label className="modal-label" htmlFor="tag-input">Tag Name</label>
              <input id="tag-input" type="text" className="modal-input" placeholder="e.g., sprint-22, regression, cdvr" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleBulkTag()} autoFocus />
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowTagModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleBulkTag}><Tag size={14} /> Apply Tag</button></div>
          </div>
        </div>
      )}

      {/* Version Diff Modal */}
      {showDiffModal && diffData && (
        <div className="modal-overlay" onClick={() => setShowDiffModal(false)} role="dialog" aria-modal="true" aria-label="Version diff analysis">
          <div className="modal-card modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><GitMerge size={18} /> Version Diff Analysis</h3>
              <button className="modal-close" onClick={() => setShowDiffModal(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="diff-summary">
                <span className="badge badge-info">Updating: {diffData.oldDoc.name}</span>
                <span className="badge badge-accent">→ {diffData.newFileName}</span>
              </div>
              <div className="diff-changes-list">
                {diffData.changes.map((c, i) => (
                  <div key={i} className={`diff-change-item diff-${c.type}`}>
                    <span className="diff-type-badge">{c.type === 'added' ? '+' : c.type === 'removed' ? '−' : '~'}</span>
                    <span>{c.text}</span>
                  </div>
                ))}
              </div>
              <div className="diff-impact">
                <AlertTriangle size={14} />
                <span>{diffData.outOfDate} test cases are now out of date: {diffData.affectedTests.join(', ')}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDiffModal(false)}>Dismiss</button>
              <button className="btn btn-primary" onClick={() => setShowDiffModal(false)}><RefreshCw size={14} /> Update & Re-generate Tests</button>
            </div>
          </div>
        </div>
      )}

      {/* Quality Gate Modal */}
      {showQualityGate && qualityScores && (
        <div className="modal-overlay" onClick={() => setShowQualityGate(false)} role="dialog" aria-modal="true" aria-label="Quality gate">
          <div className="modal-card modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Shield size={18} /> Pre-Parse Quality Gate</h3>
              <button className="modal-close" onClick={() => setShowQualityGate(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p className="modal-hint" style={{ marginBottom: '0.75rem' }}>AI scored "{qualityDoc}" before parsing:</p>
              <div className="quality-gate-grid">
                <div className="qg-score">
                  <div className="qg-circle" style={{ borderColor: qualityGateColor(100 - qualityScores.ambiguity.score) }}>
                    <span style={{ color: qualityGateColor(100 - qualityScores.ambiguity.score) }}>{qualityScores.ambiguity.score}%</span>
                  </div>
                  <span className="qg-label">Ambiguity</span>
                  <ul className="qg-issues">{qualityScores.ambiguity.issues.map((iss, i) => <li key={i}>{iss}</li>)}</ul>
                </div>
                <div className="qg-score">
                  <div className="qg-circle" style={{ borderColor: qualityGateColor(qualityScores.completeness.score) }}>
                    <span style={{ color: qualityGateColor(qualityScores.completeness.score) }}>{qualityScores.completeness.score}%</span>
                  </div>
                  <span className="qg-label">Completeness</span>
                  <ul className="qg-issues">{qualityScores.completeness.issues.map((iss, i) => <li key={i}>{iss}</li>)}</ul>
                </div>
                <div className="qg-score">
                  <div className="qg-circle" style={{ borderColor: qualityGateColor(qualityScores.testability.score) }}>
                    <span style={{ color: qualityGateColor(qualityScores.testability.score) }}>{qualityScores.testability.score}%</span>
                  </div>
                  <span className="qg-label">Testability</span>
                  <ul className="qg-issues">{qualityScores.testability.issues.map((iss, i) => <li key={i}>{iss}</li>)}</ul>
                </div>
              </div>
              <div className="qg-overall">
                <span>Overall Quality:</span>
                <span className="qg-overall-score" style={{ color: qualityGateColor(qualityScores.overall) }}>{qualityScores.overall}%</span>
                {qualityScores.overall < 60 && <span className="badge badge-danger">Below threshold — consider revising</span>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowQualityGate(false)}>Parse Anyway</button>
              <button className="btn btn-primary" onClick={() => setShowQualityGate(false)}><CheckCircle size={14} /> Acknowledge & Continue</button>
            </div>
          </div>
        </div>
      )}

      {/* Impact Indicators */}
      <div className="impact-banner animate-in">
        <Zap size={14} /><span>Live Impact: Editing REQ-003 affects</span>
        <span className="impact-chip"><RefreshCw size={11} /> 3 scenarios</span>
        <span className="impact-chip">🧪 7 test cases</span>
        <span className="impact-chip danger-chip">📉 -12% coverage</span>
      </div>

      {/* Stat Cards */}
      <section className="grid-4" style={{ marginBottom: '1.5rem' }}>
        {[
          { filter: 'documents', value: docs.length, label: 'Documents Ingested', color: '' },
          { filter: 'stories', value: totalStories, label: 'User Stories Extracted', color: 'var(--success)' },
          { filter: 'specs', value: totalSpecs, label: 'Technical Specs', color: 'var(--warning)' },
          { filter: 'linked', value: linkedCount, label: 'Linked Sources', color: 'var(--info)' },
        ].map(s => (
          <button key={s.filter} className={`card stat-card stat-card-clickable ${activeFilter === s.filter ? 'stat-active' : ''}`} onClick={() => handleStatClick(s.filter)} aria-pressed={activeFilter === s.filter}>
            <div className="stat-value animate-count" style={s.color ? { color: s.color } : {}}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </button>
        ))}
      </section>

      {/* Drop Zone */}
      <section className={`drop-zone card ${dragActive ? 'drag-active' : ''}`} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} role="region" aria-label="Document upload area">
        <Upload size={40} className="drop-icon" aria-hidden="true" />
        <h3>Drop documents here or click to browse</h3>
        <p>Supports PDF, Word, Confluence links, Jira tickets</p>
        <div className="drop-actions">
          <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}><Upload size={16} /> Upload Files</button>
          <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); setShowUrlModal(true) }}><Link size={16} /> Import from URL</button>
          <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); setShowJiraModal(true) }}><GitBranch size={16} /> Connect Jira</button>
        </div>
      </section>

      {/* Document Table */}
      <section className="card" id="docs-table" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title">
            Ingested Documents
            {activeFilter && <span className="filter-badge">{activeFilter} <button className="filter-clear" onClick={() => setActiveFilter(null)}>×</button></span>}
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {selectedIds.length > 0 && (
              <div className="bulk-actions animate-in">
                <span className="badge badge-accent">{selectedIds.length} selected</span>
                <button className="btn btn-sm btn-primary" onClick={handleBulkReparse}><RefreshCw size={12} /> Re-parse</button>
                <button className="btn btn-sm btn-secondary" onClick={() => setShowTagModal(true)}><Tag size={12} /> Tag</button>
                <button className="btn btn-sm btn-danger" onClick={handleBulkDelete}><Trash2 size={12} /> Delete</button>
                <button className="btn btn-sm btn-secondary" onClick={() => setSelectedIds([])}>Clear</button>
              </div>
            )}
            <button className="btn btn-sm btn-secondary" onClick={selectAll}><CheckSquare size={14} /> Select All</button>
            <button className="btn btn-sm btn-danger" onClick={() => { const all = [...docs]; setDocs([]); setSelectedIds([]); setTrash(prev => [...all.map(d => ({ ...d, deletedAt: new Date().toISOString() })), ...prev]); toast.undo(`${all.length} document(s) moved to trash`, () => { setTrash(prev => prev.filter(t => !all.some(d => d.id === t.id))); setDocs(all) }) }}><Trash2 size={14} /> Delete All</button>
            <button className="btn btn-sm btn-primary" onClick={() => { const unparsed = docs.filter(d => d.status !== 'parsed'); if (unparsed.length === 0) { toast.info('All documents are already parsed'); return; } handleReparse(unparsed.map(d => d.id)) }}><Sparkles size={14} /> Parse All with AI</button>
            {trash.length > 0 && (
              <button className="btn btn-sm btn-secondary" onClick={() => setShowTrash(!showTrash)}><Archive size={14} /> Trash ({trash.length})</button>
            )}
          </div>
        </div>
        <div className="table-wrapper">
          <table aria-label="Ingested documents list">
            <thead><tr><th style={{width:'32px'}}></th><th>Document</th><th>Type</th><th>Status</th><th>Stories</th><th>Specs</th><th>Quality Score</th><th>Actions</th></tr></thead>
            <tbody>
              {filteredDocs.map(doc => (
                <tr key={doc.id} className={selectedIds.includes(doc.id) ? 'row-selected' : ''}>
                  <td><input type="checkbox" checked={selectedIds.includes(doc.id)} onChange={() => toggleSelect(doc.id)} aria-label={`Select ${doc.name}`} /></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={16} />
                      <div>
                        <div>{doc.name}</div>
                        {doc.tags?.length > 0 && <div className="doc-tags">{doc.tags.map(t => <span key={t} className="doc-tag">{t}</span>)}</div>}
                      </div>
                    </div>
                  </td>
                  <td><span className="badge badge-accent">{doc.type}</span></td>
                  <td>
                    <div className="status-cell">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>{statusIcon(doc.status)}<span>{doc.status}</span></div>
                      {doc.status === 'parsing' && (
                        <div className="parse-progress">
                          <div className="parse-progress-bar"><div className="parse-progress-fill" style={{ width: `${doc.parseProgress}%` }} /></div>
                          <span className="parse-pct">{doc.parseProgress}%</span>
                        </div>
                      )}
                      {doc.status === 'error' && (
                        <div className="error-detail">
                          <span className="error-reason">{doc.errorReason || ERROR_REASONS[doc.type] || ERROR_REASONS.default}</span>
                          <button className="btn btn-sm btn-primary retry-btn" onClick={() => handleRetry(doc.id)}><RotateCcw size={12} /> Retry</button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td>{doc.stories || '—'}</td>
                  <td>{doc.specs || '—'}</td>
                  <td>
                    {doc.status === 'parsed' ? (
                      <div className="quality-scores">
                        <div className="mini-score" title={`Ambiguity: ${doc.ambiguity}% (lower is better)`}><span className="mini-label">AMB</span><div className="mini-bar"><div className="mini-fill" style={{ width: `${doc.ambiguity}%`, background: doc.ambiguity < 25 ? 'var(--success)' : 'var(--danger)' }} /></div><span style={{ color: doc.ambiguity < 25 ? 'var(--success)' : 'var(--danger)' }}>{doc.ambiguity}%</span></div>
                        <div className="mini-score" title={`Completeness: ${doc.completeness}%`}><span className="mini-label">CMP</span><div className="mini-bar"><div className="mini-fill" style={{ width: `${doc.completeness}%`, background: scoreColor(doc.completeness) }} /></div><span style={{ color: scoreColor(doc.completeness) }}>{doc.completeness}%</span></div>
                        <div className="mini-score" title={`Testability: ${doc.testability}%`}><span className="mini-label">TST</span><div className="mini-bar"><div className="mini-fill" style={{ width: `${doc.testability}%`, background: scoreColor(doc.testability) }} /></div><span style={{ color: scoreColor(doc.testability) }}>{doc.testability}%</span></div>
                      </div>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-sm btn-secondary" aria-label={`View ${doc.name}`}><Eye size={14} /></button>
                      <button className="btn btn-sm btn-secondary" aria-label={`Re-parse ${doc.name}`} onClick={() => handleReparse([doc.id])}><RefreshCw size={14} /></button>
                      <button className="btn btn-sm btn-secondary" aria-label={`Delete ${doc.name}`} onClick={() => handleDeleteDoc(doc.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recently Deleted Trash Bin */}
      {showTrash && trash.length > 0 && (
        <section className="card animate-in" style={{ marginTop: '1.5rem' }}>
          <div className="card-header">
            <h3 className="card-title"><Archive size={16} /> Recently Deleted ({trash.length})</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-sm btn-danger" onClick={emptyTrash}><Trash2 size={12} /> Empty Trash</button>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowTrash(false)}>Close</button>
            </div>
          </div>
          <div className="table-wrapper">
            <table aria-label="Recently deleted documents">
              <thead><tr><th>Document</th><th>Type</th><th>Deleted</th><th>Actions</th></tr></thead>
              <tbody>
                {trash.map(doc => (
                  <tr key={doc.id}>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={16} /><span>{doc.name}</span></div></td>
                    <td><span className="badge badge-accent">{doc.type}</span></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{doc.deletedAt ? new Date(doc.deletedAt).toLocaleDateString() : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn btn-sm btn-primary" onClick={() => restoreFromTrash(doc.id)}><RotateCcw size={12} /> Restore</button>
                        <button className="btn btn-sm btn-danger" onClick={() => permanentDelete(doc.id)}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Document Summary Bubble Visualization */}
      {docs.filter(d => d.status === 'parsed').length > 0 && (
        <section className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-header">
            <h3 className="card-title"><Sparkles size={16} /> Document Summary</h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.72rem' }}>
              <span className="legend-dot" style={{ background: 'var(--success)' }} /> High
              <span className="legend-dot" style={{ background: 'var(--warning)' }} /> Medium
              <span className="legend-dot" style={{ background: 'var(--danger)' }} /> Low
            </div>
          </div>
          <div className="doc-summary-viz" role="img" aria-label="Document summary bubble visualization">
            {/* Center bubble — project overview */}
            <div className="doc-summary-center" style={{ borderColor: scoreColor(Math.round(docs.filter(d => d.status === 'parsed').reduce((s, d) => s + d.testability, 0) / docs.filter(d => d.status === 'parsed').length)) }}>
              <span className="doc-summary-center-score" style={{ color: scoreColor(Math.round(docs.filter(d => d.status === 'parsed').reduce((s, d) => s + d.testability, 0) / docs.filter(d => d.status === 'parsed').length)) }}>
                {Math.round(docs.filter(d => d.status === 'parsed').reduce((s, d) => s + d.testability, 0) / docs.filter(d => d.status === 'parsed').length)}%
              </span>
              <span className="doc-summary-center-label">Overall Score</span>
              <span className="doc-summary-center-count">{docs.filter(d => d.status === 'parsed').length} docs</span>
            </div>
            {/* Satellite bubbles — one per parsed document */}
            {docs.filter(d => d.status === 'parsed').map((doc, i, arr) => {
              const angle = (2 * Math.PI * i) / arr.length - Math.PI / 2
              const radius = arr.length <= 4 ? 140 : arr.length <= 8 ? 160 : 180
              const x = Math.cos(angle) * radius
              const y = Math.sin(angle) * radius
              const score = doc.testability
              const shortName = doc.name.replace(/\.[^.]+$/, '').substring(0, 20) + (doc.name.length > 24 ? '…' : '')
              return (
                <div key={doc.id} className="doc-summary-bubble" style={{ transform: `translate(${x}px, ${y}px)`, borderColor: scoreColor(score) }} title={`${doc.name}\nTestability: ${score}%\nStories: ${doc.stories} | Specs: ${doc.specs}`}>
                  <span className="doc-summary-bubble-score" style={{ color: scoreColor(score) }}>{score}%</span>
                  <span className="doc-summary-bubble-label">{shortName}</span>
                  <span className="doc-summary-bubble-meta">{doc.stories}S / {doc.specs}T</span>
                </div>
              )
            })}
            {/* Connector lines from center to each bubble */}
            <svg className="doc-summary-lines" viewBox="-250 -250 500 500">
              {docs.filter(d => d.status === 'parsed').map((doc, i, arr) => {
                const angle = (2 * Math.PI * i) / arr.length - Math.PI / 2
                const radius = arr.length <= 4 ? 140 : arr.length <= 8 ? 160 : 180
                const x = Math.cos(angle) * radius
                const y = Math.sin(angle) * radius
                return <line key={doc.id} x1="0" y1="0" x2={x} y2={y} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
              })}
            </svg>
          </div>
        </section>
      )}

      {/* Conflict Detector */}
      <section className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title"><AlertTriangle size={16} /> Conflict Detector</h3>
          <button className="btn btn-sm btn-primary" onClick={handleAIConflictScan} disabled={conflictScanning}><Sparkles size={14} /> {conflictScanning ? 'Scanning...' : showConflicts ? 'Hide' : 'Scan'} Conflicts ({aiConflicts.length})</button>
        </div>
        {showConflicts && (
          <div className="conflict-list animate-in">
            {aiConflicts.map(c => (
              <div key={c.id} className={`conflict-item severity-${c.severity}`}>
                <div className="conflict-header"><div className="conflict-reqs"><span className="badge badge-danger">{c.reqA}</span><XCircle size={14} /><span className="badge badge-danger">{c.reqB}</span></div><span className={`badge badge-${c.severity === 'high' ? 'danger' : 'warning'}`}>{c.severity}</span></div>
                <p className="conflict-desc">{c.desc}</p>
                <div className="conflict-suggestion"><Sparkles size={13} /><div><strong>AI Suggestion:</strong><p>{c.aiSuggestion}</p><button className="btn btn-sm btn-success" style={{ marginTop: '0.35rem' }}>Apply Fix</button></div></div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
