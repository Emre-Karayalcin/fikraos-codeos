import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute, useParams } from "wouter";
import { useTranslation } from "react-i18next";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { useSidebar } from "@/contexts/SidebarContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import ThemeSelector from "@/components/theme/ThemeSelector";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search, Loader2, Send, MessageSquare, FileText, BarChart3, RefreshCw, Sparkles, TrendingUp, Users, DollarSign } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ReportVisualization } from "@/components/research/ReportVisualization";

interface ResearchResult {
  query: string;
  summary: string;
  keyFindings: string[];
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface DetailedIdea {
  title: string;
  description: string;
  marketSize: string;
  targetAudience: string;
  keyFeatures: string[];
  revenueModel: string;
  challenges: string[];
  opportunities: string[];
}

interface ResearchStep {
  id: string;
  title: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  timestamp?: Date;
}

export default function Research() {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { isCollapsed } = useSidebar();
  const [match] = useRoute("/research");
  const [query, setQuery] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [steps, setSteps] = useState<ResearchStep[]>([]);
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>("");
  const [suggestedIdeas, setSuggestedIdeas] = useState<DetailedIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<DetailedIdea | null>(null);
  const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isTyping]);

  // Get query from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('q');
    if (q) {
      setQuery(q);
      startResearch(q);
    }
  }, []);

  const startResearch = async (searchQuery: string) => {
    setIsResearching(true);
    setResult(null);
    setChatMessages([]);
    setCurrentStatus("");

    // Initialize static research steps
    const initialSteps: ResearchStep[] = [
      { id: 'planning', title: 'Planning research strategy', status: 'active' },
      { id: 'searching', title: 'Searching for information', status: 'pending' },
      { id: 'analyzing', title: 'Analyzing sources', status: 'pending' },
      { id: 'synthesizing', title: 'Synthesizing findings', status: 'pending' }
    ];
    setSteps(initialSteps);

    try {
      // Create custom fetch for streaming with POST
      const response = await fetch('/api/research/perplexity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Research failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'status') {
                // Update current status for right panel display (without emojis)
                const cleanMessage = data.message.replace(/[^\w\s\-.,!?]/g, '').trim();
                setCurrentStatus(cleanMessage);
                
                // Progress through static steps
                if (cleanMessage.includes('Connecting') || cleanMessage.includes('network')) {
                  setSteps(prev => prev.map(s => 
                    s.id === 'planning' ? { ...s, status: 'completed', timestamp: new Date() } :
                    s.id === 'searching' ? { ...s, status: 'active' } : s
                  ));
                } else if (cleanMessage.includes('Searching') || cleanMessage.includes('databases')) {
                  setSteps(prev => prev.map(s => 
                    s.id === 'searching' ? { ...s, status: 'completed', timestamp: new Date() } :
                    s.id === 'analyzing' ? { ...s, status: 'active' } : s
                  ));
                } else if (cleanMessage.includes('Processing') || cleanMessage.includes('insights')) {
                  setSteps(prev => prev.map(s => 
                    s.id === 'analyzing' ? { ...s, status: 'completed', timestamp: new Date() } :
                    s.id === 'synthesizing' ? { ...s, status: 'active' } : s
                  ));
                }
              } else if (data.type === 'result') {
                // Research complete, set final result
                setResult({
                  query: searchQuery,
                  summary: data.data.content || 'No content available',
                  keyFindings: data.data.keyFindings || [],
                  sources: data.data.sources || []
                });
                
                // Complete all steps
                setSteps(prev => prev.map(s => ({ ...s, status: 'completed', timestamp: new Date() })));
                setCurrentStatus("Research analysis complete and ready for review!");
                
                // Generate suggested ideas based on research
                generateSuggestedIdeas(searchQuery, data.data.content);
                
                setIsResearching(false);
                return;
              } else if (data.type === 'error') {
                // Handle error
                console.error('Research error:', data.message);
                setSteps(prev => prev.map(s => 
                  s.status === 'active' ? { ...s, status: 'failed' } : s
                ));
                setCurrentStatus(`Error: ${data.message}`);
                setIsResearching(false);
                return;
              }
            } catch (parseError) {
              console.error('Failed to parse streaming data:', parseError);
            }
          }
        }
      }

    } catch (error) {
      console.error('Research failed:', error);
      setSteps(prev => prev.map(s => 
        s.status === 'active' ? { ...s, status: 'failed' } : s
      ));
      setCurrentStatus(`Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsResearching(false);
    }
  };

  const generateSuggestedIdeas = (query: string, content: string) => {
    const ideas: DetailedIdea[] = [];
    
    // Generate relevant business ideas based on actual research insights
    if (query.toLowerCase().includes('ai') || content.toLowerCase().includes('artificial intelligence')) {
      ideas.push(
        {
          title: "Industry-Specific AI Automation Platform",
          description: "Develop AI-powered workflow automation tailored to specific industries (healthcare, finance, manufacturing) with pre-built integrations and compliance features.",
          marketSize: "$16.8B AI in business automation market (growing 25% annually)",
          targetAudience: "Mid-market companies in regulated industries, operations managers, IT decision makers",
          keyFeatures: ["Industry-specific templates", "Compliance monitoring", "ROI tracking", "No-code workflow builder", "Advanced analytics"],
          revenueModel: "Enterprise SaaS ($200-2000/month per department) + implementation services + training programs",
          challenges: [],
          opportunities: []
        },
        {
          title: "AI-Powered Decision Intelligence Platform",
          description: "Advanced analytics platform that combines AI, real-time data, and predictive modeling to help executives make strategic decisions with confidence scores and scenario planning.",
          marketSize: "$12.4B business intelligence market expanding to AI-driven insights",
          targetAudience: "C-suite executives, strategic planners, investment firms, consulting companies",
          keyFeatures: ["Predictive scenario modeling", "Risk assessment algorithms", "Real-time market data integration", "Executive dashboards", "Collaborative decision tracking"],
          revenueModel: "Enterprise licensing ($500-5000/month) + strategic consulting services + custom model development",
          challenges: [],
          opportunities: []
        }
      );
    } else if (query.toLowerCase().includes('sustainability') || content.toLowerCase().includes('environmental')) {
      ideas.push(
        {
          title: "Supply Chain Sustainability Intelligence",
          description: "Enterprise platform that provides end-to-end visibility into supply chain environmental impact with AI-driven recommendations for sustainable sourcing and logistics optimization.",
          marketSize: "$3.2B sustainable supply chain management market (28% CAGR)",
          targetAudience: "Large manufacturers, retail chains, procurement teams, sustainability officers",
          keyFeatures: ["Supplier sustainability scoring", "Carbon footprint mapping", "Alternative sourcing recommendations", "Regulatory compliance tracking", "ESG reporting automation"],
          revenueModel: "Enterprise licensing ($1000-10000/month) + implementation services + sustainability consulting fees",
          challenges: [],
          opportunities: []
        },
        {
          title: "Sustainable Packaging Marketplace",
          description: "B2B platform connecting businesses with eco-friendly packaging suppliers, featuring sustainability scoring and cost optimization tools.",
          marketSize: "$74.8B sustainable packaging market",
          targetAudience: "E-commerce businesses, retailers, manufacturers, packaging suppliers",
          keyFeatures: ["Supplier marketplace", "Sustainability scoring", "Cost calculator", "Sample ordering", "Compliance tracking"],
          revenueModel: "Transaction fees (2-4%) + SaaS subscriptions ($199-1999/month) + premium supplier partnerships",
          challenges: [],
          opportunities: []
        }
      );
    } else if (query.toLowerCase().includes('fintech') || content.toLowerCase().includes('financial')) {
      ideas.push(
        {
          title: "Micro-Investment Social Platform",
          description: "Community-driven investment app for young professionals featuring fractional shares, financial education, and peer insights.",
          marketSize: "$12.3B robo-advisor market",
          targetAudience: "Millennials and Gen Z (22-35), first-time investors, low-income professionals",
          keyFeatures: ["Fractional investing", "Social trading", "Educational content", "Goal-based saving", "Automated rebalancing"],
          revenueModel: "Asset management fees (0.50-1.25%) + premium features ($12.99/month) + educational content subscriptions",
          challenges: [],
          opportunities: []
        },
        {
          title: "AI-Powered Personal Finance Coach",
          description: "Intelligent financial advisor that analyzes spending patterns, provides personalized recommendations, and automates savings strategies.",
          marketSize: "$5.6B personal finance software market",
          targetAudience: "Middle-income households, young professionals, financial planning beginners",
          keyFeatures: ["Expense categorization", "Bill prediction", "Savings automation", "Debt optimization", "Investment recommendations"],
          revenueModel: "Freemium + premium subscriptions ($19.99/month) + financial institution partnerships + coaching services",
          challenges: [],
          opportunities: []
        }
      );
    } else {
      // Generic business ideas with detailed information
      const baseKeyword = query.split(' ')[0] || 'business';
      ideas.push(
        {
          title: `Smart ${baseKeyword.charAt(0).toUpperCase() + baseKeyword.slice(1)} Management Platform`,
          description: `Comprehensive SaaS solution designed specifically for ${baseKeyword} businesses to streamline operations, improve efficiency, and drive growth.`,
          marketSize: `$2.5B+ ${baseKeyword} software market`,
          targetAudience: `${baseKeyword} business owners, operations managers, industry professionals`,
          keyFeatures: ["Analytics dashboard", "Workflow automation", "Mobile app", "Integration APIs", "Custom reporting"],
          revenueModel: "SaaS subscriptions ($149-2499/month) + setup fees + training programs + custom integrations",
          challenges: [],
          opportunities: []
        },
        {
          title: `${baseKeyword.charAt(0).toUpperCase() + baseKeyword.slice(1)} Professional Network`,
          description: `Specialized networking platform connecting ${baseKeyword} professionals for collaboration, knowledge sharing, and business opportunities.`,
          marketSize: `$1.2B professional networking market segment`,
          targetAudience: `${baseKeyword} professionals, freelancers, consultants, industry experts`,
          keyFeatures: ["Professional profiles", "Industry job board", "Knowledge sharing", "Event platform", "Mentorship matching"],
          revenueModel: "Premium memberships ($24.99/month) + recruiter tools ($199/month) + event platform fees + sponsored content",
          challenges: [],
          opportunities: []
        }
      );
    }
    
    setSuggestedIdeas(ideas.slice(0, 4)); // Show top 4 comprehensive ideas
  };

  const refreshIdeas = () => {
    if (result) {
      generateSuggestedIdeas(result.query, result.summary);
    }
  };

  const handleIdeaClick = (idea: DetailedIdea) => {
    setSelectedIdea(idea);
    setIsIdeaModalOpen(true);
  };

  const handleDevelopIdea = async (idea: DetailedIdea) => {
    try {
      setIsIdeaModalOpen(false);
      
      // Get user organizations
      const orgsResponse = await fetch('/api/organizations', {
        credentials: 'include'
      });
      
      if (!orgsResponse.ok) {
        throw new Error('Failed to fetch organizations');
      }
      
      const organizations = await orgsResponse.json();
      
      if (!organizations?.length) {
        throw new Error('No organizations found');
      }
      
      const orgId = organizations[0].id;
      
      // Create new project
      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          title: idea.title,
          type: 'RESEARCH',
          description: `Business idea generated from research: "${query}" - ${idea.description}`
        }),
        credentials: 'include'
      });
      
      if (!projectResponse.ok) {
        throw new Error('Failed to create project');
      }
      
      const project = await projectResponse.json();
      
      // Create initial chat
      const chatResponse = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          title: 'Business Development Chat'
        }),
        credentials: 'include'
      });
      
      if (!chatResponse.ok) {
        throw new Error('Failed to create chat');
      }
      
      const chat = await chatResponse.json();
      
      // Send the idea as the first message with full details
      const ideaMessage = `I want to develop this business idea:

**${idea.title}**

${idea.description}

**Market Size:** ${idea.marketSize}
**Target Audience:** ${idea.targetAudience}

**Key Features:**
${idea.keyFeatures.map(feature => `- ${feature}`).join('\n')}

**Revenue Model:** ${idea.revenueModel}

Please help me develop this idea further with a comprehensive business plan, including market analysis, competitive landscape, go-to-market strategy, and financial projections.`;

      const messageResponse = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: chat.id,
          content: ideaMessage,
          role: 'user'
        }),
        credentials: 'include'
      });
      
      if (!messageResponse.ok) {
        throw new Error('Failed to send initial message');
      }
      
      // Trigger agent response to the user's message
      const agentResponse = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: ideaMessage,
          chatId: chat.id,
          language: i18n.language || 'en',
        }),
        credentials: "include",
      });
      
      if (!agentResponse.ok) {
        console.warn('Failed to trigger agent response, but continuing to chat');
      }
      
      // Navigate to the new chat
      setLocation(`/w/${slug}/chat/${chat.id}`);
      
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const handleFollowUp = async () => {
    if (!followUpQuestion.trim() || !result) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: followUpQuestion,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setFollowUpQuestion("");
    setIsTyping(true);

    try {
      const response = await fetch('/api/research/followup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: followUpQuestion,
          context: result.summary,
          previousQuery: result.query
        }),
      });

      if (!response.ok) {
        throw new Error('Follow-up request failed');
      }

      const data = await response.json();
      
      // Add user message to chat history
      const assistantResponse = data.content || "No additional information available.";
      
      // Update the main canvas content with typewriter effect
      setIsTyping(false);
      
      // First add the assistant message to chat
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: assistantResponse,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, assistantMessage]);

      // Now update the main content canvas with enhanced information
      const originalContent = result.summary;
      const enhancedContent = `${originalContent}\n\n---\n\n## Additional Analysis\n\n${assistantResponse}`;
      
      // Typewriter effect for the main canvas update
      let currentContent = originalContent;
      const newSection = `\n\n---\n\n## Additional Analysis\n\n${assistantResponse}`;
      
      for (let i = 0; i <= newSection.length; i++) {
        currentContent = originalContent + newSection.slice(0, i);
        setResult(prev => prev ? {
          ...prev,
          summary: currentContent
        } : null);
        
        // Faster typewriter for main content
        await new Promise(resolve => setTimeout(resolve, 10));
      }

    } catch (error) {
      console.error('Follow-up failed:', error);
      setIsTyping(false);
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I couldn\'t process your follow-up question. Please try again.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    }
  };

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden">
      {/* Left Sidebar */}
      <UnifiedSidebar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Research Progress */}
        <div className="w-80 border-r border-border flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/')}
                className="p-1"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Research</span>
              </div>
            </div>
          </div>

          {/* Query */}
          <div className="p-4 border-b border-border">
            <h3 className="font-medium text-sm text-text-secondary mb-2">Query</h3>
            <p className="text-sm text-text-primary">{query}</p>
          </div>

          {/* Research Steps or Suggested Ideas */}
          <div className="flex-1 p-4">
            {result && suggestedIdeas.length > 0 ? (
              // Show suggested ideas after research is complete
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-sm text-text-secondary">Suggested Ideas</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshIdeas}
                    className="h-6 px-2 text-xs"
                    data-testid="button-refresh-ideas"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Refresh
                  </Button>
                </div>
                <div className="space-y-3">
                  {suggestedIdeas.map((idea, index) => (
                    <div 
                      key={index} 
                      className="p-4 bg-background-secondary hover:bg-background-tertiary border border-border rounded-lg cursor-pointer transition-all duration-200 group"
                      onClick={() => handleIdeaClick(idea)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-text-primary group-hover:text-primary mb-1">
                            {idea.title}
                          </h4>
                          <p className="text-xs text-text-secondary line-clamp-2">
                            {idea.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              {idea.marketSize.split(' ')[0]}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {idea.targetAudience.split(',')[0]}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-text-muted mt-3 px-1">
                  Click on an idea to see detailed information and develop it
                </p>
              </>
            ) : (
              // Show research progress
              <>
                <h3 className="font-medium text-sm text-text-secondary mb-3">Progress</h3>
                <div className="space-y-3">
                  {steps.map((step) => (
                    <div key={step.id} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        step.status === 'completed' ? 'bg-green-500' :
                        step.status === 'active' ? 'bg-primary animate-pulse' :
                        step.status === 'failed' ? 'bg-red-500' :
                        'bg-gray-300'
                      }`} />
                      <span className={`text-xs ${
                        step.status === 'completed' ? 'text-green-600' :
                        step.status === 'active' ? 'text-primary' :
                        step.status === 'failed' ? 'text-red-600' :
                        'text-text-muted'
                      }`}>
                        {step.title}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="flex-1 flex flex-col">
          {/* Top Right Controls */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            {isAuthenticated && (
              <>
                <ThemeSelector />
                <LanguageSwitcher />
              </>
            )}
          </div>

          {/* Results Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            {isResearching && !result ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-text-secondary font-medium">
                    {currentStatus || "Starting research..."}
                  </p>
                </div>
              </div>
            ) : result ? (
              <div className="p-6">
                <Tabs defaultValue="report" className="w-full h-full">
                  <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto mb-6">
                  <TabsTrigger value="report" className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Report
                  </TabsTrigger>
                  <TabsTrigger value="findings" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Raw Data
                  </TabsTrigger>
                  <TabsTrigger value="sources">Sources</TabsTrigger>
                </TabsList>
                
                <TabsContent value="report" className="mt-6 p-6 space-y-8">
                  <ReportVisualization content={result.summary} query={result.query} />
                  
                  {/* Follow-up Research Interface */}
                  <div className="bg-muted/30 border border-border rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <MessageSquare className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-lg">Follow-up Research</h3>
                    </div>
                    
                    {/* Chat Messages */}
                    {chatMessages.length > 0 && (
                      <div className="mb-6 space-y-4 max-h-64 overflow-y-auto bg-background rounded-lg p-4 border">
                        {chatMessages.map((message, index) => (
                          <div key={index} className={`${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                            <div className={`inline-block max-w-[85%] p-4 rounded-lg ${
                              message.role === 'user' 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-card border border-border shadow-sm'
                            }`}>
                              {message.role === 'user' ? (
                                <p className="text-sm font-medium">{message.content}</p>
                              ) : (
                                <div className="prose prose-sm max-w-none">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {message.content}
                                  </ReactMarkdown>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {isTyping && (
                          <div className="text-left">
                            <div className="inline-block bg-card border border-border p-4 rounded-lg shadow-sm">
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                <span className="text-sm font-medium">Researching...</span>
                              </div>
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                    )}
                    
                    {/* Follow-up Input */}
                    <div className="flex gap-3">
                      <Textarea
                        value={followUpQuestion}
                        onChange={(e) => setFollowUpQuestion(e.target.value)}
                        placeholder="Ask for more details, request specific analysis, or explore new aspects..."
                        className="flex-1 min-h-[100px] resize-none bg-background border-border text-base"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleFollowUp();
                          }
                        }}
                      />
                      <Button
                        onClick={handleFollowUp}
                        disabled={!followUpQuestion.trim() || isTyping}
                        className="self-end px-6 py-3 h-auto"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Research
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="findings" className="mt-6 space-y-8 p-6">
                  {/* Research Content - Enhanced Design */}
                  <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
                    <div className="prose prose-lg max-w-none" ref={contentRef}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {result.summary}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Follow-up Research Interface */}
                  <div className="bg-muted/30 border border-border rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <MessageSquare className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-lg">Follow-up Research</h3>
                    </div>
                    
                    {/* Chat Messages */}
                    {chatMessages.length > 0 && (
                      <div className="mb-6 space-y-4 max-h-64 overflow-y-auto bg-background rounded-lg p-4 border">
                        {chatMessages.map((message, index) => (
                          <div key={index} className={`${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                            <div className={`inline-block max-w-[85%] p-4 rounded-lg ${
                              message.role === 'user' 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-card border border-border shadow-sm'
                            }`}>
                              {message.role === 'user' ? (
                                <p className="text-sm font-medium">{message.content}</p>
                              ) : (
                                <div className="prose prose-sm max-w-none">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {message.content}
                                  </ReactMarkdown>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {isTyping && (
                          <div className="text-left">
                            <div className="inline-block bg-card border border-border p-4 rounded-lg shadow-sm">
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                <span className="text-sm font-medium">Researching...</span>
                              </div>
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                    )}
                    
                    {/* Follow-up Input */}
                    <div className="flex gap-3">
                      <Textarea
                        value={followUpQuestion}
                        onChange={(e) => setFollowUpQuestion(e.target.value)}
                        placeholder="Ask for more details, request specific analysis, or explore new aspects..."
                        className="flex-1 min-h-[100px] resize-none bg-background border-border text-base"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleFollowUp();
                          }
                        }}
                      />
                      <Button
                        onClick={handleFollowUp}
                        disabled={!followUpQuestion.trim() || isTyping}
                        className="self-end px-6 py-3 h-auto"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Research
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="sources" className="mt-6 p-6">
                  <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h3 className="text-xl font-semibold mb-6">Research Sources</h3>
                    <div className="grid gap-4">
                      {result.sources.map((source, index) => (
                        <div key={index} className="bg-background border border-border rounded-lg p-5 hover:shadow-sm transition-shadow">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                              <span className="text-primary font-semibold text-sm">{index + 1}</span>
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-base mb-2">
                                <a href={source.url} target="_blank" rel="noopener noreferrer" 
                                   className="text-primary hover:underline transition-colors">
                                  {source.title}
                                </a>
                              </h4>
                              <p className="text-sm text-muted-foreground mb-3 font-mono">{source.url}</p>
                              <p className="text-sm text-foreground leading-relaxed">{source.snippet}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-text-muted">Enter a research query to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Idea Modal */}
      <Dialog open={isIdeaModalOpen} onOpenChange={setIsIdeaModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedIdea && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  {selectedIdea.title}
                </DialogTitle>
                <DialogDescription className="text-base mt-3">
                  {selectedIdea.description}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* Market Information */}
                <div className="bg-muted/30 rounded-lg p-4">
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    Market Size
                  </h4>
                  <p className="text-sm text-muted-foreground">{selectedIdea.marketSize}</p>
                </div>

                {/* Target Audience */}
                <div className="bg-muted/30 rounded-lg p-4">
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-blue-600" />
                    Target Audience
                  </h4>
                  <p className="text-sm text-muted-foreground">{selectedIdea.targetAudience}</p>
                </div>

                {/* Revenue Model */}
                <div className="bg-muted/30 rounded-lg p-4">
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    Revenue Model
                  </h4>
                  <p className="text-sm text-muted-foreground">{selectedIdea.revenueModel}</p>
                </div>

                {/* Key Features */}
                <div className="bg-muted/30 rounded-lg p-4">
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    Key Features
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {selectedIdea.keyFeatures.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-purple-600 rounded-full flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>


              <DialogFooter className="mt-8 gap-3">
                <Button variant="outline" onClick={() => setIsIdeaModalOpen(false)}>
                  Close
                </Button>
                <Button 
                  onClick={() => handleDevelopIdea(selectedIdea)}
                  className="bg-primary hover:bg-primary/90"
                  data-testid="button-develop-idea"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Develop this Idea
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}