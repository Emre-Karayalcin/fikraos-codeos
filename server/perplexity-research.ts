import { Response } from 'express';
import fetch from 'node-fetch';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

export interface ResearchActivity {
  type: 'query' | 'analyzing' | 'source' | 'insight' | 'synthesizing';
  content: string;
  url?: string;
  domain?: string;
  reason?: string;
  snippet?: string;
  favicon?: string;
  timestamp?: Date;
}

export interface ResearchResult {
  executiveSummary: string[];
  keyFindings: Array<{ question: string; answer: string; sources: string[] }>;
  dataFacts: Array<{ fact: string; sources: string[]; confidence: string }>;
  prosAndCons?: { pros: string[]; cons: string[] };
  openQuestions: string[];
  citations: Array<{ url: string; title: string; domain: string; timestamp: Date }>;
  fullReport: string;
  recommendations: string[];
}

export class PerplexityResearchAgent {
  private sendUpdate(res: Response, data: any) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }

  private async queryPerplexity(prompt: string, includeCitations: boolean = true): Promise<any> {
    if (!PERPLEXITY_API_KEY) {
      console.warn('⚠️  PERPLEXITY_API_KEY not set - using fallback mode');
      return null;
    }

    try {
      const response = await fetch(PERPLEXITY_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-large-128k-online',
          messages: [
            {
              role: 'system',
              content: 'You are a professional research analyst. Provide detailed, well-sourced, and comprehensive research with specific data points, statistics, and citations.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 4000,
          return_citations: includeCitations,
          return_images: false
        })
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error calling Perplexity API:', error);
      return null;
    }
  }

  async conductResearch(query: string, res: Response): Promise<void> {
    try {
      console.log(`🔍 Starting comprehensive research for: "${query}"`);

      // Step 1: Planning & Query Analysis
      this.sendUpdate(res, {
        state: 'PLANNING',
        step: 'Analyzing your research query and planning approach...',
        progress: 5
      });

      this.sendUpdate(res, {
        activity: {
          type: 'query',
          content: `Research Query: ${query}`,
          timestamp: new Date()
        }
      });

      // Step 2: Generate sub-questions for comprehensive research
      this.sendUpdate(res, {
        state: 'EXPANDING',
        step: 'Breaking down into key research questions...',
        progress: 15
      });

      const subQuestionsPrompt = `Based on this research query: "${query}"

Generate 5-7 specific sub-questions that would comprehensively cover different aspects of this topic. Focus on:
1. Market size and opportunities
2. Current trends and innovations
3. Key players and competitors
4. Challenges and risks
5. Future outlook
6. Technical/operational considerations
7. Financial/business model aspects

Format as a numbered list.`;

      const subQuestionsResult = await this.queryPerplexity(subQuestionsPrompt, false);
      const subQuestions = subQuestionsResult?.choices[0]?.message?.content || '';

      this.sendUpdate(res, {
        activity: {
          type: 'analyzing',
          content: 'Identified key research dimensions',
          snippet: subQuestions.split('\n').slice(0, 5).join('\n'),
          timestamp: new Date()
        }
      });

      // Step 3: Deep Research with Perplexity
      this.sendUpdate(res, {
        state: 'RESEARCHING',
        step: 'Conducting deep research across multiple sources...',
        progress: 30
      });

      const mainResearchPrompt = `Conduct comprehensive research on: "${query}"

Please provide:
1. Executive Summary (3-5 key takeaways)
2. Market Analysis (size, growth, trends with specific numbers)
3. Key Players and Competition
4. Technology/Innovation Landscape
5. Business Model and Revenue Opportunities
6. Challenges and Risks
7. Future Outlook and Predictions
8. Actionable Recommendations

Include specific data points, statistics, and recent developments. Cite all sources.`;

      const mainResult = await this.queryPerplexity(mainResearchPrompt, true);

      if (!mainResult) {
        throw new Error('Failed to get research results from Perplexity');
      }

      const mainContent = mainResult.choices[0]?.message?.content || '';
      const citations = mainResult.citations || [];

      // Process citations and show sources
      this.sendUpdate(res, {
        state: 'ANALYZING',
        step: 'Analyzing sources and extracting insights...',
        progress: 50
      });

      const processedCitations = citations.map((url: string, index: number) => {
        const domain = this.extractDomain(url);
        this.sendUpdate(res, {
          activity: {
            type: 'source',
            content: `Found relevant source: ${domain}`,
            url,
            domain,
            favicon: `https://www.google.com/s2/favicons?domain=${domain}`,
            timestamp: new Date()
          }
        });

        return {
          url,
          title: `Source ${index + 1} - ${domain}`,
          domain,
          timestamp: new Date()
        };
      });

      // Step 4: Pros and Cons Analysis
      this.sendUpdate(res, {
        state: 'ANALYZING',
        step: 'Evaluating opportunities and challenges...',
        progress: 65
      });

      const prosConsPrompt = `Based on research about "${query}", provide:
1. Top 5-7 Pros/Opportunities (be specific with data)
2. Top 5-7 Cons/Challenges (be specific with real concerns)

Format clearly with bullet points.`;

      const prosConsResult = await this.queryPerplexity(prosConsPrompt, true);
      const prosConsContent = prosConsResult?.choices[0]?.message?.content || '';

      // Step 5: Extract Key Data Facts
      this.sendUpdate(res, {
        state: 'EXTRACTING',
        step: 'Extracting key data points and statistics...',
        progress: 75
      });

      const dataFactsPrompt = `From research on "${query}", extract 8-10 key factual data points, statistics, or metrics that are most important. Include:
- Market size numbers
- Growth rates
- Key statistics
- Important dates/milestones
- User numbers or adoption rates

Format as: "Fact | Source URL"`;

      const dataFactsResult = await this.queryPerplexity(dataFactsPrompt, true);
      const dataFactsContent = dataFactsResult?.choices[0]?.message?.content || '';

      // Step 6: Generate Actionable Recommendations
      this.sendUpdate(res, {
        state: 'SYNTHESIZING',
        step: 'Synthesizing insights and generating recommendations...',
        progress: 85
      });

      const recommendationsPrompt = `Based on all research about "${query}", provide 5-7 specific, actionable recommendations for someone looking to:
1. Enter this market/space
2. Build a product/service
3. Make strategic decisions

Be specific and tactical.`;

      const recommendationsResult = await this.queryPerplexity(recommendationsPrompt, false);
      const recommendationsContent = recommendationsResult?.choices[0]?.message?.content || '';

      // Step 7: Identify Open Questions
      this.sendUpdate(res, {
        state: 'FINALIZING',
        step: 'Identifying areas for further investigation...',
        progress: 95
      });

      const openQuestionsPrompt = `Based on research about "${query}", what are 4-6 important questions that still need investigation or remain unanswered? Focus on gaps in knowledge or areas needing deeper dive.`;

      const openQuestionsResult = await this.queryPerplexity(openQuestionsPrompt, false);
      const openQuestionsContent = openQuestionsResult?.choices[0]?.message?.content || '';

      // Parse and structure results
      const executiveSummary = this.extractSection(mainContent, 'Executive Summary', 'Market Analysis');
      const keyFindings = this.parseKeyFindings(mainContent, processedCitations);
      const dataFacts = this.parseDataFacts(dataFactsContent, dataFactsResult?.citations || []);
      const prosAndCons = this.parseProsAndCons(prosConsContent);
      const recommendations = this.parseList(recommendationsContent);
      const openQuestions = this.parseList(openQuestionsContent);

      // Final result
      const result: ResearchResult = {
        executiveSummary: this.parseList(executiveSummary),
        keyFindings,
        dataFacts,
        prosAndCons,
        openQuestions,
        citations: processedCitations,
        fullReport: mainContent,
        recommendations
      };

      this.sendUpdate(res, {
        state: 'COMPLETED',
        step: 'Research completed!',
        progress: 100,
        result
      });

      console.log(`✅ Research completed for: "${query}" with ${processedCitations.length} sources`);

    } catch (error) {
      console.error('Research error:', error);
      this.sendUpdate(res, {
        state: 'ERROR',
        step: 'Research failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private extractSection(content: string, startMarker: string, endMarker: string): string {
    const startIdx = content.indexOf(startMarker);
    if (startIdx === -1) return '';

    const endIdx = content.indexOf(endMarker, startIdx);
    if (endIdx === -1) return content.slice(startIdx);

    return content.slice(startIdx, endIdx);
  }

  private parseList(content: string): string[] {
    const lines = content.split('\n');
    const items: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/^[\d\-\*\•]/) || trimmed.match(/^\d+\./)) {
        items.push(trimmed.replace(/^[\d\-\*\•\.]+\s*/, ''));
      }
    }

    return items.filter(item => item.length > 10);
  }

  private parseKeyFindings(content: string, citations: any[]): Array<{ question: string; answer: string; sources: string[] }> {
    const findings: Array<{ question: string; answer: string; sources: string[] }> = [];
    const sections = ['Market Analysis', 'Key Players', 'Technology', 'Business Model', 'Challenges'];

    for (const section of sections) {
      const sectionContent = this.extractSection(content, section, sections[sections.indexOf(section) + 1] || 'END');
      if (sectionContent) {
        findings.push({
          question: `What about ${section.toLowerCase()}?`,
          answer: sectionContent.slice(0, 300) + '...',
          sources: citations.slice(0, 3).map(c => c.url)
        });
      }
    }

    return findings;
  }

  private parseDataFacts(content: string, citations: string[]): Array<{ fact: string; sources: string[]; confidence: string }> {
    const facts: Array<{ fact: string; sources: string[]; confidence: string }> = [];
    const lines = content.split('\n').filter(l => l.trim().length > 0);

    for (const line of lines) {
      if (line.includes('|')) {
        const [fact, source] = line.split('|').map(s => s.trim());
        facts.push({
          fact,
          sources: source ? [source] : citations.slice(0, 2),
          confidence: 'High'
        });
      } else if (line.match(/^[\d\-\*\•]/)) {
        facts.push({
          fact: line.replace(/^[\d\-\*\•\.]+\s*/, ''),
          sources: citations.slice(0, 2),
          confidence: 'High'
        });
      }
    }

    return facts.slice(0, 10);
  }

  private parseProsAndCons(content: string): { pros: string[]; cons: string[] } {
    const lines = content.split('\n');
    const pros: string[] = [];
    const cons: string[] = [];
    let currentSection: 'pros' | 'cons' | null = null;

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes('pro') || lower.includes('opportunit') || lower.includes('benefit')) {
        currentSection = 'pros';
        continue;
      }
      if (lower.includes('con') || lower.includes('challenge') || lower.includes('risk')) {
        currentSection = 'cons';
        continue;
      }

      const trimmed = line.trim();
      if (trimmed.match(/^[\d\-\*\•]/) && currentSection) {
        const item = trimmed.replace(/^[\d\-\*\•\.]+\s*/, '');
        if (item.length > 10) {
          currentSection === 'pros' ? pros.push(item) : cons.push(item);
        }
      }
    }

    return { pros, cons };
  }
}
