import {
  FileText, ClipboardCheck, Zap, Download, Wrench, BarChart3,
  ArrowRight, Sparkles, Shield, Rocket, Target, Layers, FolderOpen, Search
} from 'lucide-react'
import './Home.css'

const FEATURES = [
  { icon: FileText, title: 'Document Hub', desc: 'Ingest requirements from PDF, Word, Confluence, and Jira. AI parses and extracts user stories and specs automatically.', page: 'documents', color: '#6366f1' },
  { icon: FolderOpen, title: 'Project Overview', desc: 'AI-generated project summary with scope, risks, readiness score, and coverage gaps from uploaded documents.', page: 'overview', color: '#14b8a6' },
  { icon: ClipboardCheck, title: 'Review Dashboard', desc: 'Review AI-extracted requirements, identify coverage gaps, and approve or flag items with inline annotations.', page: 'review', color: '#10b981' },
  { icon: Zap, title: 'Scenario Generator', desc: 'Generate positive, negative, and edge-case test scenarios powered by AI with dependency mapping.', page: 'scenarios', color: '#f59e0b' },
  { icon: Wrench, title: 'Transformation Studio', desc: 'Transform scenarios into structured test cases in VPT Standard format with AI enhancement.', page: 'transform', color: '#a855f7' },
  { icon: Download, title: 'Export Engine', desc: 'Export test cases to Excel, CSV, Jira, or automation frameworks with field mapping and scheduling.', page: 'export', color: '#3b82f6' },
  { icon: Search, title: 'Test Analysis', desc: 'AI-powered gap analysis comparing test cases against requirements, plus duplicate test detection.', page: 'testanalysis', color: '#f97316' },
  { icon: BarChart3, title: 'Analytics & Insights', desc: 'Track coverage trends, defect predictions, test efficiency scores, and CI/CD integration status.', page: 'analytics', color: '#ef4444' },
]

function getHomeStats() {
  const docs = JSON.parse(localStorage.getItem('vpt-docs') || '[]')
  const parsedDocs = docs.filter(d => d.status === 'parsed')
  const avgTestability = parsedDocs.length > 0
    ? Math.round(parsedDocs.reduce((s, d) => s + (d.testability || 0), 0) / parsedDocs.length)
    : 0
  return {
    testability: avgTestability,
    modules: FEATURES.length,
  }
}

export default function Home({ onNavigate, user }) {
  const stats = getHomeStats()

  const STATS = [
    { value: `${stats.testability}%`, label: 'Avg Testability', icon: Rocket },
    { value: `${stats.modules}`, label: 'Integrated Modules', icon: Layers },
    { value: 'AI', label: 'Powered Intelligence', icon: Sparkles },
    { value: '✓', label: 'All Systems Active', icon: Target },
  ]
  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="home-hero">
        <div className="hero-content">
          <div className="hero-badge"><Shield size={14} /> Spectrum Test Enablement</div>
          <h1 className="hero-title">
            Welcome to <span className="hero-gradient">VPT TestCraft Studio</span>
          </h1>
          <p className="hero-subtitle">
            An AI-powered test enablement platform that transforms requirements into comprehensive,
            structured test cases — from ingestion to export, all in one place.
          </p>
          {user && <p className="hero-greeting">Hello, {user.name} 👋</p>}
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={() => onNavigate('documents')}>
              <FileText size={18} /> Start with Documents <ArrowRight size={16} />
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => onNavigate('scenarios')}>
              <Zap size={18} /> Generate Scenarios
            </button>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-flow">
            <div className="flow-node flow-n1"><FileText size={24} /><span>Ingest</span></div>
            <div className="flow-arrow">→</div>
            <div className="flow-node flow-n2"><ClipboardCheck size={24} /><span>Review</span></div>
            <div className="flow-arrow">→</div>
            <div className="flow-node flow-n3"><Zap size={24} /><span>Generate</span></div>
            <div className="flow-arrow">→</div>
            <div className="flow-node flow-n4"><Wrench size={24} /><span>Transform</span></div>
            <div className="flow-arrow">→</div>
            <div className="flow-node flow-n5"><Download size={24} /><span>Export</span></div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="home-stats">
        {STATS.map((s, i) => {
          const Icon = s.icon
          return (
            <div key={i} className="home-stat-card">
              <Icon size={22} className="home-stat-icon" />
              <div className="home-stat-value">{s.value}</div>
              <div className="home-stat-label">{s.label}</div>
            </div>
          )
        })}
      </section>

      {/* Feature Cards */}
      <section className="home-features">
        <h2 className="home-section-title">Platform Modules</h2>
        <p className="home-section-desc">Click any module to get started</p>
        <div className="features-grid">
          {FEATURES.map(f => {
            const Icon = f.icon
            return (
              <button key={f.page} className="feature-card" onClick={() => onNavigate(f.page)}>
                <div className="feature-icon-wrap" style={{ background: f.color + '18', color: f.color }}>
                  <Icon size={24} />
                </div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
                <span className="feature-link">Open <ArrowRight size={14} /></span>
              </button>
            )
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="home-workflow">
        <h2 className="home-section-title">How It Works</h2>
        <div className="workflow-steps">
          {[
            { step: '1', title: 'Upload Requirements', desc: 'Drop PDFs, Word docs, or connect Jira/Confluence' },
            { step: '2', title: 'AI Parses & Reviews', desc: 'Extracts stories, detects gaps, scores quality' },
            { step: '3', title: 'Generate Scenarios', desc: 'AI creates positive, negative & edge cases' },
            { step: '4', title: 'Transform & Export', desc: 'VPT Standard format, ready for execution' },
            { step: '5', title: 'Analyze & Optimize', desc: 'Find coverage gaps and duplicate tests with AI' },
          ].map((w, i) => (
            <div key={i} className="workflow-step">
              <div className="step-number">{w.step}</div>
              <h4>{w.title}</h4>
              <p>{w.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
