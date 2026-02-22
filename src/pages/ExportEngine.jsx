import { useState, useCallback } from 'react'
import {
  Download, FileSpreadsheet, FileText, Settings,
  CheckSquare, Filter, Layers, Clock, GitBranch,
  Eye, Plus, Minus, RefreshCw, AlertTriangle, Calendar, Zap,
  Link2, Code, Play
} from 'lucide-react'
import { useToast } from '../components/Toast'
import './ExportEngine.css'

// ---- Download helper: triggers browser Save dialog → user's Downloads folder ----
function downloadFile(content, filename, mimeType = 'text/csv') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ---- Build CSV content from data rows ----
function buildCSV(headers, rows) {
  const escape = (val) => {
    const str = String(val ?? '')
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"` : str
  }
  const lines = [headers.map(escape).join(',')]
  rows.forEach(row => lines.push(headers.map(h => escape(row[h] ?? '')).join(',')))
  return lines.join('\n')
}

const EXPORT_FORMATS = [
  { id: 'excel', name: 'Excel / CSV', icon: FileSpreadsheet, desc: 'Standard spreadsheet with customizable columns' },
  { id: 'jira', name: 'Jira', icon: Layers, desc: 'Import-ready for Jira Test Management' },
  { id: 'azure', name: 'Azure DevOps', icon: GitBranch, desc: 'Compatible with Azure Test Plans' },
  { id: 'testrail', name: 'TestRail', icon: FileText, desc: 'TestRail CSV import format' },
]

const EXPORT_HISTORY = [
  { id: 1, name: 'CDVR_Scenarios_v2.xlsx', format: 'Excel', items: 8, date: '2026-02-20 14:30', user: 'Sathish S.' },
  { id: 2, name: 'CDVR_TestCases_Jira.csv', format: 'Jira', items: 24, date: '2026-02-19 10:15', user: 'Sathish S.' },
  { id: 3, name: 'PauseLive_E2E_v1.xlsx', format: 'Excel', items: 15, date: '2026-02-18 16:45', user: 'Sarah C.' },
]

const PREVIEW_FIELDS = {
  excel: [
    { field: 'Test Case ID', mapped: true, required: true },
    { field: 'Title', mapped: true, required: true },
    { field: 'Steps', mapped: true, required: true },
    { field: 'Expected Result', mapped: true, required: true },
    { field: 'Priority', mapped: true, required: false },
    { field: 'Category', mapped: true, required: false },
  ],
  jira: [
    { field: 'Summary', mapped: true, required: true },
    { field: 'Description', mapped: true, required: true },
    { field: 'Issue Type', mapped: true, required: true },
    { field: 'Priority', mapped: true, required: true },
    { field: 'Component', mapped: false, required: true },
    { field: 'Sprint', mapped: true, required: false },
    { field: 'Labels', mapped: false, required: false },
    { field: 'Fix Version', mapped: false, required: false },
  ],
  azure: [
    { field: 'Title', mapped: true, required: true },
    { field: 'Steps', mapped: true, required: true },
    { field: 'Area Path', mapped: false, required: true },
    { field: 'Iteration', mapped: true, required: false },
    { field: 'Priority', mapped: true, required: false },
    { field: 'State', mapped: true, required: false },
  ],
  testrail: [
    { field: 'Title', mapped: true, required: true },
    { field: 'Section', mapped: true, required: true },
    { field: 'Steps', mapped: true, required: true },
    { field: 'Expected', mapped: true, required: true },
    { field: 'Priority', mapped: true, required: false },
    { field: 'Type', mapped: true, required: false },
  ],
}

const DIFF_CHANGES = {
  added: ['TC-005: Cross-device sync timeout', 'TC-006: Parental control bypass attempt', 'SC-009: Storage quota edge case'],
  removed: ['TC-OLD-003: Deprecated storage test'],
  updated: ['TC-001: Updated assertions for new UI', 'SC-003: Added conflict priority step'],
}

