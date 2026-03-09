// SECURITY FIX (P2): Prompt Injection Protection
// Detects and mitigates prompt injection attacks in AI prompts

/**
 * Patterns commonly used in prompt injection attacks
 */
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|above|prior)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|above|prior)/i,
  /forget\s+(everything|all)\s+(you|that)/i,
  /you\s+are\s+now\s+a?n?\s*(unrestricted|evil|unfiltered|jailbroken)/i,
  /pretend\s+(to\s+be|you('re|r\s+are))/i,
  /jailbreak/i,
  /DAN\s*mode/i,
  /developer\s+mode/i,
  /sudo\s+mode/i,
  /admin\s+override/i,
];

export interface PromptSanitizationResult {
  safe: boolean;
  sanitized: string;
  warnings: string[];
}

/**
 * SECURITY FIX (P2): Sanitizes user prompts to prevent injection attacks
 *
 * @param input - The user-provided prompt
 * @param maxLength - Maximum allowed prompt length (default: 10000)
 * @returns Sanitization result with warnings
 */
export function sanitizePrompt(
  input: string,
  maxLength: number = 10000
): PromptSanitizationResult {
  const warnings: string[] = [];
  let sanitized = input;

  // Check for injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      warnings.push(`Potential injection pattern detected: ${pattern.toString()}`);
      // Replace suspicious patterns with filtered marker
      sanitized = sanitized.replace(pattern, '[FILTERED]');
    }
  }

  // Limit prompt length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
    warnings.push(`Prompt truncated to ${maxLength} characters`);
  }

  // Additional checks for suspicious characters/sequences
  const suspiciousPatterns = [
    { pattern: /\{[^}]{500,}\}/g, description: 'Very long JSON-like structure' },
    { pattern: /(\n\s*){10,}/g, description: 'Excessive newlines' },
  ];

  for (const { pattern, description } of suspiciousPatterns) {
    if (pattern.test(sanitized)) {
      warnings.push(description);
    }
  }

  return {
    safe: warnings.length === 0,
    sanitized,
    warnings,
  };
}

/**
 * Allowed system prompt templates
 * Prevents users from injecting arbitrary system prompts
 */
export const ALLOWED_SYSTEM_PROMPTS = {
  'idea-assistant': 'You are a helpful business idea assistant. Help users develop and refine their business ideas with constructive feedback and insights.',
  'pitch-generator': 'You are an expert pitch deck creator. Help users create compelling presentations for their business ideas.',
  'research-helper': 'You help research market trends and competitive analysis. Provide factual, well-researched information.',
  'evaluation-assistant': 'You are an objective business idea evaluator. Analyze ideas against provided criteria and provide structured feedback.',
  'default': 'You are a helpful assistant for the FikraHub platform. Provide clear, professional, and constructive responses.',
} as const;

export type AllowedPromptType = keyof typeof ALLOWED_SYSTEM_PROMPTS;

/**
 * Get a safe system prompt by type
 * @param promptType - The type of system prompt requested
 * @returns The corresponding system prompt or default
 */
export function getSystemPrompt(promptType?: string): string {
  if (promptType && promptType in ALLOWED_SYSTEM_PROMPTS) {
    return ALLOWED_SYSTEM_PROMPTS[promptType as AllowedPromptType];
  }
  return ALLOWED_SYSTEM_PROMPTS.default;
}
