import { useState } from 'react'
import { Sun, Moon, User, Shield, ChevronRight, Mail } from 'lucide-react'
import './LoginScreen.css'

const ROLES = ['Manager', 'Test Architect', 'Dev Tester', 'QA']

const AUTHORIZED_USERS = [
  { name: 'sathishkumar', email: 'sathishkumar.sivalingam@charter.com', role: 'Test Architect' },
  { name: 'senthil', email: 'senthil.kanna@charter.com', role: 'Manager' },
  { name: 'debbie', email: 'debbie.fox@charter.com', role: 'Manager' },
  { name: 'shri', email: 'shrilata.kallurkarvenkatesh@charter.com', role: 'Manager' },
]

function isAuthorizedUser(name, email, role) {
  return AUTHORIZED_USERS.some(
    u => u.name === name.trim().toLowerCase()
      && u.email === email.trim().toLowerCase()
      && u.role === role
  )
}

export default function LoginScreen({ onLogin, theme, onCycleTheme }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('QA')
  const [nameError, setNameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [authError, setAuthError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setNameError('')
    setEmailError('')
    setAuthError('')

    if (!name.trim()) { setNameError('Please enter your name'); return }
    if (!email.trim()) { setEmailError('Please enter your email'); return }
    if (!isAuthorizedUser(name, email, role)) {
      setAuthError('You are not authorized to access the studio. Please verify your Name, Email ID, and Role.')
      return
    }

    onLogin({ name: name.trim(), email: email.trim().toLowerCase(), role })
  }

  return (
    <div className="login-screen" data-theme={theme}>
      <div className="login-bg-pattern" aria-hidden="true" />
      <button className="login-theme-toggle" onClick={onCycleTheme} aria-label="Cycle theme" title={`Theme: ${theme}`}>
        {theme === 'light' ? <Moon size={18} /> : theme === 'high-contrast' ? <Sun size={18} /> : <Sun size={18} />}
        <span className="login-theme-label">{theme === 'high-contrast' ? 'HC' : theme === 'light' ? 'Light' : 'Dark'}</span>
      </button>

      <div className="login-card">
        <div className="login-brand">
          <img src={import.meta.env.BASE_URL + 'spectrum-logo.svg'} alt="Spectrum" className="login-spectrum-logo" />
          <h1>VPT TestCraft Studio</h1>
          <p className="login-tagline">Craft Tests with Intelligence</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="login-name"><User size={14} /> Name</label>
            <input
              id="login-name"
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setNameError(''); setAuthError('') }}
              placeholder="Enter your name"
              autoFocus
            />
            {nameError && <span className="login-error">{nameError}</span>}
          </div>

          <div className="login-field">
            <label htmlFor="login-email"><Mail size={14} /> Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setEmailError(''); setAuthError('') }}
              placeholder="yourname@charter.com"
            />
            {emailError && <span className="login-error">{emailError}</span>}
            <span className="login-hint">Only active/approved @charter.com emails are accepted</span>
          </div>

          <div className="login-field">
            <label><Shield size={14} /> Role</label>
            <div className="role-selector">
              {ROLES.map(r => (
                <button
                  key={r}
                  type="button"
                  className={`role-option ${role === r ? 'active' : ''}`}
                  onClick={() => { setRole(r); setAuthError('') }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="login-submit">
            Enter Studio <ChevronRight size={16} />
          </button>

          {authError && (
            <div className="login-auth-error">
              <Shield size={16} />
              <span>{authError}</span>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
