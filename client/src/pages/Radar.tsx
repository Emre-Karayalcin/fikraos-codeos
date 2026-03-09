import React, { useState, useEffect } from 'react';
import { UnifiedSidebar } from '@/components/layout/UnifiedSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  TrendingUp,
  Globe,
  Building2,
  Zap,
  ExternalLink,
  Clock,
  Users,
  DollarSign,
  BarChart3,
  Sun
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useBranding } from '@/contexts/BrandingContext';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { useLocation } from 'wouter';
import DOMPurify from 'isomorphic-dompurify';

// Topic configuration with translation keys
const TOPICS = (t: any) => [
  { id: 'for-you', label: t('radar.topics.forYou'), icon: Users },
  { id: 'innovation', label: t('radar.topics.innovation'), icon: Zap },
  { id: 'ai', label: t('radar.topics.ai'), icon: Globe },
  { id: 'investments', label: t('radar.topics.investments'), icon: DollarSign },
  { id: 'yc-startups', label: t('radar.topics.ycStartups'), icon: TrendingUp }
];

// Mock data structure for stories
interface Story {
  id: string;
  topic: string;
  title: string;
  url: string;
  source: string;
  image?: string;
  publishedAt: string;
  summary: string;
  score: number;
  tags: string[];
  sourceCount?: number;
  sourceDomain: string;
}

