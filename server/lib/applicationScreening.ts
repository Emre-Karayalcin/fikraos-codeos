import OpenAI from 'openai';
import { db } from '../db';
import { memberApplications, users, challenges, organizations } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';
import mustache from 'mustache';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function loadEmailTemplate(name: string, vars: Record<string, string>): string {
  const candidates = [
    path.join(__dirname, '..', 'email-templates', `${name}.html`),
    path.join(process.cwd(), 'server', 'email-templates', `${name}.html`),
    path.join(process.cwd(), 'dist', 'email-templates', `${name}.html`),
    path.join(process.cwd(), 'email-templates', `${name}.html`),
  ];
  const found = candidates.find(p => { try { return fs.existsSync(p); } catch { return false; } });
  if (!found) return '';
  try {
    return mustache.render(fs.readFileSync(found, 'utf8'), vars);
  } catch {
    return '';
  }
}

async function sendApplicationEmail(to: string, subject: string, html: string): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey || !html) return;
  const resend = new Resend(resendApiKey);
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'no-reply@fikrahub.com',
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('❌ Failed to send application email:', err);
  }
}

export async function screenApplicationAsync(
  applicationId: string,
  challengeId: string | null,
  orgId: string,
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
    const isApproved = aiScore >= 70;

    await db.update(memberApplications).set({
      aiScore,
      aiMetrics: evaluationData.metrics,
      aiStrengths: evaluationData.strengths,
      aiRecommendations: evaluationData.recommendations,
      aiInsights: evaluationData.insights,
      status: isApproved ? 'APPROVED' : 'REJECTED',
      reviewedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(memberApplications.id, applicationId));

    const [user] = await db.select().from(users).where(eq(users.id, app.userId));
    if (!user) return;

    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
    const orgSlug = org?.slug || '';
    const orgName = org?.name || 'the platform';
    const hostUrl = process.env.HOST_URL || 'https://os.fikrahub.com';
    const userName = user.firstName || user.email || 'there';

    if (isApproved) {
      await db.update(users).set({ status: 'ACTIVE' }).where(eq(users.id, app.userId));

      const loginUrl = `${hostUrl}/w/${orgSlug}`;
      const html = loadEmailTemplate('application-approved', { userName, orgName, loginUrl });
      await sendApplicationEmail(user.email, `Congratulations! Your application to ${orgName} has been approved`, html);
      console.log(`✅ Application ${applicationId} APPROVED (score: ${aiScore})`);
    } else {
      const html = loadEmailTemplate('application-rejected', { userName, orgName, ideaName: app.ideaName || 'your idea' });
      await sendApplicationEmail(user.email, `Update on your application to ${orgName}`, html);
      console.log(`✅ Application ${applicationId} REJECTED (score: ${aiScore})`);
    }
  } catch (error) {
    console.error(`❌ Application screening failed for ${applicationId}:`, error);
  }
}
