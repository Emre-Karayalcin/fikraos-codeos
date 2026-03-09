// Azure OpenAI GPT-4o integration
import OpenAI from 'openai';

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT_DEV;
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_API_KEY_DEV;
const AZURE_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview';
const AZURE_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-fikra-dev';

// Remove trailing slash from endpoint to avoid double slashes
const CLEAN_ENDPOINT = AZURE_OPENAI_ENDPOINT?.replace(/\/$/, '');

if (!AZURE_OPENAI_KEY || !CLEAN_ENDPOINT) {
  console.warn("⚠️  Azure OpenAI credentials not set - AI features will be disabled");
}

const openai = (AZURE_OPENAI_KEY && CLEAN_ENDPOINT) ? new OpenAI({
  apiKey: AZURE_OPENAI_KEY,
  baseURL: `${CLEAN_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}`,
  defaultQuery: { 'api-version': AZURE_API_VERSION },
  defaultHeaders: { 'api-key': AZURE_OPENAI_KEY },
}) : null;

// Debug logging for Azure OpenAI configuration
console.log('🔧 Azure OpenAI Config:', {
  endpoint: CLEAN_ENDPOINT ? CLEAN_ENDPOINT.substring(0, 50) + '...' : 'NOT SET',
  deployment: AZURE_DEPLOYMENT,
  apiVersion: AZURE_API_VERSION,
  hasKey: !!AZURE_OPENAI_KEY,
  clientInitialized: !!openai,
  fullBaseURL: CLEAN_ENDPOINT ? `${CLEAN_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}`.substring(0, 90) + '...' : 'N/A',
  note: 'Deployment in baseURL, deployment name as model'
});

const DEFAULT_MODEL_STR = AZURE_DEPLOYMENT;

const CHAT_MODES = {
  fast: {
    model: DEFAULT_MODEL_STR,
    temperature: 0.3,
    max_tokens: 2000
  },
  balanced: {
    model: DEFAULT_MODEL_STR,
    temperature: 0.7,
    max_tokens: 4000
  },
  advanced: {
    model: DEFAULT_MODEL_STR,
    temperature: 0.9,
    max_tokens: 8000
  }
};

type ChatMode = keyof typeof CHAT_MODES;

export interface AssetGenerationRequest {
  type: string;
  context: string;
  businessDescription: string;
  additionalData?: {
    language?: 'en' | 'ar' | string;
    [key: string]: any;
  };
}

export interface AssetGenerationResponse {
  title: string;
  data: any;
  markdown?: string;
  html?: string;
}

async function callOpenAI(messages: any[], model: string, temperature: number, max_tokens: number) {
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }

  console.log(`🔄 Calling OpenAI with model: ${model}`);

  const response = await openai.chat.completions.create({
    model,
    messages: messages,
    temperature,
    max_tokens,
  });

  const responseText = response.choices[0]?.message?.content || 'No response generated';
  console.log(`✅ OpenAI response received:`, responseText?.substring(0, 100) + "...");
  return {
    choices: [{
      message: {
        content: responseText
      }
    }]
  };
}

