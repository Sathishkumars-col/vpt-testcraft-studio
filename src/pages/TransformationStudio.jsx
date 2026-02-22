import { useState } from 'react'
import {
  Wrench, Sparkles, Copy, CheckCircle, AlertTriangle,
  Settings, RefreshCw, Users, GitBranch, Code, Eye,
  CheckSquare, XCircle, Play, MessageCircle, Send,
  Flag, UserCheck, Shield, Globe, Server, FileText
} from 'lucide-react'
import { useToast } from '../components/Toast'
import { sanitizeComment } from '../utils/sanitize'
import { generateTestCases as aiGenerateTestCases, chatWithAI } from '../utils/ai'
import './TransformationStudio.css'

const TEST_CASES = [
  {
    id: 'TC-001', scenario: 'SC-001', title: 'Verify CDVR recording from program guide',
    format: 'Given-When-Then', status: 'approved', duplicateRisk: false, similarity: 0,
    given: 'User is on the program guide with a valid CDVR subscription',
    when: 'User selects a future program and clicks Record',
    then: 'Recording is scheduled and confirmation is displayed',
    testData: 'Account: CDVR Unlimited, Channel: ESPN HD, Program: Future event +2hrs',
    assertions: ['Recording icon appears on program', 'My DVR list updated', 'Storage counter incremented'],
    automationSteps: ['navigate("/guide")', 'page.click("[data-program-id=future-1]")', 'page.click("#record-btn")', 'expect(page.locator(".recording-icon")).toBeVisible()', 'expect(page.locator("#dvr-list")).toContainText("Future event")'],
    vptStandard: {
      preconditions: {
        featureFlags: [
          { flag: 'enableCDVR', value: 'true', dependency: 'None' },
          { flag: 'enableProgramGuide', value: 'true', dependency: 'None' },
          { flag: 'cdvrRecordingLimit', value: 'unlimited', dependency: 'enableCDVR = true' },
        ],
        accountType: 'Resi — CDVR Unlimited package',
        billCode: 'TV Select + CDVR Unlimited (950301)',
        accountStatus: 'Active — No billing restrictions',
      },
      testSteps: [
        { step: 1, action: 'Launch Spectrum TV app and navigate to Program Guide', uiElement: 'Bottom Nav → Guide tab', expectedResult: null, isNavigation: true },
        { step: 2, action: 'Scroll to a future program (2+ hours ahead) on ESPN HD channel', uiElement: 'Guide grid → Program cell', expectedResult: 'Program details overlay appears with Record option visible', isNavigation: false },
        { step: 3, action: 'Press Select/OK on the program to open details', uiElement: 'Remote: OK/Select button', expectedResult: 'Program detail modal opens showing title, time, channel, and Record CTA button', isNavigation: false },
        { step: 4, action: 'Click "Record" button', uiElement: 'Record CTA button in program detail modal', expectedResult: 'Recording confirmation toast displayed: "Recording Scheduled"', isNavigation: false },
        { step: 5, action: 'Validate CDVR Recording API call', apiEndpoint: 'POST /api/v3/cdvr/recordings', httpCode: 201, responseFields: ['recordingId', 'status: scheduled', 'programId', 'channelId'], headers: 'Authorization: Bearer {token}', isApi: true, expectedResult: 'API returns 201 with recordingId and status "scheduled"' },
        { step: 6, action: 'Verify recording icon on program in Guide', uiElement: 'Guide grid → Program cell', expectedResult: 'Red recording dot icon appears on the program cell in Guide', isNavigation: false },
        { step: 7, action: 'Navigate to My DVR and verify recording listed', uiElement: 'Bottom Nav → My DVR tab', expectedResult: 'New recording appears in "Scheduled" section with correct program title and time', isNavigation: false },
        { step: 8, action: 'Validate storage counter API', apiEndpoint: 'GET /api/v3/cdvr/storage', httpCode: 200, responseFields: ['usedHours (incremented)', 'totalHours: 200', 'remainingHours'], headers: 'Authorization: Bearer {token}', isApi: true, expectedResult: 'Storage counter reflects incremented usage' },
      ],
    },
  },
  {
    id: 'TC-002', scenario: 'SC-001', title: 'Verify CDVR recording playback after completion',
    format: 'Given-When-Then', status: 'review', duplicateRisk: false, similarity: 0,
    given: 'A scheduled recording has completed successfully',
    when: 'User navigates to My DVR and selects the recording',
    then: 'Recording plays back with full trick-play support',
    testData: 'Account: CDVR Unlimited, Recorded content: 30min program',
    assertions: ['Playback starts within 3 seconds', 'FF/RW controls functional', 'Progress bar accurate'],
    automationSteps: ['navigate("/my-dvr")', 'page.click("[data-recording-id=rec-1]")', 'await expect(page.locator("video")).toHaveAttribute("playing", "true")', 'page.click("#ff-btn")', 'expect(page.locator(".progress")).toBeVisible()'],
    vptStandard: {
      preconditions: {
        featureFlags: [
          { flag: 'enableCDVR', value: 'true', dependency: 'None' },
          { flag: 'enableTrickPlay', value: 'true', dependency: 'enableCDVR = true' },
          { flag: 'cdvrPlaybackDRM', value: 'widevine', dependency: 'None' },
        ],
        accountType: 'Resi — CDVR Unlimited package',
        billCode: 'TV Select + CDVR Unlimited (950301)',
        accountStatus: 'Active — No billing restrictions',
      },
      testSteps: [
        { step: 1, action: 'Launch Spectrum TV app and navigate to My DVR', uiElement: 'Bottom Nav → My DVR tab', expectedResult: null, isNavigation: true },
        { step: 2, action: 'Locate completed recording in "Recorded" section', uiElement: 'My DVR → Recorded tab', expectedResult: 'Completed recording visible with title, duration (30min), and recorded date', isNavigation: false },
        { step: 3, action: 'Select the recording and press Play', uiElement: 'Recording card → Play CTA', expectedResult: 'Playback starts within 3 seconds. Video player loads with progress bar at 0:00', isNavigation: false },
        { step: 4, action: 'Validate playback start API', apiEndpoint: 'POST /api/v3/cdvr/playback/start', httpCode: 200, responseFields: ['streamUrl', 'drmLicenseUrl', 'playbackSessionId'], headers: 'Authorization: Bearer {token}', isApi: true, expectedResult: 'API returns 200 with valid streamUrl and DRM license' },
        { step: 5, action: 'Press FF (Fast Forward) button on remote', uiElement: 'Remote: FF button / Player FF control', expectedResult: 'Playback advances at 2x/4x speed. Progress bar updates in real-time. Thumbnail preview shown', isNavigation: false },
        { step: 6, action: 'Press RW (Rewind) button on remote', uiElement: 'Remote: RW button / Player RW control', expectedResult: 'Playback rewinds at 2x/4x speed. Progress bar updates. Thumbnail preview shown', isNavigation: false },
        { step: 7, action: 'Verify progress bar accuracy at 50% playback', uiElement: 'Player progress bar', expectedResult: 'Progress bar shows ~15:00 / 30:00. Time display matches actual playback position', isNavigation: false },
      ],
    },
  },
  {
    id: 'TC-003', scenario: 'SC-002', title: 'Verify storage full error handling',
    format: 'Step-by-step', status: 'draft', duplicateRisk: true, similarity: 82,
    similarTo: 'TC-001', differences: ['TC-003 tests error state vs TC-001 tests success state', 'Different precondition: storage full vs available', 'TC-003 validates error modal, TC-001 validates recording icon'],
    given: 'User storage is at 100% capacity',
    when: 'User attempts to schedule a new recording',
    then: 'Error message displayed with manage storage option',
    testData: 'Account: CDVR Unlimited at max capacity (200hrs)',
    assertions: ['Error modal displayed', 'Manage Storage button present', 'No recording scheduled'],
    automationSteps: ['// Setup: fill storage to max', 'api.post("/storage/fill", { hours: 200 })', 'navigate("/guide")', 'page.click("[data-program-id=future-1]")', 'page.click("#record-btn")', 'expect(page.locator(".error-modal")).toBeVisible()', 'expect(page.locator("#manage-storage-btn")).toBeEnabled()'],
    vptStandard: {
      preconditions: {
        featureFlags: [
          { flag: 'enableCDVR', value: 'true', dependency: 'None' },
          { flag: 'cdvrStorageLimit', value: '200', dependency: 'enableCDVR = true' },
          { flag: 'enableStorageManagement', value: 'true', dependency: 'None' },
        ],
        accountType: 'Resi — CDVR Unlimited package (storage at 100% capacity)',
        billCode: 'TV Select + CDVR Unlimited (950301)',
        accountStatus: 'Active — Storage full (200/200 hrs used)',
      },
      testSteps: [
        { step: 1, action: 'Ensure account CDVR storage is at 200/200 hours (100% full)', uiElement: 'N/A — Pre-condition setup', expectedResult: null, isNavigation: true },
        { step: 2, action: 'Launch Spectrum TV app and navigate to Program Guide', uiElement: 'Bottom Nav → Guide tab', expectedResult: null, isNavigation: true },
        { step: 3, action: 'Select a future program and click "Record"', uiElement: 'Guide → Program cell → Record CTA', expectedResult: 'Error modal appears: "Storage Full — Unable to schedule recording"', isNavigation: false },
        { step: 4, action: 'Validate error response from Recording API', apiEndpoint: 'POST /api/v3/cdvr/recordings', httpCode: 409, responseFields: ['error: STORAGE_FULL', 'message', 'currentUsage: 200', 'maxCapacity: 200'], headers: 'Authorization: Bearer {token}', isApi: true, expectedResult: 'API returns 409 Conflict with error code STORAGE_FULL' },
        { step: 5, action: 'Verify "Manage Storage" button is present in error modal', uiElement: 'Error modal → Manage Storage CTA', expectedResult: '"Manage Storage" button is visible and enabled in the error modal', isNavigation: false },
        { step: 6, action: 'Click "Manage Storage" button', uiElement: 'Manage Storage CTA', expectedResult: 'Navigates to My DVR → Storage Management screen showing all recordings with delete options', isNavigation: false },
        { step: 7, action: 'Verify no new recording was scheduled', uiElement: 'My DVR → Scheduled tab', expectedResult: 'No new recording entry in Scheduled list. Recording count unchanged', isNavigation: false },
      ],
    },
  },
  {
    id: 'TC-004', scenario: 'SC-003', title: 'Verify concurrent recording conflict resolution',
    format: 'Given-When-Then', status: 'draft', duplicateRisk: false, similarity: 0,
    given: 'User has 2 recordings scheduled at overlapping times',
    when: 'System detects the conflict during scheduling',
    then: 'Conflict notification shown with resolution options',
    testData: 'Account: CDVR Unlimited, 2 programs same timeslot',
    assertions: ['Conflict dialog appears', 'Both programs listed', 'Keep/Cancel options available'],
    automationSteps: ['api.post("/recordings", { programId: "p1", time: "20:00" })', 'api.post("/recordings", { programId: "p2", time: "20:00" })', 'expect(page.locator(".conflict-dialog")).toBeVisible()', 'expect(page.locator(".conflict-options")).toHaveCount(2)'],
    vptStandard: {
      preconditions: {
        featureFlags: [
          { flag: 'enableCDVR', value: 'true', dependency: 'None' },
          { flag: 'enableConflictResolution', value: 'true', dependency: 'enableCDVR = true' },
          { flag: 'maxConcurrentRecordings', value: '1', dependency: 'None' },
        ],
        accountType: 'Resi — CDVR Unlimited package',
        billCode: 'TV Select + CDVR Unlimited (950301)',
        accountStatus: 'Active — 1 existing recording scheduled at 8:00 PM',
      },
      testSteps: [
        { step: 1, action: 'Ensure 1 recording is already scheduled at 8:00 PM timeslot', uiElement: 'N/A — Pre-condition setup', expectedResult: null, isNavigation: true },
        { step: 2, action: 'Navigate to Program Guide and select a different program at 8:00 PM', uiElement: 'Guide → Program cell (overlapping timeslot)', expectedResult: 'Program detail modal opens with Record option', isNavigation: false },
        { step: 3, action: 'Click "Record" on the overlapping program', uiElement: 'Record CTA button', expectedResult: 'Conflict resolution dialog appears: "Recording Conflict Detected"', isNavigation: false },
        { step: 4, action: 'Validate conflict detection API', apiEndpoint: 'POST /api/v3/cdvr/recordings', httpCode: 409, responseFields: ['error: CONFLICT', 'conflictingRecordings[]', 'resolutionOptions[]'], headers: 'Authorization: Bearer {token}', isApi: true, expectedResult: 'API returns 409 with conflicting recording details and resolution options' },
        { step: 5, action: 'Verify both programs are listed in conflict dialog', uiElement: 'Conflict dialog → Program list', expectedResult: 'Both program titles, channels, and times displayed side by side', isNavigation: false },
        { step: 6, action: 'Verify "Keep Both" and "Cancel New" options available', uiElement: 'Conflict dialog → Action buttons', expectedResult: '"Keep Existing", "Replace with New", and "Cancel" buttons all visible and enabled', isNavigation: false },
      ],
    },
  },
]