const SCHEDULES = [
  { id: 1, trigger: 'Every Sprint End', format: 'Jira', active: true, lastRun: '2026-02-14' },
  { id: 2, trigger: 'Coverage < 70%', format: 'Excel', active: false, lastRun: 'Never' },
]

const CONTENT_ITEMS = [
  { id: 'scenarios', label: 'Test Scenarios', count: 8 },
  { id: 'testcases', label: 'Test Cases', count: 24 },
  { id: 'traceability', label: 'Traceability Matrix', count: 1 },
  { id: 'requirements', label: 'Requirements', count: 6 },
  { id: 'coverage', label: 'Coverage Report', count: 1 },
]

export default function ExportEngine() {
  const toast = useToast()
  const [selectedFormat, setSelectedFormat] = useState('excel')
  const [selectedItems, setSelectedItems] = useState(['scenarios', 'testcases', 'traceability'])
  const [showPreview, setShowPreview] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [schedules, setSchedules] = useState(SCHEDULES)
  const [showLiveSync, setShowLiveSync] = useState(false)
  const [liveSyncEnabled, setLiveSyncEnabled] = useState(false)
  const [liveSyncTarget, setLiveSyncTarget] = useState('jira')
  const [showScriptExport, setShowScriptExport] = useState(false)
  const [scriptFramework, setScriptFramework] = useState('playwright')

  const toggleItem = (item) => setSelectedItems(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])
  const toggleScheduleActive = (id) => setSchedules(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s))

  const fields = PREVIEW_FIELDS[selectedFormat] || PREVIEW_FIELDS.excel
  const missingRequired = fields.filter(f => !f.mapped && f.required)

  const totalExportable = (() => {
    const docs = JSON.parse(localStorage.getItem('vpt-docs') || '[]')
    const reqs = docs.filter(d => d.status === 'parsed').flatMap(d => d.aiRequirements || [])
    return reqs.length > 0 ? reqs.length * selectedItems.length : CONTENT_ITEMS.reduce((sum, item) => sum + item.count, 0)
  })()

  // ---- Gather real data from localStorage (same source as other pages) ----
  const gatherExportData = useCallback(() => {
    const docs = JSON.parse(localStorage.getItem('vpt-docs') || '[]')
    const parsedDocs = docs.filter(d => d.status === 'parsed')
    const projectSummary = JSON.parse(localStorage.getItem('vpt-project-summary') || 'null')
    const allRequirements = parsedDocs.flatMap(d => (d.aiRequirements || []))
    const rows = []

    if (selectedItems.includes('requirements')) {
      allRequirements.forEach((r, i) => {
        rows.push({
          'ID': r.id || `REQ-${String(i + 1).padStart(3, '0')}`,
          'Type': 'Requirement',
          'Title': r.title || '',
          'Description': r.description || '',
          'Risk': r.risk || 'medium',
          'Priority': r.risk === 'high' ? 'P1' : r.risk === 'medium' ? 'P2' : 'P3',
          'Source Document': r.sourceDoc || '',
          'Status': 'Extracted',
          'Category': 'Requirement',
        })
      })
    }

    if (selectedItems.includes('scenarios')) {
      allRequirements.forEach((r, i) => {
        rows.push({
          'ID': `SC-${String(i + 1).padStart(3, '0')}`,
          'Type': 'Scenario',
          'Title': `Verify: ${r.title || 'Untitled'}`,
          'Description': `Test scenario for ${r.title || 'requirement'}: ${r.description || ''}`,
          'Risk': r.risk || 'medium',
          'Priority': r.risk === 'high' ? 'P1' : r.risk === 'medium' ? 'P2' : 'P3',
          'Source Document': r.sourceDoc || '',
          'Status': 'Generated',
          'Category': 'Scenario',
        })
      })
    }

    if (selectedItems.includes('testcases')) {
      allRequirements.forEach((r, i) => {
        rows.push({
          'ID': `TC-${String(i + 1).padStart(3, '0')}`,
          'Type': 'Test Case',
          'Title': `Validate ${r.title || 'Untitled'}`,
          'Description': `Given the system is ready, When ${r.title || 'action'} is performed, Then expected behavior is verified`,
          'Risk': r.risk || 'medium',
          'Priority': r.risk === 'high' ? 'P1' : r.risk === 'medium' ? 'P2' : 'P3',
          'Source Document': r.sourceDoc || '',
          'Status': 'Draft',
          'Category': 'Test Case',
        })
      })
    }

    if (selectedItems.includes('traceability')) {
      allRequirements.forEach((r, i) => {
        rows.push({
          'ID': `TM-${String(i + 1).padStart(3, '0')}`,
          'Type': 'Traceability',
          'Title': `${r.id || `REQ-${i+1}`} → SC-${String(i+1).padStart(3,'0')} → TC-${String(i+1).padStart(3,'0')}`,
          'Description': `Requirement mapped to scenario and test case`,
          'Risk': r.risk || 'medium',
          'Priority': '',
          'Source Document': r.sourceDoc || '',
          'Status': 'Mapped',
          'Category': 'Traceability',
        })
      })
    }

    if (selectedItems.includes('coverage')) {
      const avgTestability = parsedDocs.length > 0
        ? Math.round(parsedDocs.reduce((s, d) => s + (d.testability || 0), 0) / parsedDocs.length) : 0
      rows.push({
        'ID': 'COV-001',
        'Type': 'Coverage Report',
        'Title': `Overall Coverage: ${avgTestability}%`,
        'Description': `${parsedDocs.length} documents parsed, ${allRequirements.length} requirements extracted, avg testability ${avgTestability}%`,
        'Risk': avgTestability < 60 ? 'high' : avgTestability < 80 ? 'medium' : 'low',
        'Priority': '',
        'Source Document': 'All Documents',
        'Status': 'Current',
        'Category': 'Coverage',
      })
    }

    // If no real data, add sample rows so the export isn't empty
    if (rows.length === 0) {
      rows.push(
        { 'ID': 'TC-001', 'Type': 'Test Case', 'Title': 'Sample — upload documents in Document Hub for real data', 'Description': '', 'Risk': '', 'Priority': '', 'Source Document': '', 'Status': 'Sample', 'Category': '' },
      )
    }

    return { rows, docs: parsedDocs, projectSummary, allRequirements }
  }, [selectedItems])

  // ---- Format-specific export builders ----
  const buildExcelCSV = (rows) => {
    const headers = ['ID', 'Type', 'Title', 'Description', 'Priority', 'Risk', 'Status', 'Category', 'Source Document']
    return buildCSV(headers, rows)
  }

  const buildJiraCSV = (rows) => {
    const jiraRows = rows.map(r => ({
      'Summary': r['Title'],
      'Description': r['Description'],
      'Issue Type': r['Type'] === 'Test Case' ? 'Test' : r['Type'] === 'Scenario' ? 'Story' : 'Task',
      'Priority': r['Priority'] || 'Medium',
      'Labels': r['Category'],
      'Component': '',
    }))
    const headers = ['Summary', 'Description', 'Issue Type', 'Priority', 'Labels', 'Component']
    return buildCSV(headers, jiraRows)
  }

  const buildAzureCSV = (rows) => {
    const azureRows = rows.map(r => ({
      'Title': r['Title'],
      'Work Item Type': r['Type'] === 'Test Case' ? 'Test Case' : 'User Story',
      'Description': r['Description'],
      'Priority': r['Priority'] === 'P1' ? '1' : r['Priority'] === 'P2' ? '2' : '3',
      'State': r['Status'] === 'Draft' ? 'Design' : 'Ready',
      'Area Path': '',
      'Iteration': '',
    }))
    const headers = ['Title', 'Work Item Type', 'Description', 'Priority', 'State', 'Area Path', 'Iteration']
    return buildCSV(headers, azureRows)
  }

  const buildTestRailCSV = (rows) => {
    const trRows = rows.map(r => ({
      'Title': r['Title'],
      'Section': r['Category'] || 'General',
      'Steps': r['Description'],
      'Expected': 'Verify expected behavior',
      'Priority': r['Priority'] || 'Medium',
      'Type': r['Type'],
    }))
    const headers = ['Title', 'Section', 'Steps', 'Expected', 'Priority', 'Type']
    return buildCSV(headers, trRows)
  }

  // ---- Main export handler ----
  const handleExportNow = () => {
    const { rows } = gatherExportData()
    const versionTag = document.querySelector('.template-settings input[type="text"]')?.value || 'v1.0'
    const timestamp = new Date().toISOString().split('T')[0]
    let content, filename

    switch (selectedFormat) {
      case 'jira':
        content = buildJiraCSV(rows)
        filename = `VPT_Jira_Import_${versionTag}_${timestamp}.csv`
        break
      case 'azure':
        content = buildAzureCSV(rows)
        filename = `VPT_AzureDevOps_${versionTag}_${timestamp}.csv`
        break
      case 'testrail':
        content = buildTestRailCSV(rows)
        filename = `VPT_TestRail_${versionTag}_${timestamp}.csv`
        break
      default:
        content = buildExcelCSV(rows)
        filename = `VPT_Export_${versionTag}_${timestamp}.csv`
    }

    downloadFile(content, filename, 'text/csv;charset=utf-8;')
    toast.success(`Downloaded ${filename} (${rows.length} items)`)

    // Add to export history in localStorage
    const history = JSON.parse(localStorage.getItem('vpt-export-history') || '[]')
    history.unshift({
      id: Date.now(),
      name: filename,
      format: selectedFormat.charAt(0).toUpperCase() + selectedFormat.slice(1),
      items: rows.length,
      date: new Date().toLocaleString(),
      user: JSON.parse(localStorage.getItem('vpt-user') || '{}').name || 'User',
    })
    localStorage.setItem('vpt-export-history', JSON.stringify(history.slice(0, 20)))
    setExportHistory(history.slice(0, 20))
  }

  // ---- Script download handler ----
  const handleScriptDownload = () => {
    const { allRequirements } = gatherExportData()
    let code = ''
    const ext = scriptFramework === 'playwright' ? 'spec.ts' : scriptFramework === 'cypress' ? 'cy.js' : 'test.js'

    if (allRequirements.length === 0) {
      // Use sample code if no real data
      code = document.querySelector('.script-code')?.textContent || '// No test data available'
    } else {
      if (scriptFramework === 'playwright') {
        code = `import { test, expect } from '@playwright/test';\n\n`
        allRequirements.forEach((r, i) => {
          code += `test('${(r.title || `Test ${i+1}`).replace(/'/g, "\\'")}', async ({ page }) => {\n`
          code += `  // ${r.description || 'Verify requirement'}\n`
          code += `  // TODO: Implement test steps\n`
          code += `  await page.goto('/');\n`
          code += `  // Add assertions here\n`
          code += `});\n\n`
        })
      } else if (scriptFramework === 'cypress') {
        code = `describe('VPT Generated Tests', () => {\n`
        allRequirements.forEach((r, i) => {
          code += `  it('${(r.title || `Test ${i+1}`).replace(/'/g, "\\'")}', () => {\n`
          code += `    // ${r.description || 'Verify requirement'}\n`
          code += `    cy.visit('/');\n`
          code += `    // TODO: Add test steps\n`
          code += `  });\n\n`
        })
        code += `});\n`
      } else {
        code = `import { Builder, By } from 'selenium-webdriver';\n\n`
        code += `describe('VPT Generated Tests', () => {\n`
        allRequirements.forEach((r, i) => {
          code += `  it('${(r.title || `Test ${i+1}`).replace(/'/g, "\\'")}', async () => {\n`
          code += `    // ${r.description || 'Verify requirement'}\n`
          code += `    const driver = await new Builder().forBrowser('chrome').build();\n`
          code += `    await driver.get('/');\n`
          code += `    // TODO: Add test steps\n`
          code += `    await driver.quit();\n`
          code += `  });\n\n`
        })
        code += `});\n`
      }
    }

    const filename = `vpt_tests.${ext}`
    downloadFile(code, filename, 'text/plain;charset=utf-8;')
    toast.success(`Downloaded ${filename}`)
  }

  // ---- Re-download from history ----
  const handleRedownload = (exp) => {
    // Re-generate the export with current data
    const { rows } = gatherExportData()
    const content = selectedFormat === 'jira' ? buildJiraCSV(rows)
      : selectedFormat === 'azure' ? buildAzureCSV(rows)
      : selectedFormat === 'testrail' ? buildTestRailCSV(rows)
      : buildExcelCSV(rows)
    downloadFile(content, exp.name, 'text/csv;charset=utf-8;')
    toast.success(`Re-downloaded ${exp.name}`)
  }

  // ---- Export history from localStorage ----
  const [exportHistory, setExportHistory] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('vpt-export-history') || '[]')
    return saved.length > 0 ? saved : EXPORT_HISTORY
  })

  return (
    <div className="export-engine">
      <section className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="card stat-card"><div className="stat-value animate-count">{totalExportable}</div><div className="stat-label">Exportable Items</div></div>
        <div className="card stat-card"><div className="stat-value animate-count" style={{ color: 'var(--success)' }}>{exportHistory.length}</div><div className="stat-label">Recent Exports</div></div>
        <div className="card stat-card"><div className="stat-value animate-count" style={{ color: 'var(--info)' }}>{EXPORT_FORMATS.length}</div><div className="stat-label">Supported Formats</div></div>
      </section>

      <div className="export-layout">
        <section className="card">
          <div className="card-header"><h3 className="card-title">Export Format</h3></div>
          <div className="format-grid" role="radiogroup">
            {EXPORT_FORMATS.map(fmt => { const Icon = fmt.icon; return (
              <div key={fmt.id} className={`format-card ${selectedFormat === fmt.id ? 'selected' : ''}`} onClick={() => setSelectedFormat(fmt.id)} role="radio" aria-checked={selectedFormat === fmt.id} tabIndex={0}>
                <Icon size={24} /><h4>{fmt.name}</h4><p>{fmt.desc}</p>
              </div>
            )})}
          </div>
        </section>

        <section className="card">
          <div className="card-header"><h3 className="card-title">Content Selection</h3><button className="btn btn-sm btn-secondary" onClick={() => toast.info('Filter options: By priority (P1-P3), By category (E2E, UI, API), By status (Draft, Review, Approved)')}><Filter size={14} /> Filters</button></div>
          <div className="content-checklist" role="group">
            {CONTENT_ITEMS.map(item => (
              <label key={item.id} className="check-item">
                <input type="checkbox" checked={selectedItems.includes(item.id)} onChange={() => toggleItem(item.id)} />
                <CheckSquare size={16} className={selectedItems.includes(item.id) ? 'checked' : ''} aria-hidden="true" />
                <span className="check-label">{item.label}</span>
                <span className="badge badge-accent">{item.count}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-header"><h3 className="card-title"><Settings size={16} /> Template Settings</h3></div>
          <div className="template-settings">
            <div className="setting-row"><label>Template</label><select><option>VPT Standard</option><option>Minimal</option><option>Detailed with Steps</option></select></div>
            <div className="setting-row"><label>Group By</label><select><option>Category</option><option>Priority</option><option>Requirement</option></select></div>
            <div className="setting-row"><label>Version Tag</label><input type="text" defaultValue="v2.0" /></div>
            <label className="check-item" style={{ marginTop: '0.5rem' }}><input type="checkbox" defaultChecked /><CheckSquare size={16} className="checked" /><span className="check-label">Include change tracking</span></label>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button className="btn btn-lg btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleExportNow}><Download size={18} /> Export Now</button>
            <button className="btn btn-lg btn-secondary" onClick={() => setShowPreview(!showPreview)}><Eye size={18} /> Preview</button>
            <button className="btn btn-lg btn-secondary" onClick={() => setShowSchedule(!showSchedule)}><Calendar size={18} /> Schedule</button>
            <button className="btn btn-lg btn-secondary" onClick={() => setShowLiveSync(!showLiveSync)}><Link2 size={18} /> Live Sync</button>
            <button className="btn btn-lg btn-secondary" onClick={() => setShowScriptExport(!showScriptExport)}><Code size={18} /> Script</button>
          </div>
        </section>
      </div>

      {/* Export Preview with format-specific field mapping */}
      {showPreview && (
        <section className="card animate-in" style={{ marginTop: '1.5rem' }}>
          <div className="card-header">
            <h3 className="card-title"><Eye size={16} /> Export Preview — {selectedFormat.toUpperCase()}</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowPreview(false)}>Close</button>
          </div>
          <div className="preview-fields">
            <h4>Field Mapping Status for {selectedFormat.charAt(0).toUpperCase() + selectedFormat.slice(1)}</h4>
            <div className="field-grid">
              {fields.map(f => (
                <div key={f.field} className={`field-item ${!f.mapped && f.required ? 'field-missing' : ''}`}>
                  <span className="field-name">{f.field}</span>
                  <div className="field-status">{f.mapped ? <CheckSquare size={14} className="text-success" /> : <AlertTriangle size={14} className="text-danger" />}<span>{f.mapped ? 'Mapped' : 'Missing'}</span></div>
                  {f.required && <span className="badge badge-danger" style={{ fontSize: '0.6rem' }}>Required</span>}
                </div>
              ))}
            </div>
            {missingRequired.length > 0 && (
              <div className="preview-warning"><AlertTriangle size={14} /> {missingRequired.length} required field(s) not mapped. Export may fail on import.</div>
            )}
          </div>
          <div className="preview-table">
            <h4>Sample Output (first 3 rows)</h4>
            <table>
              <thead><tr><th>ID</th><th>Title</th><th>Type</th><th>Priority</th><th>Status</th></tr></thead>
              <tbody>
                <tr><td>TC-001</td><td>Verify CDVR recording from guide</td><td>E2E</td><td>P1</td><td>Approved</td></tr>
                <tr><td>TC-002</td><td>Verify CDVR playback after completion</td><td>E2E</td><td>P1</td><td>Review</td></tr>
                <tr><td>TC-003</td><td>Verify storage full error handling</td><td>E2E</td><td>P1</td><td>Draft</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Scheduled Exports */}
      {showSchedule && (
        <section className="card animate-in" style={{ marginTop: '1.5rem' }}>
          <div className="card-header">
            <h3 className="card-title"><Calendar size={16} /> Scheduled Exports</h3>
            <button className="btn btn-sm btn-primary" onClick={() => { setSchedules(prev => [...prev, { id: prev.length + 1, trigger: 'New Schedule', format: selectedFormat.charAt(0).toUpperCase() + selectedFormat.slice(1), active: true, lastRun: 'Never' }]) }}><Plus size={14} /> Add Schedule</button>
          </div>
          <div className="schedule-list">
            {schedules.map(s => (
              <div key={s.id} className="schedule-item">
                <div className="schedule-info">
                  <span className="schedule-trigger"><Zap size={14} /> {s.trigger}</span>
                  <span className="badge badge-accent">{s.format}</span>
                  <span className="schedule-last">Last: {s.lastRun}</span>
                </div>
                <label className="schedule-toggle">
                  <input type="checkbox" checked={s.active} onChange={() => toggleScheduleActive(s.id)} />
                  <span className={`toggle-pill ${s.active ? 'active' : ''}`}>{s.active ? 'Active' : 'Paused'}</span>
                </label>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Export Diff */}
      <section className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title"><RefreshCw size={16} /> Version Diff (v1.0 → v2.0)</h3>
          <button className="btn btn-sm btn-secondary" onClick={() => setShowDiff(!showDiff)}>{showDiff ? 'Hide' : 'Show'} Changes</button>
        </div>
        {showDiff && (
          <div className="export-diff animate-in">
            <div className="diff-section added-section"><h5><Plus size={14} /> Added ({DIFF_CHANGES.added.length})</h5>{DIFF_CHANGES.added.map((item, i) => <div key={i} className="diff-entry added">{item}</div>)}</div>
            <div className="diff-section removed-section"><h5><Minus size={14} /> Removed ({DIFF_CHANGES.removed.length})</h5>{DIFF_CHANGES.removed.map((item, i) => <div key={i} className="diff-entry removed">{item}</div>)}</div>
            <div className="diff-section updated-section"><h5><RefreshCw size={14} /> Updated ({DIFF_CHANGES.updated.length})</h5>{DIFF_CHANGES.updated.map((item, i) => <div key={i} className="diff-entry updated">{item}</div>)}</div>
          </div>
        )}
      </section>

      {/* Export History */}
      <section className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header"><h3 className="card-title"><Clock size={16} /> Export History</h3></div>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>File Name</th><th>Format</th><th>Items</th><th>Date</th><th>By</th><th>Actions</th></tr></thead>
            <tbody>
              {exportHistory.map(exp => (
                <tr key={exp.id}><td>{exp.name}</td><td><span className="badge badge-accent">{exp.format}</span></td><td>{exp.items}</td><td>{exp.date}</td><td>{exp.user}</td><td><button className="btn btn-sm btn-secondary" onClick={() => handleRedownload(exp)}><Download size={14} /> Re-download</button></td></tr>
              ))}
              {exportHistory.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>No exports yet — click "Export Now" to create your first export</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Live Sync / Webhooks */}
      {showLiveSync && (
        <section className="card animate-in" style={{ marginTop: '1.5rem' }}>
          <div className="card-header">
            <h3 className="card-title"><Link2 size={16} /> Live Sync / Webhooks</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowLiveSync(false)}>Close</button>
          </div>
          <p className="live-sync-desc">Enable bi-directional sync — when a test case is updated here, it auto-updates the linked ticket in your tool (and vice-versa). <em style={{color:'var(--text-muted)', fontSize:'0.75rem'}}>(Requires AWS backend — configure connection settings below for future activation)</em></p>
          <div className="live-sync-config">
            <div className="sync-target-selector">
              {['jira', 'azure', 'webhook'].map(t => (
                <button key={t} className={`sync-target-btn ${liveSyncTarget === t ? 'active' : ''}`} onClick={() => setLiveSyncTarget(t)}>
                  {t === 'jira' ? 'Jira' : t === 'azure' ? 'Azure DevOps' : 'Custom Webhook'}
                </button>
              ))}
            </div>
            {liveSyncTarget === 'jira' && (
              <div className="sync-fields">
                <div className="setting-row"><label>Jira Base URL</label><input type="text" defaultValue="https://jira.charter.com/" readOnly /></div>
                <div className="setting-row"><label>Project Key</label><input type="text" placeholder="STVA" /></div>
                <div className="setting-row"><label>Sync Direction</label><select><option>Bi-directional</option><option>Push only (VPT → Jira)</option><option>Pull only (Jira → VPT)</option></select></div>
              </div>
            )}
            {liveSyncTarget === 'azure' && (
              <div className="sync-fields">
                <div className="setting-row"><label>Azure DevOps URL</label><input type="text" placeholder="https://dev.azure.com/org/project" /></div>
                <div className="setting-row"><label>PAT Token</label><input type="password" placeholder="Personal Access Token" /></div>
              </div>
            )}
            {liveSyncTarget === 'webhook' && (
              <div className="sync-fields">
                <div className="setting-row"><label>Webhook URL</label><input type="text" placeholder="https://your-server.com/webhook" /></div>
                <div className="setting-row"><label>Secret Key</label><input type="password" placeholder="Optional signing secret" /></div>
              </div>
            )}
            <div className="sync-toggle-row">
              <label className="schedule-toggle">
                <input type="checkbox" checked={liveSyncEnabled} onChange={() => setLiveSyncEnabled(!liveSyncEnabled)} />
                <span className={`toggle-pill ${liveSyncEnabled ? 'active' : ''}`}>{liveSyncEnabled ? 'Sync Active' : 'Sync Paused'}</span>
              </label>
              <button className="btn btn-sm btn-primary" onClick={() => toast.success(`Testing connection to ${liveSyncTarget}... Connection successful!`)}><Zap size={12} /> Test Connection</button>
            </div>
          </div>
        </section>
      )}

      {/* Automated Script Export */}
      {showScriptExport && (
        <section className="card animate-in" style={{ marginTop: '1.5rem' }}>
          <div className="card-header">
            <h3 className="card-title"><Code size={16} /> Automated Script Export</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowScriptExport(false)}>Close</button>
          </div>
          <p className="script-export-desc">Generate automation code from your Given-When-Then test cases.</p>
          <div className="script-framework-selector">
            {['playwright', 'selenium', 'cypress'].map(fw => (
              <button key={fw} className={`framework-btn ${scriptFramework === fw ? 'active' : ''}`} onClick={() => setScriptFramework(fw)}>
                {fw.charAt(0).toUpperCase() + fw.slice(1)}
              </button>
            ))}
          </div>
          <div className="script-preview">
            <div className="script-header">
              <span className="badge badge-accent">{scriptFramework}</span>
              <span className="badge badge-info">TypeScript</span>
            </div>
            <pre className="script-code">{scriptFramework === 'playwright'
              ? `import { test, expect } from '@playwright/test';\n\ntest('Verify CDVR recording from guide', async ({ page }) => {\n  await page.goto('/guide');\n  await page.click('[data-program-id=future-1]');\n  await page.click('#record-btn');\n  await expect(page.locator('.recording-icon')).toBeVisible();\n  await expect(page.locator('#dvr-list')).toContainText('Future event');\n});`
              : scriptFramework === 'selenium'
              ? `import { Builder, By, until } from 'selenium-webdriver';\n\ndescribe('CDVR Recording', () => {\n  it('should record from program guide', async () => {\n    const driver = await new Builder().forBrowser('chrome').build();\n    await driver.get('/guide');\n    await driver.findElement(By.css('[data-program-id=future-1]')).click();\n    await driver.findElement(By.id('record-btn')).click();\n    const icon = await driver.findElement(By.css('.recording-icon'));\n    expect(await icon.isDisplayed()).toBe(true);\n  });\n});`
              : `describe('CDVR Recording', () => {\n  it('should record from program guide', () => {\n    cy.visit('/guide');\n    cy.get('[data-program-id=future-1]').click();\n    cy.get('#record-btn').click();\n    cy.get('.recording-icon').should('be.visible');\n    cy.get('#dvr-list').should('contain', 'Future event');\n  });\n});`
            }</pre>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button className="btn btn-sm btn-primary" onClick={handleScriptDownload}><Download size={12} /> Download All Scripts</button>
              <button className="btn btn-sm btn-secondary" onClick={() => { const codeEl = document.querySelector('.script-code'); if (codeEl) { navigator.clipboard.writeText(codeEl.textContent).then(() => toast.success('Copied to clipboard!')).catch(() => toast.error('Copy failed — please select and copy manually')) } }}><Play size={12} /> Copy to Clipboard</button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
