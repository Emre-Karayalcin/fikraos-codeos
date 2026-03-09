import { Router } from 'express';
import OpenAI from 'openai';
import { isAuthenticated } from './auth';
import {
  openaiChatSchema,
  anthropicChatSchema,
  validateRequest,
} from "@shared/validation-schemas";
import { sanitizePrompt, getSystemPrompt } from './utils/prompt-sanitizer';

const router = Router();

// Initialize Azure OpenAI client
const azureOpenAIEndpoint = process.env.AZURE_OPENAI_ENDPOINT_DEV;
const azureOpenAIKey = process.env.AZURE_OPENAI_API_KEY_DEV;
const azureAPIVersion = process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview';
const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-fikra-dev';

const openai = (azureOpenAIKey && azureOpenAIEndpoint) ? new OpenAI({
  apiKey: azureOpenAIKey,
  baseURL: `${azureOpenAIEndpoint}/openai/deployments/${azureDeployment}`,
  defaultQuery: { 'api-version': azureAPIVersion },
  defaultHeaders: { 'api-key': azureOpenAIKey },
}) : null;

// SECURITY: Chat completion endpoint for AI code generation (REQUIRES AUTHENTICATION)
// ✅ SECURITY FIX (P1): Add comprehensive input validation
router.post('/chat', isAuthenticated, validateRequest(openaiChatSchema), async (req, res) => {
  try {
    const { messages, model = 'gpt-4', temperature = 0.7, max_tokens = 4000 } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    if (!openai) {
      return res.status(503).json({ error: 'OpenAI API not configured' });
    }

    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: 'gpt-4', // Using gpt-4 for now as gpt-5 might not be available yet
      messages,
      temperature,
      max_tokens,
    });

    res.json(response);

  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
      }
      if (error.message.includes('insufficient_quota')) {
        return res.status(402).json({ error: 'OpenAI quota exceeded. Please check your OpenAI account.' });
      }
      if (error.message.includes('invalid_api_key')) {
        return res.status(401).json({ error: 'Invalid OpenAI API key.' });
      }
    }

    res.status(500).json({ 
      error: 'AI service temporarily unavailable',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// SECURITY: Anthropic Claude API endpoint for ultra-advanced code generation (REQUIRES AUTHENTICATION)
// ✅ SECURITY FIX (P1): Add comprehensive input validation
router.post('/anthropic/chat', isAuthenticated, validateRequest(anthropicChatSchema), async (req, res) => {
  try {
    const { messages, model = 'claude-3-5-sonnet-20241022', temperature = 0.8, max_tokens = 8000 } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Import Anthropic SDK
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    // SECURITY FIX (P2): Sanitize prompts to prevent injection attacks
    let systemPrompt = '';
    const userMessages = messages.filter(msg => {
      if (msg.role === 'system') {
        systemPrompt = msg.content;
        return false;
      }
      return true;
    });

    // Sanitize all user messages
    const sanitizedMessages = userMessages.map(msg => {
      const result = sanitizePrompt(msg.content);
      if (!result.safe) {
        console.warn('⚠️ Prompt injection attempt detected', {
          userId: (req as any).user?.id,
          warnings: result.warnings
        });
      }
      return {
        ...msg,
        content: result.sanitized
      };
    });

    // Use predefined system prompt instead of user-controlled one
    const safeSystemPrompt = systemPrompt
      ? getSystemPrompt('default')  // Override user system prompt
      : undefined;

    console.log('🚀 Calling Claude with sanitized prompts...');

    const anthropicResponse = await anthropic.messages.create({
      model,
      max_tokens,
      system: safeSystemPrompt,
      messages: sanitizedMessages,
      temperature: 0.8
    });

    // Convert Anthropic response to OpenAI-compatible format
    const content = anthropicResponse.content[0]?.type === 'text' 
      ? anthropicResponse.content[0].text 
      : 'No response generated';

    // SECURITY FIX (P2): Only log full responses in development to prevent data leakage
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Claude response received, length:', content.length);
      console.log('🔍 Claude response preview:', content.substring(0, 500) + '...');
    } else {
      // Production: Log only metadata, not content
      console.log('✅ Claude response received', {
        contentLength: content.length,
        model: anthropicResponse.model,
        usage: anthropicResponse.usage,
        stopReason: anthropicResponse.stop_reason
      });
    }

    const compatibleResponse = {
      choices: [{
        message: {
          content: content
        }
      }]
    };

    console.log('🔍 Sending formatted response to client');
    res.json(compatibleResponse);

  } catch (error) {
    console.error('Anthropic API Error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
      }
      if (error.message.includes('quota')) {
        return res.status(402).json({ error: 'Anthropic quota exceeded. Please check your account.' });
      }
      if (error.message.includes('api_key')) {
        return res.status(401).json({ error: 'Invalid Anthropic API key.' });
      }
    }

    res.status(500).json({ 
      error: 'Claude AI service temporarily unavailable',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;