const FORMAT_OPTIONS = ['Given-When-Then', 'VPT Standard', 'Step-by-step', 'BDD', 'Automation Preview', 'Step Play']

const convertToFormat = (tc, format) => {
  if (format === 'Step-by-step') return { steps: [`1. Precondition: ${tc.given}`, `2. Action: ${tc.when}`, `3. Verification: ${tc.then}`, ...tc.assertions.map((a, i) => `${i + 4}. Assert: ${a}`)] }
  if (format === 'BDD') return { feature: `Feature: ${tc.title}`, scenario: `  Scenario: ${tc.title}\n    Given ${tc.given}\n    When ${tc.when}\n    Then ${tc.then}${tc.assertions.map(a => `\n    And ${a}`).join('')}` }
  return null
}

export default function TransformationStudio() {
  const toast = useToast()
  const [testCases, setTestCases] = useState(TEST_CASES)
  const [selectedCase, setSelectedCase] = useState(TEST_CASES[0])
  const [activeFormat, setActiveFormat] = useState('All')
  const [viewFormat, setViewFormat] = useState('Given-When-Then')
  const [selectedIds, setSelectedIds] = useState([])
  const [playStep, setPlayStep] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiEnhancing, setAiEnhancing] = useState(false)
  const [comments, setComments] = useState({
    'TC-001': [{ user: '@sarah.chen', text: 'Should we add a timeout assertion for the recording confirmation?', time: '3h ago' }],
    'TC-003': [{ user: '@mike.johnson', text: 'This overlaps with TC-001 — can we merge the precondition?', time: '1h ago' }],
  })
  const [newComment, setNewComment] = useState('')

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  const selectAll = () => setSelectedIds(testCases.map(tc => tc.id))

  const handleBulkApprove = () => {
    setTestCases(prev => prev.map(tc => selectedIds.includes(tc.id) ? { ...tc, status: 'approved' } : tc))
    setSelectedIds([])
  }
  const handleBulkReject = () => {
    setTestCases(prev => prev.map(tc => selectedIds.includes(tc.id) ? { ...tc, status: 'draft' } : tc))
    setSelectedIds([])
  }

  const startStepPlay = () => {
    if (!selectedCase) return
    setIsPlaying(true)
    setPlayStep(0)
    const steps = ['given', 'when', 'then', ...selectedCase.assertions.map((_, i) => `assert-${i}`)]
    let idx = 0
    const interval = setInterval(() => {
      idx++
      if (idx >= steps.length) { clearInterval(interval); setIsPlaying(false) }
      else setPlayStep(idx)
    }, 1500)
  }

  const addComment = () => {
    const clean = sanitizeComment(newComment)
    if (!clean || !selectedCase) return
    const caseComments = comments[selectedCase.id] || []
    setComments({ ...comments, [selectedCase.id]: [...caseComments, { user: '@you', text: clean, time: 'just now' }] })
    setNewComment('')
  }

  const converted = selectedCase ? convertToFormat(selectedCase, viewFormat) : null

  // AI-powered test case generation from scenarios
  const handleAIGenerateFromScenarios = async () => {
    setAiGenerating(true)
    toast.info('AI is generating test cases from approved scenarios...')
    try {
      // Use existing scenarios as input
      const approvedScenarios = testCases.map(tc => ({
        id: tc.scenario, title: tc.title, given: tc.given, when: tc.when, then: tc.then,
      }))
      // Also pull from localStorage if ScenarioGenerator saved any
      const scenarioData = approvedScenarios[0] || { id: 'SC-001', title: 'Default scenario', given: 'User is logged in', when: 'User performs action', then: 'Expected result occurs' }
      const result = await aiGenerateTestCases(scenarioData)
      const newCases = (result.testCases || []).map((tc, i) => ({
        id: `TC-${String(testCases.length + i + 1).padStart(3, '0')}`,
        scenario: scenarioData.id,
        title: tc.title,
        format: 'Given-When-Then',
        status: 'draft',
        duplicateRisk: false,
        similarity: 0,
        given: tc.given,
        when: tc.when,
        then: tc.then,
        testData: tc.testData || '',
        assertions: tc.assertions || [],
        automationSteps: tc.automationSteps || [],
      }))
      setTestCases(prev => [...prev, ...newCases])
      toast.success(`AI generated ${newCases.length} new test cases`)
    } catch (err) {
      toast.error(`AI generation failed: ${err.message}`)
    } finally {
      setAiGenerating(false)
    }
  }

  // AI-powered test case enhancement
  const handleAIEnhance = async () => {
    if (!selectedCase) return
    setAiEnhancing(true)
    toast.info(`AI enhancing ${selectedCase.id}...`)
    try {
      const data = await chatWithAI(
        `Enhance this test case by adding edge cases, improving assertions, and suggesting better test data. Return JSON with fields: given, when, then, testData, assertions (array), automationSteps (array). Only return JSON.`,
        `Test case: ${selectedCase.title}\nGiven: ${selectedCase.given}\nWhen: ${selectedCase.when}\nThen: ${selectedCase.then}\nCurrent assertions: ${selectedCase.assertions.join(', ')}`
      )
      try {
        const enhanced = JSON.parse(data.reply.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim())
        setTestCases(prev => prev.map(tc => tc.id === selectedCase.id ? {
          ...tc,
          given: enhanced.given || tc.given,
          when: enhanced.when || tc.when,
          then: enhanced.then || tc.then,
          testData: enhanced.testData || tc.testData,
          assertions: enhanced.assertions || tc.assertions,
          automationSteps: enhanced.automationSteps || tc.automationSteps,
        } : tc))
        setSelectedCase(prev => ({
          ...prev,
          given: enhanced.given || prev.given,
          when: enhanced.when || prev.when,
          then: enhanced.then || prev.then,
          testData: enhanced.testData || prev.testData,
          assertions: enhanced.assertions || prev.assertions,
          automationSteps: enhanced.automationSteps || prev.automationSteps,
        }))
        toast.success(`${selectedCase.id} enhanced by AI`)
      } catch {
        toast.info(`AI response: ${data.reply.substring(0, 100)}...`)
      }
    } catch (err) {
      toast.error(`AI enhance failed: ${err.message}`)
    } finally {
      setAiEnhancing(false)
    }
  }

  const copyStepsToClipboard = () => {
    if (!selectedCase) return
    let text = `${selectedCase.id}: ${selectedCase.title}\n\n`
    text += `Given: ${selectedCase.given}\nWhen: ${selectedCase.when}\nThen: ${selectedCase.then}\n\n`
    text += `Test Data: ${selectedCase.testData}\n\nAssertions:\n`
    selectedCase.assertions.forEach((a, i) => { text += `${i + 1}. ${a}\n` })
    if (selectedCase.vptStandard) {
      text += `\nPre-conditions:\n`
      text += `Account: ${selectedCase.vptStandard.preconditions.accountType}\n`
      text += `Bill Code: ${selectedCase.vptStandard.preconditions.billCode}\n\n`
      text += `Steps:\n`
      selectedCase.vptStandard.testSteps.forEach(s => {
        text += `${s.step}. ${s.action}`
        if (s.expectedResult) text += ` → Expected: ${s.expectedResult}`
        text += '\n'
      })
    }
    navigator.clipboard.writeText(text).then(() => toast.success('Steps copied to clipboard')).catch(() => toast.error('Copy failed'))
  }

  return (
    <div className="transformation-studio">
      <section className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="card stat-card"><div className="stat-value animate-count">{testCases.length}</div><div className="stat-label">Test Cases</div></div>
        <div className="card stat-card"><div className="stat-value animate-count" style={{ color: 'var(--success)' }}>{testCases.filter(t => t.status === 'approved').length}</div><div className="stat-label">Approved</div></div>
        <div className="card stat-card"><div className="stat-value animate-count" style={{ color: 'var(--warning)' }}>{testCases.filter(t => t.status === 'review').length}</div><div className="stat-label">In Review</div></div>
        <div className="card stat-card"><div className="stat-value animate-count" style={{ color: 'var(--danger)' }}>{testCases.filter(t => t.duplicateRisk).length}</div><div className="stat-label">Duplicate Risk</div></div>
      </section>

      <div className="transform-layout">
        <section className="card tc-list-panel">
          <div className="card-header">
            <h3 className="card-title">Test Cases</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {selectedIds.length > 0 && (
                <div className="batch-actions animate-in">
                  <span className="badge badge-accent">{selectedIds.length} selected</span>
                  <button className="btn btn-sm btn-success" onClick={handleBulkApprove}><CheckCircle size={12} /> Approve</button>
                  <button className="btn btn-sm btn-danger" onClick={handleBulkReject}><XCircle size={12} /> Reject</button>
                  <button className="btn btn-sm btn-secondary" onClick={() => setSelectedIds([])}>Clear</button>
                </div>
              )}
              <button className="btn btn-sm btn-secondary" onClick={selectAll}><CheckSquare size={14} /> Select All</button>
              <button className="btn btn-sm btn-primary" onClick={handleAIGenerateFromScenarios} disabled={aiGenerating}><Sparkles size={14} /> {aiGenerating ? 'Generating...' : 'Generate from Scenarios'}</button>
              <button className="btn btn-sm btn-secondary" onClick={() => toast.info('Converting all test cases to automation-ready format with Playwright steps...')}><Wrench size={14} /> Make Automation-Ready</button>
            </div>
          </div>

          <div className="tabs" role="tablist">
            {['All', 'Given-When-Then', 'Step-by-step', 'BDD'].map(fmt => (
              <button key={fmt} role="tab" className={`tab ${activeFormat === fmt ? 'active' : ''}`} onClick={() => setActiveFormat(fmt)} aria-selected={activeFormat === fmt}>{fmt}</button>
            ))}
          </div>

          <div className="tc-list" role="list">
            {testCases.map(tc => (
              <div key={tc.id} className={`tc-item ${selectedCase?.id === tc.id ? 'selected' : ''} ${selectedIds.includes(tc.id) ? 'tc-checked' : ''}`} role="listitem">
                <div className="tc-check"><input type="checkbox" checked={selectedIds.includes(tc.id)} onChange={() => toggleSelect(tc.id)} aria-label={`Select ${tc.id}`} /></div>
                <div className="tc-item-body" onClick={() => setSelectedCase(tc)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSelectedCase(tc)}>
                  <div className="tc-item-header">
                    <span className="tc-id">{tc.id}</span>
                    <span className={`badge badge-${tc.status === 'approved' ? 'success' : tc.status === 'review' ? 'warning' : 'accent'}`}>{tc.status}</span>
                    {tc.duplicateRisk && (
                      <span className="badge badge-danger" title={`${tc.similarity}% similar to ${tc.similarTo}`}>
                        <Copy size={10} /> {tc.similarity}% → {tc.similarTo}
                      </span>
                    )}
                  </div>
                  <p className="tc-title">{tc.title}</p>
                  <span className="tc-scenario"><GitBranch size={12} /> {tc.scenario}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card tc-detail-panel">
          {selectedCase ? (
            <>
              <div className="card-header">
                <h3 className="card-title">{selectedCase.id}: {selectedCase.title}</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-sm btn-secondary" onClick={copyStepsToClipboard}><Copy size={14} /> Copy Steps</button>
                  <button className="btn btn-sm btn-primary" onClick={handleAIEnhance} disabled={aiEnhancing}><Sparkles size={14} /> {aiEnhancing ? 'Enhancing...' : 'AI Enhance'}</button>
                  <button className="btn btn-sm btn-success" onClick={() => setTestCases(prev => prev.map(tc => tc.id === selectedCase.id ? { ...tc, status: 'approved' } : tc))}><CheckCircle size={14} /> Approve</button>
                </div>
              </div>

              {/* Multi-Format View Toggle with auto-conversion */}
              <div className="format-toggle">
                {FORMAT_OPTIONS.map(f => (
                  <button key={f} className={`format-toggle-btn ${viewFormat === f ? 'active' : ''}`} onClick={() => setViewFormat(f)}>
                    {f === 'Automation Preview' ? <Code size={13} /> : f === 'Step Play' ? <Play size={13} /> : <Eye size={13} />} {f}
                  </button>
                ))}
              </div>

              <div className="tc-detail-content">
                {viewFormat === 'Given-When-Then' && (
                  <>
                    <div className="tc-format-section">
                      <div className="format-block given"><h4>Given</h4><p>{selectedCase.given}</p></div>
                      <div className="format-block when"><h4>When</h4><p>{selectedCase.when}</p></div>
                      <div className="format-block then"><h4>Then</h4><p>{selectedCase.then}</p></div>
                    </div>
                    <div className="tc-section"><h4><Settings size={14} /> Test Data</h4><div className="test-data-box">{selectedCase.testData}</div></div>
                    <div className="tc-section"><h4><CheckCircle size={14} /> Assertions</h4><ul className="assertion-list">{selectedCase.assertions.map((a, i) => <li key={i}><CheckCircle size={12} /> {a}</li>)}</ul></div>
                  </>
                )}

                {viewFormat === 'VPT Standard' && selectedCase.vptStandard && (
                  <div className="vpt-standard-view">
                    <div className="format-note"><FileText size={12} /> VPT Test Case Standard Format — FE Dev & VPT Guidelines</div>

                    {/* 1. Pre-conditions */}
                    <div className="vpt-section">
                      <h4 className="vpt-section-title"><Shield size={14} /> 1. Pre-conditions</h4>

                      <div className="vpt-subsection">
                        <h5><Flag size={12} /> TDCS Feature Flag Configuration</h5>
                        <table className="vpt-table">
                          <thead><tr><th>Flag Name</th><th>Value</th><th>Dependency</th></tr></thead>
                          <tbody>
                            {selectedCase.vptStandard.preconditions.featureFlags.map((f, i) => (
                              <tr key={i}>
                                <td><code>{f.flag}</code></td>
                                <td><span className={`badge ${f.value === 'true' ? 'badge-success' : 'badge-accent'}`}>{f.value}</span></td>
                                <td>{f.dependency}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="vpt-subsection">
                        <h5><UserCheck size={12} /> Account Type Requirements</h5>
                        <div className="vpt-field"><span className="vpt-label">Account Type:</span> {selectedCase.vptStandard.preconditions.accountType}</div>
                        <div className="vpt-field"><span className="vpt-label">Bill Code / Package:</span> {selectedCase.vptStandard.preconditions.billCode}</div>
                      </div>

                      <div className="vpt-subsection">
                        <h5><Shield size={12} /> Account Status Dependencies</h5>
                        <div className="vpt-field"><span className="vpt-label">Status:</span> {selectedCase.vptStandard.preconditions.accountStatus}</div>
                      </div>
                    </div>

                    {/* 2. Test Steps */}
                    <div className="vpt-section">
                      <h4 className="vpt-section-title"><Play size={14} /> 2. Test Steps</h4>
                      <div className="vpt-steps">
                        {selectedCase.vptStandard.testSteps.map((s) => (
                          <div key={s.step} className={`vpt-step ${s.isApi ? 'vpt-step-api' : s.isNavigation ? 'vpt-step-nav' : 'vpt-step-func'}`}>
                            <div className="vpt-step-num">{s.step}</div>
                            <div className="vpt-step-body">
                              <div className="vpt-step-action">
                                {s.isApi && <span className="badge badge-info" style={{ marginRight: '0.5rem' }}>API</span>}
                                {s.isNavigation && <span className="badge badge-accent" style={{ marginRight: '0.5rem' }}>NAV</span>}
                                {!s.isApi && !s.isNavigation && <span className="badge badge-warning" style={{ marginRight: '0.5rem' }}>FUNC</span>}
                                {s.action}
                              </div>
                              {s.uiElement && <div className="vpt-step-meta"><Globe size={11} /> UI Element: {s.uiElement}</div>}
                              {s.apiEndpoint && (
                                <div className="vpt-step-api-detail">
                                  <div className="vpt-step-meta"><Server size={11} /> Endpoint: <code>{s.apiEndpoint}</code></div>
                                  <div className="vpt-step-meta">Expected HTTP: <span className={`badge ${s.httpCode < 300 ? 'badge-success' : 'badge-danger'}`}>{s.httpCode}</span></div>
                                  <div className="vpt-step-meta">Response Fields: {s.responseFields.map((f, i) => <code key={i} style={{ marginRight: '0.25rem' }}>{f}</code>)}</div>
                                  {s.headers && <div className="vpt-step-meta">Headers: <code>{s.headers}</code></div>}
                                </div>
                              )}
                              {s.expectedResult && (
                                <div className="vpt-expected">
                                  <CheckCircle size={11} /> <strong>Expected:</strong> {s.expectedResult}
                                </div>
                              )}
                              {s.isNavigation && !s.expectedResult && (
                                <div className="vpt-expected vpt-expected-nav">
                                  <em>Navigation step — expected result omitted per VPT guidelines</em>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {viewFormat === 'Step-by-step' && converted && (
                  <div className="step-by-step-view">
                    <div className="format-note"><Sparkles size={12} /> Auto-converted from Given-When-Then format</div>
                    <ol className="step-list">{converted.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                  </div>
                )}

                {viewFormat === 'BDD' && converted && (
                  <div className="bdd-view">
                    <div className="format-note"><Sparkles size={12} /> Auto-converted to Gherkin/BDD syntax</div>
                    <pre className="bdd-code">{converted.scenario}</pre>
                  </div>
                )}

                {viewFormat === 'Automation Preview' && (
                  <div className="automation-preview">
                    <div className="auto-header"><span className="badge badge-accent">Playwright</span><span className="badge badge-info">TypeScript</span></div>
                    <pre className="auto-code">{`test('${selectedCase.title}', async ({ page }) => {\n${selectedCase.automationSteps.map(s => `  ${s};`).join('\n')}\n});`}</pre>
                  </div>
                )}

                {viewFormat === 'Step Play' && selectedCase && (
                  <div className="step-play-view">
                    <div className="format-note"><Play size={12} /> LLM-simulated step-by-step execution preview</div>
                    {!isPlaying && playStep === -1 && (
                      <button className="btn btn-primary step-play-start" onClick={startStepPlay}><Play size={14} /> Start Simulation</button>
                    )}
                    <div className="play-steps">
                      <div className={`play-step ${playStep >= 0 ? 'play-active' : ''} ${playStep > 0 ? 'play-done' : ''}`}>
                        <div className="play-step-label">GIVEN</div>
                        <div className="play-step-text">{selectedCase.given}</div>
                        {playStep === 0 && <div className="play-sim">🖥️ Simulating: User on program guide, subscription verified...</div>}
                      </div>
                      <div className={`play-step ${playStep >= 1 ? 'play-active' : ''} ${playStep > 1 ? 'play-done' : ''}`}>
                        <div className="play-step-label">WHEN</div>
                        <div className="play-step-text">{selectedCase.when}</div>
                        {playStep === 1 && <div className="play-sim">🖱️ Simulating: Click action on Record button...</div>}
                      </div>
                      <div className={`play-step ${playStep >= 2 ? 'play-active' : ''} ${playStep > 2 ? 'play-done' : ''}`}>
                        <div className="play-step-label">THEN</div>
                        <div className="play-step-text">{selectedCase.then}</div>
                        {playStep === 2 && <div className="play-sim">✅ Verifying: Confirmation dialog rendered...</div>}
                      </div>
                      {selectedCase.assertions.map((a, i) => (
                        <div key={i} className={`play-step ${playStep >= 3 + i ? 'play-active' : ''} ${playStep > 3 + i ? 'play-done' : ''}`}>
                          <div className="play-step-label">ASSERT {i + 1}</div>
                          <div className="play-step-text">{a}</div>
                          {playStep === 3 + i && <div className="play-sim">🔍 Checking assertion...</div>}
                        </div>
                      ))}
                    </div>
                    {!isPlaying && playStep > -1 && (
                      <div className="play-result"><CheckCircle size={14} /> All steps passed simulation. Ready for execution.</div>
                    )}
                  </div>
                )}

                {/* Duplicate Similarity Detail with link */}
                {selectedCase.duplicateRisk && (
                  <div className="duplicate-detail">
                    <AlertTriangle size={16} />
                    <div>
                      <strong>{selectedCase.similarity}% semantic similarity with <button className="dup-link" onClick={() => { const tc = testCases.find(t => t.id === selectedCase.similarTo); if (tc) setSelectedCase(tc) }}>{selectedCase.similarTo}</button></strong>
                      <ul className="diff-list">{selectedCase.differences?.map((d, i) => <li key={i}>{d}</li>)}</ul>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => { const tc = testCases.find(t => t.id === selectedCase.similarTo); if (tc) setSelectedCase(tc) }}><RefreshCw size={12} /> View {selectedCase.similarTo}</button>
                        <button className="btn btn-sm btn-secondary">Dismiss</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Collaborative Comments */}
                <div className="tc-section">
                  <h4><MessageCircle size={14} /> Comments & Discussion</h4>
                  <div className="comments-thread">
                    {(comments[selectedCase.id] || []).map((c, i) => (
                      <div key={i} className="comment-item">
                        <span className="comment-user">{c.user}</span>
                        <span className="comment-time">{c.time}</span>
                        <p className="comment-text">{c.text}</p>
                      </div>
                    ))}
                    {(!comments[selectedCase.id] || comments[selectedCase.id].length === 0) && (
                      <p className="comment-empty">No comments yet. Start a discussion.</p>
                    )}
                    <div className="comment-input-row">
                      <input
                        type="text"
                        className="comment-input"
                        placeholder="Add a comment... (use @ to mention)"
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addComment()}
                      />
                      <button className="btn btn-sm btn-primary" onClick={addComment} disabled={!newComment.trim()}><Send size={12} /></button>
                    </div>
                  </div>
                </div>

                <div className="tc-section">
                  <h4><Users size={14} /> Review Workflow</h4>
                  <div className="workflow-steps">
                    <div className="workflow-step completed"><div className="step-dot" /><span>Draft</span></div>
                    <div className={`workflow-step ${selectedCase.status !== 'draft' ? 'completed' : 'current'}`}><div className="step-dot" /><span>Review</span></div>
                    <div className={`workflow-step ${selectedCase.status === 'approved' ? 'completed' : ''}`}><div className="step-dot" /><span>Approved</span></div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state"><Wrench size={48} /><p>Select a test case to view details</p></div>
          )}
        </section>
      </div>
    </div>
  )
}
