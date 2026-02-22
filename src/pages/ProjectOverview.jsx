import { useState, useEffect } from 'react'
import {
  FolderOpen, FileText, CheckCircle, AlertTriangle, Sparkles,
  BarChart3, Target, Shield, Zap, RefreshCw, Loader
} from 'lucide-react'
import { chatWithAI } from '../utils/ai'
import { useToast } from '../components/Toast'
import './ProjectOverview.css'

export default function ProjectOverview() {
  const toast = useToast()
  const [docs, setDocs] = useState([])
  const [aiSummary, setAiSummary] = useState(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('vpt-docs') || '[]')
    setDocs(saved)
  }, [])

  const parsed = docs.filter(d => d.status === 'parsed')
  const totalStories = docs.reduce((s, d) => s + (d.stories || 0), 0)
  const totalSpecs = docs.reduce((s, d) => s + (d.specs || 0), 0)
  const avgTestability = parsed.length > 0 ? Math.round(parsed.reduce((s, d) => s + (d.testability || 0), 0) / parsed.length) : 0
  const avgCompleteness = parsed.length > 0 ? Math.round(parsed.reduce((s, d) => s + (d.completeness || 0), 0) / parsed.length) : 0
  const avgAmbiguity = parsed.length > 0 ? Math.round(parsed.reduce((s, d) => s + (d.ambiguity || 0), 0) / parsed.length) : 0
  const highRiskDocs = parsed.filter(d => (d.testability || 0) < 60)
  const allRequirements = parsed.flatMap(d => d.aiRequirements || [])
  const allIssues = parsed.flatMap(d => d.aiIssues || [])
  const scoreColor = v => v > 80 ? 'var(--success)' : v > 60 ? 'var(--warning)' : 'var(--danger)'
  const ambColor = v => v < 25 ? 'var(--success)' : v < 40 ? 'var(--warning)' : 'var(--danger)'

  const generateAISummary = async () => {
    if (parsed.length === 0) { toast.warning('No parsed documents yet. Upload and parse documents in Document Hub first.'); return }
    setGenerating(true)
    toast.info('AI is generating project summary...')
    try {
      const context = parsed.map(d => ({
        name: d.name, stories: d.stories, specs: d.specs,
        testability: d.testability, completeness: d.completeness, ambiguity: d.ambiguity,
        summary: d.aiSummary || '',
        requirements: (d.aiRequirements || []).slice(0, 5).map(r => r.title),
        issues: (d.aiIssues || []).slice(0, 3).map(i => i.text),
      }))
      const data = await chatWithAI(
        `You are a senior QA Test Architect. Analyze this project's documents and provide a comprehensive project overview. Return JSON with these fields:
{
  "projectName": "<inferred project name>",
  "executiveSummary": "<3-4 sentence high-level summary>",
  "scope": "<what the project covers>",
  "keyFindings": ["<finding 1>", "<finding 2>", ...],
  "risks": [{"title": "<risk>", "severity": "high|medium|low", "mitigation": "<suggestion>"}],
  "recommendations": ["<recommendation 1>", "<recommendation 2>", ...],
  "testStrategy": "<recommended test approach in 2-3 sentences>",
  "readinessScore": <0-100 overall readiness>,
  "coverageGaps": ["<gap 1>", "<gap 2>", ...]
}
Only return valid JSON.`,
        JSON.stringify(context)
      )
      const reply = data.reply.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      const result = JSON.parse(reply)
      setAiSummary(result)
      toast.success('Project overview generated')
    } catch (err) {
      console.error('AI summary failed:', err)
      toast.error(`AI summary failed: ${err.message}`)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="project-overview">
      {/* Stats Row */}
      <section className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="card stat-card"><div className="stat-value animate-count">{docs.length}</div><div className="stat-label">Documents</div></div>
        <div className="card stat-card"><div className="stat-value animate-count" style={{ color: 'var(--success)' }}>{totalStories}</div><div className="stat-label">User Stories</div></div>
        <div className="card stat-card"><div className="stat-value animate-count" style={{ color: 'var(--warning)' }}>{totalSpecs}</div><div className="stat-label">Tech Specs</div></div>
        <div className="card stat-card"><div className="stat-value animate-count" style={{ color: scoreColor(avgTestability) }}>{avgTestability}%</div><div className="stat-label">Avg Testability</div></div>
      </section>

      {/* Generate Button */}
      <div className="po-generate-row">
        <button className="btn btn-primary btn-lg" onClick={generateAISummary} disabled={generating}>
          {generating ? <><Loader size={16} className="spin" /> Generating...</> : <><Sparkles size={16} /> Generate AI Project Summary</>}
        </button>
        {parsed.length === 0 && <span className="po-hint">Upload documents in Document Hub first</span>}
      </div>

      <div className="po-layout">
        {/* Left: AI Summary */}
        <div className="po-main">
          {aiSummary ? (
            <>
              <section className="card po-summary-card">
                <div className="card-header">
                  <h3 className="card-title"><FolderOpen size={16} /> {aiSummary.projectName || 'Project Summary'}</h3>
                  <div className="po-readiness">
                    <span className="po-readiness-label">Readiness</span>
                    <span className="po-readiness-score" style={{ color: scoreColor(aiSummary.readinessScore || 0) }}>{aiSummary.readinessScore || 0}%</span>
                  </div>
                </div>
                <p className="po-executive">{aiSummary.executiveSummary}</p>
                <div className="po-field"><span className="po-field-label">Scope:</span> {aiSummary.scope}</div>
                <div className="po-field"><span className="po-field-label">Test Strategy:</span> {aiSummary.testStrategy}</div>
              </section>

              <section className="card">
                <div className="card-header"><h3 className="card-title"><Target size={16} /> Key Findings</h3></div>
                <ul className="po-list">{(aiSummary.keyFindings || []).map((f, i) => <li key={i}><CheckCircle size={13} className="text-success" /> {f}</li>)}</ul>
              </section>

              <section className="card">
                <div className="card-header"><h3 className="card-title"><AlertTriangle size={16} /> Risks</h3></div>
                <div className="po-risks">
                  {(aiSummary.risks || []).map((r, i) => (
                    <div key={i} className={`po-risk-item severity-${r.severity}`}>
                      <div className="po-risk-header">
                        <span className="po-risk-title">{r.title}</span>
                        <span className={`badge badge-${r.severity === 'high' ? 'danger' : r.severity === 'medium' ? 'warning' : 'success'}`}>{r.severity}</span>
                      </div>
                      <p className="po-risk-mitigation"><Shield size={12} /> {r.mitigation}</p>
                    </div>
                  ))}
                </div>
              </section>

              {(aiSummary.coverageGaps || []).length > 0 && (
                <section className="card">
                  <div className="card-header"><h3 className="card-title"><Zap size={16} /> Coverage Gaps</h3></div>
                  <ul className="po-list po-gaps">{aiSummary.coverageGaps.map((g, i) => <li key={i}><AlertTriangle size={13} className="text-warning" /> {g}</li>)}</ul>
                </section>
              )}

              <section className="card">
                <div className="card-header"><h3 className="card-title"><Sparkles size={16} /> Recommendations</h3></div>
                <ul className="po-list">{(aiSummary.recommendations || []).map((r, i) => <li key={i}><Sparkles size={13} className="text-accent" /> {r}</li>)}</ul>
              </section>
            </>
          ) : (
            <div className="po-empty-state card">
              <FolderOpen size={48} />
              <h3>No Project Summary Yet</h3>
              <p>Click "Generate AI Project Summary" to create a comprehensive overview based on your uploaded documents and AI analysis.</p>
            </div>
          )}
        </div>

        {/* Right: Document Health */}
        <div className="po-sidebar">
          <section className="card">
            <div className="card-header"><h3 className="card-title"><BarChart3 size={16} /> Quality Scores</h3></div>
            <div className="po-scores">
              <div className="po-score-row">
                <span>Testability</span>
                <div className="po-bar"><div className="po-bar-fill" style={{ width: `${avgTestability}%`, background: scoreColor(avgTestability) }} /></div>
                <span style={{ color: scoreColor(avgTestability) }}>{avgTestability}%</span>
              </div>
              <div className="po-score-row">
                <span>Completeness</span>
                <div className="po-bar"><div className="po-bar-fill" style={{ width: `${avgCompleteness}%`, background: scoreColor(avgCompleteness) }} /></div>
                <span style={{ color: scoreColor(avgCompleteness) }}>{avgCompleteness}%</span>
              </div>
              <div className="po-score-row">
                <span>Ambiguity</span>
                <div className="po-bar"><div className="po-bar-fill" style={{ width: `${avgAmbiguity}%`, background: ambColor(avgAmbiguity) }} /></div>
                <span style={{ color: ambColor(avgAmbiguity) }}>{avgAmbiguity}%</span>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-header"><h3 className="card-title"><FileText size={16} /> Parsed Documents</h3></div>
            <div className="po-doc-list">
              {parsed.length > 0 ? parsed.map(d => (
                <div key={d.id} className="po-doc-item">
                  <div className="po-doc-name">{d.name}</div>
                  <div className="po-doc-meta">
                    <span>{d.stories} stories</span>
                    <span>{d.specs} specs</span>
                    <span style={{ color: scoreColor(d.testability || 0) }}>{d.testability}%</span>
                  </div>
                  {d.aiSummary && <p className="po-doc-summary">{d.aiSummary}</p>}
                </div>
              )) : <p className="po-empty-hint">No parsed documents yet</p>}
            </div>
          </section>

          {allRequirements.length > 0 && (
            <section className="card">
              <div className="card-header"><h3 className="card-title"><Target size={16} /> Extracted Requirements ({allRequirements.length})</h3></div>
              <div className="po-req-list">
                {allRequirements.slice(0, 15).map((r, i) => (
                  <div key={i} className="po-req-item">
                    <span className="po-req-id">{r.id}</span>
                    <span className="po-req-title">{r.title}</span>
                    <span className={`badge badge-${r.risk === 'high' ? 'danger' : r.risk === 'medium' ? 'warning' : 'success'}`}>{r.risk}</span>
                  </div>
                ))}
                {allRequirements.length > 15 && <p className="po-more">+{allRequirements.length - 15} more</p>}
              </div>
            </section>
          )}

          {allIssues.length > 0 && (
            <section className="card">
              <div className="card-header"><h3 className="card-title"><AlertTriangle size={16} /> AI-Detected Issues ({allIssues.length})</h3></div>
              <div className="po-issues-list">
                {allIssues.slice(0, 8).map((iss, i) => (
                  <div key={i} className="po-issue-item">
                    <AlertTriangle size={12} className="text-warning" />
                    <span>{iss.text}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {highRiskDocs.length > 0 && (
            <section className="card">
              <div className="card-header"><h3 className="card-title"><Shield size={16} /> High Risk Documents</h3></div>
              <div className="po-doc-list">
                {highRiskDocs.map(d => (
                  <div key={d.id} className="po-doc-item po-doc-risk">
                    <div className="po-doc-name">{d.name}</div>
                    <span className="badge badge-danger">Testability: {d.testability}%</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
