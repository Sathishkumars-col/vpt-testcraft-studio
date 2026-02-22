import { useState, useRef, useEffect } from 'react'
import { X, Send, Bot, User, Loader, Sparkles } from 'lucide-react'
import { chatWithAI } from '../utils/ai'
import './AICoPilot.css'

export default function AICoPilot({ open, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hey! I\'m your AI Co-Pilot. Ask me anything about your requirements, test scenarios, or test strategy.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEnd = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const msg = input.trim()
    if (!msg || loading) return

    setMessages(prev => [...prev, { role: 'user', text: msg }])
    setInput('')
    setLoading(true)

    try {
      // Gather context from localStorage docs
      const docs = JSON.parse(localStorage.getItem('vpt-docs') || '[]')
      const context = docs.length > 0
        ? `User has ${docs.length} documents ingested. Parsed docs: ${docs.filter(d => d.status === 'parsed').map(d => d.name).join(', ')}`
        : 'No documents ingested yet.'

      const data = await chatWithAI(msg, context)
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: `Sorry, I couldn't process that. ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="copilot-overlay" onClick={onClose}>
      <div className="copilot-panel" onClick={e => e.stopPropagation()}>
        <div className="copilot-header">
          <div className="copilot-title"><Sparkles size={16} /> AI Co-Pilot</div>
          <button className="copilot-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="copilot-messages">
          {messages.map((m, i) => (
            <div key={i} className={`copilot-msg copilot-msg-${m.role}`}>
              <div className="copilot-msg-icon">
                {m.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
              </div>
              <div className="copilot-msg-text">{m.text}</div>
            </div>
          ))}
          {loading && (
            <div className="copilot-msg copilot-msg-assistant">
              <div className="copilot-msg-icon"><Bot size={16} /></div>
              <div className="copilot-msg-text copilot-typing"><Loader size={14} className="spin" /> Thinking...</div>
            </div>
          )}
          <div ref={messagesEnd} />
        </div>

        <div className="copilot-input-area">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask about requirements, scenarios, test strategy..."
            disabled={loading}
          />
          <button onClick={handleSend} disabled={loading || !input.trim()} aria-label="Send">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
