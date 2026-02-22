import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import dotenv from 'dotenv'
dotenv.config()

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-haiku-4-5-20251001-v1:0'

function isClaude(modelId) {
  return modelId.includes('anthropic') || modelId.includes('claude')
}

function isTitan(modelId) {
  return modelId.includes('titan')
}

export async function askBedrock(systemPrompt, userMessage, maxTokens = 4096) {
  let body

  if (isClaude(MODEL_ID)) {
    // Anthropic Claude format
    body = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })
  } else if (isTitan(MODEL_ID)) {
    // Amazon Titan format
    body = JSON.stringify({
      inputText: `${systemPrompt}\n\nUser: ${userMessage}`,
      textGenerationConfig: {
        maxTokenCount: maxTokens,
        temperature: 0.3,
        topP: 0.9,
      },
    })
  } else {
    // Generic fallback (Meta Llama, etc.)
    body = JSON.stringify({
      prompt: `${systemPrompt}\n\nUser: ${userMessage}\n\nAssistant:`,
      max_gen_len: maxTokens,
      temperature: 0.3,
    })
  }

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body,
  })

  const response = await client.send(command)
  const result = JSON.parse(new TextDecoder().decode(response.body))

  // Extract text based on model response format
  if (isClaude(MODEL_ID)) {
    return result.content[0].text
  } else if (isTitan(MODEL_ID)) {
    return result.results[0].outputText
  } else {
    return result.generation || result.output || JSON.stringify(result)
  }
}

// Parse JSON from AI response (handles markdown code blocks)
export function parseAIJson(text) {
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  return JSON.parse(cleaned)
}