// Topic chip component
function TopicChip({ topic, isActive, onClick }: { 
  topic: { id: string; label: string; icon: any }; 
  isActive: boolean; 
  onClick: () => void; 
}) {
  const Icon = topic.icon;
  
  return (
    <Button
      variant={isActive ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      className={`flex items-center gap-2 transition-all ${
        isActive 
          ? 'bg-primary text-primary-foreground shadow-sm' 
          : 'hover:bg-muted/50'
      }`}
      data-testid={`topic-chip-${topic.id}`}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{topic.label}</span>
    </Button>
  );
}

// Story card component
function StoryCard({ story, onStoryClick }: { story: Story; onStoryClick: (story: Story) => void }) {
  const { t } = useTranslation();
  const timeAgo = React.useMemo(() => {
    const now = new Date();
    const published = new Date(story.publishedAt);
    const diffHours = Math.floor((now.getTime() - published.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return t('radar.timeAgo.justNow');
    if (diffHours === 1) return t('radar.timeAgo.oneHour');
    if (diffHours < 24) return t('radar.timeAgo.hours', { count: diffHours });
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return t('radar.timeAgo.oneDay');
    return t('radar.timeAgo.days', { count: diffDays });
  }, [story.publishedAt, t]);

  return (
    <Card 
      className="group hover:shadow-md transition-all cursor-pointer border border-border/50 hover:border-border" 
      data-testid={`story-card-${story.id}`}
      onClick={() => onStoryClick(story)}
    >
      <CardContent className="p-0">
        {story.image && (
          <div className="relative overflow-hidden rounded-t-lg">
            <img 
              src={story.image} 
              alt={story.title}
              className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute top-2 right-2">
              {story.sourceCount && story.sourceCount > 1 && (
                <Badge variant="secondary" className="bg-black/70 text-white text-xs">
                  {t('radar.sources', { count: story.sourceCount })}
                </Badge>
              )}
            </div>
          </div>
        )}
        
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-muted-foreground">{story.source}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo}
            </span>
          </div>
          
          <h3 className="font-semibold text-sm leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">
            {story.title}
          </h3>
          
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {story.summary}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {story.tags?.slice(0, 2).map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Latest AI Tools widget component
function LatestAIToolsWidget() {
  const { t } = useTranslation();
  
  const aiTools = [
    { name: 'Claude 3.5 Sonnet', category: t('radar.widgets.aiTools.categories.languageModel'), tag: t('radar.widgets.aiTools.tags.new'), trending: true },
    { name: 'Midjourney V6', category: t('radar.widgets.aiTools.categories.imageGeneration'), tag: t('radar.widgets.aiTools.tags.updated'), trending: true },
    { name: 'Cursor', category: t('radar.widgets.aiTools.categories.codeEditor'), tag: t('radar.widgets.aiTools.tags.hot'), trending: false },
    { name: 'Perplexity Pro', category: t('radar.widgets.aiTools.categories.searchAI'), tag: t('radar.widgets.aiTools.tags.featured'), trending: true },
    { name: 'Runway ML', category: t('radar.widgets.aiTools.categories.videoAI'), tag: t('radar.widgets.aiTools.tags.new'), trending: false }
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2 ltr:flex-row">
          <Zap className="w-4 h-4" />
          {t('radar.widgets.aiTools.title')}
        </h3>
        <div className="space-y-3">
          {aiTools.map(tool => (
            <div key={tool.name} className="flex items-center justify-between hover:bg-muted/50 p-2 rounded cursor-pointer transition-colors">
              <div className="flex-1">
                <div className="font-medium text-sm flex items-center gap-2">
                  {tool.name}
                  {tool.trending && <TrendingUp className="w-3 h-3 text-green-600" />}
                </div>
                <div className="text-xs text-muted-foreground">{tool.category}</div>
              </div>
              <Badge variant={tool.tag === t('radar.widgets.aiTools.tags.new') ? 'default' : 'secondary'} className="text-xs">
                {tool.tag}
              </Badge>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="w-full mt-3">
          {t('radar.widgets.aiTools.viewAll')}
        </Button>
      </CardContent>
    </Card>
  );
}

// Trending companies widget
function TrendingCompaniesWidget() {
  const { t } = useTranslation();
  
  const companies = [
    { name: 'ARAMCO', ticker: 'ARAMCO', change: '+2.3%', positive: true },
    { name: 'STC', ticker: 'STC', change: '+1.8%', positive: true },
    { name: 'SABIC', ticker: 'SABIC', change: '-0.5%', positive: false },
    { name: 'Al Rajhi Bank', ticker: 'RJHI', change: '+0.9%', positive: true }
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          {t('radar.widgets.companies.title')}
        </h3>
        <div className="space-y-2">
          {companies.map(company => (
            <div key={company.ticker} className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{company.name}</div>
                <div className="text-xs text-muted-foreground">{company.ticker}</div>
              </div>
              <div className={`text-sm font-medium ${company.positive ? 'text-green-600' : 'text-red-600'}`}>
                {company.change}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Radar() {
  const { t,i18n } = useTranslation();
  const { radarNameEn, radarNameAr, radarDescEn, radarDescAr } = useBranding();
  const lang = i18n?.language?.startsWith('ar') ? 'ar' : 'en';
  const radarTitle = (lang === 'ar' ? radarNameAr : radarNameEn) || t('radar.title');
  const radarSubtitle = (lang === 'ar' ? radarDescAr : radarDescEn) || t('radar.subtitle');

  const [activeTopic, setActiveTopic] = useState('for-you');
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [showStoryReader, setShowStoryReader] = useState(false);

  // Fetch news from API
  const { data: newsData, isLoading: newsLoading, error: newsError } = useQuery({
    queryKey: ['/api/news', activeTopic, i18n.language],
    queryFn: async () => {
      const response = await fetch(`/api/news?topic=${activeTopic}&page=1&language=${i18n.language}`);
      if (!response.ok) throw new Error(t('radar.errors.fetchFailed'));
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false
  });

  // Update stories when news data changes
  React.useEffect(() => {
    if (newsData?.results) {
      // Map NewsData.io API format to our Story format
      const mappedStories: Story[] = newsData.results.map((article: any) => ({
        id: article.article_id || String(Math.random()),
        topic: activeTopic,
        title: article.title,
        url: article.link || article.url,
        source: article.source_id || article.source || t('radar.unknownSource'),
        image: article.image_url || article.image || undefined,
        publishedAt: article.pubDate || article.publishedAt,
        summary: article.description || article.summary || '',
        score: 80,
        tags: article.category || article.tags || [],
        sourceCount: article.duplicate || 1,
        sourceDomain: article.source_url || article.link || article.url
      }));
      setStories(mappedStories);
    }
  }, [newsData, activeTopic, t]);

  // Filter stories based on active topic
  const filteredStories = React.useMemo(() => {
    if (activeTopic === 'for-you') {
      return stories.sort((a, b) => b.score - a.score);
    }
    return stories.filter(story => story.topic === activeTopic);
  }, [stories, activeTopic]);

  // Handle story click to show in-platform reader
  const handleStoryClick = (story: Story) => {
    setSelectedStory(story);
    setShowStoryReader(true);
  };

  // Mock article content for demo - sanitized for security
  const getArticleContent = (story: Story) => {
    const unsafeHtml = `
      <h1>${story.title}</h1>
      <div class="article-meta">
        <span>${t('radar.reader.by')} ${story.source}</span> •
        <span>${new Date(story.publishedAt).toLocaleDateString()}</span>
      </div>

      <p class="lead">${story.summary}</p>

      <p>${t('radar.reader.sampleContent1')}</p>

      <p>${t('radar.reader.sampleContent2')}</p>

      <p>${t('radar.reader.sampleContent3')}</p>

      <h2>${t('radar.reader.keyPoints')}</h2>
      <ul>
        ${story.tags?.map(tag => `<li>${t('radar.reader.relatedTo')}: ${tag}</li>`).join('') || ''}
      </ul>
    `;

    // SECURITY: Sanitize HTML to prevent XSS attacks
    return DOMPurify.sanitize(unsafeHtml, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'div', 'span', 'ul', 'li', 'strong', 'em', 'br'],
      ALLOWED_ATTR: ['class']
    });
  };

  const topics = TOPICS(t);

  return (
    <div className="h-screen w-full bg-background text-foreground overflow-hidden flex relative">
      {/* Left Navigation Sidebar - Hide on mobile when bottom nav is present */}
      <div className="hidden sm:block">
        <UnifiedSidebar />
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden pb-20 sm:pb-0">
        <div className="h-full flex">
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto relative">
            <div className="absolute top-4 sm:top-6 ltr:right-4 ltr:sm:right-6 rtl:left-4 rtl:sm:left-6 flex items-center gap-2 sm:gap-3 z-10">
              <LanguageSwitcher />
            </div>
            <div className="max-w-6xl mx-auto p-6">
              {/* Header */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold mb-2">{radarTitle}</h1>
                <p className="text-muted-foreground">{radarSubtitle}</p>
              </div>

              {/* Topic Chips */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2" data-testid="topic-chips">
                {topics.map(topic => (
                  <TopicChip
                    key={topic.id}
                    topic={topic}
                    isActive={activeTopic === topic.id}
                    onClick={() => setActiveTopic(topic.id)}
                  />
                ))}
              </div>

              {/* Stories Grid */}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="stories-grid">
                {newsLoading ? (
                  // Loading skeleton
                  Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-0">
                        <div className="h-40 bg-muted rounded-t-lg"></div>
                        <div className="p-4 space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4"></div>
                          <div className="h-4 bg-muted rounded w-full"></div>
                          <div className="h-3 bg-muted rounded w-2/3"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : newsError ? (
                  <div className="col-span-full text-center py-8">
                    <p className="text-muted-foreground mb-2">{t('radar.errors.unableToLoad')}</p>
                    <p className="text-sm text-muted-foreground">{t('radar.errors.checkConnection')}</p>
                  </div>
                ) : filteredStories.length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <p className="text-muted-foreground">{t('radar.noNews')}</p>
                  </div>
                ) : (
                  filteredStories.map(story => (
                    <StoryCard key={story.id} story={story} onStoryClick={handleStoryClick} />
                  ))
                )}
              </div>

              {/* Load More */}
              {!newsLoading && filteredStories.length > 0 && (
                <div className="hidden mt-8 text-center">
                  <Button 
                    variant="outline" 
                    data-testid="button-load-more"
                    onClick={() => {
                      // TODO: Implement pagination
                      console.log('Load more stories');
                    }}
                  >
                    {t('radar.loadMore')}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="hidden lg:block w-80 border-l border-border overflow-y-auto">
            <div className="p-6 space-y-4">
              <LatestAIToolsWidget />
              <TrendingCompaniesWidget />
              
              {/* Save Interests Widget */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">{t('radar.widgets.interests.title')}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t('radar.widgets.interests.description')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      t('radar.widgets.interests.categories.tech'),
                      t('radar.widgets.interests.categories.finance'),
                      t('radar.widgets.interests.categories.arts'),
                      t('radar.widgets.interests.categories.sports'),
                      t('radar.widgets.interests.categories.entertainment')
                    ].map(interest => (
                      <Badge key={interest} variant="outline" className="cursor-pointer hover:bg-muted">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                  <Button size="sm" className="w-full mt-3">
                    {t('radar.widgets.interests.save')}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom Navigation */}
      <BottomNavigation />

      {/* Story Reader Modal */}
      {showStoryReader && selectedStory && (
        <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
          <div className="min-h-screen">
            {/* Header with back button */}
            <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4">
              <div className="max-w-4xl mx-auto flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowStoryReader(false)}
                  className="flex items-center gap-2"
                  data-testid="button-back-to-radar"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  {t('radar.reader.backToRadar')}
                </Button>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{selectedStory.source}</span>
                  <span>•</span>
                  <span>{new Date(selectedStory.publishedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Article content */}
            <div className="max-w-4xl mx-auto p-6">
              <div className="prose prose-lg max-w-none dark:prose-invert">
                <div dangerouslySetInnerHTML={{ __html: getArticleContent(selectedStory) }} />
              </div>
              
              {/* Tags and source info */}
              <div className="mt-8 pt-6 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {selectedStory.tags?.map(tag => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  <Button variant="outline" asChild>
                    <a href={selectedStory.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      {t('radar.reader.viewOriginal')}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}