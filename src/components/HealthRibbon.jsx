import { Target, AlertTriangle, Copy, Clock, GitBranch, FileText } from 'lucide-react'
import './HealthRibbon.css'

export default function HealthRibbon({ data }) {
  const coverage = data?.coverage || 0
  const gaps = data?.gaps || 0
  const errors = data?.errors || 0
  const docs = data?.docs || 0
  const coverageColor = coverage > 80 ? 'var(--success)' : coverage > 60 ? 'var(--warning)' : 'var(--danger)'

  return (
    <div className="health-ribbon" role="status" aria-label="Project health overview">
      <div className="ribbon-item" title="Average testability across parsed documents">
        <Target size={13} aria-hidden="true" />
        <span className="ribbon-label">Testability</span>
        <span className="ribbon-value" style={{ color: coverageColor }}>{coverage}%</span>
        <div className="ribbon-minibar"><div className="ribbon-minifill" style={{ width: `${coverage}%`, background: coverageColor }} /></div>
      </div>
      <div className="ribbon-divider" />
      <div className="ribbon-item" title="Documents with high ambiguity (>30%)">
        <AlertTriangle size={13} aria-hidden="true" />
        <span className="ribbon-label">High Ambiguity</span>
        <span className="ribbon-value danger-val">{gaps}</span>
      </div>
      <div className="ribbon-divider" />
      <div className="ribbon-item" title="Documents with parse errors">
        <Copy size={13} aria-hidden="true" />
        <span className="ribbon-label">Errors</span>
        <span className="ribbon-value warning-val">{errors}</span>
      </div>
      <div className="ribbon-divider" />
      <div className="ribbon-item" title="Total ingested documents">
        <FileText size={13} aria-hidden="true" />
        <span className="ribbon-label">Documents</span>
        <span className="ribbon-value accent-val">{docs}</span>
      </div>
      <div className="ribbon-divider" />
      <div className="ribbon-item" title="Current sprint version">
        <GitBranch size={13} aria-hidden="true" />
        <span className="ribbon-label">Version</span>
        <span className="ribbon-value accent-val">v2.4.0</span>
      </div>
    </div>
  )
}
