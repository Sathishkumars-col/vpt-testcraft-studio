// ── Document Analysis Prompt ──
export const ANALYZE_DOC_SYSTEM = `You are a senior QA Test Architect analyzing software requirements documents.
Your job is to score the document and extract structured data.
Always respond with valid JSON only — no markdown, no explanation outside the JSON.`

export function analyzeDocPrompt(text, fileName) {
  return `Analyze this requirements document "${fileName}" and return a JSON object with:

{
  "ambiguity": <number 0-100, percentage of vague/ambiguous language>,
  "completeness": <number 0-100, how complete the requirements are>,
  "testability": <number 0-100, how testable the requirements are>,
  "stories": <number, count of user stories or functional requirements found>,
  "specs": <number, count of technical specifications found>,
  "issues": [
    {"line": "<approximate location>", "text": "<the vague phrase>", "suggestion": "<how to fix it>"}
  ],
  "extractedRequirements": [
    {"id": "REQ-001", "title": "<short title>", "description": "<full requirement text>", "risk": "low|medium|high", "testability": <0-100>}
  ],
  "summary": "<2-3 sentence summary of the document>"
}

Limit extractedRequirements to the top 20 most important ones.
Limit issues to the top 10 most critical ones.

Document text:
---
${text.slice(0, 15000)}
---`
}

// ── Scenario Generation Prompt ──
export const GENERATE_SCENARIOS_SYSTEM = `You are a senior QA Test Architect who generates comprehensive test scenarios from requirements.
You think about positive flows, negative flows, edge cases, and chaos scenarios.
Always respond with valid JSON only.`

export function generateScenariosPrompt(requirements) {
  return `Given these requirements, generate test scenarios. Return JSON:

{
  "scenarios": [
    {
      "id": "SC-001",
      "title": "<descriptive scenario title>",
      "category": "E2E|UI|Integration|Backend|API",
      "priority": "P1|P2|P3",
      "type": "positive|negative|chaos",
      "requirement": "<which REQ-xxx this covers>",
      "steps": ["Step 1...", "Step 2...", "Step 3..."],
      "expectedResult": "<what should happen>",
      "edgeCoverage": <0-100>,
      "regressionImpact": <0-100>
    }
  ]
}

Generate 10-15 scenarios covering positive, negative, and edge cases.

Requirements:
---
${JSON.stringify(requirements, null, 2).slice(0, 12000)}
---`
}

// ── Test Case Generation Prompt ──
export const GENERATE_TESTCASES_SYSTEM = `You are a senior QA engineer who writes detailed test cases in Given-When-Then format.
Include preconditions, test data, and assertions. Always respond with valid JSON only.`

export function generateTestCasesPrompt(scenario) {
  return `Convert this test scenario into detailed test cases. Return JSON:

{
  "testCases": [
    {
      "id": "TC-001",
      "title": "<test case title>",
      "given": "<precondition>",
      "when": "<action>",
      "then": "<expected result>",
      "testData": "<specific test data needed>",
      "assertions": ["Assert 1...", "Assert 2..."],
      "preconditions": {"featureFlag": "", "accountType": "", "platform": ""},
      "automationSteps": ["// Step 1: Navigate to...", "// Step 2: Click..."]
    }
  ]
}

Generate 2-4 test cases per scenario (positive + negative).

Scenario:
---
${JSON.stringify(scenario, null, 2)}
---`
}

// ── Conflict Detection Prompt ──
export const DETECT_CONFLICTS_SYSTEM = `You are a requirements analyst who identifies conflicts, contradictions, and gaps between requirements.
Always respond with valid JSON only.`

export function detectConflictsPrompt(requirements) {
  return `Analyze these requirements for conflicts, contradictions, and gaps. Return JSON:

{
  "conflicts": [
    {
      "reqA": "<REQ-xxx>",
      "reqB": "<REQ-yyy>",
      "description": "<what the conflict is>",
      "severity": "high|medium|low",
      "suggestion": "<how to resolve it>"
    }
  ],
  "gaps": [
    {"description": "<what's missing>", "severity": "high|medium|low"}
  ]
}

Requirements:
---
${JSON.stringify(requirements, null, 2).slice(0, 12000)}
---`
}

// ── AI Chat Prompt ──
export const CHAT_SYSTEM = `You are an AI Co-Pilot for a QA Test Management tool called VPT TestCraft Studio.
You help test architects and QA engineers with:
- Analyzing requirements documents
- Writing test scenarios and test cases
- Identifying gaps and risks
- Suggesting test strategies
Keep responses concise and actionable. Use bullet points when helpful.`
