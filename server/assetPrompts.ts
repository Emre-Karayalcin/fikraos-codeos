// Asset-specific prompts for generating high-quality business frameworks

export function getAssetPrompt(assetType: string, ideaName: string, launchLocation: string): string {
  switch (assetType) {
    case 'LEAN_CANVAS':
      return `Create a Lean Canvas with these sections:
- Problem (top 3 problems)
- Solution (top 3 features)
- Key Metrics (3-5 KPIs)
- Unique Value Proposition (clear, compelling statement)
- Unfair Advantage (what can't be easily copied)
- Channels (path to customers)
- Customer Segments (target users)
- Cost Structure (major costs)
- Revenue Streams (how you make money)

Format as JSON with each section as an array or string.`;

    case 'SWOT':
      return `Create a SWOT Analysis with:
- Strengths (4-6 internal advantages)
- Weaknesses (4-6 internal challenges)
- Opportunities (4-6 external opportunities)
- Threats (4-6 external risks)

Consider the specific market dynamics of ${launchLocation}. Format as JSON with arrays.`;

    case 'PERSONA':
      return `Create 3 detailed user personas with:
- Name and demographic info
- Goals and motivations
- Pain points and frustrations
- Behavior patterns
- Technology usage
- Quote that represents them

Format as JSON array of persona objects.`;

    case 'JOURNEY_MAP':
      return `Create a customer journey map with 5 stages:
- Awareness (how they discover the problem)
- Consideration (evaluating solutions)
- Purchase (decision and buying process)
- Onboarding (first experience)
- Advocacy (becoming a promoter)

For each stage include: touchpoints, emotions, pain points, opportunities. Format as JSON.`;

    case 'MARKETING_PLAN':
      return `Create a comprehensive marketing plan in this EXACT JSON structure:
{
  "targeting": {
    "primaryAudience": "Description of primary target audience",
    "demographics": ["Age: 25-45", "Income: $50k-$100k", "Education: College degree", "Location: Urban areas"],
    "psychographics": ["Tech-savvy early adopters", "Value efficiency", "Environmentally conscious"]
  },
  "messaging": {
    "valueProposition": "Clear value proposition statement",
    "keyMessages": ["Key message 1", "Key message 2", "Key message 3"],
    "brandVoice": "Tone and personality (e.g., Professional yet approachable)"
  },
  "channels": {
    "digital": ["LinkedIn", "Content Marketing", "SEO", "Email campaigns"],
    "traditional": ["Trade shows", "Print media", "Direct mail"],
    "budget": "$50,000"
  },
  "funnel": {
    "awareness": ["Social media ads", "Content marketing", "SEO", "PR outreach"],
    "consideration": ["Free trials", "Case studies", "Product demos", "Webinars"],
    "conversion": ["Limited-time offers", "Sales calls", "Customer testimonials"],
    "retention": ["Customer success program", "Regular check-ins", "Loyalty rewards", "Upselling"]
  },
  "budget": {
    "total": "$100,000",
    "breakdown": [
      {"channel": "Digital Advertising", "percentage": 40, "amount": "$40,000"},
      {"channel": "Content Marketing", "percentage": 25, "amount": "$25,000"},
      {"channel": "Events & PR", "percentage": 20, "amount": "$20,000"},
      {"channel": "Tools & Software", "percentage": 15, "amount": "$15,000"}
    ]
  },
  "timeline": [
    {
      "phase": "Q1: Launch & Awareness",
      "duration": "3 months",
      "activities": ["Build brand presence", "Launch social media", "Create content", "SEO optimization"]
    },
    {
      "phase": "Q2: Growth & Engagement",
      "duration": "3 months",
      "activities": ["Scale advertising", "Partnership outreach", "Customer stories", "Product improvements"]
    },
    {
      "phase": "Q3-Q4: Scale & Optimize",
      "duration": "6 months",
      "activities": ["Expand to new markets", "Advanced segmentation", "Referral program", "Marketing automation"]
    }
  ]
}

Consider ${launchLocation} market specifics. Generate realistic, actionable content for ${ideaName}.`;

    case 'COMPETITOR_MAP':
      return `Create a competitor analysis with:
- Direct Competitors (3-5 companies doing the same thing)
- Indirect Competitors (alternative solutions)
- Competitive Matrix (features, pricing, strengths/weaknesses)
- Market Positioning (how each competitor positions themselves)
- Competitive Advantages (what makes you different)
- Threats and Opportunities (from competitive landscape)

Focus on ${launchLocation} market. Format as structured JSON.`;

    case 'TAM_SAM_SOM':
      return `Create a market size analysis with:
- TAM (Total Addressable Market): entire market demand
- SAM (Serviceable Addressable Market): segment you can target
- SOM (Serviceable Obtainable Market): realistic market share

Include:
- Market size calculations (in USD)
- Methodology and assumptions
- Growth projections (3-5 years)
- Market trends and drivers
- Geographic breakdown for ${launchLocation}

Format as structured JSON with numbers and explanations.`;

    case 'PITCH_OUTLINE':
      return `Create a compelling pitch deck outline in this EXACT JSON structure:
{
  "overview": "Brief overview of the pitch deck purpose",
  "duration": "15-20 minutes",
  "slides": [
    {
      "title": "Problem",
      "content": ["Key pain point 1", "Key pain point 2", "Market gap"],
      "keyPoints": ["Why this matters", "Current state", "Impact"]
    },
    {
      "title": "Solution",
      "content": ["Your approach", "Key features", "How it works"],
      "keyPoints": ["Unique value", "Innovation", "Benefits"]
    },
    {
      "title": "Market Opportunity",
      "content": ["Market size (TAM/SAM/SOM)", "Growth trends", "Target segment"],
      "keyPoints": ["$XX billion market", "XX% growth", "Early adopter opportunity"]
    },
    {
      "title": "Product",
      "content": ["Core features", "User experience", "Technology"],
      "keyPoints": ["Demo highlights", "Differentiators", "Roadmap"]
    },
    {
      "title": "Business Model",
      "content": ["Revenue streams", "Pricing strategy", "Unit economics"],
      "keyPoints": ["How you make money", "Margins", "Scalability"]
    },
    {
      "title": "Traction",
      "content": ["Current metrics", "Customer testimonials", "Milestones achieved"],
      "keyPoints": ["Growth rate", "Key wins", "Validation"]
    },
    {
      "title": "Competition",
      "content": ["Competitive landscape", "Your differentiation", "Barriers to entry"],
      "keyPoints": ["Competitive advantage", "Market positioning", "Moat"]
    },
    {
      "title": "Team",
      "content": ["Founders background", "Key hires", "Advisors"],
      "keyPoints": ["Relevant experience", "Track record", "Network"]
    },
    {
      "title": "Financials",
      "content": ["Revenue projections", "Key assumptions", "Path to profitability"],
      "keyPoints": ["3-5 year forecast", "Break-even timeline", "Cash flow"]
    },
    {
      "title": "Funding Ask",
      "content": ["Amount raising", "Use of funds", "Milestones to achieve"],
      "keyPoints": ["Investment needed", "Runway", "Expected outcomes"]
    }
  ],
  "keyMessages": [
    "Clear problem with large market",
    "Unique solution with traction",
    "Strong team executing",
    "Defined path to returns"
  ],
  "callToAction": "Join us in revolutionizing [industry] - let's discuss next steps",
  "appendix": [
    {
      "title": "Additional Financials",
      "items": ["Detailed P&L", "Cash flow projections", "Sensitivity analysis"]
    },
    {
      "title": "Customer Case Studies",
      "items": ["Enterprise client A results", "SMB client B testimonial", "Use case examples"]
    },
    {
      "title": "Technical Details",
      "items": ["Architecture overview", "Security measures", "Scalability approach"]
    }
  ]
}

Generate specific, compelling content for ${ideaName} launching in ${launchLocation}.`;

    default:
      return `Create a comprehensive business analysis covering key strategic elements relevant to ${assetType}.`;
  }
}