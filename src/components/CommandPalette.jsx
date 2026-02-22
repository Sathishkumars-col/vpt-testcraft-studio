import { useState, useEffect, useRef } from 'react'
import { Search, Zap, FileText, ClipboardCheck, Wrench, BarChart3, Download, ArrowRight, Sparkles, Target, AlertTriangle } from 'lucide-react'
import './CommandPalette.css'

const COMMANDS = [
  { id: 'nav-doc', type: 'navigate', icon: FileText, label: 'Go to Document Hub', page: 'documents' },
  { id: 'nav-review', type: 'navigate', icon: ClipboardCheck, label: 'Go to Review Dashboard', page: 'review' },
  { id: 'nav-scenario', type: 'navigate', icon: Zap, label: 'Go to Scenario Generator', page: 'scenarios' },
  { id: 'nav-export', type: 'navigate', icon: Download, label: 'Go to Export Engine', page: 'export' },
  { id: 'nav-transform', type: 'navigate', icon: Wrench, label: 'Go to Transformation Studio', page: 'transform' },
  { id: 'nav-analytics', type: 'navigate', icon: BarChart3, label: 'Go to Analytics & Insights', page: 'analytics' },
  { id: 'ai-neg', type: 'action', icon: Sparkles, label: 'Generate negative scenarios for REQ-003' },
  { id: 'ai-edge', type: 'action', icon: Sparkles, label: 'Suggest edge cases for CDVR Recording' },
  { id: 'ai-gap', type: 'action', icon: Target, label: 'Run AI gap analysis on all requirements' },
  { id: 'filter-risk', type: 'filter', icon: AlertTriangle, label: 'Filter: risk:high' },
  { id: 'filter-cov', type: 'filter', icon: Target, label: 'Filter: coverage:<60%' },
  { id: 'filter-review', type: 'filter', icon: ClipboardCheck, label: 'Filter: status:review' },
  { id: 'req-001', type: 'item', icon: FileText, label: 'REQ-001: Record up to 200 hours', page: 'review' },
  { id: 'req-003', type: 'item', icon: FileText, label: 'REQ-003: Concurrent recording conflicts', page: 'review' },
  { id: 'sc-001', type: 'item', icon: Zap, label: 'SC-001: CDVR Recording Happy Path', page: 'scenarios' },
  { id: 'sc-002', type: 'item', icon: Zap, label: 'SC-002: CDVR Recording Storage Full', page: 'scenarios' },
  { id: 'tc-001', type: 'item', icon: Wrench, label: 'TC-001: Verify CDVR recording from guide', page: 'transform' },
]

const NL_PATTERNS = [
  { pattern: /high.?priority.*cdvr|cdvr.*high.?priority/i, label: 'Show high-priority CDVR scenarios', page: 'scenarios' },
  { pattern: /coverage.*low|low.*coverage/i, label: 'Show modules with low coverage', page: 'analytics' },
  { pattern: /duplicate|similar/i, label: 'Show duplicate risk test cases', page: 'transform' },
  { pattern: /gap|missing/i, label: 'Show coverage gaps', page: 'review' },
  { pattern: /export.*jira|jira.*export/i, label: 'Export to Jira', page: 'export' },
  { pattern: /risk|flagged/i, label: 'Show flagged/high-risk requirements', page: 'review' },
  { pattern: /pause.?live/i, label: 'Show Pause Live scenarios', page: 'scenarios' },
  { pattern: /conflict|concurrent/i, label: 'Show Conflict Resolution scenarios', page: 'scenarios' },
]

export default function CommandPalette({ open, onClose, onNavigate }) {
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef(null)

  const nlMatches = query.trim().length > 3
    ? NL_PATTERNS.filter(p => p.pattern.test(query)).map((p, i) => ({
        id: `nl-${i}`, type: 'ai-search', icon: Sparkles, label: p.label, page: p.page
      }))
    : []

  const filtered = query.trim()
    ? [...nlMatches, ...COMMANDS.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))]
    : COMMANDS

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => { setSelectedIdx(0) }, [query])

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && filtered[selectedIdx]) { executeCommand(filtered[selectedIdx]) }
    else if (e.key === 'Escape') { onClose() }
  }

  const executeCommand = (cmd) => {
    if (cmd.page) onNavigate(cmd.page)
    onClose()
  }

  if (!open) return null

  return (
    <div className="cmd-overlay" onClick={onClose} role="dialog" aria-label="Command palette" aria-modal="true">
      <div className="cmd-palette" onClick={e => e.stopPropagation()}>
        <div className="cmd-input-wrap">
          <Search size={18} aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, search requirements, scenarios..."
            aria-label="Command search"
          />
          <kbd>ESC</kbd>
        </div>
        <div className="cmd-results" role="listbox">
          {filtered.length === 0 && <div className="cmd-empty">No results found</div>}
          {filtered.map((cmd, i) => {
            const Icon = cmd.icon
            return (
              <div
                key={cmd.id}
                className={`cmd-item ${i === selectedIdx ? 'selected' : ''}`}
                onClick={() => executeCommand(cmd)}
                role="option"
                aria-selected={i === selectedIdx}
              >
                <Icon size={16} aria-hidden="true" />
                <span className="cmd-label">{cmd.label}</span>
                <span className={`cmd-type badge badge-${cmd.type === 'navigate' ? 'accent' : cmd.type === 'action' ? 'success' : cmd.type === 'filter' ? 'warning' : cmd.type === 'ai-search' ? 'success' : 'info'}`}>
                  {cmd.type === 'ai-search' ? 'AI match' : cmd.type}
                </span>
                <ArrowRight size={14} className="cmd-arrow" />
              </div>
            )
          })}
        </div>
        <div className="cmd-footer">
          <span><kbd>↑↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Select</span>
          <span><kbd>ESC</kbd> Close</span>
        </div>
      </div>
    </div>
  )
}
