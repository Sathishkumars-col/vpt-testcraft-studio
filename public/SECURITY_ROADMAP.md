# VPT TestCraft Studio — Security Roadmap

## What's Implemented (Client-Side, v2.4.0)

### ✅ Input Sanitization
- `src/utils/sanitize.js` — `stripHtml`, `escapeHtml`, `sanitizeTag`, `sanitizeComment`, `sanitizeUrl`, `sanitizeJiraId`
- Applied to: DocumentHub (tags, URLs, Jira IDs), ReviewDashboard (annotations), TransformationStudio (comments)

### ✅ Safe localStorage Reads
- `src/utils/safeStorage.js` — `safeGetJSON`, `safeGetUser`
- Validates JSON structure, sanitizes shape, prevents corrupted data crashes

### ✅ Content Security Policy (CSP)
- Meta tag in `index.html` with:
  - `default-src 'self'` — only load resources from same origin
  - `script-src 'self'` — no inline scripts, no eval
  - `style-src 'self' 'unsafe-inline'` — needed for React inline styles
  - `frame-ancestors 'none'` — prevents clickjacking
  - `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`

### ✅ Client-Side Auth Hardening
- Authorized user list with strict 3-field matching
- `safeGetUser()` validates localStorage shape before trusting it

---

## What Requires a Backend

### 🔒 Server-Side Authentication

**Current problem:** Auth is client-side only. Anyone can set `localStorage['vpt-user']` to bypass login.

**Solution architecture:**

```
Browser → Charter SSO (SAML/OIDC) → Backend API → JWT token → Browser
                                         ↓
                                   Validate against
                                   AUTHORIZED_USERS DB
```

**Step-by-step implementation:**

#### Step 1: Set up a lightweight backend (Node.js + Express)

```bash
mkdir vpt-api && cd vpt-api
npm init -y
npm install express jsonwebtoken cors helmet express-rate-limit cookie-parser
```

#### Step 2: Create the auth endpoint

```js
// vpt-api/server.js
const express = require('express');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const app = express();
app.use(helmet());
app.use(cors({ origin: 'https://spectrum.testenablement.info', credentials: true }));
app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET; // Must be env var, never hardcoded
const TOKEN_EXPIRY = '8h';

const AUTHORIZED_USERS = [
  { name: 'sathishkumar', email: '[email]', role: 'Test Architect' },
  { name: 'senthil', email: '[email]', role: 'Manager' },
  { name: 'debbie', email: '[email]', role: 'Manager' },
  { name: 'shri', email: '[email]', role: 'Manager' },
];

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { name, email, role } = req.body;
  if (!name || !email || !role) return res.status(400).json({ error: 'Missing fields' });

  const user = AUTHORIZED_USERS.find(
    u => u.name === name.toLowerCase().trim()
      && u.email === email.toLowerCase().trim()
      && u.role === role
  );

  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const token = jwt.sign({ name: user.name, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });

  // Set as httpOnly cookie (not accessible via JS — prevents XSS token theft)
  res.cookie('vpt_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  });

  return res.json({ user: { name: user.name, email: user.email, role: user.role } });
});

// GET /api/auth/me — validate token and return user
app.get('/api/auth/me', (req, res) => {
  const token = req.cookies.vpt_token;
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.json({ user: { name: decoded.name, email: decoded.email, role: decoded.role } });
  } catch {
    res.clearCookie('vpt_token');
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('vpt_token');
  return res.json({ ok: true });
});

app.listen(3001, () => console.log('VPT API on :3001'));
```

#### Step 3: Update the React frontend

Replace the client-side auth in `LoginScreen.jsx`:

```jsx
// Instead of checking against a local array:
const handleLogin = async (name, email, role) => {
  const res = await fetch('https://api.testenablement.info/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // sends cookies
    body: JSON.stringify({ name, email, role }),
  });
  if (!res.ok) throw new Error('Unauthorized');
  const { user } = await res.json();
  return user; // token is in httpOnly cookie, not accessible to JS
};
```

Add a session check on app load in `App.jsx`:

```jsx
useEffect(() => {
  fetch('https://api.testenablement.info/api/auth/me', { credentials: 'include' })
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(({ user }) => setUser(user))
    .catch(() => setUser(null));
}, []);
```

#### Step 4: Deploy the backend

Options (in order of simplicity):
1. **AWS Lambda + API Gateway** — serverless, zero maintenance
2. **AWS App Runner** — container-based, auto-scaling
3. **EC2 behind ALB** — traditional, full control

---

### 🛡️ Rate Limiting

Already included in the backend starter above via `express-rate-limit`. Add this before your routes:

```js
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, try again later' },
});

// Apply to auth routes (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // only 10 login attempts per 15 min
  message: { error: 'Too many login attempts' },
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
```

---

## Priority Order

| Priority | Item | Status | Effort |
|----------|------|--------|--------|
| 1 | Input sanitization | ✅ Done | Low |
| 2 | CSP headers | ✅ Done | Low |
| 3 | Safe localStorage | ✅ Done | Low |
| 4 | Server-side auth | 📋 Guide ready | Medium |
| 5 | Rate limiting | 📋 Guide ready | Low (with backend) |
