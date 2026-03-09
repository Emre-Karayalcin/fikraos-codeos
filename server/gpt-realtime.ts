// GPT-4 Realtime API Integration for voice conversations
const AZURE_REALTIME_ENDPOINT = process.env.AZURE_OPENAI_REALTIME_ENDPOINT;
const AZURE_REALTIME_API_KEY = process.env.AZURE_OPENAI_REALTIME_API_KEY;
const AZURE_REALTIME_DEPLOYMENT = process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT || 'gpt-realtime';
const AZURE_REALTIME_API_VERSION = process.env.AZURE_OPENAI_REALTIME_API_VERSION || '2024-10-01-preview';

if (!AZURE_REALTIME_API_KEY || !AZURE_REALTIME_ENDPOINT) {
  console.warn("⚠️  Azure Realtime API credentials not set - voice features will be disabled");
}

export interface RealtimeSessionConfig {
  expertType?: 'gtm' | 'finance' | 'product';
  language?: 'en' | 'ar';
  systemPrompt?: string;
  userIdeas?: string;
}

export interface RealtimeConnectionInfo {
  websocketUrl: string;
  apiKey: string;
  sessionConfig: any;
}

/**
 * Build expert-specific system prompts with language support
 */
function buildExpertPrompt(
  expertType?: 'gtm' | 'finance' | 'product',
  language?: 'en' | 'ar',
  userIdeas: string = ''
): string {
  const languageInstruction = language === 'ar'
    ? 'IMPORTANT: Respond in Arabic only. You are an Arabic-speaking AI Business Cofounder (شريك ذكي في الأعمال). Use proper Arabic grammar and business terminology.'
    : 'Respond in English only.';

  const basePrompts = {
    gtm: `You are a Go-to-Market Strategy Expert with 15+ years of experience helping startups and scale-ups launch products successfully.

    Your expertise includes:
    - Market research and competitive analysis
    - Customer segmentation and targeting
    - Pricing strategy and positioning
    - Sales funnel optimization
    - Growth hacking and acquisition channels
    - Partnership and distribution strategies${userIdeas}

    Respond in a conversational, advisory tone as if you're a senior consultant. Keep responses focused, actionable, and ask insightful follow-up questions.`,

    finance: `You are a Finance and Investment Expert with 15+ years of experience in startup funding, financial planning, and venture capital.

    Your expertise includes:
    - Financial modeling and forecasting
    - Investment rounds and valuation
    - Unit economics and profitability analysis
    - Cash flow management and runway planning
    - Fundraising strategy and pitch preparation
    - Financial risk assessment${userIdeas}

    Respond in a conversational, advisory tone as if you're a senior financial consultant. Keep responses focused, actionable, and ask insightful follow-up questions.`,

    product: `You are a Product Strategy Expert with 15+ years of experience in product management, user experience, and product-market fit.

    Your expertise includes:
    - Product-market fit validation
    - User research and customer feedback analysis
    - Feature prioritization and roadmap planning
    - User experience design and optimization
    - Product analytics and metrics
    - Agile development and iteration strategies${userIdeas}

    Respond in a conversational, advisory tone as if you're a senior product consultant. Keep responses focused, actionable, and ask insightful follow-up questions.`
  };

  const basePrompt = basePrompts[expertType || 'gtm'];
  return `${languageInstruction}\n\n${basePrompt}`;
}

/**
 * Get GPT Realtime WebSocket connection details and session configuration
 */
export async function getRealtimeConnection(
  config: RealtimeSessionConfig = {}
): Promise<RealtimeConnectionInfo> {
  if (!AZURE_REALTIME_API_KEY || !AZURE_REALTIME_ENDPOINT) {
    throw new Error("Azure Realtime API credentials not configured");
  }

  // Build WebSocket URL - handle both base URL and full URL formats
  // Extract just the hostname from the endpoint (handle both formats gracefully)
  const url = new URL(AZURE_REALTIME_ENDPOINT.startsWith('http') ? AZURE_REALTIME_ENDPOINT : `https://${AZURE_REALTIME_ENDPOINT}`);
  const hostname = url.hostname;
  const wsUrl = `wss://${hostname}/openai/realtime?api-version=${AZURE_REALTIME_API_VERSION}&deployment=${AZURE_REALTIME_DEPLOYMENT}&api-key=${AZURE_REALTIME_API_KEY}`;

  // Build system prompt based on expert type
  const systemPrompt = config.systemPrompt || buildExpertPrompt(
    config.expertType,
    config.language,
    config.userIdeas
  );

  console.log(`🎙️  Creating Realtime session for ${config.expertType || 'general'} expert in ${config.language || 'en'}`);

  // Session configuration for GPT Realtime API
  const sessionConfig = {
    modalities: ['text', 'audio'],
    instructions: systemPrompt,
    voice: 'shimmer', // Options: alloy, ash, ballad, coral, echo, sage, shimmer, verse
    input_audio_format: 'pcm16',
    output_audio_format: 'pcm16',
    input_audio_transcription: {
      model: 'whisper-1'
    },
    turn_detection: {
      type: 'server_vad',
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 200
    },
    temperature: 0.8,
    max_response_output_tokens: 4096
  };

  return {
    websocketUrl: wsUrl,
    apiKey: AZURE_REALTIME_API_KEY,
    sessionConfig
  };
}

/**
 * Gracefully end a realtime conversation
 * Note: GPT Realtime API handles session cleanup on WebSocket close
 */
export async function endRealtimeConversation(sessionId?: string): Promise<void> {
  console.log(`🔚 Ending realtime conversation${sessionId ? `: ${sessionId}` : ''}`);
  // No explicit API call needed - WebSocket close handles cleanup
  // This function exists for API compatibility and logging
}