// Validate JSON structure based on asset type
function validateAssetData(type: string, data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  switch (type) {
    case "TEAM_ROLES":
      // Validation
      if (!Array.isArray(data.roles) || data.roles.length !== 5) {
        errors.push("Missing or invalid 'roles' array (must have exactly 5 roles)");
      } else {
        data.roles.forEach((role: any, idx: number) => {
          if (!role.name) errors.push(`Role ${idx}: missing 'name'`);
          if (!role.description) errors.push(`Role ${idx}: missing 'description'`);
          for (let i = 1; i <= 3; i++) {
            if (!role[`responsibilities_${i}`]) errors.push(`Role ${idx}: missing 'responsibilities_${i}'`);
            if (!role[`personal_attributes_${i}`]) errors.push(`Role ${idx}: missing 'personal_attributes_${i}'`);
            if (!role[`driving_motivators_${i}`]) errors.push(`Role ${idx}: missing 'driving_motivators_${i}'`);
          }
        });
      }
      break;
    case "BRAND_IDENTITY":
      // Validation
      // Color Palette
      for (let i = 1; i <= 5; i++) {
        if (!data[`color_name_${i}`]) errors.push(`Missing 'color_name_${i}' string`);
        if (!data[`color_hex_${i}`]) errors.push(`Missing 'color_hex_${i}' string`);
      }
      if (!data.color_des) errors.push("Missing 'color_des' string");
      
      // Visual Identity
      if (!data.logo_idea) errors.push("Missing 'logo_idea' string");
      if (!data.typography) errors.push("Missing 'typography' string");
      if (!data.imagery_photography) errors.push("Missing 'imagery_photography' string");
      
      // Brand Voice & Values
      if (!data.brand_voice) errors.push("Missing 'brand_voice' string");
      if (!data.brand_values) errors.push("Missing 'brand_values' string");
      if (!data.brand_personality_traits) errors.push("Missing 'brand_personality_traits' string");
      if (!data.customer_promise) errors.push("Missing 'customer_promise' string");
      break;
    case "BRAND_WHEEL":
      // Validation
      if (!data.mission) errors.push("Missing 'mission' string");
      if (!data.vision) errors.push("Missing 'vision' string");
      if (!data.brand_positioning) errors.push("Missing 'brand_positioning' string");
      if (!data.brand_values) errors.push("Missing 'brand_values' string");
      if (!data.personality) errors.push("Missing 'personality' string");
      break;
    case "INTERVIEW_QUESTIONS":
      // Validation
      if (!data.inDepth) {
        errors.push("Missing 'inDepth' object");
      } else {
        for (let i = 1; i <= 10; i++) {
          if (!data.inDepth[`question_${i}`]) {
            errors.push(`Missing 'inDepth.question_${i}'`);
          }
        }
      }
      
      if (!data.demographic) {
        errors.push("Missing 'demographic' object");
      } else {
        for (let i = 11; i <= 13; i++) {
          if (!data.demographic[`question_${i}`]) {
            errors.push(`Missing 'demographic.question_${i}'`);
          }
        }
      }
      
      if (!data.wrapUp) {
        errors.push("Missing 'wrapUp' object");
      } else {
        for (let i = 14; i <= 16; i++) {
          if (!data.wrapUp[`question_${i}`]) {
            errors.push(`Missing 'wrapUp.question_${i}'`);
          }
        }
      }
      break;
    case "USER_STORIES":
      if (!Array.isArray(data.stories) || data.stories.length === 0) {
        errors.push("Missing or empty 'stories' array");
      } else {
        data.stories.forEach((story: any, idx: number) => {
          if (!story.userStory) errors.push(`Story ${idx}: missing 'userStory'`);
          if (!story.acceptanceCriteria) errors.push(`Story ${idx}: missing 'acceptanceCriteria'`);
        });
      }
      break;
    case "LEAN_CANVAS":
      if (!Array.isArray(data.problem) || data.problem.length === 0) errors.push("Missing or empty 'problem' array");
      if (!Array.isArray(data.solution) || data.solution.length === 0) errors.push("Missing or empty 'solution' array");
      if (!Array.isArray(data.keyMetrics)) errors.push("Missing 'keyMetrics' array");
      if (!data.uniqueValueProposition) errors.push("Missing 'uniqueValueProposition' string");
      if (!data.unfairAdvantage) errors.push("Missing 'unfairAdvantage' string");
      if (!Array.isArray(data.channels)) errors.push("Missing 'channels' array");
      if (!Array.isArray(data.customerSegments)) errors.push("Missing 'customerSegments' array");
      if (!Array.isArray(data.costStructure)) errors.push("Missing 'costStructure' array");
      if (!Array.isArray(data.revenueStreams)) errors.push("Missing 'revenueStreams' array");
      break;

    case "PERSONA":
      if (!data.personas || !Array.isArray(data.personas) || data.personas.length === 0) {
        errors.push("Missing or empty 'personas' array");
      } else {
        data.personas.forEach((persona: any, idx: number) => {
          if (!persona.name) errors.push(`Persona ${idx}: missing 'name'`);
          if (!persona.age) errors.push(`Persona ${idx}: missing 'age'`);
          if (!persona.location) errors.push(`Persona ${idx}: missing 'location'`);
          if (!persona.role) errors.push(`Persona ${idx}: missing 'role'`);
          if (!Array.isArray(persona.goals)) errors.push(`Persona ${idx}: missing 'goals' array`);
          if (!Array.isArray(persona.painPoints)) errors.push(`Persona ${idx}: missing 'painPoints' array`);
          if (!Array.isArray(persona.behaviors)) errors.push(`Persona ${idx}: missing 'behaviors' array`);
          if (!Array.isArray(persona.channels)) errors.push(`Persona ${idx}: missing 'channels' array`);
          if (!persona.quote) errors.push(`Persona ${idx}: missing 'quote' string`);
        });
      }
      break;

    case "SWOT":
      if (!Array.isArray(data.strengths) || data.strengths.length < 3) errors.push("Missing or insufficient 'strengths' array (need 3+)");
      if (!Array.isArray(data.weaknesses) || data.weaknesses.length < 3) errors.push("Missing or insufficient 'weaknesses' array (need 3+)");
      if (!Array.isArray(data.opportunities) || data.opportunities.length < 3) errors.push("Missing or insufficient 'opportunities' array (need 3+)");
      if (!Array.isArray(data.threats) || data.threats.length < 3) errors.push("Missing or insufficient 'threats' array (need 3+)");
      break;

    case "MARKETING_PLAN":
      // Validation for NEW structure
      if (!data.targeting) errors.push("Missing 'targeting' object");
      if (data.targeting && !data.targeting.primaryAudience) errors.push("Missing 'targeting.primaryAudience'");
      if (data.targeting && !Array.isArray(data.targeting.demographics)) errors.push("Missing 'targeting.demographics' array");
      if (data.targeting && !Array.isArray(data.targeting.psychographics)) errors.push("Missing 'targeting.psychographics' array");
      
      if (!data.messaging) errors.push("Missing 'messaging' object");
      if (data.messaging && !data.messaging.valueProposition) errors.push("Missing 'messaging.valueProposition'");
      if (data.messaging && !Array.isArray(data.messaging.keyMessages)) errors.push("Missing 'messaging.keyMessages' array");
      if (data.messaging && !data.messaging.brandVoice) errors.push("Missing 'messaging.brandVoice'");
      
      if (!data.channels) errors.push("Missing 'channels' object");
      if (data.channels && !Array.isArray(data.channels.digital)) errors.push("Missing 'channels.digital' array");
      if (data.channels && !Array.isArray(data.channels.traditional)) errors.push("Missing 'channels.traditional' array");
      if (data.channels && !data.channels.budget) errors.push("Missing 'channels.budget'");
      
      if (!data.funnel) errors.push("Missing 'funnel' object");
      if (data.funnel && !Array.isArray(data.funnel.awareness)) errors.push("Missing 'funnel.awareness' array");
      if (data.funnel && !Array.isArray(data.funnel.consideration)) errors.push("Missing 'funnel.consideration' array");
      if (data.funnel && !Array.isArray(data.funnel.conversion)) errors.push("Missing 'funnel.conversion' array");
      if (data.funnel && !Array.isArray(data.funnel.retention)) errors.push("Missing 'funnel.retention' array");
      
      if (!data.budget) errors.push("Missing 'budget' object");
      if (data.budget && !data.budget.total) errors.push("Missing 'budget.total'");
      if (data.budget && !Array.isArray(data.budget.breakdown)) errors.push("Missing 'budget.breakdown' array");
      if (data.budget && Array.isArray(data.budget.breakdown)) {
        data.budget.breakdown.forEach((item: any, idx: number) => {
          if (!item.channel) errors.push(`Budget breakdown ${idx}: missing 'channel'`);
          if (typeof item.percentage !== 'number') errors.push(`Budget breakdown ${idx}: missing or invalid 'percentage'`);
          if (!item.amount) errors.push(`Budget breakdown ${idx}: missing 'amount'`);
        });
      }
      
      if (!Array.isArray(data.timeline) || data.timeline.length === 0) {
        errors.push("Missing or empty 'timeline' array");
      } else {
        data.timeline.forEach((phase: any, idx: number) => {
          if (!phase.phase) errors.push(`Timeline phase ${idx}: missing 'phase'`);
          if (!phase.duration) errors.push(`Timeline phase ${idx}: missing 'duration'`);
          if (!Array.isArray(phase.activities)) errors.push(`Timeline phase ${idx}: missing 'activities' array`);
        });
      }
      break;

    case "TAM_SAM_SOM":
      // Validate TAM
      if (!data.tam || typeof data.tam.value !== 'number') errors.push("Missing or invalid 'tam.value'");
      if (!data.tam?.method) errors.push("Missing 'tam.method'");
      if (!data.tam?.currency) errors.push("Missing 'tam.currency'");
      
      // Validate SAM
      if (!data.sam || typeof data.sam.value !== 'number') errors.push("Missing or invalid 'sam.value'");
      if (!data.sam?.method) errors.push("Missing 'sam.method'");
      if (!data.sam?.currency) errors.push("Missing 'sam.currency'");
      
      // Validate SOM
      if (!data.som || typeof data.som.value !== 'number') errors.push("Missing or invalid 'som.value'");
      if (!data.som?.method) errors.push("Missing 'som.method'");
      if (!data.som?.currency) errors.push("Missing 'som.currency'");
      
      // Validate Market Penetration
      if (!data.marketPenetration) {
        errors.push("Missing 'marketPenetration' object");
      } else {
        const years = ['year1', 'year3', 'year5'];
        years.forEach(year => {
          if (!data.marketPenetration[year]) {
            errors.push(`Missing 'marketPenetration.${year}'`);
          } else {
            const yearData = data.marketPenetration[year];
            if (typeof yearData === 'object') {
              if (!yearData.percentage && !yearData.customers && !yearData.revenue) {
                errors.push(`marketPenetration.${year} must have at least one of: percentage, customers, or revenue`);
              }
            }
          }
        });
      }
      
      // Validate Revenue Projection
      if (!data.revenueProjection) {
        errors.push("Missing 'revenueProjection' object");
      } else {
        const years = ['year1', 'year3', 'year5'];
        years.forEach(year => {
          if (!data.revenueProjection[year]) {
            errors.push(`Missing 'revenueProjection.${year}'`);
          } else {
            const yearData = data.revenueProjection[year];
            if (typeof yearData === 'object') {
              if (!yearData.revenue && !yearData.value) {
                errors.push(`revenueProjection.${year} must have either 'revenue' or 'value'`);
              }
            }
          }
        });
      }
      
      // Validate optional fields
      if (!Array.isArray(data.assumptions)) errors.push("Missing 'assumptions' array");
      break;

    case "JOURNEY_MAP":
      if (!data.persona) errors.push("Missing 'persona' string");
      if (!Array.isArray(data.stages) || data.stages.length < 3) errors.push("Missing or insufficient 'stages' array (need 3+)");
      
      if (Array.isArray(data.stages)) {
        data.stages.forEach((stage: any, idx: number) => {
          if (!stage.name) errors.push(`Stage ${idx}: missing 'name'`);
          if (!stage.description) errors.push(`Stage ${idx}: missing 'description'`);
          if (!Array.isArray(stage.actions)) errors.push(`Stage ${idx}: missing 'actions' array`);
          if (!Array.isArray(stage.touchpoints)) errors.push(`Stage ${idx}: missing 'touchpoints' array`);
          if (!Array.isArray(stage.emotions)) errors.push(`Stage ${idx}: missing 'emotions' array`);
          if (!Array.isArray(stage.painPoints)) errors.push(`Stage ${idx}: missing 'painPoints' array`);
          if (!Array.isArray(stage.opportunities)) errors.push(`Stage ${idx}: missing 'opportunities' array`);
        });
      }
      break;

    case "COMPETITOR_MAP":
      // Validation
      if (!data.overview) errors.push("Missing 'overview' string");
      
      if (!Array.isArray(data.competitors) || data.competitors.length === 0) {
        errors.push("Missing or empty 'competitors' array");
      } else {
        data.competitors.forEach((comp: any, idx: number) => {
          if (!comp.name) errors.push(`Competitor ${idx}: missing 'name'`);
          if (!comp.description) errors.push(`Competitor ${idx}: missing 'description'`);
          if (!comp.marketPosition) errors.push(`Competitor ${idx}: missing 'marketPosition'`);
          if (!Array.isArray(comp.strengths)) errors.push(`Competitor ${idx}: missing 'strengths' array`);
          if (!Array.isArray(comp.weaknesses)) errors.push(`Competitor ${idx}: missing 'weaknesses' array`);
          if (!comp.marketShare) errors.push(`Competitor ${idx}: missing 'marketShare'`);
          if (!comp.pricing) errors.push(`Competitor ${idx}: missing 'pricing'`);
          if (!comp.targetAudience) errors.push(`Competitor ${idx}: missing 'targetAudience'`);
          if (!Array.isArray(comp.keyProducts)) errors.push(`Competitor ${idx}: missing 'keyProducts' array`);
          if (!Array.isArray(comp.threats)) errors.push(`Competitor ${idx}: missing 'threats' array`);
          if (!Array.isArray(comp.opportunities)) errors.push(`Competitor ${idx}: missing 'opportunities' array`);
          if (!Array.isArray(comp.competitiveAdvantage)) errors.push(`Competitor ${idx}: missing 'competitiveAdvantage' array`);
        });
      }
      
      if (!Array.isArray(data.marketGaps)) errors.push("Missing 'marketGaps' array");
      if (!Array.isArray(data.competitiveAdvantages)) errors.push("Missing 'competitiveAdvantages' array");
      if (!Array.isArray(data.threats)) errors.push("Missing 'threats' array");
      if (!Array.isArray(data.recommendations)) errors.push("Missing 'recommendations' array");
      break;

    case "PITCH_OUTLINE":
      if (!Array.isArray(data.slides) || data.slides.length < 8) {
        errors.push("Missing or insufficient 'slides' array (need 8+)");
      } else {
        data.slides.forEach((slide: any, idx: number) => {
          if (typeof slide.slideNumber !== 'number') errors.push(`Slide ${idx}: missing 'slideNumber'`);
          if (!slide.title) errors.push(`Slide ${idx}: missing 'title'`);
          if (!slide.content) errors.push(`Slide ${idx}: missing 'content'`);
          if (!Array.isArray(slide.keyPoints)) errors.push(`Slide ${idx}: missing 'keyPoints' array`);
        });
      }
      if (!data.fundingAsk) errors.push("Missing 'fundingAsk' object");
      if (data.fundingAsk && !data.fundingAsk.amount) errors.push("Missing 'fundingAsk.amount'");
      break;

    case "BRAND_GUIDELINES":
      if (!data.brandStory) errors.push("Missing 'brandStory'");
      if (!Array.isArray(data.brandValues)) errors.push("Missing 'brandValues' array");
      if (!Array.isArray(data.brandPersonality)) errors.push("Missing 'brandPersonality' array");
      if (!data.visualIdentity) errors.push("Missing 'visualIdentity' object");
      if (!data.voiceAndTone) errors.push("Missing 'voiceAndTone' object");
      break;

    case "LAUNCH_ROADMAP":
      if (!data.launchStrategy) errors.push("Missing 'launchStrategy'");
      if (!Array.isArray(data.phases) || data.phases.length < 2) errors.push("Missing or insufficient 'phases' array (need 2+)");
      
      if (Array.isArray(data.phases)) {
        data.phases.forEach((phase: any, idx: number) => {
          if (!phase.name) errors.push(`Phase ${idx}: missing 'name'`);
          if (!phase.objective) errors.push(`Phase ${idx}: missing 'objective'`);
          if (!Array.isArray(phase.keyMilestones)) errors.push(`Phase ${idx}: missing 'keyMilestones' array`);
        });
      }
      break;

    case "FINANCIAL_PROJECTIONS":
      if (!data.projectionPeriod) errors.push("Missing 'projectionPeriod'");
      if (!data.revenueModel) errors.push("Missing 'revenueModel' object");
      if (!data.costStructure) errors.push("Missing 'costStructure' object");
      if (!Array.isArray(data.profitability)) errors.push("Missing 'profitability' array");
      if (!Array.isArray(data.assumptions)) errors.push("Missing 'assumptions' array");
      break;

    case "RISK_ASSESSMENT":
      if (!Array.isArray(data.riskCategories) || data.riskCategories.length === 0) {
        errors.push("Missing or empty 'riskCategories' array");
      } else {
        data.riskCategories.forEach((cat: any, idx: number) => {
          if (!cat.category) errors.push(`Risk category ${idx}: missing 'category'`);
          if (!Array.isArray(cat.risks)) errors.push(`Risk category ${idx}: missing 'risks' array`);
        });
      }
      break;

    case "GTM_STRATEGY":
      if (!data.marketAnalysis) errors.push("Missing 'marketAnalysis' object");
      if (!data.positioning) errors.push("Missing 'positioning' object");
      if (!Array.isArray(data.channelStrategy)) errors.push("Missing 'channelStrategy' array");
      if (!data.pricingStrategy) errors.push("Missing 'pricingStrategy' object");
      if (!data.salesStrategy) errors.push("Missing 'salesStrategy' object");
      break;

    case "PRODUCT_ROADMAP":
      if (!data.productVision) errors.push("Missing 'productVision'");
      if (!Array.isArray(data.phases) || data.phases.length === 0) errors.push("Missing or empty 'phases' array");
      
      if (Array.isArray(data.phases)) {
        data.phases.forEach((phase: any, idx: number) => {
          if (!phase.phase) errors.push(`Phase ${idx}: missing 'phase' name`);
          if (!Array.isArray(phase.features)) errors.push(`Phase ${idx}: missing 'features' array`);
        });
      }
      break;

    case "TEAM_STRUCTURE":
      if (!data.organizationChart) errors.push("Missing 'organizationChart' object");
      if (!Array.isArray(data.coreRoles) || data.coreRoles.length === 0) {
        errors.push("Missing or empty 'coreRoles' array");
      } else {
        data.coreRoles.forEach((role: any, idx: number) => {
          if (!role.title) errors.push(`Role ${idx}: missing 'title'`);
          if (!Array.isArray(role.responsibilities)) errors.push(`Role ${idx}: missing 'responsibilities' array`);
          if (!Array.isArray(role.skills)) errors.push(`Role ${idx}: missing 'skills' array`);
        });
      }
      break;

    case "FUNDING_STRATEGY":
      if (!data.capitalRequirements) errors.push("Missing 'capitalRequirements' object");
      if (!Array.isArray(data.fundingRounds) || data.fundingRounds.length === 0) {
        errors.push("Missing or empty 'fundingRounds' array");
      } else {
        data.fundingRounds.forEach((round: any, idx: number) => {
          if (!round.round) errors.push(`Funding round ${idx}: missing 'round'`);
          if (typeof round.amount !== 'number') errors.push(`Funding round ${idx}: missing or invalid 'amount'`);
          if (!Array.isArray(round.useOfFunds)) errors.push(`Funding round ${idx}: missing 'useOfFunds' array`);
        });
      }
      if (!data.investorTargeting) errors.push("Missing 'investorTargeting' object");
      break;

    default:
      errors.push(`Unknown asset type: ${type}`);
  }

  return { valid: errors.length === 0, errors };
}

// Retry logic for generating asset
async function generateAssetWithRetry(
  type: string,
  systemPrompt: string,
  prompt: string,
  maxRetries: number = 2
): Promise<AssetGenerationResponse> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries + 1} for ${type}`);
      
      const response = await callOpenAI([
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ], DEFAULT_MODEL_STR, 0.7, 4000);

      let responseContent = response.choices[0]?.message?.content || "{}";
      console.log(`📄 Response content length: ${responseContent.length}`);

      // Strip markdown code blocks if present
      const jsonMatch = responseContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        responseContent = jsonMatch[1];
        console.log(`📝 Stripped markdown code blocks`);
      }

      // Parse JSON
      const result = JSON.parse(responseContent);
      
      // Validate structure
      if (!result.title) {
        throw new Error("Missing 'title' field in response");
      }
      if (!result.data) {
        throw new Error("Missing 'data' field in response");
      }

      // Validate asset-specific data
      const validation = validateAssetData(type, result.data);
      if (!validation.valid) {
        console.warn(`⚠️  Validation errors on attempt ${attempt}:`, validation.errors);
        if (attempt <= maxRetries) {
          console.log(`🔁 Retrying with validation feedback...`);
          // Add validation errors to next prompt
          prompt += `\n\nIMPORTANT: Previous response had these errors:\n${validation.errors.join('\n')}\nPlease fix these issues.`;
          continue;
        }
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      return {
        title: result.title,
        data: result.data,
        markdown: result.markdown,
        html: result.html,
      };

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`❌ Attempt ${attempt} failed:`, {
        error: lastError.message,
        attempt,
        maxRetries
      });

      if (attempt <= maxRetries) {
        console.log(`🔁 Retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        continue;
      }
    }
  }

  throw new Error(`Failed to generate ${type} after ${maxRetries + 1} attempts: ${lastError?.message}`);
}

