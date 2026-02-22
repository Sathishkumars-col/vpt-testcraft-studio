// VPT TestCraft Studio — AI API Client
// Talks to the Express backend which calls Amazon Bedrock

const AI_BASE = import.meta.env.VITE_AI_URL || '/api/ai'

async function aiRequest(path, options = {}) {
  const res = await fetch(`${AI_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(body.error || `HTTP ${res.status}`)
  }

  return res.json()
}

// Analyze an uploaded file
export async function analyzeDocument(file) {
  const formData = new FormData()
  formData.append('file', file)
  return aiRequest('/analyze-document', { method: 'POST', body: formData })
}

// Analyze raw text (for URL/Jira imports)
export async function analyzeText(text, fileName) {
  return aiRequest('/analyze-text', {
    method: 'POST',
    body: JSON.stringify({ text, fileName }),
  })
}

// Generate test scenarios from requirements
export async function generateScenarios(requirements) {
  return aiRequest('/generate-scenarios', {
    method: 'POST',
    body: JSON.stringify({ requirements }),
  })
}

// Generate test cases from a scenario
export async function generateTestCases(scenario) {
  return aiRequest('/generate-testcases', {
    method: 'POST',
    body: JSON.stringify({ scenario }),
  })
}

// Detect conflicts between requirements
export async function detectConflicts(requirements) {
  return aiRequest('/detect-conflicts', {
    method: 'POST',
    body: JSON.stringify({ requirements }),
  })
}

// AI Chat
export async function chatWithAI(message, context) {
  return aiRequest('/chat', {
    method: 'POST',
    body: JSON.stringify({ message, context }),
  })
}

// Health check
export async function aiHealth() {
  return aiRequest('/../health')
}
