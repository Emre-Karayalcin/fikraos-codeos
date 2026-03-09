import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, ChevronDown, ChevronUp, FileText, Calendar } from 'lucide-react';
import BusinessModel from '@/components/assets/BusinessModel';
import LeanCanvas from '@/components/assets/LeanCanvas';
import Personas from '@/components/assets/Personas';
import Swot from '@/components/assets/Swot';
import TamSamSom from '@/components/assets/TamSamSom';
import { useTranslation } from 'react-i18next';

interface AllAIOutputsViewProps {
  ideaId: string;
}

const OUTPUT_TYPE_LABELS: Record<string, { en: string; ar: string }> = {
  PITCH_OUTLINE: { en: 'Pitch Deck Outline', ar: 'مخطط عرض الأعمال' },
  TEAM_ROLES: { en: 'Team Roles & Structure', ar: 'أدوار وهيكل الفريق' },
  TAM_SAM_SOM: { en: 'TAM/SAM/SOM Analysis', ar: 'تحليل TAM/SAM/SOM' },
  COMPETITOR_MAP: { en: 'Competitor Analysis', ar: 'تحليل المنافسين' },
  BRAND_WHEEL: { en: 'Brand Wheel', ar: 'عجلة العلامة التجارية' },
  MARKETING_PLAN: { en: 'Marketing Plan', ar: 'خطة التسويق' },
  JOURNEY_MAP: { en: 'Customer Journey Map', ar: 'خريطة رحلة العميل' },
  INTERVIEW_QUESTIONS: { en: 'Interview Questions', ar: 'أسئلة المقابلة' },
  USER_STORIES: { en: 'User Stories', ar: 'قصص المستخدم' },
  SWOT: { en: 'SWOT Analysis', ar: 'تحليل SWOT' },
  PERSONA: { en: 'User Personas', ar: 'شخصيات المستخدم' },
  BRAND_IDENTITY: { en: 'Brand Identity', ar: 'هوية العلامة التجارية' },
  LEAN_CANVAS: { en: 'Lean Canvas', ar: 'لوحة العمل الرشيقة' },
  // Legacy support
  BusinessModel: { en: 'Business Model', ar: 'نموذج العمل' },
  LeanCanvas: { en: 'Lean Canvas', ar: 'لوحة العمل الرشيقة' },
  Personas: { en: 'User Personas', ar: 'شخصيات المستخدم' },
  Swot: { en: 'SWOT Analysis', ar: 'تحليل SWOT' },
  TamSamSom: { en: 'TAM/SAM/SOM', ar: 'TAM/SAM/SOM' },
  MarketAnalysis: { en: 'Market Analysis', ar: 'تحليل السوق' },
  CompetitorAnalysis: { en: 'Competitor Analysis', ar: 'تحليل المنافسين' },
  FinancialProjections: { en: 'Financial Projections', ar: 'التوقعات المالية' }
};

const OUTPUT_TYPE_ICONS: Record<string, string> = {
  PITCH_OUTLINE: '📊',
  TEAM_ROLES: '👥',
  TAM_SAM_SOM: '📈',
  COMPETITOR_MAP: '⚔️',
  BRAND_WHEEL: '🎨',
  MARKETING_PLAN: '📣',
  JOURNEY_MAP: '🗺️',
  INTERVIEW_QUESTIONS: '❓',
  USER_STORIES: '📝',
  SWOT: '🔍',
  PERSONA: '👤',
  BRAND_IDENTITY: '🎨',
  LEAN_CANVAS: '📋',
  // Legacy support
  BusinessModel: '💼',
  LeanCanvas: '📋',
  Personas: '👥',
  Swot: '📊',
  TamSamSom: '📈',
  MarketAnalysis: '🔍',
  CompetitorAnalysis: '⚔️',
  FinancialProjections: '💰'
};

const CATEGORY_MAP: Record<string, string> = {
  PITCH_OUTLINE: 'Business Strategy',
  TEAM_ROLES: 'Team & Organization',
  TAM_SAM_SOM: 'Market Analysis',
  COMPETITOR_MAP: 'Market Analysis',
  BRAND_WHEEL: 'Brand & Marketing',
  MARKETING_PLAN: 'Brand & Marketing',
  JOURNEY_MAP: 'User Research',
  INTERVIEW_QUESTIONS: 'User Research',
  USER_STORIES: 'Product Development',
  SWOT: 'Strategic Analysis',
  PERSONA: 'User Research',
  BRAND_IDENTITY: 'Brand & Marketing',
  LEAN_CANVAS: 'Business Strategy',
  // Legacy support
  BusinessModel: 'Business Strategy',
  LeanCanvas: 'Business Strategy',
  Personas: 'User Research',
  Swot: 'Strategic Analysis',
  TamSamSom: 'Market Analysis',
  MarketAnalysis: 'Market Analysis',
  CompetitorAnalysis: 'Market Analysis',
  FinancialProjections: 'Financial Planning'
};

