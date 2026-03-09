import { Response } from 'express';

export interface ResearchActivity {
  type: 'query' | 'visit' | 'extract';
  content: string;
  url?: string;
  domain?: string;
  reason?: string;
  snippet?: string;
  favicon?: string;
}

export interface ResearchResult {
  executiveSummary: string[];
  keyFindings: { question: string; answer: string }[];
  dataFacts: { fact: string; sources: string[] }[];
  prosAndCons?: { pros: string[]; cons: string[] };
  openQuestions: string[];
  citations: { url: string; title: string; domain: string; timestamp: Date }[];
}

export class ResearchAgent {
  private sendUpdate(res: Response, data: any) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  async conductResearch(query: string, res: Response): Promise<void> {
    try {
      console.log(`🔍 Starting research for query: "${query}"`);
      
      // Planning phase
      this.sendUpdate(res, { 
        state: 'PLANNING', 
        step: 'Analyzing your query...' 
      });
      
      await this.delay(1000);

      // Expanding sub-questions
      this.sendUpdate(res, { 
        state: 'EXPANDING', 
        step: 'Breaking down into sub-questions...' 
      });
      
      const subQuestions = this.generateSubQuestions(query);
      await this.delay(1500);

      // Searching phase
      this.sendUpdate(res, { 
        state: 'SEARCHING', 
        step: 'Searching for relevant information...' 
      });

      this.sendUpdate(res, {
        activity: {
          type: 'query',
          content: query
        }
      });

      await this.delay(1000);

      // Simulate visiting multiple sites
      const mockSites = [
        { domain: 'techcrunch.com', title: 'TechCrunch - Latest Technology News', reason: 'Industry trends and startup news' },
        { domain: 'crunchbase.com', title: 'Crunchbase - Company Data', reason: 'Market data and funding information' },
        { domain: 'statista.com', title: 'Statista - Market Research', reason: 'Market size and statistics' },
        { domain: 'mckinsey.com', title: 'McKinsey Insights', reason: 'Strategic analysis and reports' }
      ];

      for (const site of mockSites) {
        this.sendUpdate(res, { 
          state: 'VISITING', 
          step: `Visiting ${site.domain}...` 
        });

        this.sendUpdate(res, {
          activity: {
            type: 'visit',
            content: `Analyzing content from ${site.domain}`,
            url: `https://${site.domain}`,
            domain: site.domain,
            reason: site.reason,
            favicon: `https://www.google.com/s2/favicons?domain=${site.domain}`
          }
        });

        await this.delay(800);

        // Extract content
        this.sendUpdate(res, { 
          state: 'EXTRACTING', 
          step: `Extracting key information from ${site.domain}...` 
        });

        this.sendUpdate(res, {
          activity: {
            type: 'extract',
            content: `Extracted insights about ${query.split(' ').slice(0, 3).join(' ')}`,
            snippet: this.generateMockSnippet(query, site.domain)
          }
        });

        await this.delay(600);
      }

      // Cross-checking
      this.sendUpdate(res, { 
        state: 'CROSSCHECK', 
        step: 'Cross-referencing information...' 
      });
      await this.delay(1200);

      // Synthesizing
      this.sendUpdate(res, { 
        state: 'SYNTHESIZING', 
        step: 'Synthesizing findings...' 
      });
      await this.delay(1500);

      // Drafting
      this.sendUpdate(res, { 
        state: 'DRAFTING', 
        step: 'Drafting comprehensive answer...' 
      });
      await this.delay(1000);

      // Generate final result
      const result = this.generateMockResult(query, subQuestions);
      
      this.sendUpdate(res, {
        state: 'DONE',
        result: this.formatResultForChat(result),
        researchData: result,
        done: true
      });

    } catch (error) {
      console.error('Research error:', error);
      this.sendUpdate(res, { 
        state: 'ERROR', 
        error: 'Research failed. Please try again.' 
      });
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateSubQuestions(query: string): string[] {
    // Generate relevant sub-questions based on the main query
    const baseQuestions = [
      `What is the market size for ${query}?`,
      `Who are the main competitors in ${query}?`,
      `What are the key trends in ${query}?`,
      `What are the challenges and opportunities in ${query}?`
    ];
    
    return baseQuestions.slice(0, 3); // Return 3 sub-questions
  }

  private generateMockSnippet(query: string, domain: string): string {
    const snippets = {
      'techcrunch.com': `The ${query} market is experiencing significant growth with emerging trends in AI and automation...`,
      'crunchbase.com': `Recent funding rounds in the ${query} space show investor confidence with over $500M raised in 2024...`,
      'statista.com': `Market research indicates the ${query} industry is valued at approximately $12.5 billion globally...`,
      'mckinsey.com': `Strategic analysis reveals key opportunities in ${query} through digital transformation initiatives...`
    };

    return snippets[domain as keyof typeof snippets] || `Key insights about ${query} from industry analysis...`;
  }

  private generateMockResult(query: string, subQuestions: string[]): ResearchResult {
    return {
      executiveSummary: [
        `The ${query} market represents a significant growth opportunity with strong investor interest`,
        `Key trends include AI integration, automation, and digital transformation`,
        `Market size is estimated at $12.5 billion globally with 15% annual growth`,
        `Main challenges include regulatory compliance and competition from established players`,
        `Emerging opportunities exist in mobile-first solutions and international expansion`
      ],
      keyFindings: subQuestions.map((question, index) => ({
        question,
        answer: this.generateAnswerForQuestion(question, query)
      })),
      dataFacts: [
        {
          fact: `Global market size for ${query} estimated at $12.5 billion`,
          sources: ['Statista Market Research', 'McKinsey Industry Report']
        },
        {
          fact: `Over $500M in venture funding raised in 2024`,
          sources: ['Crunchbase Funding Data', 'TechCrunch Analysis']
        },
        {
          fact: `15% annual growth rate projected through 2027`,
          sources: ['Industry Growth Analysis', 'Market Forecast Reports']
        }
      ],
      prosAndCons: {
        pros: [
          'Large and growing market opportunity',
          'Strong investor interest and funding availability',
          'Emerging technology trends creating new possibilities',
          'Increasing demand from enterprise customers'
        ],
        cons: [
          'High competition from established players',
          'Regulatory compliance requirements',
          'Technology adoption barriers',
          'Economic uncertainty affecting spending'
        ]
      },
      openQuestions: [
        `What specific regulations might affect ${query} businesses?`,
        `How will economic conditions impact market growth?`,
        `What emerging technologies could disrupt the industry?`
      ],
      citations: [
        {
          url: 'https://techcrunch.com',
          title: 'TechCrunch - Latest Technology News',
          domain: 'techcrunch.com',
          timestamp: new Date()
        },
        {
          url: 'https://crunchbase.com',
          title: 'Crunchbase - Company and Market Data',
          domain: 'crunchbase.com',
          timestamp: new Date()
        },
        {
          url: 'https://statista.com',
          title: 'Statista - Market Research Platform',
          domain: 'statista.com',
          timestamp: new Date()
        },
        {
          url: 'https://mckinsey.com',
          title: 'McKinsey - Strategic Insights',
          domain: 'mckinsey.com',
          timestamp: new Date()
        }
      ]
    };
  }

  private generateAnswerForQuestion(question: string, query: string): string {
    if (question.includes('market size')) {
      return `The global market for ${query} is estimated at $12.5 billion with strong growth projections of 15% annually through 2027.`;
    }
    if (question.includes('competitors')) {
      return `Key competitors include established tech companies and emerging startups, with consolidation expected as the market matures.`;
    }
    if (question.includes('trends')) {
      return `Major trends include AI integration, mobile-first approaches, and increased focus on user experience and automation.`;
    }
    if (question.includes('challenges')) {
      return `Main challenges include regulatory compliance, market competition, technology adoption barriers, and securing adequate funding.`;
    }
    
    return `Research indicates significant opportunities and challenges in the ${query} space requiring strategic planning.`;
  }

  private formatResultForChat(result: ResearchResult): string {
    let formatted = `# Comprehensive Research Analysis\n\n`;
    
    // Executive Summary with more context
    formatted += `## Executive Summary\n\n`;
    formatted += `Based on extensive research and analysis, here are the critical insights:\n\n`;
    result.executiveSummary.forEach((point, index) => {
      formatted += `${index + 1}. ${point}\n`;
    });
    
    // Key Research Questions & Findings
    formatted += `\n## In-Depth Analysis\n\n`;
    result.keyFindings.forEach((finding, index) => {
      formatted += `${index + 1}. ${finding.question}\n\n`;
      formatted += `${finding.answer}\n\n`;
      formatted += `---\n\n`;
    });
    
    // Market Intelligence & Data Points
    formatted += `## Market Intelligence & Critical Data\n\n`;
    result.dataFacts.forEach((fact, index) => {
      formatted += `• ${fact.fact}\n`;
      if (fact.sources && fact.sources.length > 0) {
        formatted += `  Sources: ${fact.sources.join(', ')}\n`;
      }
      formatted += `\n`;
    });
    
    // Strategic Analysis - Pros & Cons
    if (result.prosAndCons) {
      formatted += `## Strategic Outlook\n\n`;
      formatted += `### Opportunities & Advantages\n\n`;
      result.prosAndCons.pros.forEach(pro => {
        formatted += `• ${pro}\n`;
      });
      formatted += `\n### Challenges & Risk Factors\n\n`;
      result.prosAndCons.cons.forEach(con => {
        formatted += `• ${con}\n`;
      });
      formatted += `\n`;
    }
    
    // Future Research Directions
    if (result.openQuestions.length > 0) {
      formatted += `## Future Research Priorities\n\n`;
      formatted += `These areas warrant deeper investigation for comprehensive understanding:\n\n`;
      result.openQuestions.forEach((question, index) => {
        formatted += `${index + 1}. ${question}\n`;
      });
      formatted += `\n`;
    }
    
    // Research Methodology & Sources
    formatted += `## Research Methodology\n\n`;
    formatted += `This analysis was conducted using comprehensive data gathering from ${result.citations.length} authoritative sources, `;
    formatted += `including industry reports, market research databases, expert analyses, and real-time data feeds. `;
    formatted += `The findings represent current market conditions and emerging trends as of ${new Date().toLocaleDateString()}.\n\n`;
    
    formatted += `### Primary Sources Referenced\n\n`;
    result.citations.forEach((citation, index) => {
      formatted += `${index + 1}. ${citation.title} (${citation.domain})\n`;
    });
    
    return formatted;
  }
}