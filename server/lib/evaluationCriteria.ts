import fs from 'fs';
import path from 'path';

interface CriteriaFile {
  id: string;
  name: string;
  path: string;
  uploadedAt: string;
  uploadedBy: string;
}

interface ParsedCriteria {
  combined: any;
  systemPrompt: string;
  files: string[];
}

/**
 * Parse and combine all evaluation criteria (files + text)
 */
export async function parseEvaluationCriteria(
  criteriaFiles: CriteriaFile[] = [],
  criteriaText: string = ''
): Promise<ParsedCriteria> {
  const combinedCriteria: any = {};
  const filesUsed: string[] = [];

  // 1. Parse JSON files
  for (const file of criteriaFiles) {
    try {
      const physicalPath = path.join(
        process.cwd(), 
        'uploads', 
        'evaluation-criteria', 
        path.basename(file.path)
      );

      if (!fs.existsSync(physicalPath)) {
        console.warn(`⚠️ Criteria file not found: ${file.name}`);
        continue;
      }

      const content = fs.readFileSync(physicalPath, 'utf-8');
      const jsonData = JSON.parse(content);

      Object.assign(combinedCriteria, jsonData);
      filesUsed.push(file.name);

      console.log(`✅ Loaded criteria from: ${file.name}`);
    } catch (error) {
      console.error(`❌ Error parsing criteria file ${file.name}:`, error);
    }
  }

  // 2. Parse criteria text
  if (criteriaText && criteriaText.trim()) {
    try {
      const textCriteria = JSON.parse(criteriaText);
      Object.assign(combinedCriteria, textCriteria);
      console.log('✅ Loaded criteria from text input');
    } catch (error) {
      console.error('❌ Error parsing criteria text:', error);
    }
  }

  // 3. Build system prompt
  const systemPrompt = buildSystemPrompt(combinedCriteria);

  return {
    combined: combinedCriteria,
    systemPrompt,
    files: filesUsed
  };
}

/**
 * ✅ IMPROVED: Build system prompt with strict JSON formatting instructions
 */
function buildSystemPrompt(criteria: any): string {
  const metricsText = Object.entries(criteria)
    .map(([key, value]: [string, any]) => {
      if (typeof value === 'object' && value !== null) {
        return `- ${key}: ${value.description || ''} (weight: ${value.weight || 'N/A'})`;
      }
      return `- ${key}: ${value}`;
    })
    .join('\n');

  return `You are an expert startup evaluator and innovation consultant.

**CRITICAL: You MUST respond with ONLY valid JSON. No markdown, no code blocks, no explanations - ONLY the JSON object.**

Your task is to evaluate a project/idea based on the following criteria:

${metricsText}

For each criterion, provide:
1. A score from 0-100 (integer)
2. A detailed rationale (2-3 sentences, plain text with no special characters)
3. An appropriate emoji icon (single emoji)
4. A trend indicator (format: "+12%", "-5%", or "stable")

Additionally, provide:
- Overall score (weighted average based on criteria weights, integer 0-100)
- 4-6 key strengths (array of strings, each 1-2 sentences)
- 4-6 recommendations (array of strings, each 1-2 sentences)
- General insights (single paragraph, 3-5 sentences)

**RESPONSE FORMAT - YOU MUST RETURN EXACTLY THIS STRUCTURE:**

{
  "overallScore": 85,
  "metrics": [
    {
      "name": "Market Opportunity",
      "score": 90,
      "rationale": "Strong market demand with clear growth trajectory. Target segment shows high willingness to pay.",
      "icon": "📈",
      "trend": "+15%"
    }
  ],
  "strengths": [
    "Clear value proposition addressing specific pain points",
    "Strong competitive advantages in target market"
  ],
  "recommendations": [
    "Focus on customer acquisition cost optimization",
    "Expand go-to-market strategy to adjacent segments"
  ],
  "insights": "This project shows significant potential with strong market fundamentals. The team should prioritize product-market fit validation and early customer feedback to refine the offering."
}

**IMPORTANT RULES:**
- Return ONLY the JSON object, nothing else
- Do NOT wrap in markdown code blocks
- Do NOT include any text before or after the JSON
- Use double quotes for all strings
- Ensure all JSON is valid and properly escaped
- Metrics array must have at least 3 items
- All scores must be integers between 0-100
- Strengths and recommendations must each have 4-6 items

Be objective, constructive, and specific in your evaluation.`;
}

/**
 * Build user prompt for specific project
 */
export function buildProjectEvaluationPrompt(project: any): string {
  return `Please evaluate the following project:

**Title:** ${project.title}

**Description:**
${project.description || 'No description provided'}

**Tags:** ${project.tags?.join(', ') || 'None'}

**Status:** ${project.status || 'Unknown'}

**Created:** ${new Date(project.createdAt).toLocaleDateString()}

Remember: Respond with ONLY valid JSON, no markdown or explanations.`;
}

/**
 * ✅ NEW: Robust JSON parser (reuse from routes.ts pattern)
 */
export function parseEvaluationResponse(responseText: string): any {
  try {
    let jsonString = responseText.trim();
    
    // Step 1: Extract JSON from markdown code blocks if present
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                      responseText.match(/```\s*([\s\S]*?)\s*```/);
    
    if (jsonMatch) {
      jsonString = jsonMatch[1] || jsonMatch[0];
      console.log('📝 Extracted JSON from markdown code block');
    }
    
    // Step 2: Clean up leading/trailing non-JSON characters
    jsonString = jsonString.trim();
    
    // Remove any text before first { or [ 
    const firstBrace = jsonString.indexOf('{');
    const firstBracket = jsonString.indexOf('[');
    const firstChar = firstBrace === -1 ? firstBracket : 
                     firstBracket === -1 ? firstBrace :
                     Math.min(firstBrace, firstBracket);
    
    if (firstChar > 0) {
      jsonString = jsonString.substring(firstChar);
      console.log('🔧 Removed leading non-JSON text');
    }
    
    // Remove any text after last } or ]
    const lastBrace = jsonString.lastIndexOf('}');
    const lastBracket = jsonString.lastIndexOf(']');
    const lastChar = Math.max(lastBrace, lastBracket);
    
    if (lastChar > -1 && lastChar < jsonString.length - 1) {
      jsonString = jsonString.substring(0, lastChar + 1);
      console.log('🔧 Removed trailing non-JSON text');
    }
    
    // Step 3: Parse JSON
    const parsed = JSON.parse(jsonString);
    
    // Step 4: Validate structure
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Parsed result is not an object');
    }
    
    // Validate required fields for evaluation
    if (!('overallScore' in parsed)) {
      throw new Error('Missing required field: overallScore');
    }
    
    if (!Array.isArray(parsed.metrics)) {
      throw new Error('Missing or invalid field: metrics (must be array)');
    }
    
    if (!Array.isArray(parsed.strengths)) {
      throw new Error('Missing or invalid field: strengths (must be array)');
    }
    
    if (!Array.isArray(parsed.recommendations)) {
      throw new Error('Missing or invalid field: recommendations (must be array)');
    }
    
    console.log('✅ Successfully parsed and validated evaluation JSON');
    console.log(`📊 Evaluation: ${parsed.overallScore}/100, ${parsed.metrics.length} metrics`);
    
    return parsed;
    
  } catch (error) {
    console.error('❌ Failed to parse evaluation JSON:', error);
    console.error('📄 Original response text (first 500 chars):', responseText.substring(0, 500));
    
    // Return null to trigger fallback handling
    return null;
  }
}