export async function generateBusinessAsset(request: AssetGenerationRequest): Promise<AssetGenerationResponse> {
  console.log(`\n🎯 === generateBusinessAsset START ===`);
  console.log(`📋 Request:`, {
    type: request.type,
    language: request.additionalData?.language || 'en'
  });

  const { type, context, businessDescription, additionalData } = request;
  const language = additionalData?.language || 'en';
  const isArabic = language === 'ar';
  
  let prompt = "";
  let systemPrompt = "";
  
  // Base instruction for all prompts
  const baseInstruction = `${isArabic ? 
    'متطلبات حرجة: يجب أن تستجيب بتنسيق JSON صالح فقط. جميع القيم يجب أن تكون بالعربية. أسماء المفاتيح بالإنجليزية.' : 
    'CRITICAL: You MUST respond with valid JSON format ONLY. All values in English. Keys in English.'}

${isArabic ? 'البنية المطلوبة:' : 'Required structure:'}
{
  "title": "${isArabic ? 'العنوان (نص)' : 'Title (string)'}",
  "data": { ... ${isArabic ? 'البيانات حسب النوع' : 'asset-specific data'} ... },
  "markdown": "${isArabic ? 'تنسيق markdown (اختياري)' : 'markdown format (optional)'}"
}

${isArabic ? 'تحذير: عدم اتباع هذا التنسيق سيؤدي إلى رفض الاستجابة.' : 'WARNING: Failure to follow this format will result in rejection.'}`;

  switch (type) {
    case "TEAM_ROLES":
      systemPrompt = `You are a senior HR consultant and organizational development expert with 15+ years of experience building high-performing startup teams.

${baseInstruction}

REQUIRED JSON STRUCTURE (ALL fields MANDATORY):
{
  "title": "string - Team Roles title",
  "data": {
    "roles": [
      {
        "name": "string" - REQUIRED: Role title (e.g., "Venture Lead", "Tech Lead", "Marketing Lead"),
        "description": "string" - REQUIRED: Brief role description (1-2 sentences),
        "responsibilities_1": "string" - REQUIRED: First key responsibility,
        "responsibilities_2": "string" - REQUIRED: Second key responsibility,
        "responsibilities_3": "string" - REQUIRED: Third key responsibility,
        "personal_attributes_1": "string" - REQUIRED: First important personal attribute,
        "personal_attributes_2": "string" - REQUIRED: Second important personal attribute,
        "personal_attributes_3": "string" - REQUIRED: Third important personal attribute,
        "driving_motivators_1": "string" - REQUIRED: First driving motivator,
        "driving_motivators_2": "string" - REQUIRED: Second driving motivator,
        "driving_motivators_3": "string" - REQUIRED: Third driving motivator
      }
    ] - REQUIRED: EXACTLY 5 roles
  },
  "markdown": "string - OPTIONAL"
}

${isArabic ? `إرشادات مهمة:
- يجب إنشاء ٥ أدوار بالضبط
- لكل دور: اسم، وصف، ٣ مسؤوليات، ٣ صفات شخصية، ٣ دوافع
- المسؤوليات: مهام ووظائف محددة
- الصفات الشخصية: مهارات ناعمة وسمات شخصية
- الدوافع: ما يحفز هذا الشخص للعمل في هذا الدور` : `CRITICAL GUIDELINES:
- Must create EXACTLY 5 roles
- Each role: name, description, 3 responsibilities, 3 personal attributes, 3 driving motivators
- Responsibilities: Specific tasks and functions
- Personal Attributes: Soft skills and personality traits
- Driving Motivators: What motivates this person to work in this role`}

TEAM ROLE EXAMPLES:

**Role 1: Venture Lead**
name: "Venture Lead"
description: "The quarterback of the venture, responsible for overall project coordination, communication, and keeping everything on track."

responsibilities_1: "Overall project vision, strategy & coordination"
responsibilities_2: "Securing funding and managing resources"
responsibilities_3: "Communication with investors, advisors, and team members"

personal_attributes_1: "Strong leadership, communication, and interpersonal skills"
personal_attributes_2: "Strategic thinking and problem-solving abilities"
personal_attributes_3: "Passion for the venture's vision and resilience in the face of challenges"

driving_motivators_1: "Building something innovative and impactful"
driving_motivators_2: "The challenge of creating a successful venture"
driving_motivators_3: "Financial rewards and personal growth"

**Role 2: Tech Lead**
name: "Tech Lead"
description: "Responsible for all technical aspects of the product, from architecture to implementation and quality assurance."

responsibilities_1: "Product architecture, development, and technical roadmap"
responsibilities_2: "Code quality, testing, and technical documentation"
responsibilities_3: "Technology stack selection and infrastructure management"

personal_attributes_1: "Deep technical expertise and coding skills"
personal_attributes_2: "Attention to detail and commitment to quality"
personal_attributes_3: "Ability to translate business requirements into technical solutions"

driving_motivators_1: "Solving complex technical challenges"
driving_motivators_2: "Building scalable, elegant software solutions"
driving_motivators_3: "Learning and working with cutting-edge technologies"

**Role 3: Marketing Lead**
name: "Marketing Lead"
description: "Drives customer acquisition, brand awareness, and market positioning through strategic marketing initiatives."

responsibilities_1: "Marketing strategy, brand positioning, and messaging"
responsibilities_2: "Customer acquisition channels and growth campaigns"
responsibilities_3: "Analytics, metrics tracking, and performance optimization"

personal_attributes_1: "Creative thinking and storytelling abilities"
personal_attributes_2: "Data-driven decision-making and analytical skills"
personal_attributes_3: "Understanding of customer psychology and market trends"

driving_motivators_1: "Creating compelling brand stories and campaigns"
driving_motivators_2: "Achieving measurable growth and market impact"
driving_motivators_3: "Building brand recognition and customer loyalty"

**Role 4: Finance Lead**
name: "Finance Lead"
description: "Manages financial planning, budgeting, fundraising, and ensures the venture's financial health and sustainability."

responsibilities_1: "Financial planning, budgeting, and forecasting"
responsibilities_2: "Fundraising strategy and investor relations"
responsibilities_3: "Financial reporting, compliance, and risk management"

personal_attributes_1: "Strong analytical and numerical skills"
personal_attributes_2: "Attention to detail and accuracy"
personal_attributes_3: "Strategic thinking about financial sustainability"

driving_motivators_1: "Ensuring financial health and sustainability"
driving_motivators_2: "Optimizing resource allocation and ROI"
driving_motivators_3: "Supporting business growth through smart financial decisions"

**Role 5: Operations Lead**
name: "Operations Lead"
description: "Ensures smooth day-to-day operations, process optimization, and operational excellence across the organization."

responsibilities_1: "Operations management, process design, and optimization"
responsibilities_2: "Supply chain, logistics, and vendor management"
responsibilities_3: "Quality assurance and operational metrics tracking"

personal_attributes_1: "Organizational and project management skills"
personal_attributes_2: "Problem-solving and process improvement mindset"
personal_attributes_3: "Ability to manage multiple priorities and stakeholders"

driving_motivators_1: "Creating efficient, scalable operational systems"
driving_motivators_2: "Solving operational challenges and improving processes"
driving_motivators_3: "Enabling the team to focus on growth and innovation"

GUIDELINES FOR STRONG TEAM ROLES:

1. **Name**: Clear, standard role title (e.g., "Tech Lead" not "Technology Person")
2. **Description**: 1-2 sentences capturing the essence of the role
3. **Responsibilities**: Specific, actionable tasks and functions
4. **Personal Attributes**: Mix of hard and soft skills needed
5. **Driving Motivators**: Intrinsic motivations that drive success in this role

ROLE CATEGORIES TO COVER (Choose 5 most relevant):
- Leadership: Venture Lead, CEO, Founder
- Technical: Tech Lead, CTO, Engineering Lead, Product Lead
- Marketing: Marketing Lead, Growth Lead, CMO
- Sales: Sales Lead, Business Development Lead
- Finance: Finance Lead, CFO
- Operations: Operations Lead, COO
- Design: Design Lead, UX Lead
- Customer Success: Customer Success Lead, Support Lead
- HR: People & Culture Lead, HR Lead

RESPOND WITH VALID JSON ONLY. NO ADDITIONAL TEXT.`;
      
      prompt = `${isArabic ? 'أنشئ ٥ أدوار فريق رئيسية بالضبط' : 'Create EXACTLY 5 key team roles'} for: ${businessDescription}

${isArabic ? 'السياق' : 'Context'}: ${context}

${isArabic ? `المتطلبات الحرجة:
1. يجب إنشاء ٥ أدوار بالضبط (لا أكثر، لا أقل)
2. لكل دور يجب أن يحتوي على:
   - name: اسم الدور
   - description: وصف موجز (1-2 جملة)
   - responsibilities_1, responsibilities_2, responsibilities_3: ٣ مسؤوليات محددة
   - personal_attributes_1, personal_attributes_2, personal_attributes_3: ٣ صفات شخصية
   - driving_motivators_1, driving_motivators_2, driving_motivators_3: ٣ دوافع
3. اختر الأدوار الأكثر أهمية لهذا المشروع
4. كن محددًا وعمليًا في المسؤوليات والصفات` : `CRITICAL REQUIREMENTS:
1. Must create EXACTLY 5 roles (no more, no less)
2. Each role must contain:
   - name: Role title
   - description: Brief description (1-2 sentences)
   - responsibilities_1, responsibilities_2, responsibilities_3: 3 specific responsibilities
   - personal_attributes_1, personal_attributes_2, personal_attributes_3: 3 personal attributes
   - driving_motivators_1, driving_motivators_2, driving_motivators_3: 3 driving motivators
3. Choose the most important roles for this venture
4. Be specific and practical in responsibilities and attributes`}

${isArabic ? `أمثلة على الأدوار الشائعة:
1. قائد المشروع (Venture Lead)
2. القائد التقني (Tech Lead)
3. قائد التسويق (Marketing Lead)
4. قائد المالية (Finance Lead)
5. قائد العمليات (Operations Lead)

اختر ٥ أدوار تناسب هذا المشروع بشكل أفضل.` : `Common role examples:
1. Venture Lead (Overall coordination)
2. Tech Lead (Technical development)
3. Marketing Lead (Growth & acquisition)
4. Finance Lead (Financial management)
5. Operations Lead (Day-to-day operations)

Choose the 5 roles that best fit this venture.`}

RESPOND WITH VALID JSON ONLY.`;
      break;
    case "BRAND_IDENTITY":
      systemPrompt = `You are a brand identity designer and color theory expert with extensive experience creating cohesive visual identities for successful brands.

${baseInstruction}

REQUIRED JSON STRUCTURE (ALL fields MANDATORY):
{
  "title": "string - Brand Identity title",
  "data": {
    "color_name_1": "string" - REQUIRED: Name of lightest shade (e.g., "Light Blue", "Soft Coral"),
    "color_name_2": "string" - REQUIRED: Name of 2nd shade,
    "color_name_3": "string" - REQUIRED: Name of 3rd/middle shade,
    "color_name_4": "string" - REQUIRED: Name of 4th shade,
    "color_name_5": "string" - REQUIRED: Name of darkest shade,
    "color_hex_1": "string" - REQUIRED: Hex code for lightest shade (e.g., "#ADD8E6"),
    "color_hex_2": "string" - REQUIRED: Hex code for 2nd shade,
    "color_hex_3": "string" - REQUIRED: Hex code for 3rd/middle shade,
    "color_hex_4": "string" - REQUIRED: Hex code for 4th shade,
    "color_hex_5": "string" - REQUIRED: Hex code for darkest shade,
    "color_des": "string" - REQUIRED: Description of color scheme inspiration and meaning (2-3 sentences),
    "logo_idea": "string" - REQUIRED: Logo concept description with symbolism (2-3 sentences),
    "typography": "string" - REQUIRED: Font choices with rationale (2-3 sentences),
    "imagery_photography": "string" - REQUIRED: Visual style and imagery guidelines (2-3 sentences),
    "brand_voice": "string" - REQUIRED: Brand voice characteristics (2-3 sentences),
    "brand_values": "string" - REQUIRED: Core brand values (comma-separated with brief explanations),
    "brand_personality_traits": "string" - REQUIRED: Brand personality traits (comma-separated),
    "customer_promise": "string" - REQUIRED: Promise to customers (1-2 sentences)
  },
  "markdown": "string - OPTIONAL"
}

${isArabic ? `إرشادات مهمة:
- الألوان: 5 درجات من اللون نفسه (من الفاتح إلى الداكن) مع أسماء ورموز hex
- color_des: وصف إلهام ومعنى نظام الألوان
- logo_idea: مفهوم الشعار مع الرمزية
- typography: اختيارات الخطوط مع التبرير
- imagery_photography: إرشادات الأسلوب البصري
- brand_voice: خصائص صوت العلامة التجارية
- brand_values: القيم الأساسية (مفصولة بفواصل)
- brand_personality_traits: سمات الشخصية (مفصولة بفواصل)
- customer_promise: الوعد للعملاء` : `CRITICAL GUIDELINES:
- Colors: 5 shades of same hue (light to dark) with names and hex codes
- color_des: Description of color scheme inspiration and meaning
- logo_idea: Logo concept with symbolism
- typography: Font choices with rationale
- imagery_photography: Visual style guidelines
- brand_voice: Brand voice characteristics
- brand_values: Core values (comma-separated)
- brand_personality_traits: Personality traits (comma-separated)
- customer_promise: Promise to customers`}

COLOR PALETTE GUIDELINES:

**Requirement:** Generate 5 hex color codes for shades of the SAME COLOR ranging from light to dark while maintaining the same hue.

Good Examples:
✅ Blue Palette:
- color_name_1: "Light Blue" → color_hex_1: "#ADD8E6"
- color_name_2: "Sky Blue" → color_hex_2: "#87CEEB"
- color_name_3: "Dodger Blue" → color_hex_3: "#1E90FF"
- color_name_4: "Royal Blue" → color_hex_4: "#4169E1"
- color_name_5: "Medium Blue" → color_hex_5: "#0000CD"

✅ Teal Palette (Saudi Arabia inspired):
- color_name_1: "Mint Teal" → color_hex_1: "#B2E3E0"
- color_name_2: "Light Teal" → color_hex_2: "#7DD3C0"
- color_name_3: "Turquoise" → color_hex_3: "#14B8A6"
- color_name_4: "Deep Teal" → color_hex_4: "#0D9488"
- color_name_5: "Dark Teal" → color_hex_5: "#115E59"

Bad Examples:
❌ Mixing different hues (Red, Blue, Green, Yellow, Purple)
❌ Random colors without progression (all dark or all light)
❌ Non-sequential hex values that don't form a gradient

**Color Description:** Must explain the inspiration (culture, industry, emotion) and why this color represents the brand.

VISUAL IDENTITY COMPONENTS:

**logo_idea:**
Format: 2-3 sentences describing the concept and symbolism
Examples:
✅ "The logo for Swah features a stylized letter 'S' integrated with elements representing travel and exploration, symbolizing our innovative and personalized approach to travel planning. The curves in the design echo the winding paths of Saudi Arabia's landscapes, creating a sense of journey and discovery."
✅ "A minimalist geometric mark combining a hexagon (stability) with a forward arrow (progress), representing our commitment to reliable innovation. The negative space forms a subtle 'T' for technology."
❌ "Logo with company name" (not descriptive)
❌ "Modern design" (too vague)

**typography:**
Format: Main font + secondary font with rationale
Examples:
✅ "We chose Lato as the main font for its modern and friendly appearance, complemented by Playfair Display as the secondary font to add elegance and sophistication to our brand identity."
✅ "Inter for headings (clean, tech-forward) paired with Georgia for body text (readable, trustworthy), creating a balance between innovation and reliability."
❌ "Arial and Times New Roman" (no rationale)
❌ "Modern fonts" (not specific)

**imagery_photography:**
Format: Visual style description
Examples:
✅ "Our imagery showcases the beauty of Saudi Arabia's landscapes, rich culture, and immersive travel experiences, capturing the essence of adventure and exploration. Photography style emphasizes natural lighting, vibrant colors, and authentic moments."
✅ "Clean, minimalist product photography on white backgrounds with pops of our teal brand color. Lifestyle shots feature diverse professionals in modern workspaces, conveying productivity and innovation."
❌ "Nice pictures" (not specific)
❌ "Professional photos" (too generic)

BRAND VOICE & VALUES:

**brand_voice:**
Format: 2-3 adjectives + explanation
Examples:
✅ "Swah's brand voice is informative, inviting, and tailored to inspire travelers to discover the hidden gems of Saudi Arabia. We communicate with warmth and expertise, making complex travel planning feel effortless and exciting."
✅ "Professional yet approachable, blending technical expertise with human warmth. We speak confidently about our capabilities while remaining humble and customer-focused."
❌ "Friendly" (incomplete)
❌ "We talk to customers" (not descriptive)

**brand_values:**
Format: 4-6 values with brief explanations (comma-separated)
Examples:
✅ "Innovation (pushing boundaries and embracing new ideas), Personalization (tailoring experiences to individual needs), Cultural Integration (honoring and showcasing local heritage), Exclusive Access (providing unique opportunities)"
✅ "Trust (building lasting relationships), Quality (never compromising standards), Sustainability (caring for environment), Transparency (honest communication)"
❌ "Good, Nice, Happy" (too generic)
❌ "Values" (not specific)

**brand_personality_traits:**
Format: 4-6 traits (comma-separated)
Examples:
✅ "Innovative, Personalized, Adventurous, Cultural, Exclusive"
✅ "Reliable, Friendly, Expert, Modern, Caring, Efficient"
❌ "Normal" (not distinctive)
❌ "Professional" (incomplete, need more traits)

**customer_promise:**
Format: 1-2 sentences about what customers can expect
Examples:
✅ "We promise to provide travelers with unforgettable and tailored experiences, showcasing the best of Saudi Arabia's hidden treasures while ensuring seamless, worry-free planning."
✅ "We guarantee reliable, expert automotive care delivered to your doorstep with complete transparency, saving you time while protecting the environment."
❌ "Good service" (too vague)
❌ "We will help you" (not specific)

RESPOND WITH VALID JSON ONLY. NO ADDITIONAL TEXT.`;
      
      prompt = `${isArabic ? 'أنشئ هوية بصرية كاملة للعلامة التجارية' : 'Create comprehensive brand identity'} for: ${businessDescription}

${isArabic ? 'السياق' : 'Context'}: ${context}

${isArabic ? `المتطلبات الحرجة:
1. لوحة ألوان: 5 درجات من نفس اللون (من فاتح إلى داكن) مع الأسماء ورموز hex
2. color_des: وصف الإلهام والمعنى
3. logo_idea: مفهوم الشعار مع الرمزية (2-3 جمل)
4. typography: خطوط مع التبرير (2-3 جمل)
5. imagery_photography: أسلوب بصري (2-3 جمل)
6. brand_voice: خصائص الصوت (2-3 جمل)
7. brand_values: 4-6 قيم مع شرح (مفصولة بفواصل)
8. brand_personality_traits: 4-6 سمات (مفصولة بفواصل)
9. customer_promise: وعد للعملاء (1-2 جملة)` : `CRITICAL REQUIREMENTS:
1. Color palette: 5 shades of SAME color (light to dark) with names and hex codes
2. color_des: Inspiration and meaning description
3. logo_idea: Logo concept with symbolism (2-3 sentences)
4. typography: Fonts with rationale (2-3 sentences)
5. imagery_photography: Visual style (2-3 sentences)
6. brand_voice: Voice characteristics (2-3 sentences)
7. brand_values: 4-6 values with explanations (comma-separated)
8. brand_personality_traits: 4-6 traits (comma-separated)
9. customer_promise: Promise to customers (1-2 sentences)`}

${isArabic ? `مثال على نظام الألوان:
color_name_1: "أزرق فاتح"
color_name_2: "أزرق سماوي"
color_name_3: "أزرق دودجر"
color_name_4: "أزرق ملكي"
color_name_5: "أزرق متوسط"
color_hex_1: "#ADD8E6"
color_hex_2: "#87CEEB"
color_hex_3: "#1E90FF"
color_hex_4: "#4169E1"
color_hex_5: "#0000CD"
color_des: "نظام الألوان مستوحى من المناظر الطبيعية النابضة بالحياة في المملكة العربية السعودية..."` : `Example color system:
color_name_1: "Light Blue"
color_name_2: "Sky Blue"
color_name_3: "Dodger Blue"
color_name_4: "Royal Blue"
color_name_5: "Medium Blue"
color_hex_1: "#ADD8E6"
color_hex_2: "#87CEEB"
color_hex_3: "#1E90FF"
color_hex_4: "#4169E1"
color_hex_5: "#0000CD"
color_des: "The color scheme is inspired by the vibrant landscapes of Saudi Arabia..."`}

RESPOND WITH VALID JSON ONLY.`;
      break;
    case "BRAND_WHEEL":
      systemPrompt = `You are a senior brand strategist with 15+ years of experience building compelling brand identities for successful companies across industries.

${baseInstruction}

REQUIRED JSON STRUCTURE (ALL fields MANDATORY):
{
  "title": "string - Brand Wheel title",
  "data": {
    "mission": "string" - REQUIRED: Company mission statement (2-3 sentences, what you do and why),
    "vision": "string" - REQUIRED: Company vision statement (2-3 sentences, where you're headed),
    "brand_positioning": "string" - REQUIRED: Brand positioning statement (2-3 sentences, how you stand out),
    "brand_values": "string" - REQUIRED: Core brand values (comma-separated list of 4-6 values with brief explanations),
    "personality": "string" - REQUIRED: Brand personality traits (comma-separated list of 4-6 traits with brief descriptions)
  },
  "markdown": "string - OPTIONAL"
}

${isArabic ? `إرشادات مهمة:
- mission: بيان المهمة - ماذا تفعل ولماذا (2-3 جمل)
- vision: بيان الرؤية - إلى أين تتجه (2-3 جمل)
- brand_positioning: كيف تبرز في السوق (2-3 جمل)
- brand_values: 4-6 قيم أساسية مع شرح موجز (مفصولة بفواصل)
- personality: 4-6 صفات شخصية العلامة التجارية مع أوصاف (مفصولة بفواصل)` : `CRITICAL GUIDELINES:
- mission: Mission statement - what you do and why (2-3 sentences)
- vision: Vision statement - where you're headed (2-3 sentences)
- brand_positioning: How you stand out in market (2-3 sentences)
- brand_values: 4-6 core values with brief explanation (comma-separated)
- personality: 4-6 brand personality traits with descriptions (comma-separated)`}

BRAND WHEEL COMPONENTS EXPLAINED:

**Mission Statement:**
Purpose: Defines what the company does, who it serves, and why it exists
Format: 2-3 clear, inspiring sentences
Examples:
✅ "To empower every individual and organization on the planet to achieve more through our innovative technology and solutions. Our mission is to continuously push the boundaries of what is possible, ensuring that everyone has access to the tools and resources needed to succeed in an increasingly digital world."
✅ "To revolutionize car care by providing convenient, reliable, and eco-friendly automotive services that save time and give peace of mind. We exist to make vehicle maintenance effortless for busy professionals while promoting sustainable practices."
❌ "To be the best" (too vague)
❌ "We sell cars" (not inspiring or clear about purpose)

**Vision Statement:**
Purpose: Describes the desired future state and long-term aspirations
Format: 2-3 forward-looking, aspirational sentences
Examples:
✅ "To create a world where everyone has the opportunity to thrive, driven by our commitment to sustainability, inclusivity, and digital transformation. Our vision is to be a catalyst for positive change, fostering a global community that embraces technological advancement and works together towards a better future."
✅ "To become the most trusted automotive care brand in the Middle East, where every vehicle owner experiences hassle-free maintenance and contributes to a greener planet. We envision a future where sustainable car care is the norm, not the exception."
❌ "To make money" (not inspiring)
❌ "To grow the company" (not specific about impact)

**Brand Positioning:**
Purpose: Articulates unique value proposition and competitive differentiation
Format: 2-3 sentences explaining what makes you different
Examples:
✅ "As a leading provider of cutting-edge technology solutions, we stand at the forefront of innovation, delivering unmatched value and support to our customers worldwide. Our brand is synonymous with excellence, reliability, and a relentless pursuit of progress, setting the standard for what technology can achieve."
✅ "We position ourselves as the premium on-demand automotive care solution that combines traditional craftsmanship with modern convenience and eco-consciousness. Unlike traditional service centers, we bring expert care to your doorstep while maintaining the highest sustainability standards."
❌ "We're good at what we do" (not specific)
❌ "We offer services" (doesn't differentiate)

**Brand Values:**
Purpose: Core principles that guide decisions and behavior
Format: 4-6 values with brief explanations (comma-separated)
Examples:
✅ "Innovation (pushing boundaries and embracing new ideas), Integrity (upholding honesty and transparency in all dealings), Customer-centricity (prioritizing customer needs and satisfaction), Sustainability (committing to environmentally responsible practices), Inclusivity (promoting diversity and equal opportunities), Excellence (striving for the highest quality in everything we do)"
✅ "Trust (building lasting relationships through reliability), Convenience (making life easier for our customers), Quality (never compromising on service standards), Sustainability (caring for the environment), Transparency (honest communication at every step)"
❌ "Good, Nice, Happy" (too generic)
❌ "Making money" (not a value)

**Personality:**
Purpose: Human characteristics that define brand character and tone
Format: 4-6 traits with descriptions (comma-separated)
Examples:
✅ "Bold (taking daring approaches to challenges and standing out), Innovative (constantly seeking novel solutions and improvements), Trustworthy (maintaining steadfast reliability and dependability), Inclusive (welcoming and open to all), Supportive (providing unwavering assistance to community and customers), Professional (maintaining high standards and expertise)"
✅ "Reliable (you can count on us every time), Friendly (approachable and warm), Expert (knowledgeable and skilled), Modern (forward-thinking and tech-savvy), Caring (genuinely concerned about customer wellbeing), Efficient (respecting your time and delivering promptly)"
❌ "Normal, Regular" (not distinctive)
❌ "Aggressive, Pushy" (negative traits)

GUIDELINES FOR STRONG BRAND WHEEL:

1. **Mission**: Focus on purpose and impact, not just what you sell
2. **Vision**: Be aspirational but achievable, paint a picture of the future
3. **Positioning**: Clearly state what makes you unique vs competitors
4. **Values**: Choose 4-6 authentic values that guide decisions
5. **Personality**: Select traits that match your target audience's preferences

COHERENCE CHECK:
- Mission and Vision should align (mission = now, vision = future)
- Values should support the Mission/Vision
- Personality should match how you want customers to perceive you
- Positioning should reflect your Values and Personality

RESPOND WITH VALID JSON ONLY. NO ADDITIONAL TEXT.`;
      
      prompt = `${isArabic ? 'أنشئ Brand Wheel شامل' : 'Create comprehensive Brand Wheel'} for: ${businessDescription}

${isArabic ? 'السياق' : 'Context'}: ${context}

${isArabic ? `المتطلبات الحرجة:
1. mission: بيان مهمة ملهم (2-3 جمل)
2. vision: بيان رؤية طموح (2-3 جمل)
3. brand_positioning: موقع فريد واضح (2-3 جمل)
4. brand_values: 4-6 قيم أساسية مع شرح (مفصولة بفواصل)
5. personality: 4-6 صفات شخصية مع وصف (مفصولة بفواصل)
6. تأكد من الترابط بين جميع المكونات` : `CRITICAL REQUIREMENTS:
1. mission: Inspiring mission statement (2-3 sentences)
2. vision: Aspirational vision statement (2-3 sentences)
3. brand_positioning: Clear unique positioning (2-3 sentences)
4. brand_values: 4-6 core values with explanation (comma-separated)
5. personality: 4-6 personality traits with description (comma-separated)
6. Ensure all components are coherent and aligned`}

${isArabic ? `مثال على التنسيق:
mission: "للتمكين والابتكار..."
vision: "لإنشاء عالم حيث..."
brand_positioning: "كمزود رائد..."
brand_values: "الابتكار (دفع الحدود...), النزاهة (الحفاظ على...), التركيز على العملاء (إعطاء الأولوية...)"
personality: "جريء (اتخاذ نهج جريء...), مبتكر (البحث المستمر...), جدير بالثقة (الحفاظ على...)"` : `Example format:
mission: "To empower and innovate..."
vision: "To create a world where..."
brand_positioning: "As a leading provider..."
brand_values: "Innovation (pushing boundaries...), Integrity (upholding...), Customer-centricity (prioritizing...)"
personality: "Bold (taking daring approaches...), Innovative (constantly seeking...), Trustworthy (maintaining...)"`}

RESPOND WITH VALID JSON ONLY.`;
      break;
    case "INTERVIEW_QUESTIONS":
      systemPrompt = `You are a customer development expert and lean startup practitioner with extensive experience conducting customer interviews and validating business ideas.

${baseInstruction}

REQUIRED JSON STRUCTURE (ALL fields MANDATORY):
{
  "title": "string - Interview Questions title",
  "data": {
    "inDepth": {
      "question_1": "string" - REQUIRED: In-depth question about problem/solution,
      "question_2": "string" - REQUIRED: In-depth question about problem/solution,
      "question_3": "string" - REQUIRED: In-depth question about problem/solution,
      "question_4": "string" - REQUIRED: In-depth question about problem/solution,
      "question_5": "string" - REQUIRED: In-depth question about problem/solution,
      "question_6": "string" - REQUIRED: In-depth question about problem/solution,
      "question_7": "string" - REQUIRED: In-depth question about problem/solution,
      "question_8": "string" - REQUIRED: In-depth question about problem/solution,
      "question_9": "string" - REQUIRED: In-depth question about problem/solution,
      "question_10": "string" - REQUIRED: In-depth question about problem/solution
    },
    "demographic": {
      "question_11": "string" - REQUIRED: Demographic/background question,
      "question_12": "string" - REQUIRED: Demographic/background question,
      "question_13": "string" - REQUIRED: Demographic/background question
    },
    "wrapUp": {
      "question_14": "string" - REQUIRED: Wrap-up/closing question,
      "question_15": "string" - REQUIRED: Wrap-up/closing question,
      "question_16": "string" - REQUIRED: Wrap-up/closing question
    }
  },
  "markdown": "string - OPTIONAL"
}

${isArabic ? `إرشادات مهمة:
- أسئلة متعمقة (1-10): أسئلة مفتوحة حول المشكلة والحل والسلوكيات
- أسئلة ديموغرافية (11-13): أسئلة حول الخلفية والتركيبة السكانية
- أسئلة ختامية (14-16): أسئلة للتلخيص والتوصيات والخطوات التالية
- استخدم أسئلة مفتوحة (ماذا، كيف، لماذا) وليس أسئلة نعم/لا
- تجنب الأسئلة الموجهة أو المتحيزة` : `CRITICAL GUIDELINES:
- In-depth questions (1-10): Open-ended questions about problem, solution, and behaviors
- Demographic questions (11-13): Background and demographic information
- Wrap-up questions (14-16): Summary, recommendations, and next steps
- Use open-ended questions (what, how, why) not yes/no questions
- Avoid leading or biased questions`}

QUESTION TYPES AND EXAMPLES:

**In-Depth Questions (question_1 to question_10):**
Purpose: Understand the problem, current solutions, behaviors, and willingness to pay

Good Examples:
✅ "Can you walk me through the last time you experienced [problem]?"
✅ "What have you tried so far to solve this problem?"
✅ "How much time/money do you currently spend on solving this?"
✅ "What would an ideal solution look like to you?"
✅ "What concerns or hesitations would you have about using [solution]?"
✅ "How do you currently make decisions about [related category]?"
✅ "What would need to be true for you to switch from your current solution?"
✅ "Who else is involved in the decision-making process?"
✅ "What are the biggest frustrations with existing solutions?"
✅ "How important is solving this problem to you? (rate 1-10)"

Bad Examples:
❌ "Would you use our product?" (leading question)
❌ "Don't you think [problem] is frustrating?" (biased)
❌ "Do you like our idea?" (yes/no, not useful)
❌ "Isn't [competitor] terrible?" (unprofessional)

**Demographic Questions (question_11 to question_13):**
Purpose: Understand the interviewee's background and validate target segment

Good Examples:
✅ "What is your role or occupation?"
✅ "How long have you been working in [industry/field]?"
✅ "What's the size of your company/team?"
✅ "What's your age range?" (provide ranges, not exact)
✅ "What geographic area do you live/work in?"
✅ "What's your household/business income range?"
✅ "What education level have you completed?"
✅ "How tech-savvy would you consider yourself?"

**Wrap-Up Questions (question_14 to question_16):**
Purpose: Get referrals, gauge interest, and collect final thoughts

Good Examples:
✅ "Is there anything else about [topic] that we haven't discussed?"
✅ "Do you know anyone else who faces similar challenges that we could talk to?"
✅ "On a scale of 1-10, how interested would you be in trying a solution like this?"
✅ "What would be the most important feature for you?"
✅ "Would you be willing to participate in a beta test or pilot program?"
✅ "How can we stay in touch with updates on this project?"

QUESTION SEQUENCING STRATEGY:
1. Start with broad, contextual questions (question_1-3)
2. Dive into specific pain points and current solutions (question_4-7)
3. Explore willingness to change and decision criteria (question_8-10)
4. Gather demographic/background info (question_11-13)
5. Close with interest gauge and referrals (question_14-16)

RESPOND WITH VALID JSON ONLY. NO ADDITIONAL TEXT.`;
      
      prompt = `${isArabic ? 'أنشئ ١٦ سؤال مقابلة للتحقق من صحة الفكرة' : 'Create 16 customer interview questions to validate the business idea'} for: ${businessDescription}

${isArabic ? 'السياق' : 'Context'}: ${context}

${isArabic ? `المتطلبات الحرجة:
1. أسئلة متعمقة (1-10): ١٠ أسئلة مفتوحة حول المشكلة والحل
2. أسئلة ديموغرافية (11-13): ٣ أسئلة حول الخلفية
3. أسئلة ختامية (14-16): ٣ أسئلة للتلخيص والخطوات التالية
4. استخدم أسئلة "ماذا، كيف، لماذا" وليس "هل"
5. تجنب الأسئلة الموجهة أو المتحيزة
6. ركز على السلوكيات والتجارب الفعلية، ليس الآراء فقط` : `CRITICAL REQUIREMENTS:
1. In-depth questions (1-10): 10 open-ended questions about problem/solution
2. Demographic questions (11-13): 3 questions about background
3. Wrap-up questions (14-16): 3 questions for summary and next steps
4. Use "what, how, why" questions not "yes/no"
5. Avoid leading or biased questions
6. Focus on actual behaviors and experiences, not just opinions`}

${isArabic ? `أمثلة على الأسئلة:
- متعمق: "حدثني عن آخر مرة واجهت فيها [المشكلة]؟"
- ديموغرافي: "ما هو دورك أو مهنتك؟"
- ختامي: "هل تعرف أي شخص آخر يواجه تحديات مماثلة؟"` : `Example questions:
- In-depth: "Can you walk me through the last time you experienced [problem]?"
- Demographic: "What is your role or occupation?"
- Wrap-up: "Do you know anyone else who faces similar challenges?"`}

RESPOND WITH VALID JSON ONLY.`;
      break;
    case "USER_STORIES":
      systemPrompt = `You are a senior product manager and agile coach with 10+ years of experience writing user stories for successful software products.

${baseInstruction}

REQUIRED JSON STRUCTURE (ALL fields MANDATORY):
{
  "title": "string - User Stories title",
  "data": {
    "stories": [
      {
        "userStory": "string" - REQUIRED: User story in format "As a [role], I want to [action], so that [benefit]",
        "acceptanceCriteria": "string" - REQUIRED: Clear, testable acceptance criteria (multiple criteria separated by newlines or periods)
      }
    ] - REQUIRED: Exactly 5 user stories
  },
  "markdown": "string - OPTIONAL"
}

${isArabic ? `إرشادات مهمة:
- قصص المستخدم: يجب أن تتبع صيغة "كـ [دور]، أريد [إجراء]، حتى [فائدة]"
- معايير القبول: يجب أن تكون واضحة وقابلة للاختبار وقابلة للقياس
- كل قصة يجب أن تركز على قيمة واحدة واضحة للمستخدم
- معايير القبول يجب أن تغطي السيناريوهات الإيجابية والسلبية
- استخدم لغة بسيطة ومباشرة` : `CRITICAL GUIDELINES:
- User stories: Must follow format "As a [role], I want to [action], so that [benefit]"
- Acceptance criteria: Must be clear, testable, and measurable
- Each story should focus on one clear user value
- Acceptance criteria should cover positive and negative scenarios
- Use simple, direct language`}

USER STORY FORMAT EXAMPLES:
✅ GOOD:
"As a registered user, I want to reset my password via email, so that I can regain access to my account if I forget it."

❌ BAD:
"User login functionality" (not in user story format)
"Implement password reset" (technical, not user-focused)

ACCEPTANCE CRITERIA EXAMPLES:
✅ GOOD:
"User should be able to navigate to the 'Forgot Password' page. User should be able to input their registered email address. System should send a password reset link to the email within 2 minutes. User should be able to click the link and set a new password. User should see an error message if the email is not registered. Password reset link should expire after 24 hours."

❌ BAD:
"Password reset works" (not specific or testable)
"Email sent" (incomplete, doesn't cover all scenarios)

RESPOND WITH VALID JSON ONLY. NO ADDITIONAL TEXT.`;
      
      prompt = `${isArabic ? 'أنشئ ٥ قصص مستخدم شاملة' : 'Create exactly 5 comprehensive user stories'} for: ${businessDescription}

${isArabic ? 'السياق' : 'Context'}: ${context}

${isArabic ? `المتطلبات الحرجة:
1. يجب إنشاء ٥ قصص مستخدم بالضبط
2. كل قصة يجب أن تتبع صيغة "كـ [دور]، أريد [إجراء]، حتى [فائدة]"
3. معايير القبول يجب أن تكون محددة وقابلة للاختبار
4. غط جوانب مختلفة من المنتج/الخدمة
5. ركز على قيمة المستخدم، ليس على التفاصيل التقنية` : `CRITICAL REQUIREMENTS:
1. Must create exactly 5 user stories
2. Each story must follow format "As a [role], I want to [action], so that [benefit]"
3. Acceptance criteria must be specific and testable
4. Cover different aspects of the product/service
5. Focus on user value, not technical details`}

${isArabic ? `أمثلة على القصص:
1. قصة تسجيل الدخول/التسجيل
2. قصة الميزة الرئيسية
3. قصة إدارة الحساب
4. قصة المعاملات/العمليات
5. قصة الدعم/المساعدة` : `Example story types to cover:
1. Authentication/registration story
2. Core feature story
3. Account management story
4. Transaction/operation story
5. Support/help story`}

RESPOND WITH VALID JSON ONLY.`;
      break;
      
    case "LEAN_CANVAS":
      systemPrompt = `You are a seasoned business strategist with 15+ years experience helping startups build viable business models.

${baseInstruction}

REQUIRED JSON STRUCTURE (all fields are MANDATORY):
{
  "title": "string - Canvas title",
  "data": {
    "problem": ["string", "string", "string"] - REQUIRED: Array of 3-5 top customer problems,
    "solution": ["string", "string", "string"] - REQUIRED: Array of 3-5 key solutions/features,
    "keyMetrics": ["string", "string", "string"] - REQUIRED: Array of 3-5 KPIs to track,
    "uniqueValueProposition": "string" - REQUIRED: Single compelling value statement,
    "unfairAdvantage": "string" - REQUIRED: What can't be easily copied,
    "channels": ["string", "string"] - REQUIRED: Array of 3-5 distribution channels,
    "customerSegments": ["string", "string"] - REQUIRED: Array of 2-3 target segments,
    "costStructure": ["string", "string"] - REQUIRED: Array of major costs,
    "revenueStreams": ["string", "string"] - REQUIRED: Array of revenue models
  },
  "markdown": "string - OPTIONAL: Markdown formatted version"
}

${isArabic ? 'يجب أن تكون جميع القيم بالعربية الصحيحة.' : 'All values must be in proper English.'}`;
      
      prompt = `${isArabic ? 'أنشئ نموذج أعمال مبسط (Lean Canvas) مفصل' : 'Create a detailed Lean Canvas'} for: ${businessDescription}

${isArabic ? 'السياق' : 'Context'}: ${context}

${isArabic ? 
  'متطلبات:\n- جميع المصفوفات يجب أن تحتوي على ٣-٥ عناصر على الأقل\n- القيم يجب أن تكون محددة وقابلة للتنفيذ\n- استخدم المصطلحات التجارية العربية الصحيحة' :
  'Requirements:\n- All arrays must contain 3-5 specific items\n- Values must be concrete and actionable\n- Use proper business terminology'}

RESPOND WITH VALID JSON ONLY. NO ADDITIONAL TEXT.`;
      break;
      
    case "PERSONA":
      systemPrompt = `You are a senior UX researcher with extensive experience in user behavior analysis.

${baseInstruction}

REQUIRED JSON STRUCTURE:
{
  "title": "string - Personas title",
  "data": {
    "personas": [
      {
        "name": "string" - REQUIRED,
        "age": number - REQUIRED,
        "location": "string" - REQUIRED,
        "role": "string" - REQUIRED,
        "industry": "string" - REQUIRED,
        "income": "string" - REQUIRED,
        "education": "string" - REQUIRED,
        "goals": ["string", "string"] - REQUIRED: Array of 3-5 goals,
        "painPoints": ["string", "string"] - REQUIRED: Array of 3-5 pain points,
        "behaviors": ["string", "string"] - REQUIRED: Array of behaviors,
        "channels": ["string", "string"] - REQUIRED: Where to reach them,
        "quote": "string" - REQUIRED: Representative quote
      }
    ] - REQUIRED: Must have 3-4 personas
  },
  "markdown": "string - OPTIONAL"
}`;
      
      prompt = `${isArabic ? 'أنشئ ٣-٤ شخصيات مستخدمين شاملة' : 'Create 3-4 comprehensive user personas'} for: ${businessDescription}

Context: ${context}

MUST include 3-4 complete personas with ALL required fields.
RESPOND WITH VALID JSON ONLY.`;
      break;
      
    case "SWOT":
      systemPrompt = `You are a strategic consultant expert in competitive analysis.

${baseInstruction}

REQUIRED JSON STRUCTURE:
{
  "title": "string - SWOT Analysis title",
  "data": {
    "strengths": ["string", "string", "string"] - REQUIRED: 4-6 internal strengths,
    "weaknesses": ["string", "string", "string"] - REQUIRED: 4-6 internal weaknesses,
    "opportunities": ["string", "string", "string"] - REQUIRED: 4-6 external opportunities,
    "threats": ["string", "string", "string"] - REQUIRED: 4-6 external threats
  },
  "markdown": "string - OPTIONAL"
}`;
      
      prompt = `${isArabic ? 'أنشئ تحليل SWOT شامل' : 'Create comprehensive SWOT analysis'} for: ${businessDescription}

Context: ${context}

Each category MUST have 4-6 specific, actionable items.
RESPOND WITH VALID JSON ONLY.`;
      break;

    case "MARKETING_PLAN":
      systemPrompt = `You are a senior marketing strategist with expertise in omnichannel marketing, digital strategy, and customer journey optimization.

${baseInstruction}

REQUIRED JSON STRUCTURE (ALL fields MANDATORY):
{
  "title": "string - Marketing Plan title",
  "data": {
    "targeting": {
      "primaryAudience": "string" - REQUIRED: Primary target audience description (e.g., "Urban professionals aged 25-45 with disposable income"),
      "demographics": ["string"] - REQUIRED: Array of 4-6 demographic characteristics (age, income, location, education, occupation, etc.),
      "psychographics": ["string"] - REQUIRED: Array of 4-6 psychographic traits (interests, values, behaviors, lifestyle, pain points, etc.)
    },
    "messaging": {
      "valueProposition": "string" - REQUIRED: Clear, compelling value proposition (1-2 sentences),
      "keyMessages": ["string"] - REQUIRED: Array of 4-6 key marketing messages to communicate,
      "brandVoice": "string" - REQUIRED: Brand voice description (e.g., "Professional yet approachable, trustworthy, innovative")
    },
    "channels": {
      "digital": ["string"] - REQUIRED: Array of 4-6 digital marketing channels with tactics (e.g., "Social Media (Instagram/LinkedIn) - Influencer partnerships and targeted ads", "Email Marketing - Automated nurture campaigns", "SEO/Content Marketing - Blog posts and thought leadership"),
      "traditional": ["string"] - REQUIRED: Array of 2-4 traditional channels if applicable (e.g., "Print Ads in Industry Magazines", "Trade Shows and Events", "Direct Mail") - can be empty array if not applicable,
      "budget": "string" - REQUIRED: Overall marketing channels budget (e.g., "$120,000 annually" or "30% of revenue")
    },
    "funnel": {
      "awareness": ["string"] - REQUIRED: 4-6 tactics to create awareness (top of funnel),
      "consideration": ["string"] - REQUIRED: 4-6 tactics to drive consideration (middle of funnel),
      "conversion": ["string"] - REQUIRED: 4-6 tactics to drive conversions (bottom of funnel),
      "retention": ["string"] - REQUIRED: 4-6 tactics to retain and delight customers (post-purchase)
    },
    "budget": {
      "total": "string" - REQUIRED: Total marketing budget (e.g., "$150,000 annually" or "SAR 500,000"),
      "breakdown": [
        {
          "channel": "string" - REQUIRED: Channel/category name (e.g., "Social Media", "Content Marketing"),
          "percentage": number - REQUIRED: Percentage of total budget (must add up to 100),
          "amount": "string" - REQUIRED: Amount allocated (e.g., "$30,000" or "20% = $30,000")
        }
      ] - REQUIRED: 5-7 channel budget breakdowns that add up to 100%
    },
    "timeline": [
      {
        "phase": "string" - REQUIRED: Phase name (e.g., "Q1 2025: Foundation & Launch", "Q2-Q3 2025: Growth & Scale", "Q4 2025: Optimization"),
        "duration": "string" - REQUIRED: Duration (e.g., "3 months", "January - March 2025", "Months 1-3"),
        "activities": ["string"] - REQUIRED: Array of 5-8 specific, actionable marketing activities for this phase
      }
    ] - REQUIRED: 3-4 phases covering 12 months
  },
  "markdown": "string - OPTIONAL"
}

${isArabic ? `إرشادات مهمة:
- targeting: جمهور أساسي واضح + 4-6 خصائص ديموغرافية + 4-6 خصائص نفسية
- messaging: عرض قيمة واضح + 4-6 رسائل رئيسية + نبرة العلامة التجارية
- channels: 4-6 قنوات رقمية مع تكتيكات محددة + قنوات تقليدية (إن وجدت) + ميزانية إجمالية
- funnel: 4-6 تكتيكات لكل مرحلة (التوعية، النظر، التحويل، الاحتفاظ)
- budget: إجمالي + 5-7 فئات (يجب أن يساوي 100%)
- timeline: 3-4 مراحل لمدة 12 شهرًا مع 5-8 أنشطة محددة لكل مرحلة` : `CRITICAL GUIDELINES:
- targeting: Clear primary audience + 4-6 demographics + 4-6 psychographics
- messaging: Clear value prop + 4-6 key messages + brand voice
- channels: 4-6 digital channels with specific tactics + traditional (if any) + overall budget
- funnel: 4-6 tactics for EACH stage (awareness, consideration, conversion, retention)
- budget: total + 5-7 categories (must add to 100%)
- timeline: 3-4 phases over 12 months with 5-8 specific activities each`}

FUNNEL EXAMPLES:
Awareness (Top of Funnel):
- Social media advertising targeting specific demographics
- Content marketing (blog posts, infographics, videos)
- SEO optimization for high-traffic keywords
- Influencer partnerships and collaborations
- PR and media coverage
- Industry events and sponsorships

Consideration (Middle of Funnel):
- Email nurture campaigns with educational content
- Webinars and product demos
- Case studies and testimonials
- Comparison guides and whitepapers
- Retargeting ads for website visitors
- Free trials or consultations

Conversion (Bottom of Funnel):
- Limited-time offers and promotions
- Personalized email campaigns
- Live chat and sales support
- Checkout optimization
- Abandoned cart recovery
- Customer testimonials and social proof

Retention (Post-Purchase):
- Onboarding and welcome campaigns
- Customer success programs
- Loyalty and referral programs
- Regular check-ins and surveys
- Exclusive content for customers
- Community building initiatives

BUDGET BREAKDOWN EXAMPLES:
- Social Media Marketing: 25% = $37,500
- Content Marketing & SEO: 20% = $30,000
- Paid Advertising (Google/FB): 20% = $30,000
- Email Marketing: 15% = $22,500
- Events & Partnerships: 10% = $15,000
- Marketing Technology: 7% = $10,500
- Brand & Creative: 3% = $4,500
(Total must = 100%)

TIMELINE PHASE EXAMPLES:
Phase 1 (Q1: Foundation):
- Build brand identity and messaging framework
- Set up website with SEO optimization
- Create social media profiles and content calendar
- Develop lead magnets (ebooks, guides)
- Set up email marketing automation
- Launch initial content marketing campaign
- Identify and engage potential partners/influencers
- Set up analytics and tracking

Phase 2 (Q2-Q3: Growth):
- Launch paid advertising campaigns
- Scale content production (2-3 posts/week)
- Host monthly webinars
- Implement referral program
- Expand social media presence
- Build email list to 5,000+ subscribers
- Secure 3-5 media features
- Launch customer case studies

Phase 3 (Q4: Optimization):
- Analyze and optimize high-performing channels
- Scale budget to winning campaigns
- Implement marketing automation workflows
- Launch holiday/seasonal campaigns
- Focus on conversion rate optimization
- Build customer community
- Plan next year's strategy
- Document learnings and best practices

RESPOND WITH VALID JSON ONLY. NO ADDITIONAL TEXT.`;
      
      prompt = `${isArabic ? 'أنشئ خطة تسويقية شاملة لمدة ١٢ شهرًا' : 'Create comprehensive 12-month marketing plan'} for: ${businessDescription}

${isArabic ? 'السياق' : 'Context'}: ${context}

${isArabic ? `المتطلبات الحرجة:
1. targeting: جمهور + ديموغرافيا + سيكوغرافيا (4-6 عناصر لكل منها)
2. messaging: عرض قيمة + رسائل رئيسية + نبرة (4-6 رسائل)
3. channels: رقمية (4-6) + تقليدية + ميزانية
4. funnel: تكتيكات لكل مرحلة (4-6 لكل منها)
5. budget: إجمالي + توزيع 5-7 فئات (100%)
6. timeline: 3-4 مراحل × 12 شهر (5-8 أنشطة لكل مرحلة)` : `CRITICAL REQUIREMENTS:
1. targeting: audience + demographics + psychographics (4-6 each)
2. messaging: value prop + key messages + voice (4-6 messages)
3. channels: digital (4-6) + traditional + budget
4. funnel: tactics for each stage (4-6 each)
5. budget: total + 5-7 categories breakdown (100%)
6. timeline: 3-4 phases × 12 months (5-8 activities each)`}

RESPOND WITH VALID JSON ONLY.`;
      break;

    case "TAM_SAM_SOM":
      systemPrompt = `You are a market research analyst with expertise in market sizing and financial forecasting.

${baseInstruction}

REQUIRED JSON STRUCTURE (ALL fields MANDATORY):
{
  "title": "string - Market Size Analysis title",
  "data": {
    "tam": {
      "value": number - REQUIRED (Total Addressable Market in USD),
      "currency": "USD" - REQUIRED,
      "method": "string" - REQUIRED: Methodology used (e.g., "Top-down", "Bottom-up", "Value theory"),
      "sources": ["string"] - REQUIRED: Data sources or assumptions used,
      "description": "string" - OPTIONAL: Brief explanation
    },
    "sam": {
      "value": number - REQUIRED (Serviceable Addressable Market in USD),
      "currency": "USD" - REQUIRED,
      "method": "string" - REQUIRED: How SAM was calculated,
      "geographicScope": "string" - OPTIONAL: Geographic boundaries,
      "description": "string" - OPTIONAL
    },
    "som": {
      "value": number - REQUIRED (Serviceable Obtainable Market in USD),
      "currency": "USD" - REQUIRED,
      "method": "string" - REQUIRED: How SOM was calculated,
      "captureRate": "string" - OPTIONAL: Expected market capture percentage,
      "timeline": "string" - OPTIONAL: Time to achieve SOM,
      "description": "string" - OPTIONAL
    },
    "marketPenetration": {
      "year1": {
        "percentage": "string" - REQUIRED: Market share percentage (e.g., "0.5%"),
        "customers": number - REQUIRED: Number of customers,
        "revenue": "string" - REQUIRED: Expected revenue (e.g., "$500,000")
      },
      "year3": {
        "percentage": "string" - REQUIRED: Market share percentage (e.g., "2.5%"),
        "customers": number - REQUIRED: Number of customers,
        "revenue": "string" - REQUIRED: Expected revenue (e.g., "$5,000,000")
      },
      "year5": {
        "percentage": "string" - REQUIRED: Market share percentage (e.g., "5%"),
        "customers": number - REQUIRED: Number of customers,
        "revenue": "string" - REQUIRED: Expected revenue (e.g., "$15,000,000")
      }
    },
    "revenueProjection": {
      "year1": {
        "revenue": "string" - REQUIRED: Total revenue (e.g., "$500,000"),
        "value": "string" - REQUIRED: Same as revenue or ARR
      },
      "year3": {
        "revenue": "string" - REQUIRED: Total revenue (e.g., "$5,000,000"),
        "value": "string" - REQUIRED: Same as revenue or ARR
      },
      "year5": {
        "revenue": "string" - REQUIRED: Total revenue (e.g., "$15,000,000"),
        "value": "string" - REQUIRED: Same as revenue or ARR
      }
    },
    "assumptions": [
      {
        "assumption": "string" - REQUIRED: Key assumption made,
        "confidence": "string" - REQUIRED: Confidence level (high/medium/low),
        "impact": "string" - OPTIONAL: Potential impact if assumption is wrong
      }
    ] - REQUIRED: At least 3-5 assumptions,
    "marketTrends": ["string"] - OPTIONAL: Key market trends,
    "growthDrivers": ["string"] - OPTIONAL: Factors driving market growth
  },
  "markdown": "string - OPTIONAL"
}

${isArabic ? `إرشادات:
- TAM: إجمالي السوق المتاح (جميع العملاء المحتملين)
- SAM: السوق القابل للخدمة (العملاء الذين يمكنك الوصول إليهم)
- SOM: السوق القابل للتحقيق (العملاء الذين ستحصل عليهم فعلياً)
- اختراق السوق: نسبة مئوية واقعية من SOM في السنوات 1، 3، 5
- توقعات الإيرادات: إيرادات محددة بناءً على اختراق السوق
- الافتراضات: يجب أن تكون واضحة وقابلة للقياس` : `Guidelines:
- TAM: Total Addressable Market (all potential customers)
- SAM: Serviceable Addressable Market (customers you can reach)
- SOM: Serviceable Obtainable Market (customers you'll actually get)
- Market Penetration: Realistic % of SOM in years 1, 3, 5
- Revenue Projection: Specific revenue based on penetration
- Assumptions: Must be clear and measurable`}

EXAMPLES:
- TAM: $50B (Global market for SaaS project management)
- SAM: $5B (English-speaking SMBs in North America/Europe)
- SOM: $500M (Realistic capture based on competition and resources)
- Year 1 Penetration: 0.1% = 500 customers = $500K revenue
- Year 3 Penetration: 1% = 5,000 customers = $5M revenue
- Year 5 Penetration: 3% = 15,000 customers = $15M revenue`;
      
      prompt = `${isArabic ? 'أنشئ تحليل TAM/SAM/SOM شامل مع توقعات الإيرادات واختراق السوق' : 'Create comprehensive TAM/SAM/SOM analysis with revenue projections and market penetration'} for: ${businessDescription}

${isArabic ? 'السياق' : 'Context'}: ${context}

${isArabic ? `المتطلبات الحرجة:
1. حساب TAM/SAM/SOM بأرقام واقعية ومنطقية
2. تضمين اختراق السوق للسنوات 1، 3، 5 مع النسب المئوية والعملاء والإيرادات
3. توقعات الإيرادات للسنوات 1، 3، 5
4. 3-5 افتراضات رئيسية مع مستويات الثقة
5. شرح المنهجية المستخدمة لكل حساب` : `CRITICAL REQUIREMENTS:
1. Calculate TAM/SAM/SOM with realistic, defensible numbers
2. Include market penetration for years 1, 3, 5 with percentages, customers, and revenue
3. Revenue projections for years 1, 3, 5
4. 3-5 key assumptions with confidence levels
5. Explain methodology used for each calculation`}

Provide realistic market size estimates with clear methodology and assumptions.
RESPOND WITH VALID JSON ONLY. NO ADDITIONAL TEXT.`;
      break;
      
    case "JOURNEY_MAP":
      systemPrompt = `You are a customer experience strategist.

${baseInstruction}

REQUIRED JSON STRUCTURE:
{
  "title": "string",
  "data": {
    "persona": "string" - REQUIRED,
    "stages": [
      {
        "name": "string" - REQUIRED,
        "description": "string" - REQUIRED,
        "actions": ["string"] - REQUIRED,
        "touchpoints": ["string"] - REQUIRED,
        "emotions": ["string"] - REQUIRED,
        "painPoints": ["string"] - REQUIRED,
        "opportunities": ["string"] - REQUIRED
      }
    ] - REQUIRED: 4-6 stages
  }
}`;
      
      prompt = `Create customer journey map for: ${businessDescription}. Context: ${context}. RESPOND WITH VALID JSON ONLY.`;
      break;

    case "COMPETITOR_MAP":
      systemPrompt = `You are a competitive intelligence analyst with deep expertise in market analysis and competitive strategy.

${baseInstruction}

REQUIRED JSON STRUCTURE (ALL fields MANDATORY):
{
  "title": "string - Competitor Analysis title",
  "data": {
    "overview": "string" - REQUIRED: Brief overview of the competitive landscape (2-3 sentences),
    "competitors": [
      {
        "name": "string" - REQUIRED: Competitor name,
        "description": "string" - REQUIRED: Brief description of the competitor,
        "marketPosition": "string" - REQUIRED: Their position in the market (e.g., "Market Leader", "Challenger", "Niche Player"),
        "strengths": ["string"] - REQUIRED: 3-5 key strengths,
        "weaknesses": ["string"] - REQUIRED: 3-5 key weaknesses,
        "marketShare": "string" - REQUIRED: Estimated market share (e.g., "25%", "~$500M revenue"),
        "pricing": "string" - REQUIRED: Pricing strategy or range (e.g., "Premium: $99-299/mo", "Freemium model"),
        "targetAudience": "string" - REQUIRED: Their primary target audience,
        "keyProducts": ["string"] - REQUIRED: 2-4 main products or services,
        "threats": ["string"] - REQUIRED: 2-3 threats they pose to your business,
        "opportunities": ["string"] - REQUIRED: 2-3 opportunities to compete against them,
        "competitiveAdvantage": ["string"] - REQUIRED: 2-3 advantages they have over you
      }
    ] - REQUIRED: 3-5 main competitors,
    "marketGaps": ["string"] - REQUIRED: 3-5 gaps in the market that competitors haven't filled,
    "competitiveAdvantages": ["string"] - REQUIRED: 3-5 advantages your business has over competitors,
    "threats": ["string"] - REQUIRED: 3-5 overall competitive threats to your business,
    "recommendations": ["string"] - REQUIRED: 4-6 strategic recommendations to compete effectively
  },
  "markdown": "string - OPTIONAL"
}

${isArabic ? `إرشادات مهمة:
- overview: نظرة عامة موجزة عن المنافسة في السوق
- competitors: 3-5 منافسين رئيسيين مع تحليل شامل لكل منهم
- marketGaps: 3-5 فجوات في السوق لم يملأها المنافسون
- competitiveAdvantages: 3-5 مزايا تنافسية لعملك
- threats: 3-5 تهديدات تنافسية عامة
- recommendations: 4-6 توصيات استراتيجية للمنافسة بفعالية` : `CRITICAL GUIDELINES:
- overview: Brief overview of competitive landscape
- competitors: 3-5 main competitors with comprehensive analysis
- marketGaps: 3-5 gaps in market not filled by competitors
- competitiveAdvantages: 3-5 your business advantages over competitors
- threats: 3-5 overall competitive threats
- recommendations: 4-6 strategic recommendations to compete effectively`}

COMPETITOR ANALYSIS GUIDELINES:
1. Market Position Examples:
   - "Market Leader" (highest share/revenue)
   - "Strong Challenger" (2nd-3rd place)
   - "Emerging Player" (fast-growing newcomer)
   - "Niche Specialist" (focused on specific segment)
   - "Legacy Provider" (established but outdated)

2. Pricing Strategy Examples:
   - "Premium: $299-999/mo (Enterprise focus)"
   - "Mid-market: $49-199/mo (SMB focus)"
   - "Freemium: Free + $19-99/mo paid tiers"
   - "Usage-based: $0.05 per transaction"
   - "One-time: $499 perpetual license"

3. Market Share Examples:
   - "~35% (Market leader, $2B revenue)"
   - "15-20% (~10,000 customers)"
   - "5% (Growing 50% YoY)"
   - "Unknown (Private company, estimated $100M)"

4. Threats Examples:
   - "Brand recognition and marketing budget"
   - "Established enterprise relationships"
   - "Feature parity with lower pricing"
   - "Network effects and ecosystem lock-in"

5. Opportunities Examples:
   - "Poor customer support creates switching opportunity"
   - "Legacy technology limits mobile experience"
   - "No focus on [specific segment] market"
   - "Expensive pricing leaves room for disruption"

RESPOND WITH VALID JSON ONLY. NO ADDITIONAL TEXT.`;
      
      prompt = `${isArabic ? 'أنشئ تحليل منافسين شامل' : 'Create comprehensive competitor analysis'} for: ${businessDescription}

${isArabic ? 'السياق' : 'Context'}: ${context}

${isArabic ? `المتطلبات الحرجة:
1. نظرة عامة: وصف موجز للمشهد التنافسي
2. المنافسون: 3-5 منافسين رئيسيين مع تحليل كامل
   - لكل منافس: الاسم، الوصف، الموقع، نقاط القوة/الضعف، الحصة السوقية، التسعير، الجمهور، المنتجات، التهديدات، الفرص، المزايا
3. فجوات السوق: 3-5 فرص غير مستغلة
4. مزاياك التنافسية: 3-5 مزايا لديك
5. التهديدات: 3-5 تهديدات تنافسية عامة
6. التوصيات: 4-6 استراتيجيات للمنافسة` : `CRITICAL REQUIREMENTS:
1. overview: Brief description of competitive landscape
2. competitors: 3-5 main competitors with full analysis
   - For each: name, description, position, strengths/weaknesses, share, pricing, audience, products, threats, opportunities, advantages
3. marketGaps: 3-5 unexploited opportunities
4. competitiveAdvantages: 3-5 your advantages
5. threats: 3-5 overall competitive threats
6. recommendations: 4-6 strategies to compete effectively`}

RESPOND WITH VALID JSON ONLY.`;
      break;

    case "PITCH_OUTLINE":
      systemPrompt = `You are a pitch consultant.

${baseInstruction}

REQUIRED JSON STRUCTURE:
{
  "title": "string",
  "data": {
    "slides": [
      {
        "slideNumber": number - REQUIRED,
        "title": "string" - REQUIRED,
        "content": "string" - REQUIRED,
        "keyPoints": ["string"] - REQUIRED
      }
    ] - REQUIRED: 10-15 slides,
    "fundingAsk": {
      "amount": "string" - REQUIRED,
      "use": [{"category": "string", "amount": "string"}] - REQUIRED
    }
  }
}`;
      
      prompt = `Create pitch deck outline for: ${businessDescription}. Context: ${context}. RESPOND WITH VALID JSON ONLY.`;
      break;

    case "BRAND_GUIDELINES":
    case "LAUNCH_ROADMAP":
    case "FINANCIAL_PROJECTIONS":
    case "RISK_ASSESSMENT":
    case "GTM_STRATEGY":
    case "PRODUCT_ROADMAP":
    case "TEAM_STRUCTURE":
    case "FUNDING_STRATEGY":
      systemPrompt = `You are a business strategist.

${baseInstruction}

Create detailed ${type} with proper JSON structure. Include title, data object, and optional markdown.
ALL fields marked REQUIRED must be present.`;
      
      prompt = `Create ${type} for: ${businessDescription}. Context: ${context}. ${isArabic ? 'استجب بـ JSON صالح فقط.' : 'RESPOND WITH VALID JSON ONLY.'}`;
      break;

    default:
      throw new Error(`Unsupported asset type: ${type}`);
  }

  try {
    const result = await generateAssetWithRetry(type, systemPrompt, prompt, 2);
    console.log(`🎯 === generateBusinessAsset END (SUCCESS) ===\n`);
    return result;
  } catch (error) {
    console.error(`🎯 === generateBusinessAsset END (FAILED) ===\n`);
    throw error;
  }
}

// Function to check if response contains structured assets
function parseStructuredResponse(responseText: string): any {
  try {
    // Look for JSON blocks in the response
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                      responseText.match(/\{[\s\S]*"status":\s*"success"[\s\S]*\}/);
    
    if (jsonMatch) {
      const jsonString = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonString);
      
      // Validate it has the expected structure
      if (parsed.status === "success" && parsed.assets) {
        return parsed;
      }
    }
    
    return null;
  } catch (error) {
    console.log("Failed to parse structured response:", error);
    return null;
  }
}

