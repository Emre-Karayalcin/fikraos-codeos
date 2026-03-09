import { useState } from "react";
import { Copy, Download, ExternalLink, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface ResearchData {
  executiveSummary: string[];
  keyFindings: { question: string; answer: string }[];
  dataFacts: { fact: string; sources: string[] }[];
  prosAndCons?: { pros: string[]; cons: string[] };
  openQuestions: string[];
  citations: { url: string; title: string; domain: string; timestamp: Date }[];
  rawData?: any;
}

interface ResearchPanelProps {
  data: ResearchData | null;
  isLoading?: boolean;
}

export function ResearchPanel({ data, isLoading }: ResearchPanelProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const exportAsMarkdown = () => {
    if (!data) return;

    let markdown = '# Research Summary\n\n';
    
    markdown += '## Executive Summary\n\n';
    data.executiveSummary.forEach(point => {
      markdown += `- ${point}\n`;
    });
    
    markdown += '\n## Key Findings\n\n';
    data.keyFindings.forEach(finding => {
      markdown += `### ${finding.question}\n\n${finding.answer}\n\n`;
    });
    
    markdown += '## Data & Facts\n\n';
    data.dataFacts.forEach(fact => {
      markdown += `- ${fact.fact}\n`;
      fact.sources.forEach(source => {
        markdown += `  - Source: ${source}\n`;
      });
      markdown += '\n';
    });
    
    if (data.prosAndCons) {
      markdown += '## Pros & Cons\n\n';
      markdown += '### Pros\n\n';
      data.prosAndCons.pros.forEach(pro => {
        markdown += `- ${pro}\n`;
      });
      markdown += '\n### Cons\n\n';
      data.prosAndCons.cons.forEach(con => {
        markdown += `- ${con}\n`;
      });
    }
    
    markdown += '\n## Open Questions\n\n';
    data.openQuestions.forEach(question => {
      markdown += `- ${question}\n`;
    });
    
    markdown += '\n## Citations\n\n';
    data.citations.forEach((citation, index) => {
      markdown += `[${index + 1}] ${citation.title} - ${citation.domain}\n`;
      markdown += `    ${citation.url}\n\n`;
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'research-summary.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="w-5 h-5 text-blue-500 animate-pulse" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Research in Progress
          </h3>
        </div>
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          No Research Data
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Start a research query to see comprehensive analysis here.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with Actions */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Research Results
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const summary = data.executiveSummary.join('\n');
                copyToClipboard(summary, 'summary');
              }}
              className="text-xs"
            >
              {copiedSection === 'summary' ? (
                <CheckCircle className="w-3 h-3 mr-1" />
              ) : (
                <Copy className="w-3 h-3 mr-1" />
              )}
              Copy Summary
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportAsMarkdown}
              className="text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="summary" className="h-full">
          <TabsList className="grid w-full grid-cols-4 mx-4 my-2">
            <TabsTrigger value="summary" className="text-xs">Summary</TabsTrigger>
            <TabsTrigger value="findings" className="text-xs">Findings</TabsTrigger>
            <TabsTrigger value="data" className="text-xs">Data</TabsTrigger>
            <TabsTrigger value="sources" className="text-xs">Sources</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="p-4 pt-0">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Executive Summary
                </h4>
                <ul className="space-y-2">
                  {data.executiveSummary.map((point, index) => (
                    <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              {data.openQuestions.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Open Questions
                  </h4>
                  <ul className="space-y-1">
                    {data.openQuestions.map((question, index) => (
                      <li key={index} className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
                        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {question}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="findings" className="p-4 pt-0">
            <div className="space-y-4">
              {data.keyFindings.map((finding, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {finding.question}
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {finding.answer}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="data" className="p-4 pt-0">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Key Data & Facts
                </h4>
                <div className="space-y-3">
                  {data.dataFacts.map((fact, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                      <p className="text-sm text-gray-900 dark:text-gray-100 mb-2">
                        {fact.fact}
                      </p>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Sources: {fact.sources.length} reference{fact.sources.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {data.prosAndCons && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Pros & Cons
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                        Pros
                      </h5>
                      <ul className="space-y-1">
                        {data.prosAndCons.pros.map((pro, index) => (
                          <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                            <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
                        Cons
                      </h5>
                      <ul className="space-y-1">
                        {data.prosAndCons.cons.map((con, index) => (
                          <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                            <AlertTriangle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sources" className="p-4 pt-0">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">
                Citations ({data.citations.length})
              </h4>
              <div className="space-y-2">
                {data.citations.map((citation, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                        {citation.title}
                      </h5>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        {citation.domain} • {citation.timestamp.toLocaleDateString()}
                      </p>
                      <a
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Visit source
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}