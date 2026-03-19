import OpenAI from 'openai';
import { db } from '../db';
import { memberApplications, challenges } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const azureOpenAIEndpoint = process.env.AZURE_OPENAI_ENDPOINT_DEV;
const azureOpenAIKey = process.env.AZURE_OPENAI_API_KEY_DEV;
const azureAPIVersion = process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview';
const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-fikra-dev';
const cleanEndpoint = azureOpenAIEndpoint?.replace(/\/$/, '');

const openai = (azureOpenAIKey && cleanEndpoint) ? new OpenAI({
  apiKey: azureOpenAIKey,
  baseURL: `${cleanEndpoint}/openai/deployments/${azureDeployment}`,
  defaultQuery: { 'api-version': azureAPIVersion },
  defaultHeaders: { 'api-key': azureOpenAIKey },
}) : null;


export async function screenApplicationAsync(
  applicationId: string,
  challengeId: string | null,
  _orgId: string,
): Promise<void> {
  try {
    console.log(`🔄 Starting application screening for ${applicationId}`);

    if (!openai) {
      console.warn('⚠️ Azure OpenAI not configured, skipping screening');
      return;
    }

    const [app] = await db.select().from(memberApplications).where(eq(memberApplications.id, applicationId));
    if (!app) {
      console.error(`❌ Application not found: ${applicationId}`);
      return;
    }

    let challengeEvalCriteria = '';
    if (challengeId) {
      const [challenge] = await db.select().from(challenges).where(eq(challenges.id, challengeId));
      if (challenge?.evaluationCriteria) {
        challengeEvalCriteria = challenge.evaluationCriteria;
      }
    }

    const systemPrompt = `You are an expert startup evaluator reviewing member applications for an innovation program. Evaluate the application based on three weighted categories:
1. Business Maturity (40%): Clarity of problem, market differentiation, user understanding
2. Technical Maturity (30%): Solution completeness, feasibility, validation evidence
3. Strategic Alignment (30%): Relevance to competition brief, sector fit, strategic potential
${challengeEvalCriteria ? `\nCompetition Brief / Evaluation Criteria:\n${challengeEvalCriteria}` : ''}

Respond ONLY with a valid JSON object matching this exact schema:
{
  "overallScore": <number 0-100>,
  "metrics": [
    { "name": "Business Maturity", "score": <number 0-100>, "weight": 40, "rationale": "<string>" },
    { "name": "Technical Maturity", "score": <number 0-100>, "weight": 30, "rationale": "<string>" },
    { "name": "Strategic Alignment", "score": <number 0-100>, "weight": 30, "rationale": "<string>" }
  ],
  "strengths": ["<string>", "<string>"],
  "recommendations": ["<string>", "<string>"],
  "insights": "<overall assessment paragraph>"
}`;

    const userPrompt = `Application Details:
Idea Name: ${app.ideaName || 'N/A'}
Sector: ${app.sector || 'N/A'}
Problem Statement: ${app.problemStatement || 'N/A'}
Solution Description: ${app.solutionDescription || 'N/A'}
Differentiator: ${app.differentiator || 'N/A'}
Target User: ${app.targetUser || 'N/A'}
Relevant Skills: ${app.relevantSkills || 'N/A'}
Previous Winner: ${app.previousWinner || 'N/A'}
Has Validation: ${app.hasValidation || 'N/A'}
Validation Details: ${app.validationDetails || 'N/A'}`;

    let attempts = 0;
    const maxAttempts = 3;
    let evaluationData: any = null;

    while (attempts < maxAttempts && !evaluationData) {
      attempts++;
      try {
        const response = await openai.chat.completions.create({
          model: '',
          max_tokens: 2048,
          temperature: 0.3,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error('Empty response');

        evaluationData = JSON.parse(content);
        if (typeof evaluationData.overallScore !== 'number' || !Array.isArray(evaluationData.metrics)) {
          evaluationData = null;
          throw new Error('Invalid schema');
        }
      } catch (err) {
        console.warn(`⚠️ Screening attempt ${attempts} failed:`, err);
        if (attempts < maxAttempts) await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (!evaluationData) {
      console.error('❌ All screening attempts failed');
      return;
    }

    const aiScore = Math.max(0, Math.min(100, Math.round(evaluationData.overallScore)));

    // Only store AI scores — no emails, no user activation.
    // The Super Admin will review and manually approve or reject.
    await db.update(memberApplications).set({
      aiScore,
      aiMetrics: evaluationData.metrics,
      aiStrengths: evaluationData.strengths,
      aiRecommendations: evaluationData.recommendations,
      aiInsights: evaluationData.insights,
      status: 'AI_REVIEWED',
      updatedAt: new Date(),
    }).where(eq(memberApplications.id, applicationId));

    console.log(`✅ Application ${applicationId} AI-reviewed (score: ${aiScore}) — awaiting Super Admin decision`);
  } catch (error) {
    console.error(`❌ Application screening failed for ${applicationId}:`, error);
  }
}