export function AllAIOutputsView({ ideaId }: AllAIOutputsViewProps) {
  const [expandedOutputs, setExpandedOutputs] = useState<Set<string>>(new Set());
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language as 'en' | 'ar';

  const { data: outputs, isLoading } = useQuery({
    queryKey: ['/api/projects', ideaId, 'assets'],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${ideaId}/assets`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch AI outputs');
      return response.json();
    },
    enabled: !!ideaId
  });

  const toggleOutput = (outputId: string) => {
    const newExpanded = new Set(expandedOutputs);
    if (newExpanded.has(outputId)) {
      newExpanded.delete(outputId);
    } else {
      newExpanded.add(outputId);
    }
    setExpandedOutputs(newExpanded);
  };

  const renderOutputContent = (output: any) => {
    const isExpanded = expandedOutputs.has(output.id);

    // Map old 'kind' to new component rendering
    const normalizedKind = output.kind.toUpperCase().replace(/-/g, '_');

    // Try to render with specialized components
    switch (normalizedKind) {
      case 'BUSINESS_MODEL':
      case 'BUSINESSMODEL':
        return isExpanded ? <BusinessModel data={output.data || output.content} /> : null;
      
      case 'LEAN_CANVAS':
      case 'LEANCANVAS':
        return isExpanded ? <LeanCanvas data={output.data || output.content} /> : null;
      
      case 'PERSONA':
      case 'PERSONAS':
        return isExpanded ? <Personas data={output.data || output.content} /> : null;
      
      case 'SWOT':
        return isExpanded ? <Swot data={output.data || output.content} /> : null;
      
      case 'TAM_SAM_SOM':
      case 'TAMSOMSOM':
        return isExpanded ? <TamSamSom data={output.data || output.content} /> : null;

      // New asset types - render as formatted content
      case 'PITCH_OUTLINE':
        return isExpanded ? renderPitchOutline(output.data) : null;
      
      case 'TEAM_ROLES':
        return isExpanded ? renderTeamRoles(output.data) : null;
      
      case 'COMPETITOR_MAP':
        return isExpanded ? renderCompetitorMap(output.data) : null;
      
      case 'BRAND_WHEEL':
        return isExpanded ? renderBrandWheel(output.data) : null;
      
      case 'MARKETING_PLAN':
        return isExpanded ? renderMarketingPlan(output.data) : null;
      
      case 'JOURNEY_MAP':
        return isExpanded ? renderJourneyMap(output.data) : null;
      
      case 'INTERVIEW_QUESTIONS':
        return isExpanded ? renderInterviewQuestions(output.data) : null;
      
      case 'USER_STORIES':
        return isExpanded ? renderUserStories(output.data) : null;
      
      case 'BRAND_IDENTITY':
        return isExpanded ? renderBrandIdentity(output.data) : null;

      default:
        // Fallback for other types - show as formatted content
        return isExpanded ? renderGenericContent(output.data || output.content) : null;
    }
  };

  const renderTeamRoles = (data: any) => (
    <div className="space-y-4">
      {data.roles && data.roles.map((role: any, idx: number) => (
        <div key={idx} className="border rounded-lg p-4">
          <h5 className="font-semibold text-lg mb-2">{role.name}</h5>
          <p className="text-sm text-muted-foreground mb-3">{role.description}</p>
          
          {role.responsibilities_1 && (
            <div className="mb-3">
              <h6 className="font-medium text-sm mb-1">{t('aiOutputs.responsibilities', 'Responsibilities')}</h6>
              <ul className="space-y-1 text-sm">
                {[role.responsibilities_1, role.responsibilities_2, role.responsibilities_3]
                  .filter(Boolean)
                  .map((resp, i) => (
                    <li key={i} className="flex items-start gap-2 ltr:flex-row">
                      <span className="text-primary">•</span>
                      {resp}
                    </li>
                  ))}
              </ul>
            </div>
          )}
          
          {role.driving_motivators_1 && (
            <div className="mb-3">
              <h6 className="font-medium text-sm mb-1">{t('aiOutputs.motivators', 'Key Motivators')}</h6>
              <ul className="space-y-1 text-sm">
                {[role.driving_motivators_1, role.driving_motivators_2, role.driving_motivators_3]
                  .filter(Boolean)
                  .map((mot, i) => (
                    <li key={i} className="flex items-start gap-2 ltr:flex-row">
                      <span className="text-primary">•</span>
                      {mot}
                    </li>
                  ))}
              </ul>
            </div>
          )}
          
          {role.personal_attributes_1 && (
            <div>
              <h6 className="font-medium text-sm mb-1">{t('aiOutputs.attributes', 'Personal Attributes')}</h6>
              <ul className="space-y-1 text-sm">
                {[role.personal_attributes_1, role.personal_attributes_2, role.personal_attributes_3]
                  .filter(Boolean)
                  .map((attr, i) => (
                    <li key={i} className="flex items-start gap-2 ltr:flex-row">
                      <span className="text-primary">•</span>
                      {attr}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderCompetitorMap = (data: any) => (
    <div className="space-y-6">
      {data.overview && (
        <div className="border-l-4 border-primary/50 pl-4">
          <h5 className="font-semibold mb-2">{t('aiOutputs.overview', 'Overview')}</h5>
          <p className="text-sm text-muted-foreground">{data.overview}</p>
        </div>
      )}
      
      {data.competitors && (
        <div className="space-y-4">
          <h5 className="font-semibold text-lg">{t('aiOutputs.competitors', 'Competitors')}</h5>
          {data.competitors.map((comp: any, idx: number) => (
            <div key={idx} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <h6 className="font-semibold">{comp.name}</h6>
                {comp.marketShare && (
                  <Badge variant="secondary">{comp.marketShare}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-3">{comp.description}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                {comp.strengths && (
                  <div>
                    <h6 className="font-medium mb-1 text-green-600">{t('aiOutputs.strengths', 'Strengths')}</h6>
                    <ul className="space-y-1">
                      {comp.strengths.map((s: string, i: number) => (
                        <li key={i} className="flex items-start gap-1 ltr:flex-row">
                          <span>+</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {comp.weaknesses && (
                  <div>
                    <h6 className="font-medium mb-1 text-red-600">{t('aiOutputs.weaknesses', 'Weaknesses')}</h6>
                    <ul className="space-y-1">
                      {comp.weaknesses.map((w: string, i: number) => (
                        <li key={i} className="flex items-start gap-1 ltr:flex-row">
                          <span>-</span>
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {data.recommendations && (
        <div>
          <h5 className="font-semibold text-lg mb-2">{t('aiOutputs.recommendations', 'Recommendations')}</h5>
          <ul className="space-y-2">
            {data.recommendations.map((rec: string, i: number) => (
              <li key={i} className="flex items-start gap-2 ltr:flex-row text-sm">
                <span className="text-primary font-bold">{i + 1}.</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderBrandWheel = (data: any) => (
    <div className="space-y-4">
      {Object.entries(data).map(([key, value]) => {
        const formattedKey = key
          .replace(/_/g, ' ')
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (str) => str.toUpperCase())
          .trim();

        return (
          <div key={key} className="border-l-4 border-primary/50 pl-4">
            <h5 className="font-semibold mb-2">{formattedKey}</h5>
            <p className="text-sm text-muted-foreground">{String(value)}</p>
          </div>
        );
      })}
    </div>
  );

  const renderGenericContent = (content: any) => (
    <div className="space-y-4">
      {typeof content === 'object' && content !== null ? (
        Object.entries(content).map(([key, value]) => {
          const formattedKey = key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (str) => str.toUpperCase())
            .trim();

          return (
            <div key={key} className="border-l-2 border-primary/30 pl-4">
              <h4 className="font-semibold mb-2">{formattedKey}</h4>
              <div className="text-sm text-muted-foreground">
                {Array.isArray(value) ? (
                  <ul className="list-disc list-inside space-y-1">
                    {value.map((item, idx) => (
                      <li key={idx}>{typeof item === 'object' ? JSON.stringify(item) : String(item)}</li>
                    ))}
                  </ul>
                ) : typeof value === 'object' && value !== null ? (
                  <div className="space-y-2">
                    {Object.entries(value).map(([subKey, subValue]) => (
                      <div key={subKey} className="ml-4">
                        <span className="font-medium">{subKey}: </span>
                        <span>{String(subValue)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{String(value)}</p>
                )}
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-sm text-muted-foreground whitespace-pre-wrap">
          {String(content)}
        </div>
      )}
    </div>
  );

    // Specialized renderers for new asset types
  const renderPitchOutline = (data: any) => {
    if (!data || !data.slides) return renderGenericContent(data);
    
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-semibold text-lg border-b pb-2">
            {t('aiOutputs.pitchSlides', 'Pitch Slides')}
          </h4>
          {data.slides.map((slide: any, idx: number) => (
            <div key={idx} className="border-l-4 border-primary/50 ltr:pl-4 rtl:pr-4 py-3 bg-muted/30 rounded-r-lg">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-1">
                  {slide.slideNumber || idx + 1}
                </Badge>
                <div className="flex-1">
                  <h5 className="font-semibold text-base mb-2">{slide.title}</h5>
                  <p className="text-sm text-muted-foreground mb-3 ltr:text-left rtl:text-right">
                    {slide.content}
                  </p>
                  {slide.keyPoints && slide.keyPoints.length > 0 && (
                    <ul className="space-y-1.5">
                      {slide.keyPoints.map((point: string, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2 ltr:flex-row ltr:text-left rtl:text-right">
                          <span className="text-primary font-bold ltr:mr-1 rtl:ml-1">•</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {data.fundingAsk && (
          <div className="border-t-2 pt-6">
            <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <span className="text-2xl">💰</span>
              {t('aiOutputs.fundingAsk', 'Funding Ask')}
            </h4>
            <div className="bg-primary/10 border-l-4 border-primary ltr:pl-4 rtl:pr-4 py-3 rounded-r-lg">
              <p className="text-2xl font-bold text-primary mb-3">{data.fundingAsk.amount}</p>
              {data.fundingAsk.use && data.fundingAsk.use.length > 0 && (
                <div>
                  <h5 className="font-medium text-sm mb-2 ltr:text-left rtl:text-right">
                    {t('aiOutputs.useOfFunds', 'Use of Funds')}:
                  </h5>
                  <ul className="space-y-2">
                    {data.fundingAsk.use.map((item: any, i: number) => (
                      <li key={i} className="text-sm flex justify-between items-center bg-card p-2 rounded ltr:text-left rtl:text-right">
                        <span className="font-medium">{item.category}</span>
                        <Badge variant="secondary">{item.amount}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMarketingPlan = (data: any) => {
    if (!data) return renderGenericContent(data);
    
    return (
      <div className="space-y-6">
        {/* Budget Overview */}
        {data.budget && (
          <Card className="p-4 bg-card border-border">
            <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <span className="text-2xl">💵</span>
              {t('aiOutputs.marketingBudget', 'Marketing Budget')}
            </h4>
            <p className="text-2xl font-bold text-primary mb-4">{data.budget.total}</p>
            {data.budget.breakdown && (
              <div className="space-y-2">
                {data.budget.breakdown.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">{item.channel}</span>
                        <span className="text-sm text-muted-foreground">{item.amount}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary rounded-full h-2" 
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                    <Badge variant="outline">{item.percentage}%</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Target Audience */}
        {data.targeting && (
          <Card className="p-4 bg-card border-border">
            <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              {t('aiOutputs.targetAudience', 'Target Audience')}
            </h4>
            {data.targeting.primaryAudience && (
              <p className="text-sm text-muted-foreground mb-3 ltr:text-left rtl:text-right">
                {data.targeting.primaryAudience}
              </p>
            )}
            <div className="grid md:grid-cols-2 gap-4">
              {data.targeting.demographics && (
                <div>
                  <h5 className="font-medium text-sm mb-2 ltr:text-left rtl:text-right">
                    {t('aiOutputs.demographics', 'Demographics')}
                  </h5>
                  <ul className="space-y-1">
                    {data.targeting.demographics.map((item: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2 ltr:flex-row ltr:text-left rtl:text-right">
                        <span className="text-primary">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.targeting.psychographics && (
                <div>
                  <h5 className="font-medium text-sm mb-2 ltr:text-left rtl:text-right">
                    {t('aiOutputs.psychographics', 'Psychographics')}
                  </h5>
                  <ul className="space-y-1">
                    {data.targeting.psychographics.map((item: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2 ltr:flex-row ltr:text-left rtl:text-right">
                        <span className="text-primary">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Marketing Channels */}
        {data.channels && (
          <Card className="p-4 bg-card border-border">
            <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <span className="text-2xl">📢</span>
              {t('aiOutputs.marketingChannels', 'Marketing Channels')}
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              {data.channels.digital && (
                <div>
                  <h5 className="font-medium text-sm mb-2 text-blue-600 dark:text-blue-400 ltr:text-left rtl:text-right">
                    {t('aiOutputs.digitalChannels', 'Digital Channels')}
                  </h5>
                  <ul className="space-y-1">
                    {data.channels.digital.map((channel: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2 ltr:flex-row ltr:text-left rtl:text-right">
                        <span className="text-blue-600 dark:text-blue-400">🌐</span>
                        {channel}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.channels.traditional && (
                <div>
                  <h5 className="font-medium text-sm mb-2 text-purple-600 dark:text-purple-400 ltr:text-left rtl:text-right">
                    {t('aiOutputs.traditionalChannels', 'Traditional Channels')}
                  </h5>
                  <ul className="space-y-1">
                    {data.channels.traditional.map((channel: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2 ltr:flex-row ltr:text-left rtl:text-right">
                        <span className="text-purple-600 dark:text-purple-400">📰</span>
                        {channel}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Marketing Funnel */}
        {data.funnel && (
          <Card className="p-4 bg-card border-border">
            <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <span className="text-2xl">🔄</span>
              {t('aiOutputs.marketingFunnel', 'Marketing Funnel')}
            </h4>
            <div className="space-y-4">
              {data.funnel.awareness && (
                <div className="border-l-4 border-blue-500 ltr:pl-3 rtl:pr-3">
                  <h5 className="font-medium text-sm mb-2 text-blue-600 dark:text-blue-400 ltr:text-left rtl:text-right">
                    {t('aiOutputs.awareness', 'Awareness')}
                  </h5>
                  <ul className="space-y-1">
                    {data.funnel.awareness.map((item: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground ltr:text-left rtl:text-right">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.funnel.consideration && (
                <div className="border-l-4 border-green-500 ltr:pl-3 rtl:pr-3">
                  <h5 className="font-medium text-sm mb-2 text-green-600 dark:text-green-400 ltr:text-left rtl:text-right">
                    {t('aiOutputs.consideration', 'Consideration')}
                  </h5>
                  <ul className="space-y-1">
                    {data.funnel.consideration.map((item: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground ltr:text-left rtl:text-right">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.funnel.conversion && (
                <div className="border-l-4 border-yellow-500 ltr:pl-3 rtl:pr-3">
                  <h5 className="font-medium text-sm mb-2 text-yellow-600 dark:text-yellow-400 ltr:text-left rtl:text-right">
                    {t('aiOutputs.conversion', 'Conversion')}
                  </h5>
                  <ul className="space-y-1">
                    {data.funnel.conversion.map((item: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground ltr:text-left rtl:text-right">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.funnel.retention && (
                <div className="border-l-4 border-purple-500 ltr:pl-3 rtl:pr-3">
                  <h5 className="font-medium text-sm mb-2 text-purple-600 dark:text-purple-400 ltr:text-left rtl:text-right">
                    {t('aiOutputs.retention', 'Retention')}
                  </h5>
                  <ul className="space-y-1">
                    {data.funnel.retention.map((item: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground ltr:text-left rtl:text-right">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Timeline */}
        {data.timeline && data.timeline.length > 0 && (
          <Card className="p-4 bg-card border-border">
            <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <span className="text-2xl">📅</span>
              {t('aiOutputs.timeline', 'Timeline')}
            </h4>
            <div className="space-y-4">
              {data.timeline.map((phase: any, idx: number) => (
                <div key={idx} className="border-l-4 border-primary/50 ltr:pl-3 rtl:pr-3 py-2">
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="font-medium">{phase.phase}</h5>
                    <Badge variant="outline">{phase.duration}</Badge>
                  </div>
                  {phase.activities && (
                    <ul className="space-y-1">
                      {phase.activities.map((activity: string, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2 ltr:flex-row ltr:text-left rtl:text-right">
                          <span className="text-primary">✓</span>
                          {activity}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Messaging */}
        {data.messaging && (
          <Card className="p-4 bg-card border-border">
            <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <span className="text-2xl">💬</span>
              {t('aiOutputs.messaging', 'Messaging')}
            </h4>
            {data.messaging.valueProposition && (
              <div className="mb-3 p-3 bg-primary/10 rounded-lg">
                <p className="text-sm font-medium ltr:text-left rtl:text-right">
                  {data.messaging.valueProposition}
                </p>
              </div>
            )}
            {data.messaging.brandVoice && (
              <p className="text-sm text-muted-foreground mb-3 ltr:text-left rtl:text-right">
                <strong>{t('aiOutputs.brandVoice', 'Brand Voice')}:</strong> {data.messaging.brandVoice}
              </p>
            )}
            {data.messaging.keyMessages && (
              <ul className="space-y-1">
                {data.messaging.keyMessages.map((msg: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2 ltr:flex-row ltr:text-left rtl:text-right">
                    <span className="text-primary">💡</span>
                    {msg}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    );
  };

  const renderJourneyMap = (data: any) => {
    if (!data || !data.stages) return renderGenericContent(data);
    
    return (
      <div className="space-y-6">
        {data.persona && (
          <div className="text-center mb-4">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {t('aiOutputs.persona', 'Persona')}: {data.persona}
            </Badge>
          </div>
        )}
        
        {data.stages.map((stage: any, idx: number) => (
          <Card key={idx} className="p-4 bg-card border-border">
            <div className="flex items-center gap-2 mb-3">
              <Badge className="text-base">{idx + 1}</Badge>
              <h4 className="font-semibold text-lg">{stage.name}</h4>
            </div>
            
            {stage.description && (
              <p className="text-sm text-muted-foreground mb-3 ltr:text-left rtl:text-right">
                {stage.description}
              </p>
            )}
            
            <div className="grid md:grid-cols-2 gap-4">
              {stage.touchpoints && stage.touchpoints.length > 0 && (
                <div>
                  <h5 className="font-medium text-sm mb-2 text-blue-600 dark:text-blue-400 ltr:text-left rtl:text-right">
                    {t('aiOutputs.touchpoints', 'Touchpoints')}
                  </h5>
                  <ul className="space-y-1">
                    {stage.touchpoints.map((tp: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2 ltr:flex-row ltr:text-left rtl:text-right">
                        <span>📍</span>
                        {tp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {stage.actions && stage.actions.length > 0 && (
                <div>
                  <h5 className="font-medium text-sm mb-2 text-green-600 dark:text-green-400 ltr:text-left rtl:text-right">
                    {t('aiOutputs.actions', 'Actions')}
                  </h5>
                  <ul className="space-y-1">
                    {stage.actions.map((action: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2 ltr:flex-row ltr:text-left rtl:text-right">
                        <span>▶️</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {stage.emotions && stage.emotions.length > 0 && (
                <div>
                  <h5 className="font-medium text-sm mb-2 text-yellow-600 dark:text-yellow-400 ltr:text-left rtl:text-right">
                    {t('aiOutputs.emotions', 'Emotions')}
                  </h5>
                  <ul className="space-y-1">
                    {stage.emotions.map((emotion: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2 ltr:flex-row ltr:text-left rtl:text-right">
                        <span>❤️</span>
                        {emotion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {stage.painPoints && stage.painPoints.length > 0 && (
                <div>
                  <h5 className="font-medium text-sm mb-2 text-red-600 dark:text-red-400 ltr:text-left rtl:text-right">
                    {t('aiOutputs.painPoints', 'Pain Points')}
                  </h5>
                  <ul className="space-y-1">
                    {stage.painPoints.map((pain: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2 ltr:flex-row ltr:text-left rtl:text-right">
                        <span>⚠️</span>
                        {pain}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            {stage.opportunities && stage.opportunities.length > 0 && (
              <div className="mt-4 pt-3 border-t">
                <h5 className="font-medium text-sm mb-2 text-purple-600 dark:text-purple-400 ltr:text-left rtl:text-right">
                  {t('aiOutputs.opportunities', 'Opportunities')}
                </h5>
                <ul className="space-y-1">
                  {stage.opportunities.map((opp: string, i: number) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2 ltr:flex-row ltr:text-left rtl:text-right">
                      <span>💡</span>
                      {opp}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        ))}
      </div>
    );
  };

  const renderInterviewQuestions = (data: any) => {
    if (!data) return renderGenericContent(data);
    
    const sections = [
      { key: 'inDepth', title: t('aiOutputs.inDepthQuestions', 'In-Depth Questions'), icon: '🔍' },
      { key: 'demographic', title: t('aiOutputs.demographicQuestions', 'Demographic Questions'), icon: '👥' },
      { key: 'wrapUp', title: t('aiOutputs.wrapUpQuestions', 'Wrap-Up Questions'), icon: '✅' }
    ];
    
    return (
      <div className="space-y-6">
        {sections.map((section) => {
          const sectionData = data[section.key];
          if (!sectionData) return null;
          
          return (
            <Card key={section.key} className="p-4 bg-card border-border">
              <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <span className="text-2xl">{section.icon}</span>
                {section.title}
              </h4>
              <div className="space-y-3">
                {Object.entries(sectionData).map(([key, question], idx) => (
                  <div key={key} className="border-l-4 border-primary/30 ltr:pl-3 rtl:pr-3 py-2">
                    <div className="flex items-start gap-2 ltr:flex-row">
                      <Badge variant="outline" className="mt-0.5">{idx + 1}</Badge>
                      <p className="text-sm flex-1 ltr:text-left rtl:text-right">{String(question)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderUserStories = (data: any) => {
    if (!data || !data.stories) return renderGenericContent(data);
    
    return (
      <div className="space-y-4">
        {data.stories.map((story: any, idx: number) => (
          <Card key={idx} className="p-4 bg-card border-border">
            <div className="flex items-start gap-3 mb-3">
              <Badge className="mt-1">{idx + 1}</Badge>
              <p className="text-sm font-medium flex-1 ltr:text-left rtl:text-right">
                {story.userStory}
              </p>
            </div>
            
            {story.acceptanceCriteria && (
              <div className="ltr:ml-10 rtl:mr-10">
                <h5 className="font-medium text-sm mb-2 text-green-600 dark:text-green-400 ltr:text-left rtl:text-right">
                  {t('aiOutputs.acceptanceCriteria', 'Acceptance Criteria')}:
                </h5>
                <div className="text-sm text-muted-foreground space-y-1">
                  {story.acceptanceCriteria.split('. ').filter((s: string) => s.trim()).map((criteria: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 ltr:flex-row ltr:text-left rtl:text-right">
                      <span className="text-green-600 dark:text-green-400">✓</span>
                      <span>{criteria.trim()}{criteria.endsWith('.') ? '' : '.'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    );
  };

  const renderBrandIdentity = (data: any) => {
    if (!data) return renderGenericContent(data);
    
    return (
      <div className="space-y-6">
        {/* Logo & Typography */}
        <Card className="p-4 bg-card border-border">
          <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <span className="text-2xl">🎨</span>
            {t('aiOutputs.visualIdentity', 'Visual Identity')}
          </h4>
          {data.logo_idea && (
            <div className="mb-4">
              <h5 className="font-medium text-sm mb-2 ltr:text-left rtl:text-right">
                {t('aiOutputs.logoIdea', 'Logo Idea')}
              </h5>
              <p className="text-sm text-muted-foreground ltr:text-left rtl:text-right">
                {data.logo_idea}
              </p>
            </div>
          )}
          {data.typography && (
            <div>
              <h5 className="font-medium text-sm mb-2 ltr:text-left rtl:text-right">
                {t('aiOutputs.typography', 'Typography')}
              </h5>
              <p className="text-sm text-muted-foreground ltr:text-left rtl:text-right">
                {data.typography}
              </p>
            </div>
          )}
        </Card>

        {/* Color Palette */}
        {(data.color_hex_1 || data.color_name_1) && (
          <Card className="p-4 bg-card border-border">
            <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <span className="text-2xl">🎨</span>
              {t('aiOutputs.colorPalette', 'Color Palette')}
            </h4>
            {data.color_des && (
              <p className="text-sm text-muted-foreground mb-4 ltr:text-left rtl:text-right">
                {data.color_des}
              </p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((num) => {
                const hex = data[`color_hex_${num}`];
                const name = data[`color_name_${num}`];
                if (!hex) return null;
                
                return (
                  <div key={num} className="text-center">
                    <div 
                      className="w-full h-20 rounded-lg mb-2 border border-border"
                      style={{ backgroundColor: hex }}
                    />
                    <p className="text-xs font-medium">{name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{hex}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Brand Values & Voice */}
        <div className="grid md:grid-cols-2 gap-4">
          {data.brand_values && (
            <Card className="p-4 bg-card border-border">
              <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <span className="text-2xl">💎</span>
                {t('aiOutputs.brandValues', 'Brand Values')}
              </h4>
              <p className="text-sm text-muted-foreground ltr:text-left rtl:text-right">
                {data.brand_values}
              </p>
            </Card>
          )}
          
          {data.brand_voice && (
            <Card className="p-4 bg-card border-border">
              <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <span className="text-2xl">🗣️</span>
                {t('aiOutputs.brandVoice', 'Brand Voice')}
              </h4>
              <p className="text-sm text-muted-foreground ltr:text-left rtl:text-right">
                {data.brand_voice}
              </p>
            </Card>
          )}
        </div>

        {/* Brand Personality */}
        {data.brand_personality_traits && (
          <Card className="p-4 bg-card border-border">
            <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <span className="text-2xl">✨</span>
              {t('aiOutputs.brandPersonality', 'Brand Personality')}
            </h4>
            <div className="flex flex-wrap gap-2">
              {data.brand_personality_traits.split(',').map((trait: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-sm">
                  {trait.trim()}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Customer Promise */}
        {data.customer_promise && (
          <Card className="p-4 bg-primary/10 border-primary/20">
            <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <span className="text-2xl">🤝</span>
              {t('aiOutputs.customerPromise', 'Customer Promise')}
            </h4>
            <p className="text-sm ltr:text-left rtl:text-right">
              {data.customer_promise}
            </p>
          </Card>
        )}

        {/* Imagery & Photography */}
        {data.imagery_photography && (
          <Card className="p-4 bg-card border-border">
            <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <span className="text-2xl">📸</span>
              {t('aiOutputs.imageryPhotography', 'Imagery & Photography')}
            </h4>
            <p className="text-sm text-muted-foreground ltr:text-left rtl:text-right">
              {data.imagery_photography}
            </p>
          </Card>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            {t('aiOutputs.title', 'All AI-Generated Outputs')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!outputs || outputs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            {t('aiOutputs.title', 'All AI-Generated Outputs')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {t('aiOutputs.noOutputs', 'No AI-generated outputs yet for this idea.')}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {t('aiOutputs.outputsWillAppear', 'AI outputs will appear here as they are generated.')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group outputs by category
  const groupedOutputs = outputs.reduce((acc: Record<string, any[]>, output: any) => {
    const category = CATEGORY_MAP[output.kind] || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(output);
    return acc;
  }, {});

  // Sort by creation date
  const sortedOutputs = [...outputs].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(currentLang === 'ar' ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getOutputLabel = (kind: string) => {
    const labels = OUTPUT_TYPE_LABELS[kind];
    return labels ? labels[currentLang] : kind;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          {t('aiOutputs.title', 'All AI-Generated Outputs')}
          <Badge variant="secondary" className="ml-2">
            {outputs.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full" dir="ltr">
          <TabsList className="w-full overflow-x-auto flex-nowrap justify-start">
            <TabsTrigger value="all">
              {t('aiOutputs.all', 'All')} ({outputs.length})
            </TabsTrigger>
            {Object.keys(groupedOutputs).sort().map((category) => (
              <TabsTrigger key={category} value={category}>
                {category} ({groupedOutputs[category].length})
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-4">
            {sortedOutputs.map((output: any) => {
              const isExpanded = expandedOutputs.has(output.id);

              return (
                <Card key={output.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {OUTPUT_TYPE_ICONS[output.kind] || '📄'}
                          </span>
                          <div>
                            <h3 className="font-semibold text-lg">
                              {output.title || getOutputLabel(output.kind)}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {formatDate(output.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleOutput(output.id)}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-4 h-4 mr-2" />
                            {t('aiOutputs.collapse', 'Collapse')}
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4 mr-2" />
                            {t('aiOutputs.expand', 'Expand')}
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0">
                      <div className="border-t border-border pt-4">
                        {renderOutputContent(output)}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </TabsContent>

          {Object.entries(groupedOutputs).map(([category, categoryOutputs]) => (
            <TabsContent key={category} value={category} className="space-y-4 mt-4">
              {(categoryOutputs as any[]).sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              ).map((output) => {
                const isExpanded = expandedOutputs.has(output.id);

                return (
                  <Card key={output.id} className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">
                              {OUTPUT_TYPE_ICONS[output.kind] || '📄'}
                            </span>
                            <div>
                              <h3 className="font-semibold text-lg">
                                {output.title || getOutputLabel(output.kind)}
                              </h3>
                              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                {formatDate(output.createdAt)}
                              </div>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleOutput(output.id)}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-4 h-4 mr-2" />
                              {t('aiOutputs.collapse', 'Collapse')}
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 mr-2" />
                              {t('aiOutputs.expand', 'Expand')}
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="pt-0">
                        <div className="border-t border-border pt-4">
                          {renderOutputContent(output)}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
