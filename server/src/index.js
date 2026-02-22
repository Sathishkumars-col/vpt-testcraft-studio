import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import multer from 'multer'
import dotenv from 'dotenv'
import { askBedrock, parseAIJson } from './bedrock.js'
import {
  ANALYZE_DOC_SYSTEM, analyzeDocPrompt,
  GENERATE_SCENARIOS_SYSTEM, generateScenariosPrompt,
  GENERATE_TESTCASES_SYSTEM, generateTestCasesPrompt,
  DETECT_CONFLICTS_SYSTEM, detectConflictsPrompt,
  CHAT_SYSTEM,
} from './prompts.js'
import { extractText } from './extract.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json({ limit: '5mb' }))

// Rate limiting — 60 AI requests per 15 min per IP
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Too many AI requests, try again later' },
})
app.use('/api/ai/', aiLimiter)

// ── Health ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', ai: true, model: process.env.BEDROCK_MODEL_ID })
})

// ── POST /api/ai/analyze-document ──
// Upload a file → extract text → AI analyzes it
app.post('/api/ai/analyze-document', upload.single('file'), async (req, res) => {
  try {
    let text = ''
    let fileName = 'document'

    if (req.file) {
      fileName = req.file.originalname
      text = await extractText(req.file.buffer, req.file.originalname)
    } else if (req.body.text) {
      text = req.body.text
      fileName = req.body.fileName || 'document'
    } else {
      return res.status(400).json({ error: 'No file or text provided' })
    }

    if (!text || text.trim().length < 50) {
      return res.status(400).json({ error: 'Document text too short to analyze (min 50 chars)' })
    }

    const prompt = analyzeDocPrompt(text, fileName)
    const raw = await askBedrock(ANALYZE_DOC_SYSTEM, prompt)
    const analysis = parseAIJson(raw)

    return res.json({ analysis, textLength: text.length })
  } catch (err) {
    console.error('Analyze document error:', err)
    return res.status(500).json({ error: err.message || 'AI analysis failed' })
  }
})

// ── POST /api/ai/analyze-text ──
// Send raw text (for URL/Jira imports) → AI analyzes it
app.post('/api/ai/analyze-text', async (req, res) => {
  try {
    const { text, fileName } = req.body
    if (!text || text.trim().length < 50) {
      return res.status(400).json({ error: 'Text too short to analyze' })
    }

    const prompt = analyzeDocPrompt(text, fileName || 'document')
    const raw = await askBedrock(ANALYZE_DOC_SYSTEM, prompt)
    const analysis = parseAIJson(raw)

    return res.json({ analysis })
  } catch (err) {
    console.error('Analyze text error:', err)
    return res.status(500).json({ error: err.message || 'AI analysis failed' })
  }
})

// ── POST /api/ai/generate-scenarios ──
app.post('/api/ai/generate-scenarios', async (req, res) => {
  try {
    const { requirements } = req.body
    if (!requirements || !requirements.length) {
      return res.status(400).json({ error: 'No requirements provided' })
    }

    const prompt = generateScenariosPrompt(requirements)
    const raw = await askBedrock(GENERATE_SCENARIOS_SYSTEM, prompt)
    const result = parseAIJson(raw)

    return res.json(result)
  } catch (err) {
    console.error('Generate scenarios error:', err)
    return res.status(500).json({ error: err.message || 'Scenario generation failed' })
  }
})

// ── POST /api/ai/generate-testcases ──
app.post('/api/ai/generate-testcases', async (req, res) => {
  try {
    const { scenario } = req.body
    if (!scenario) {
      return res.status(400).json({ error: 'No scenario provided' })
    }

    const prompt = generateTestCasesPrompt(scenario)
    const raw = await askBedrock(GENERATE_TESTCASES_SYSTEM, prompt)
    const result = parseAIJson(raw)

    return res.json(result)
  } catch (err) {
    console.error('Generate test cases error:', err)
    return res.status(500).json({ error: err.message || 'Test case generation failed' })
  }
})

// ── POST /api/ai/detect-conflicts ──
app.post('/api/ai/detect-conflicts', async (req, res) => {
  try {
    const { requirements } = req.body
    if (!requirements || !requirements.length) {
      return res.status(400).json({ error: 'No requirements provided' })
    }

    const prompt = detectConflictsPrompt(requirements)
    const raw = await askBedrock(DETECT_CONFLICTS_SYSTEM, prompt)
    const result = parseAIJson(raw)

    return res.json(result)
  } catch (err) {
    console.error('Detect conflicts error:', err)
    return res.status(500).json({ error: err.message || 'Conflict detection failed' })
  }
})

// ── POST /api/ai/chat ──
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, context } = req.body
    if (!message) {
      return res.status(400).json({ error: 'No message provided' })
    }

    const userMsg = context
      ? `Context about the current project:\n${context}\n\nUser question: ${message}`
      : message

    const reply = await askBedrock(CHAT_SYSTEM, userMsg, 2048)
    return res.json({ reply })
  } catch (err) {
    console.error('Chat error:', err)
    return res.status(500).json({ error: err.message || 'Chat failed' })
  }
})

// ── 404 ──
app.use((req, res) => res.status(404).json({ error: 'Not found' }))

// ── Error handler ──
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`\n🚀 VPT TestCraft AI Server on http://localhost:${PORT}`)
  console.log(`   Model: ${process.env.BEDROCK_MODEL_ID}`)
  console.log(`   Region: ${process.env.AWS_REGION}\n`)
})
