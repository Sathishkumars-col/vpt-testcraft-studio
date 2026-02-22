import { useState } from 'react'
import { Upload, Sparkles, Target, ChevronRight, X, Zap, FileText, BarChart3 } from 'lucide-react'
import './OnboardingWizard.css'

const STEPS = [
  { title: 'Welcome to VPT TestCraft', icon: Sparkles, desc: 'Your AI-powered test enablement platform. Let\'s get you set up in under a minute.' },
  { title: 'Upload Your First Document', icon: Upload, desc: 'Start by uploading a requirements PDF, Word doc, or connecting a Jira ticket. Our AI will extract user stories and specs automatically.' },
  { title: 'Generate Test Scenarios', icon: Zap, desc: 'Once parsed, the AI generates positive and negative test scenarios with full coverage mapping.' },
  { title: 'Track & Export', icon: Target, desc: 'Review coverage gaps, transform scenarios into test cases, and export to Jira, Azure DevOps, or Excel.' },
]

export default function OnboardingWizard({ user, onClose, onLoadDemo, onNavigate }) {
  const [step, setStep] = useState(0)

  const isLast = step === STEPS.length - 1
  const StepIcon = STEPS[step].icon

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-label="Onboarding wizard">
      <div className="onboarding-card">
        <button className="onboarding-close" onClick={onClose} aria-label="Skip onboarding"><X size={18} /></button>

        <div className="onboarding-progress">
          {STEPS.map((_, i) => (
            <div key={i} className={`onboarding-dot ${i === step ? 'active' : i < step ? 'done' : ''}`} />
          ))}
        </div>

        <div className="onboarding-icon"><StepIcon size={36} /></div>
        <h2>{STEPS[step].title}</h2>
        {step === 0 && <p className="onboarding-greeting">Hey {user?.name || 'there'}, welcome aboard.</p>}
        <p className="onboarding-desc">{STEPS[step].desc}</p>

        {step === 0 && (
          <div className="onboarding-demo">
            <button className="btn btn-secondary onboarding-demo-btn" onClick={() => { onLoadDemo(); onNavigate('documents'); onClose() }}>
              <BarChart3 size={14} /> Load Sample Data (Demo Mode)
            </button>
            <span className="onboarding-demo-hint">See a 71% coverage heatmap without uploading anything</span>
          </div>
        )}

        <div className="onboarding-actions">
          {step > 0 && <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>Back</button>}
          {isLast ? (
            <button className="btn btn-primary onboarding-start" onClick={() => { onNavigate('documents'); onClose() }}>
              Get Started <ChevronRight size={16} />
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}>
              Next <ChevronRight size={14} />
            </button>
          )}
        </div>

        <button className="onboarding-skip" onClick={onClose}>Skip setup →</button>
      </div>
    </div>
  )
}
