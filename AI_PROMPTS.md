# AI Asset Generation Prompts

> Source files: `server/openai.ts` · `server/assetPrompts.ts`
> All prompts support bilingual output (EN/AR via `isArabic` flag).
> Every asset returns strict JSON: `{ title, data, markdown? }`

---

## Table of Contents

1. [LEAN_CANVAS](#1-lean_canvas)
2. [SWOT](#2-swot)
3. [PERSONA](#3-persona)
4. [JOURNEY_MAP](#4-journey_map)
5. [MARKETING_PLAN](#5-marketing_plan)
6. [TAM_SAM_SOM](#6-tam_sam_som)
7. [COMPETITOR_MAP](#7-competitor_map)
8. [PITCH_OUTLINE](#8-pitch_outline)
9. [TEAM_ROLES](#9-team_roles)
10. [BRAND_IDENTITY](#10-brand_identity)
11. [BRAND_WHEEL](#11-brand_wheel)
12. [INTERVIEW_QUESTIONS](#12-interview_questions)
13. [USER_STORIES](#13-user_stories)
14. [Generic Assets](#14-generic-assets)
15. [Chat System Prompt (FikraHub Cofounder)](#15-chat-system-prompt-fikrahub-cofounder)
16. [Multilingual (EN/AR) System](#16-multilingual-enar-system)

---

## 16. Multilingual (EN/AR) System

Codeos supports bilingual content generation in **English (en)** and **Arabic (ar)** for all AI assets and chat responses.

---

### Data flow

```
Client (i18n.language)
  → POST body: { language: 'en' | 'ar' }
    → server/routes.ts: const { language = 'en' } = req.body
      → generateBusinessAsset({ additionalData: { language } })
        → server/openai.ts: const isArabic = language === 'ar'
          → systemPrompt + userPrompt switch based on isArabic flag
            → OpenAI returns JSON with values in the selected language
```

---

### Language detection on the client

```ts
// Read language from i18n (react-i18next)
const { i18n } = useTranslation();
const lang = i18n?.language?.startsWith('ar') ? 'ar' : 'en';

// Send to server
fetch('/api/agent/chat', {
  method: 'POST',
  body: JSON.stringify({ message, chatId, language: i18n.language || 'en' })
});
```

`i18n.language` can be `'en'`, `'ar'`, or a locale string like `'ar-SA'`. The server checks `=== 'ar'` exactly, so any Arabic locale variant must be normalised to `'ar'` before sending.

---

### Server-side processing (`server/openai.ts`)

```ts
// 1. Read language from additionalData
const language = additionalData?.language || 'en';
const isArabic = language === 'ar';

// 2. baseInstruction — injected into the systemPrompt of EVERY asset
const baseInstruction = `${isArabic
  ? 'متطلبات حرجة: يجب أن تستجيب بتنسيق JSON صالح فقط. جميع القيم يجب أن تكون بالعربية. أسماء المفاتيح بالإنجليزية.'
  : 'CRITICAL: You MUST respond with valid JSON format ONLY. All values in English. Keys in English.'}

${isArabic ? 'البنية المطلوبة:' : 'Required structure:'}
{
  "title": "...",
  "data": { ... },
  "markdown": "..."
}
${isArabic
  ? 'تحذير: عدم اتباع هذا التنسيق سيؤدي إلى رفض الاستجابة.'
  : 'WARNING: Failure to follow this format will result in rejection.'}`;
```

**JSON output rules:**
| Part | Language |
|------|----------|
| Keys (field names) | Always English |
| Values (content) | Selected language (EN or AR) |
| `title` | Selected language |
| `markdown` | Selected language |

---

### Bilingual injection pattern

Every asset uses the ternary `isArabic ? '...(AR)...' : '...(EN)...'` in both `systemPrompt` and `userPrompt`:

```ts
// Example from TEAM_ROLES
systemPrompt = `...
${isArabic
  ? `إرشادات مهمة:
- يجب إنشاء ٥ أدوار بالضبط
- لكل دور: اسم، وصف، ٣ مسؤوليات...`
  : `CRITICAL GUIDELINES:
- Must create EXACTLY 5 roles
- Each role: name, description, 3 responsibilities...`}
...`;

prompt = `${isArabic ? 'أنشئ ٥ أدوار فريق رئيسية بالضبط' : 'Create EXACTLY 5 key team roles'} for: ${businessDescription}

${isArabic ? 'السياق' : 'Context'}: ${context}

${isArabic ? 'المتطلبات الحرجة:...' : 'CRITICAL REQUIREMENTS:...'}`;
```

---

### Language storage schema

```ts
// shared/schema.ts
export const assetLanguageEnum = pgEnum("asset_language", ["en", "ar"]);

export const assets = pgTable("assets", {
  ...
  language: assetLanguageEnum("language").default("en"),
  ...
});
```

Each asset is saved with a `language` field so the frontend knows whether to render RTL or LTR.

---

### RTL / LTR on the client

```ts
// client/src/contexts/LanguageContext.tsx
const isRTL = i18n.language === 'ar' || i18n.language?.startsWith('ar');

// Apply dir="rtl" when isRTL is true
<div dir={isRTL ? 'rtl' : 'ltr'}>...</div>
```

---

### Adding a new language (e.g. French)

1. Add `'fr'` to `assetLanguageEnum` in `shared/schema.ts`
2. Run `npm run db:push`
3. In `openai.ts`: add `const isFrench = language === 'fr'` and chain ternaries: `isArabic ? '...(AR)...' : isFrench ? '...(FR)...' : '...(EN)...'`
4. In `LanguageContext.tsx`: update `isRTL` logic (French does not need RTL)
5. Add translation file at `client/src/locales/fr/translation.json`

---

## 1. LEAN_CANVAS

**Role:** Seasoned business strategist (15+ years, startup business models)

**System prompt summary:**
- Returns 9 required sections as arrays/strings
- All arrays must have 3–5 specific, actionable items

**Output schema:**
```json
{
  "title": "string",
  "data": {
    "problem": ["string × 3-5"],
    "solution": ["string × 3-5"],
    "keyMetrics": ["string × 3-5"],
    "uniqueValueProposition": "string",
    "unfairAdvantage": "string",
    "channels": ["string × 3-5"],
    "customerSegments": ["string × 2-3"],
    "costStructure": ["string"],
    "revenueStreams": ["string"]
  },
  "markdown": "string (optional)"
}
```

**User prompt:**
```
Create a detailed Lean Canvas for: {businessDescription}
Context: {context}
Requirements:
- All arrays must contain 3-5 specific items
- Values must be concrete and actionable
- Use proper business terminology
RESPOND WITH VALID JSON ONLY.
```

---

## 2. SWOT

**Role:** Strategic consultant expert in competitive analysis

**System prompt summary:**
- 4 arrays, each with 4–6 specific items
- Focus on internal (S/W) vs external (O/T) factors

**Output schema:**
```json
{
  "title": "string",
  "data": {
    "strengths": ["string × 4-6"],
    "weaknesses": ["string × 4-6"],
    "opportunities": ["string × 4-6"],
    "threats": ["string × 4-6"]
  },
  "markdown": "string (optional)"
}
```

**User prompt:**
```
Create comprehensive SWOT analysis for: {businessDescription}
Context: {context}
Each category MUST have 4-6 specific, actionable items.
RESPOND WITH VALID JSON ONLY.
```

---

## 3. PERSONA

**Role:** Senior UX researcher, user behavior analysis expert

**System prompt summary:**
- Exactly 3–4 personas
- Each persona has 12 required fields

**Output schema:**
```json
{
  "title": "string",
  "data": {
    "personas": [
      {
        "name": "string",
        "age": "number",
        "location": "string",
        "role": "string",
        "industry": "string",
        "income": "string",
        "education": "string",
        "goals": ["string × 3-5"],
        "painPoints": ["string × 3-5"],
        "behaviors": ["string"],
        "channels": ["string"],
        "quote": "string"
      }
    ]
  },
  "markdown": "string (optional)"
}
```

**User prompt:**
```
Create 3-4 comprehensive user personas for: {businessDescription}
Context: {context}
MUST include 3-4 complete personas with ALL required fields.
RESPOND WITH VALID JSON ONLY.
```

---

## 4. JOURNEY_MAP

**Role:** Customer experience strategist

**System prompt summary:**
- 4–6 journey stages
- Each stage covers actions, touchpoints, emotions, pain points, opportunities

**Output schema:**
```json
{
  "title": "string",
  "data": {
    "persona": "string",
    "stages": [
      {
        "name": "string",
        "description": "string",
        "actions": ["string"],
        "touchpoints": ["string"],
        "emotions": ["string"],
        "painPoints": ["string"],
        "opportunities": ["string"]
      }
    ]
  }
}
```

**User prompt:**
```
Create customer journey map for: {businessDescription}
Context: {context}
RESPOND WITH VALID JSON ONLY.
```

---

## 5. MARKETING_PLAN

**Role:** Senior marketing strategist (omnichannel, digital strategy, customer journey)

**System prompt summary:**
- 6 major sections: targeting, messaging, channels, funnel, budget, timeline
- 12-month plan across 3–4 phases
- Budget breakdown must total exactly 100%
- 4–6 tactics per funnel stage

**Output schema:**
```json
{
  "title": "string",
  "data": {
    "targeting": {
      "primaryAudience": "string",
      "demographics": ["string × 4-6"],
      "psychographics": ["string × 4-6"]
    },
    "messaging": {
      "valueProposition": "string",
      "keyMessages": ["string × 4-6"],
      "brandVoice": "string"
    },
    "channels": {
      "digital": ["string × 4-6"],
      "traditional": ["string × 2-4"],
      "budget": "string"
    },
    "funnel": {
      "awareness": ["string × 4-6"],
      "consideration": ["string × 4-6"],
      "conversion": ["string × 4-6"],
      "retention": ["string × 4-6"]
    },
    "budget": {
      "total": "string",
      "breakdown": [{ "channel": "string", "percentage": "number", "amount": "string" }]
    },
    "timeline": [
      { "phase": "string", "duration": "string", "activities": ["string × 5-8"] }
    ]
  },
  "markdown": "string (optional)"
}
```

**User prompt:**
```
Create comprehensive 12-month marketing plan for: {businessDescription}
Context: {context}
CRITICAL REQUIREMENTS:
1. targeting: audience + demographics + psychographics (4-6 each)
2. messaging: value prop + key messages + voice (4-6 messages)
3. channels: digital (4-6) + traditional + budget
4. funnel: tactics for each stage (4-6 each)
5. budget: total + 5-7 categories breakdown (100%)
6. timeline: 3-4 phases × 12 months (5-8 activities each)
RESPOND WITH VALID JSON ONLY.
```

---

## 6. TAM_SAM_SOM

**Role:** Market research analyst (market sizing, financial forecasting)

**System prompt summary:**
- TAM/SAM/SOM in USD with methodology and sources
- Market penetration for years 1, 3, 5
- Revenue projections for years 1, 3, 5
- 3–5 assumptions with confidence levels (high/medium/low)

**Output schema:**
```json
{
  "title": "string",
  "data": {
    "tam": { "value": "number", "currency": "USD", "method": "string", "sources": ["string"], "description": "string" },
    "sam": { "value": "number", "currency": "USD", "method": "string", "geographicScope": "string", "description": "string" },
    "som": { "value": "number", "currency": "USD", "method": "string", "captureRate": "string", "timeline": "string" },
    "marketPenetration": {
      "year1": { "percentage": "string", "customers": "number", "revenue": "string" },
      "year3": { "percentage": "string", "customers": "number", "revenue": "string" },
      "year5": { "percentage": "string", "customers": "number", "revenue": "string" }
    },
    "revenueProjection": {
      "year1": { "revenue": "string", "value": "string" },
      "year3": { "revenue": "string", "value": "string" },
      "year5": { "revenue": "string", "value": "string" }
    },
    "assumptions": [{ "assumption": "string", "confidence": "high|medium|low", "impact": "string" }],
    "marketTrends": ["string (optional)"],
    "growthDrivers": ["string (optional)"]
  },
  "markdown": "string (optional)"
}
```

**User prompt:**
```
Create comprehensive TAM/SAM/SOM analysis with revenue projections and market penetration for: {businessDescription}
Context: {context}
CRITICAL REQUIREMENTS:
1. Calculate TAM/SAM/SOM with realistic, defensible numbers
2. Include market penetration for years 1, 3, 5 (percentages, customers, revenue)
3. Revenue projections for years 1, 3, 5
4. 3-5 key assumptions with confidence levels
5. Explain methodology used for each calculation
RESPOND WITH VALID JSON ONLY.
```

---

## 7. COMPETITOR_MAP

**Role:** Competitive intelligence analyst (market analysis, competitive strategy)

**System prompt summary:**
- Landscape overview (2–3 sentences)
- 3–5 competitors, each with full 12-field analysis
- Market gaps, competitive advantages, threats, strategic recommendations

**Output schema:**
```json
{
  "title": "string",
  "data": {
    "overview": "string",
    "competitors": [
      {
        "name": "string",
        "description": "string",
        "marketPosition": "string",
        "strengths": ["string × 3-5"],
        "weaknesses": ["string × 3-5"],
        "marketShare": "string",
        "pricing": "string",
        "targetAudience": "string",
        "keyProducts": ["string × 2-4"],
        "threats": ["string × 2-3"],
        "opportunities": ["string × 2-3"],
        "competitiveAdvantage": ["string × 2-3"]
      }
    ],
    "marketGaps": ["string × 3-5"],
    "competitiveAdvantages": ["string × 3-5"],
    "threats": ["string × 3-5"],
    "recommendations": ["string × 4-6"]
  },
  "markdown": "string (optional)"
}
```

**User prompt:**
```
Create comprehensive competitor analysis for: {businessDescription}
Context: {context}
CRITICAL REQUIREMENTS:
1. overview: Brief description of competitive landscape
2. competitors: 3-5 main competitors with full analysis
   - For each: name, description, position, strengths/weaknesses, share, pricing, audience, products, threats, opportunities, advantages
3. marketGaps: 3-5 unexploited opportunities
4. competitiveAdvantages: 3-5 your advantages
5. threats: 3-5 overall competitive threats
6. recommendations: 4-6 strategies to compete effectively
RESPOND WITH VALID JSON ONLY.
```

---

## 8. PITCH_OUTLINE

**Role:** Pitch consultant

**System prompt summary:**
- 10–15 slides, each with slide number, title, content, key points
- Includes funding ask section (amount + use-of-funds breakdown)

**Output schema:**
```json
{
  "title": "string",
  "data": {
    "slides": [
      {
        "slideNumber": "number",
        "title": "string",
        "content": "string",
        "keyPoints": ["string"]
      }
    ],
    "fundingAsk": {
      "amount": "string",
      "use": [{ "category": "string", "amount": "string" }]
    }
  }
}
```

**Standard slide order:** Problem → Solution → Market Opportunity → Product → Business Model → Traction → Competition → Team → Financials → Funding Ask

**User prompt:**
```
Create pitch deck outline for: {businessDescription}
Context: {context}
RESPOND WITH VALID JSON ONLY.
```

---

## 9. TEAM_ROLES

**Role:** Senior HR consultant & organizational development expert (15+ years, startup teams)

**System prompt summary:**
- Exactly 5 roles
- Each role has: name, description, 3 responsibilities, 3 personal attributes, 3 driving motivators
- Choose from: Venture Lead, Tech Lead, Marketing Lead, Finance Lead, Operations Lead, Design Lead, Sales Lead, etc.

**Output schema:**
```json
{
  "title": "string",
  "data": {
    "roles": [
      {
        "name": "string",
        "description": "string",
        "responsibilities_1": "string",
        "responsibilities_2": "string",
        "responsibilities_3": "string",
        "personal_attributes_1": "string",
        "personal_attributes_2": "string",
        "personal_attributes_3": "string",
        "driving_motivators_1": "string",
        "driving_motivators_2": "string",
        "driving_motivators_3": "string"
      }
    ]
  },
  "markdown": "string (optional)"
}
```

**User prompt:**
```
Create EXACTLY 5 key team roles for: {businessDescription}
Context: {context}
CRITICAL REQUIREMENTS:
1. Must create EXACTLY 5 roles (no more, no less)
2. Each role must contain all fields (name, description, responsibilities_1-3, personal_attributes_1-3, driving_motivators_1-3)
3. Choose the most important roles for this venture
4. Be specific and practical in responsibilities and attributes
Common examples: Venture Lead, Tech Lead, Marketing Lead, Finance Lead, Operations Lead
RESPOND WITH VALID JSON ONLY.
```

---

## 10. BRAND_IDENTITY

**Role:** Brand identity designer & color theory expert

**System prompt summary:**
- 5-shade color palette (lightest → darkest, same hue family)
- Logo concept with symbolism explanation
- Typography (primary + secondary font)
- Imagery/photography style
- Brand voice, brand values (3–5), personality traits (3–5), customer promise

**Output schema:**
```json
{
  "title": "string",
  "data": {
    "color_name_1": "string", "color_hex_1": "#xxxxxx",
    "color_name_2": "string", "color_hex_2": "#xxxxxx",
    "color_name_3": "string", "color_hex_3": "#xxxxxx",
    "color_name_4": "string", "color_hex_4": "#xxxxxx",
    "color_name_5": "string", "color_hex_5": "#xxxxxx",
    "logo_concept": "string",
    "logo_symbolism": "string",
    "primary_font": "string",
    "secondary_font": "string",
    "imagery_style": "string",
    "brand_voice": "string",
    "brand_values": ["string × 3-5"],
    "personality_traits": ["string × 3-5"],
    "customer_promise": "string"
  },
  "markdown": "string (optional)"
}
```

---

## 11. BRAND_WHEEL

**Role:** Senior brand strategist (15+ years)

**System prompt summary:**
- Mission (2–3 sentences), Vision (2–3 sentences)
- Brand positioning statement (2–3 sentences)
- 4–6 brand values, each with label + explanation
- 4–6 personality traits, each with label + description

**Output schema:**
```json
{
  "title": "string",
  "data": {
    "mission": "string",
    "vision": "string",
    "positioning": "string",
    "values": [{ "value": "string", "explanation": "string" }],
    "personality": [{ "trait": "string", "description": "string" }]
  },
  "markdown": "string (optional)"
}
```

---

## 12. INTERVIEW_QUESTIONS

**Role:** Customer development expert & lean startup practitioner

**System prompt summary:**
- Exactly 16 questions total:
  - 10 in-depth open-ended discovery questions (problem/solution validation)
  - 3 demographic/profiling questions
  - 3 wrap-up questions
- No leading or biased phrasing

**Output schema:**
```json
{
  "title": "string",
  "data": {
    "questions": [
      {
        "id": "number",
        "category": "discovery|demographic|wrap-up",
        "question": "string",
        "purpose": "string",
        "followUp": "string (optional)"
      }
    ]
  },
  "markdown": "string (optional)"
}
```

---

## 13. USER_STORIES

**Role:** Senior product manager & agile coach (10+ years)

**System prompt summary:**
- Exactly 5 user stories
- Format: `"As a [role], I want to [action], so that [benefit]"`
- Each includes acceptance criteria (clear, testable, 3–5 items)
- Covers: authentication, core features, account management, transactions, support

**Output schema:**
```json
{
  "title": "string",
  "data": {
    "stories": [
      {
        "id": "number",
        "title": "string",
        "story": "As a [role], I want to [action], so that [benefit]",
        "acceptanceCriteria": ["string × 3-5"],
        "priority": "high|medium|low",
        "storyPoints": "number"
      }
    ]
  },
  "markdown": "string (optional)"
}
```

---

## 14. Generic Assets

The following asset types use a simplified generic prompt:

| Asset Type | Description |
|---|---|
| `BRAND_GUIDELINES` | Visual and verbal brand standards |
| `LAUNCH_ROADMAP` | Go-to-market launch timeline |
| `FINANCIAL_PROJECTIONS` | Revenue/cost projections |
| `RISK_ASSESSMENT` | Risk identification and mitigation |
| `GTM_STRATEGY` | Go-to-market strategy |
| `PRODUCT_ROADMAP` | Product feature timeline |
| `TEAM_STRUCTURE` | Org chart and reporting lines |
| `FUNDING_STRATEGY` | Funding rounds and investor strategy |

**System prompt:**
```
You are a business strategist.
{baseInstruction}
Create detailed {type} with proper JSON structure.
Include title, data object, and optional markdown.
ALL fields marked REQUIRED must be present.
```

**User prompt:**
```
Create {type} for: {businessDescription}
Context: {context}
RESPOND WITH VALID JSON ONLY.
```

---

## 15. Chat System Prompt (FikraHub Cofounder)

**Source:** `server/openai.ts` → `generateChatResponse()`

**Role:** FikraHub Cofounder — AI cofounder for turning ideas into validated business cases

```
You are FikraHub Cofounder, an AI cofounder that helps users turn an idea into a
concrete, validated business case.

Your job: quickly clarify the idea with a few targeted questions, then produce
structured assets (Business Model, Marketing Plan, User Personas, User Stories,
SWOT, Lean Canvas, Journey Map, Competitor Map, TAM/SAM/SOM, OKRs, Pitch Outline)
and return runnable UI code that our app will write to files and render.
```

**Behavior rules:**
- **First message:** Skip greetings — jump directly to asking about the business idea
- **Ask first (max 5 questions):** Product name, target market/geo, ICP, monetization, success goal
- **Be decisive:** Offer best-practice defaults when user is unsure; note assumptions
- **Bilingual:** Default EN; switch to AR if user's locale is Arabic (keep JSON keys in English)
- **Evidence > fluff:** Add assumption notes or source placeholders for claims

**Every response must include:**
1. Human-readable summary of what was produced
2. Machine-readable JSON payload for each asset (strict schemas)
3. Code array with ready-to-run TSX/React files (Tailwind + shadcn/ui + lucide-react + recharts only)

---

## Common Variables

All prompts receive these shared context variables:

| Variable | Description |
|---|---|
| `businessDescription` | Core idea/product description |
| `context` | Additional context (industry, location, stage, etc.) |
| `launchLocation` | Target geography (used in SWOT, MARKETING_PLAN, TAM_SAM_SOM) |
| `ideaName` | Product/startup name |
| `isArabic` | Boolean — switches all output to Arabic |
| `baseInstruction` | Shared instruction block injected into every system prompt |

---

## Notes

- All prompts end with `RESPOND WITH VALID JSON ONLY. NO ADDITIONAL TEXT.`
- Failed JSON parsing triggers an automatic retry (up to 2 retries via `generateAssetWithRetry`)
- The `markdown` field is always optional — used for human-readable rendering alongside the structured data