export async function generateChatResponse(message: string, context: any = {}, mode: ChatMode = 'balanced'): Promise<string | {response: string, assets?: any}> {
  try {
    let systemPrompt = `You are FikraHub Cofounder, an AI cofounder that helps users turn an idea into a concrete, validated business case.

Your job: quickly clarify the idea with a few targeted questions, then produce structured assets (Business Model, Marketing Plan, User Personas, User Stories, SWOT, Lean Canvas, Journey Map, Competitor Map, TAM/SAM/SOM, OKRs, Pitch Outline) and return runnable UI code that our app will write to files and render.

## CRITICAL: First Message Behavior
On your very first interaction, immediately ask about their business idea. DO NOT say "Hello" or "How can I help". Instead, jump straight into business mode with an enthusiastic question like:
"I'm excited to help you build something amazing! Tell me about your business idea - what problem are you solving or what are you looking to create?"

## Interaction Rules

**Ask first (briefly).** If core info is missing, ask up to 5 crisp questions (name of product, target market/geo, ICP, monetization, success goal). If provided already, skip to delivery.

**Be decisive.** Offer best-practice defaults when the user is unsure. Note assumptions and how to validate them.

**Bilingual-friendly.** Default to English; if user's locale is Arabic, generate content in Arabic and keep data keys in English.

**Evidence > fluff.** When you make a claim (market size, channels), add a clear assumption note or a placeholder for source link.

## Atomic Generation

Every response must include:

1. **Human-readable summary** of what you produced.

2. **Machine-readable JSON payload** for each asset (strict schemas below).

3. **Code array** with ready-to-run files (TSX/React + minimal data adapters). These files must compile without extra packages beyond React, Tailwind, shadcn/ui, lucide-react, recharts.

## Asset Schemas

When generating assets, use this exact JSON structure:

\`\`\`json
{
  "status": "success",
  "assets": {
    "data": {
      "user_stories": [{
        userStory: "As a [type of user], I want to [perform some task] so that I can [achieve some goal].",
        acceptanceCriteria: "- Given [context], when [action], then [outcome]."
      }]
      "brand_wheel": {
        mission: string;
        vision: string;
        brand_positioning: string;
        brand_values: string;
        personality: string;
      },
      "interview_questions": {
        inDepth: {
          question_1: string;
          question_2: string;
          question_3: string;
          question_4: string;
          question_5: string;
          question_6: string;
          question_7: string;
          question_8: string;
          question_9: string;
          question_10: string;
        };
        demographic: {
          question_11: string;
          question_12: string;
          question_13: string;
        };
        wrapUp: {
          question_14: string;
          question_15: string;
          question_16: string;
        };
      },
      "lean_canvas": {
        "problem": ["List of problems this idea solves"],
        "solution": ["Key features/solutions"],
        "uniqueValueProp": "What makes this unique",
        "customerSegments": ["Target customers"],
        "channels": ["How to reach customers"],
        "keyMetrics": ["Important metrics to track"],
        "costStructure": ["Main costs"],
        "revenueStreams": ["How it makes money"],
        "unfairAdvantage": ["Competitive advantages"]
      },
      "business_model": {
        "productName": "The product name",
        "valueProposition": "Core value delivered",
        "segments": ["Customer groups"],
        "revenueStreams": [{"model": "Subscription", "pricePoint": {"currency": "USD", "amount": 29}}],
        "keyActivities": ["Main business activities"],
        "keyPartners": ["Important partnerships"],
        "costs": ["Major expenses"],
        "assumptions": [{"statement": "Key assumption", "confidence": "medium"}]
      },
      "user_personas": [
        {
          "name": "Customer Name",
          "segment": "Customer type",
          "demographics": {"age": "25-35", "income": "$50k-$80k", "location": "Urban areas"},
          "goals": ["What they want to achieve"],
          "pains": ["Their current problems"],
          "channels": ["Where to find them"],
          "objections": ["Why they might hesitate"],
          "quote": "Something they would say"
        }
      ],
      "swot": {
        "strengths": ["Internal advantages"],
        "weaknesses": ["Areas to improve"],
        "opportunities": ["External chances"],
        "threats": ["External risks"]
      },
      "tam_sam_som": {
        "tam": 50000000000,
        "sam": 5000000000,
        "som": 500000000,
        "currency": "USD",
        "method": "How these numbers were calculated",
        "notes": ["Additional market insights"],
        "assumptions": ["Key assumptions made"]
      },
      "marketing_plan": {
        "objectives": ["Marketing goals"],
        "targetAudience": ["Detailed customer segments"],
        "channels": [{"name": "Social Media", "budget": 5000, "roi": "3:1", "timeline": "Q1"}],
        "messaging": {"primary": "Main message", "secondary": ["Supporting messages"]},
        "budget": {"total": 50000, "breakdown": [{"item": "Social Media", "amount": 20000}]}
      },
      "okrs": [
        {
          "objective": "Launch MVP",
          "keyResults": ["Get 1000 users", "Achieve $10k MRR", "95% uptime"],
          "timeline": "Q1 2025",
          "owner": "Product Team"
        }
      ]
    },
    "code": [
      {
        "filename": "LeanCanvas.tsx",
        "content": "// React component code here"
      }
    ]
  }
}
\`\`\`

## Code Generation Rules

For the code array, generate clean React components using:
- React hooks (useState, useEffect)
- Tailwind CSS for styling
- shadcn/ui components
- lucide-react for icons
- recharts for charts/graphs
- TypeScript interfaces for props

Each component should be self-contained and render the asset data beautifully.

Keep it conversational but decisive - you're building something amazing together!`;

    // Add project context if available
    if (context.projectTitle || context.projectDescription) {
      systemPrompt += `\n\nProject Context:
- Title: ${context.projectTitle || "Not specified"}
- Description: ${context.projectDescription || "Not specified"}`;
    }

    // Build conversation history - AIMLAPI doesn't support system role, so we'll add instructions to first message
    const messages = [];
    
    // Add recent conversation context - format messages for Anthropic
    if (context.recentMessages && context.recentMessages.length > 0) {
      context.recentMessages.forEach((msg: any) => {
        // Only add user and assistant messages, skip system messages
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({
            role: msg.role,
            content: msg.text
          });
        }
      });
    }

    // Add current message with system prompt included for context  
    const messageWithInstructions = messages.length === 0 
      ? `IMPORTANT: You are Fikra AI. DO NOT say "Hello" or "How can I help". Instead, immediately ask about their business idea with enthusiasm like: "I'm excited to help you build something amazing! Tell me about your business idea - what problem are you solving or what are you looking to create?"

${systemPrompt}

User: ${message}

CRITICAL: Skip greetings and ask about their business idea right away.`
      : message;
    
    messages.push({ role: "user", content: messageWithInstructions });

    // Get mode configuration
    const modeConfig = CHAT_MODES[mode];

    const response = await callOpenAI(
      messages,
      modeConfig.model,
      modeConfig.temperature,
      modeConfig.max_tokens
    );

    const responseText = response.choices[0].message.content || "I apologize, but I couldn't generate a response. Please try again.";
    
    console.log(`✓ Generated AI response using ${mode} mode (${modeConfig.model}):`, responseText.substring(0, 100) + "...");
    
    // Check if response contains structured assets
    const structuredData = parseStructuredResponse(responseText);
    if (structuredData) {
      console.log("📦 Structured data detected in response:", structuredData);
      return {
        response: "Structured data received",
        assets: structuredData.assets
      };
    }
    
    return responseText;
  } catch (error) {
    console.error("Error generating chat response:", error);
    throw error;
  }
}
