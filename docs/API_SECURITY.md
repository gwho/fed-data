# API Security Implementation Guide

This document explains the security measures implemented to protect the FRED API key and outlines best practices for API security in Next.js applications.

## Table of Contents

1. [The Problem: Exposed API Keys](#the-problem-exposed-api-keys)
2. [The Solution: Backend API Proxy](#the-solution-backend-api-proxy)
3. [Implementation Details](#implementation-details)
4. [Security Features](#security-features)
5. [Configuration Guide](#configuration-guide)
6. [Best Practices](#best-practices)
7. [Further Learning](#further-learning)

---

## The Problem: Exposed API Keys

### What Was Wrong?

Previously, the FRED API key was stored as `NEXT_PUBLIC_FRED_API_KEY`. In Next.js, any environment variable prefixed with `NEXT_PUBLIC_` gets bundled into the client-side JavaScript, making it visible to anyone who:

- Views the page source
- Opens browser developer tools (Network tab)
- Inspects the JavaScript bundle

```javascript
// BAD: This key is visible in the browser!
const API_KEY = process.env.NEXT_PUBLIC_FRED_API_KEY;

fetch(`https://api.stlouisfed.org/fred/...?api_key=${API_KEY}`);
```

### Why Is This a Security Risk?

1. **API Abuse**: Attackers can use your key to make unlimited requests
2. **Rate Limit Exhaustion**: Your quota gets consumed by unauthorized users
3. **Cost Implications**: For paid APIs, you could incur unexpected charges
4. **Data Scraping**: Attackers can harvest data using your credentials
5. **Key Revocation**: If detected, the API provider may revoke your key

---

## The Solution: Backend API Proxy

### Architecture Overview

Instead of calling the FRED API directly from the browser, we route all requests through our own backend API:

```
┌──────────────────────────────────────────────────────────────────┐
│                         BEFORE (Insecure)                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐    NEXT_PUBLIC_FRED_API_KEY    ┌──────────────┐  │
│   │  Browser │ ─────────────────────────────→ │   FRED API   │  │
│   │ (Client) │      (Key visible in JS)       │              │  │
│   └──────────┘                                └──────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                         AFTER (Secure)                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐              ┌─────────────┐              ┌─────┐│
│   │  Browser │   No key     │  /api/fred  │  FRED_API_KEY│FRED ││
│   │ (Client) │ ───────────→ │  (Server)   │ ───────────→ │ API ││
│   └──────────┘              └─────────────┘   (Hidden)   └─────┘│
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### How It Works

1. **Client Request**: Browser calls `/api/fred?series=FEDFUNDS`
2. **Server Processing**: Next.js API route receives the request
3. **Key Injection**: Server adds the API key (stored securely)
4. **External Call**: Server calls FRED API with the key
5. **Response**: Data is returned to the client (without the key)

---

## Implementation Details

### Files Structure

```
app/
├── api/
│   └── fred/
│       └── route.ts    # Backend proxy endpoint
├── lib/
│   ├── fredApi.ts      # Updated to use proxy on client
│   └── fredCache.ts    # Caching layer (unchanged)
```

### Key Code Components

#### 1. Backend Proxy (`app/api/fred/route.ts`)

```typescript
// Server-side only - key never reaches the browser
const FRED_API_KEY = process.env.FRED_API_KEY || '';

export async function GET(request: NextRequest) {
  const seriesId = request.nextUrl.searchParams.get('series');

  // Add API key server-side
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: FRED_API_KEY,  // Secure!
    file_type: 'json',
  });

  const response = await fetch(`${FRED_API_BASE}/series/observations?${params}`);
  // ... return data without exposing the key
}
```

#### 2. Client Integration (`app/lib/fredApi.ts`)

```typescript
// Detects environment and uses appropriate method
export async function getFredSeries(seriesId: string): Promise<FredSeriesData[]> {
  if (typeof window !== 'undefined') {
    // Client-side: use proxy (no API key exposed)
    return getFredSeriesViaProxy(seriesId);
  }
  // Server-side: direct call (key is safe)
  return getFredSeriesDirectly(seriesId);
}
```

---

## Security Features

### 1. Series Whitelist

Only pre-approved FRED series can be requested:

```typescript
const ALLOWED_SERIES = new Set([
  'CPIAUCSL', 'UNRATE', 'FEDFUNDS', 'GS10', // ... etc
]);

if (!ALLOWED_SERIES.has(seriesId)) {
  return NextResponse.json({ error: 'Series not allowed' }, { status: 403 });
}
```

**Why?** Prevents attackers from using your API as a general FRED proxy.

### 2. Rate Limiting

Limits requests per IP address:

```typescript
const RATE_LIMIT_MAX_REQUESTS = 30;  // per minute
const RATE_LIMIT_WINDOW_MS = 60000;  // 1 minute

if (requestCount >= RATE_LIMIT_MAX_REQUESTS) {
  return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
}
```

**Why?** Prevents abuse and protects your FRED API quota.

### 3. Input Validation

All parameters are validated before processing:

```typescript
if (!seriesId) {
  return NextResponse.json({ error: 'Missing series parameter' }, { status: 400 });
}
```

**Why?** Prevents injection attacks and malformed requests.

### 4. Error Handling

Errors are logged server-side but generic messages are returned to clients:

```typescript
catch (error) {
  console.error('Error in FRED API proxy:', error);  // Server log
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
```

**Why?** Prevents information leakage that could help attackers.

---

## Configuration Guide

### Environment Variables

#### Development (`.env.local`)

```bash
# Server-side only (recommended)
FRED_API_KEY=your_actual_api_key_here

# Legacy (deprecated, still works for backward compatibility)
NEXT_PUBLIC_FRED_API_KEY=your_actual_api_key_here
```

#### Production (Vercel/Hosting Provider)

Set `FRED_API_KEY` in your hosting provider's environment variables:

- **Vercel**: Project Settings → Environment Variables
- **Netlify**: Site Settings → Environment Variables
- **Railway**: Variables tab in your service

### Getting a FRED API Key

1. Visit [FRED API Registration](https://fred.stlouisfed.org/docs/api/api_key.html)
2. Create a free account
3. Request an API key (instant approval)
4. Add to your environment variables

---

## Best Practices

### Do's ✅

1. **Always use server-side environment variables** for API keys
2. **Implement rate limiting** to prevent abuse
3. **Whitelist allowed operations** (series IDs, endpoints)
4. **Log errors server-side** for debugging
5. **Use HTTPS** for all API calls
6. **Rotate keys periodically** if exposed

### Don'ts ❌

1. **Never use `NEXT_PUBLIC_`** for sensitive keys
2. **Never log API keys** in console or error messages
3. **Never commit `.env` files** to version control
4. **Never trust client input** without validation
5. **Never expose stack traces** to clients

### Environment Variable Naming

| Prefix | Visibility | Use For |
|--------|-----------|---------|
| `NEXT_PUBLIC_` | Browser + Server | Public config (analytics ID, site name) |
| No prefix | Server Only | API keys, secrets, credentials |

---

## Further Learning

### Next.js Security

- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Next.js API Routes Security](https://nextjs.org/docs/pages/building-your-application/routing/api-routes)
- [Vercel Security Best Practices](https://vercel.com/docs/security)

### API Security

- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)

### General Web Security

- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)

### Tools

- [dotenv](https://github.com/motdotla/dotenv) - Environment variable management
- [upstash/ratelimit](https://github.com/upstash/ratelimit) - Serverless rate limiting
- [next-auth](https://next-auth.js.org/) - Authentication for Next.js

---

## API Reference

### GET /api/fred

Fetch FRED economic data series.

**Query Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `series` | Yes | FRED series ID (e.g., `FEDFUNDS`) |
| `start` | No | Start date (YYYY-MM-DD format) |

**Response:**

```json
{
  "series": "FEDFUNDS",
  "observations": [
    { "date": "2024-01-01", "value": "5.33" },
    { "date": "2024-02-01", "value": "5.33" }
  ],
  "count": 2
}
```

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 400 | Missing series parameter |
| 403 | Series not in whitelist |
| 429 | Rate limit exceeded |
| 502 | FRED API error |
| 503 | API key not configured |

### OPTIONS /api/fred

Get API documentation and allowed series list.

```bash
curl -X OPTIONS http://localhost:3000/api/fred
```

---

## Migration Checklist

- [ ] Add `FRED_API_KEY` to environment variables
- [ ] Deploy the new `/api/fred` route
- [ ] Test that data loads correctly
- [ ] Remove `NEXT_PUBLIC_FRED_API_KEY` (optional, after testing)
- [ ] Update any CI/CD pipelines with new variable name
