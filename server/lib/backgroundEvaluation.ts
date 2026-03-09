import OpenAI from 'openai';
import { storage } from '../storage';
import { parseEvaluationCriteria, parseEvaluationResponse, buildProjectEvaluationPrompt } from './evaluationCriteria';

// Initialize Azure OpenAI client
const azureOpenAIEndpoint = process.env.AZURE_OPENAI_ENDPOINT_DEV;
const azureOpenAIKey = process.env.AZURE_OPENAI_API_KEY_DEV;
const azureAPIVersion = process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview';
const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-fikra-dev';

// Remove trailing slash from endpoint to avoid double slashes
const cleanEndpoint = azureOpenAIEndpoint?.replace(/\/$/, '');

const openai = (azureOpenAIKey && cleanEndpoint) ? new OpenAI({
  apiKey: azureOpenAIKey,
  baseURL: `${cleanEndpoint}/openai/deployments/${azureDeployment}`,
  defaultQuery: { 'api-version': azureAPIVersion },
  defaultHeaders: { 'api-key': azureOpenAIKey },
}) : null;

/**
 * Evaluates a project asynchronously in the background.
 * Used for auto-evaluation when submitting projects to challenges.
 *
 * @param projectId - The project to evaluate
 * @param userId - The user triggering the evaluation
 * @param challengeId - Optional challenge ID if project is submitted to a challenge
 * @param challengeCriteria - Optional challenge-specific evaluation criteria text
 */
export async function evaluateProjectAsync(
  projectId: string,
  userId: string,
  challengeId?: string,
  challengeCriteria?: string | null
): Promise<void> {
  try {
    console.log(`🔄 Starting background evaluation for project ${projectId}`);

    if (!openai) {
      console.warn('⚠️ Azure OpenAI not configured, skipping evaluation');
      return;
    }

    // Get project
    const project = await storage.getProject(projectId);
    if (!project) {
      console.error(`❌ Project not found: ${projectId}`);
      return;
    }

    // Get organization
    const org = await storage.getOrganization(project.orgId);
    if (!org) {
      console.error(`❌ Organization not found: ${project.orgId}`);
      return;
    }

    // Determine criteria source: prioritize challenge criteria
    let criteriaText = '';
    let criteriaFiles: any[] = [];

    if (challengeCriteria && challengeCriteria.trim()) {
      // Use challenge-specific criteria
      criteriaText = challengeCriteria;
      console.log('📋 Using challenge-specific evaluation criteria');
    } else {
      // Fallback to organization-level criteria
      criteriaFiles = org.evaluationCriteriaFiles || [];
      criteriaText = org.evaluationCriteriaText || '';
      console.log('📋 Using organization-level evaluation criteria');
    }

    if (!criteriaFiles.length && !criteriaText.trim()) {
      console.log('⚠️ No evaluation criteria available, skipping evaluation');
      return;
    }

    // Parse criteria and build prompts
    const { systemPrompt, files: filesUsed } = await parseEvaluationCriteria(
      criteriaFiles,
      criteriaText
    );

    const userPrompt = buildProjectEvaluationPrompt(project);

    // Call Azure OpenAI API with retry logic
    let attempts = 0;
    const maxAttempts = 3;
    let evaluationData = null;

    while (attempts < maxAttempts && !evaluationData) {
      attempts++;
      console.log(`🤖 Attempt ${attempts}/${maxAttempts} - Calling Azure OpenAI API...`);

      try {
        const response = await openai.chat.completions.create({
          model: '', // Empty string when deployment is in baseURL
          max_tokens: 4096,
          temperature: 0.3,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          response_format: { type: 'json_object' } // Request JSON mode
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('Unexpected response from Azure OpenAI');
        }

        console.log('📝 Azure OpenAI response received, length:', content.length);

        // Parse response
        evaluationData = parseEvaluationResponse(content);

        if (!evaluationData) {
          console.warn(`⚠️ Attempt ${attempts} failed to parse JSON, retrying...`);

          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } else {
          console.log(`✅ Successfully parsed evaluation on attempt ${attempts}`);
        }

      } catch (parseError) {
        console.error(`❌ Attempt ${attempts} failed:`, parseError);

        if (attempts >= maxAttempts) {
          throw parseError;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Validate data
    if (!evaluationData) {
      console.error('❌ All parsing attempts failed');
      return;
    }

    // Ensure data integrity
    if (typeof evaluationData.overallScore !== 'number' ||
        evaluationData.overallScore < 0 ||
        evaluationData.overallScore > 100) {
      console.warn('⚠️ Invalid overall score, using default');
      evaluationData.overallScore = 50;
    }

    if (!Array.isArray(evaluationData.metrics) || evaluationData.metrics.length === 0) {
      console.warn('⚠️ Invalid or empty metrics array, using defaults');
      evaluationData.metrics = [
        {
          name: 'Market Opportunity',
          score: 70,
          rationale: 'Evaluation data incomplete - please regenerate',
          icon: '📊',
          trend: 'N/A'
        }
      ];
    }

    if (!Array.isArray(evaluationData.strengths)) {
      evaluationData.strengths = ['Evaluation incomplete - please regenerate'];
    }

    if (!Array.isArray(evaluationData.recommendations)) {
      evaluationData.recommendations = ['Evaluation incomplete - please regenerate'];
    }

    // Save to database
    await storage.createProjectEvaluation({
      projectId,
      orgId: project.orgId,
      overallScore: evaluationData.overallScore,
      metrics: evaluationData.metrics,
      strengths: evaluationData.strengths,
      recommendations: evaluationData.recommendations,
      insights: evaluationData.insights || 'Auto-generated on submission',
      evaluatedBy: userId,
      criteriaSnapshot: {
        files: filesUsed,
        text: criteriaText,
        source: challengeCriteria ? 'challenge' : 'organization'
      }
    });

    console.log(`✅ Background evaluation completed for project ${projectId}`);
  } catch (error) {
    console.error(`❌ Background evaluation failed for project ${projectId}:`, error);
    // Fail silently - don't disrupt submission flow
  }
}
