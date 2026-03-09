import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'wouter';
import { 
  Lightbulb, 
  Target, 
  Users, 
  DollarSign, 
  TrendingUp,
  Zap,
  Shield,
  Building2,
  Rocket,
  Award,
  Presentation,
  Clock,
  Download,
  FileText,
  Loader2,
  Settings,
  ExternalLink,
  Trash2,
  Plus,
  Minus,
  Calendar,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface PitchSlide {
  title: string | any;
  content: (string | any)[];
  keyPoints?: (string | any)[];
  duration?: string | any;
}

interface PitchOutlineData {
  overview?: string | any;
  slides?: PitchSlide[];
  duration?: string | any;
  keyMessages?: (string | any)[];
  callToAction?: string | any;
  content?: string | any;
  details?: string | any;
  recommendations?: (string | any)[];
  data?: {
    slides?: PitchSlide[];
  };
  appendix?: {
    title: string | any;
    items: (string | any)[];
  }[];
}

interface PitchOutlineProps {
  data: PitchOutlineData;
  projectId?: string;
  assetId?: string;
}

interface GeneratedDeck {
  id: string;
  downloadUrl: string;
  template: string;
  theme: string;
  colorScheme: string;
  fontFamily: string;
  generatedAt: Date;
  status: 'generating' | 'ready' | 'error';
  taskId?: string;
}

export default function PitchOutline({ data, projectId, assetId }: PitchOutlineProps) {
  const { t } = useTranslation();
  
  const [isGeneratingDeck, setIsGeneratingDeck] = useState(false);
  const [pitchDeckGenerations, setPitchDeckGenerations] = useState<any[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [deckOptions, setDeckOptions] = useState({
    template: 'modern-business',
    theme: 'professional',
    colorScheme: 'blue',
    fontFamily: 'Inter',
    slideCount: 'auto'
  });
  const { slug } = useParams<{ slug?: string }>();
  const [, setLocation] = useLocation();

  // Fetch pitch deck generations from database
  useEffect(() => {
    const fetchPitchDeckGenerations = async () => {
      if (!projectId) return;
      
      try {
        console.log('📋 Fetching pitch deck generations for project:', projectId);
        const response = await fetch(`/api/projects/${projectId}/pitch-deck-generations`, {
          credentials: 'include'
        });
        const generations = await response.json();
        
        console.log('✅ Fetched generations:', generations);
        setPitchDeckGenerations(generations);
        
        // Continue polling for any GENERATING status
        const activeGenerations = generations.filter((g: any) => g.status === 'GENERATING');
        activeGenerations.forEach((gen: any) => {
          if (gen.taskId) {
            console.log('🔄 Continuing to poll for active generation:', gen.taskId);
            pollTaskStatus(gen.taskId);
          }
        });
      } catch (error) {
        console.error('❌ Error fetching pitch deck generations:', error);
      }
    };

    fetchPitchDeckGenerations();
  }, [projectId]);

  // Handle different data structures - sometimes it's slides, sometimes content/details
  let slides = [];
  
  if (data?.data?.slides) {
    slides = data.data.slides;
  } else if (data?.slides) {
    slides = data.slides;
  } else if (data?.content || data?.details || data?.recommendations) {
    // Convert content/details structure to slides format
    slides = [];
    if (data.content) {
      slides.push({ 
        title: "Overview", 
        content: Array.isArray(data.content) ? data.content : [data.content],
        keyPoints: []
      });
    }
    if (data.details) {
      slides.push({ 
        title: "Details", 
        content: Array.isArray(data.details) ? data.details : [data.details],
        keyPoints: []
      });
    }
    if (data.recommendations) {
      slides.push({ 
        title: "Recommendations", 
        content: Array.isArray(data.recommendations) ? data.recommendations : [data.recommendations],
        keyPoints: []
      });
    }
  }
  

  const handleGeneratePitchDeck = async () => {
    if (!slides || slides.length === 0) {
      setGenerationError('No slides available to generate pitch deck');
      return;
    }

    if (!projectId) {
      setGenerationError('Project ID is required for pitch deck generation');
      return;
    }

    setIsGeneratingDeck(true);
    setGenerationError(null);
    setShowOptions(false);

    try {
      console.log('🎯 Starting pitch deck generation...');
      const response = await fetch('/api/generate-pitch-deck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          projectId,
          assetId: assetId || null,
          pitchData: {
            title: 'Business Pitch Deck',
            slides: slides.map((slide: any, index: number) => ({
              title: typeof slide.title === 'string' ? slide.title : slide.title?.text || `Slide ${index + 1}`,
              content: Array.isArray(slide.content) 
                ? slide.content.map((item: any) => typeof item === 'string' ? item : item?.text || String(item))
                : typeof slide.content === 'string' 
                  ? [slide.content]
                  : typeof slide.content === 'object'
                    ? [JSON.stringify(slide.content)]
                    : [String(slide.content || 'No content')],
              keyPoints: slide.keyPoints 
                ? slide.keyPoints.map((point: any) => typeof point === 'string' ? point : point?.text || String(point))
                : [],
              speakerNotes: slide.speakerNotes || ''
            })),
            template: deckOptions.template,
            theme: deckOptions.theme,
            colorScheme: deckOptions.colorScheme,
            fontFamily: deckOptions.fontFamily
          }
        })
      });

      const result = await response.json();
      
      if (result.success && result.taskId) {
        console.log('✅ Generation started with task ID:', result.taskId);
        
        // Refresh the generations list to show the new one
        const generationsResponse = await fetch(`/api/projects/${projectId}/pitch-deck-generations`, {
          credentials: 'include'
        });
        const generations = await generationsResponse.json();
        setPitchDeckGenerations(generations);
        
        // Start polling for this task
        pollTaskStatus(result.taskId);
        setGenerationStatus('Generating presentation... This takes 20-30 seconds.');
      } else {
        setGenerationError(result.error || 'Failed to generate pitch deck');
        setIsGeneratingDeck(false);
      }
    } catch (error) {
      console.error('❌ Generation error:', error);
      setGenerationError('Network error occurred while generating pitch deck');
      setIsGeneratingDeck(false);
    }
  };

  const pollTaskStatus = async (taskId: string) => {
    const maxAttempts = 36; // 3 minutes max (5 second intervals)
    let attempts = 0;
    
    const checkStatus = async () => {
      try {
        console.log(`🔍 Checking status for task ${taskId}, attempt ${attempts + 1}/${maxAttempts}`);
        
        const response = await fetch(`/api/check-pitch-status/${taskId}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('📋 Status result:', result);
        
        if (result.success && result.downloadUrl) {
          console.log('🎉 Generation completed! Download URL:', result.downloadUrl);
          // Refresh the generations list from database
          if (projectId) {
            const generationsResponse = await fetch(`/api/projects/${projectId}/pitch-deck-generations`, {
              credentials: 'include'
            });
            const generations = await generationsResponse.json();
            setPitchDeckGenerations(generations);
          }
          setGenerationStatus('');
          setIsGeneratingDeck(false);
          setShowOptions(false); // Close options panel
        } else if (result.status === 'SUCCESS' && result.downloadUrl) {
          console.log('✅ SUCCESS status with download URL');
          // Refresh the generations list from database
          if (projectId) {
            const generationsResponse = await fetch(`/api/projects/${projectId}/pitch-deck-generations`, {
              credentials: 'include'
            });
            const generations = await generationsResponse.json();
            setPitchDeckGenerations(generations);
          }
          setGenerationStatus('');
          setIsGeneratingDeck(false);
          setShowOptions(false);
        } else if (result.status === 'STARTED' || result.status === 'PENDING' || result.status === 'PROGRESS') {
          attempts++;
          if (attempts < maxAttempts) {
            console.log(`⏳ Still processing... ${attempts}/${maxAttempts}`);
            setGenerationStatus(`Generating presentation... (${Math.round(attempts * 5)}s)`);
            setTimeout(checkStatus, 5000); // Check again in 5 seconds
          } else {
            console.error('❌ Timeout reached');
            // Refresh the generations list to show any updates
            if (projectId) {
              const generationsResponse = await fetch(`/api/projects/${projectId}/pitch-deck-generations`, {
                credentials: 'include'
              });
              const generations = await generationsResponse.json();
              setPitchDeckGenerations(generations);
            }
            setGenerationError('Presentation generation timed out. Please try again.');
            setGenerationStatus('');
            setIsGeneratingDeck(false);
          }
        } else if (result.status === 'FAILURE' || result.status === 'REVOKED' || result.error) {
          console.error('❌ Generation failed:', result.error || result.message);
          // Refresh the generations list from database
          if (projectId) {
            const generationsResponse = await fetch(`/api/projects/${projectId}/pitch-deck-generations`, {
              credentials: 'include'
            });
            const generations = await generationsResponse.json();
            setPitchDeckGenerations(generations);
          }
          setGenerationError(result.error || result.message || 'Generation failed');
          setGenerationStatus('');
          setIsGeneratingDeck(false);
        } else {
          // Unknown status, continue polling but with limited attempts
          console.log('🤔 Unknown status, continuing...', result.status);
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(checkStatus, 5000);
          } else {
            // Refresh the generations list to show any updates
            if (projectId) {
              const generationsResponse = await fetch(`/api/projects/${projectId}/pitch-deck-generations`, {
                credentials: 'include'
              });
              const generations = await generationsResponse.json();
              setPitchDeckGenerations(generations);
            }
            setGenerationError('Unknown status. Please try again.');
            setGenerationStatus('');
            setIsGeneratingDeck(false);
          }
        }
      } catch (error) {
        console.error('❌ Status check error:', error);
        attempts++;
        if (attempts >= maxAttempts) {
          // Refresh the generations list to show any updates
          if (projectId) {
            try {
              const generationsResponse = await fetch(`/api/projects/${projectId}/pitch-deck-generations`, {
                credentials: 'include'
              });
              const generations = await generationsResponse.json();
              setPitchDeckGenerations(generations);
            } catch (e) {
              console.error('Failed to refresh generations:', e);
            }
          }
          setGenerationError('Connection error. Please try again.');
          setGenerationStatus('');
          setIsGeneratingDeck(false);
        } else {
          console.log('🔄 Retrying...');
          setTimeout(checkStatus, 5000);
        }
      }
    };
    
    // Start checking immediately 
    checkStatus();
  };
  const getSlideIcon = (title: string, index: number) => {
    const lower = title.toLowerCase();
    if (lower.includes('problem') || lower.includes('pain')) return Lightbulb;
    if (lower.includes('solution') || lower.includes('product')) return Zap;
    if (lower.includes('market') || lower.includes('opportunity')) return Target;
    if (lower.includes('business') || lower.includes('revenue')) return DollarSign;
    if (lower.includes('traction') || lower.includes('growth')) return TrendingUp;
    if (lower.includes('team') || lower.includes('founder')) return Users;
    if (lower.includes('competition') || lower.includes('advantage')) return Shield;
    if (lower.includes('funding') || lower.includes('investment')) return Building2;
    if (lower.includes('vision') || lower.includes('future')) return Rocket;
    if (lower.includes('demo') || lower.includes('product')) return Presentation;
    return Award;
  };

  const getSlideColor = (index: number) => {
    const colors = [
      'bg-blue-100 text-blue-900 border-blue-200',
      'bg-green-100 text-green-900 border-green-200',
      'bg-purple-100 text-purple-900 border-purple-200',
      'bg-orange-100 text-orange-900 border-orange-200',
      'bg-blue-100 text-blue-900 border-blue-200',
      'bg-red-100 text-red-900 border-red-200',
      'bg-indigo-100 text-indigo-900 border-indigo-200',
      'bg-pink-100 text-pink-900 border-pink-200',
      'bg-yellow-100 text-yellow-900 border-yellow-200',
      'bg-gray-100 text-gray-900 border-gray-200'
    ];
    return colors[index % colors.length];
  };

  const SlideCard = ({ slide, index }: { slide: PitchSlide; index: number }) => {
    const SlideIcon = getSlideIcon(slide.title, index);
    const colorClass = getSlideColor(index);

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-2">
          <div className="flex items-center flex-row">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${colorClass}`}>
              <SlideIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-row">
                <span className="text-xs font-bold text-gray-500">#{index + 1}</span>
                <h3 className="font-semibold text-gray-900 ltr:text-left rtl:text-right">
                  {typeof slide.title === 'string' ? slide.title : slide.title?.text || slide.title?.description || JSON.stringify(slide.title)}
                </h3>
              </div>
              {slide.duration && (
                <div className="flex items-center mt-1 text-xs text-gray-500 flex-row">
                  <Clock className="w-3 h-3 ltr:mr-1 rtl:ml-1" />
                  {slide.duration}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-3">
          {slide.content && Array.isArray(slide.content) && slide.content.length > 0 && (
            <ul className="space-y-2">
              {slide.content.map((item, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-start ltr:flex-row">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  {typeof item === 'string' ? item : item?.text || item?.description || JSON.stringify(item)}
                </li>
              ))}
            </ul>
          )}

          {/* Key Points */}
          {slide.keyPoints && Array.isArray(slide.keyPoints) && slide.keyPoints.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <h4 className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide ltr:text-left rtl:text-right">
                {t('pitchOutline.keyPoints')}
              </h4>
              <ul className="space-y-1">
                {slide.keyPoints.map((point, i) => (
                  <li key={i} className="text-xs text-gray-600 flex items-start ltr:flex-row">
                    <span className="w-1 h-1 bg-blue-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                    {typeof point === 'string' ? point : point?.text || point?.description || JSON.stringify(point)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-full">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 ltr:text-left rtl:text-right">
            {t('pitchOutline.title')}
          </h2>
          {data.duration && (
            <div className="flex items-center text-sm text-gray-600 flex-row">
              <Clock className="w-4 h-4 mr-2" />
              {data.duration}
            </div>
          )}
        </div>
        <p className="text-gray-600 text-sm sm:text-base ltr:text-left rtl:text-right">
          {t('pitchOutline.subtitle')}
        </p>
        
        {data.overview && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-blue-800 ltr:text-left rtl:text-right">{data.overview}</p>
          </div>
        )}
      </div>

      {/* Slides */}
      {slides && slides.length > 0 && (
        <div className="space-y-4 mb-8">
          {slides.map((slide: any, index: number) => (
            <SlideCard key={index} slide={slide} index={index} />
          ))}
        </div>
      )}

      {/* Key Messages */}
      {data.keyMessages && data.keyMessages.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center flex-row">
            <Award className="w-5 h-5 text-yellow-600 mr-2" />
            {t('pitchOutline.keyMessages')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.keyMessages.map((message, index) => (
              <div key={index} className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                <p className="text-sm text-yellow-900 ltr:text-left rtl:text-right">
                  {typeof message === 'string' ? message : message?.text || message?.description || JSON.stringify(message)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Call to Action */}
      {data.callToAction && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white mb-6">
          <h3 className="font-semibold mb-2 flex items-center flex-row">
            <Rocket className="w-5 h-5 mr-2" />
            {t('pitchOutline.callToAction')}
          </h3>
          <p className="text-blue-100 ltr:text-left rtl:text-right">
            {typeof data.callToAction === 'string' ? data.callToAction : data.callToAction?.text || data.callToAction?.description || JSON.stringify(data.callToAction)}
          </p>
        </div>
      )}

      {/* Pitch Deck Generation */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center flex-row">
          <Download className="w-5 h-5 text-blue-600 mr-2" />
          {t('pitchOutline.generateTitle')}
        </h3>
        
        {generationError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-800 ltr:text-left rtl:text-right">{generationError}</p>
          </div>
        )}
        
        {pitchDeckGenerations.length > 0 && (
          <div className="mb-6 space-y-4">
            <h4 className="text-md font-semibold text-gray-900 ltr:text-left rtl:text-right">
              {t('pitchOutline.generatedDecks')}
            </h4>
            {pitchDeckGenerations.map((generation, index) => (
              <div key={generation.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-row">
                      <span className="text-sm font-medium text-gray-900">
                        {t('pitchOutline.deckNumber', { number: pitchDeckGenerations.length - index })}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(generation.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mb-2 ltr:text-left rtl:text-right">
                      {t('pitchOutline.template')}: {generation.template} • {t('pitchOutline.theme')}: {generation.theme} • {t('pitchOutline.color')}: {generation.colorScheme}
                    </div>
                    
                    {generation.status === 'GENERATING' && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-blue-600 flex-row">
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t('pitchOutline.generating')}
                        </div>
                        <button
                          onClick={async () => {
                            if (projectId) {
                              const generationsResponse = await fetch(`/api/projects/${projectId}/pitch-deck-generations`, {
                                credentials: 'include'
                              });
                              const generations = await generationsResponse.json();
                              setPitchDeckGenerations(generations);
                            }
                          }}
                          className="text-xs text-red-600 hover:text-red-800 underline"
                        >
                          {t('common.refresh')}
                        </button>
                      </div>
                    )}
                    
                    {generation.status === 'COMPLETED' && generation.downloadUrl && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const fileId = generation.downloadUrl
                              .split('/')
                              .pop()
                              ?.replace('.pptx', '') || generation.id;
                            
                            const url = `/w/${slug}/presentation/${fileId}`;
                            window.open(url, '_blank');
                          }}
                          className="inline-flex items-center px-2.5 py-1.5 bg-blue-400 text-white text-xs rounded hover:bg-blue-700 transition-colors flex-row cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3 ltr:mr-1 rtl:ml-1" />
                          {t('common.view')}
                        </button>
                        <a
                          href={generation.downloadUrl}
                          download
                          className="inline-flex items-center px-2.5 py-1.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-700 transition-colors flex-row"
                        >
                          <Download className="w-3 h-3 ltr:mr-1 rtl:ml-1" />
                          {t('common.download')}
                        </a>
                      </div>
                    )}
                    
                    {generation.status === 'FAILED' && (
                      <div className="text-sm text-red-600 ltr:text-left rtl:text-right">
                        {t('pitchOutline.generationFailed')}: {generation.errorMessage || t('pitchOutline.tryAgain')}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={async () => {
                      if (confirm(t('pitchOutline.confirmDelete'))) {
                        try {
                          const response = await fetch(`/api/pitch-deck-generations/${generation.id}`, {
                            method: 'DELETE',
                            credentials: 'include'
                          });
                          
                          if (response.ok) {
                            if (projectId) {
                              const generationsResponse = await fetch(`/api/projects/${projectId}/pitch-deck-generations`, {
                                credentials: 'include'
                              });
                              const generations = await generationsResponse.json();
                              setPitchDeckGenerations(generations);
                            }
                          } else {
                            alert(t('pitchOutline.deleteFailed'));
                          }
                        } catch (error) {
                          console.error('Error deleting generation:', error);
                          alert(t('pitchOutline.deleteError'));
                        }
                      }
                    }}
                    className="inline-flex items-center p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                    title={t('common.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
          <div className="flex items-start gap-4 mb-4 flex-row">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Presentation className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1 ltr:text-left rtl:text-right">
                {t('pitchOutline.generateDeck')}
              </h4>
              <p className="text-sm text-gray-600 ltr:text-left rtl:text-right">
                {t('pitchOutline.generateDescription')}
              </p>
            </div>
          </div>
          
          {generationStatus && (
            <div className="bg-blue-100 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-center flex-row">
                <Loader2 className="w-4 h-4 mr-2 animate-spin text-blue-600" />
                <span className="text-sm text-blue-700 font-medium">{generationStatus}</span>
              </div>
            </div>
          )}
          
          {!showOptions ? (
            <button
              onClick={() => setShowOptions(true)}
              disabled={isGeneratingDeck || !slides || slides.length === 0}
              className="inline-flex items-center bg-primary gap-2 px-4 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex-row"
            >
              <Settings className="w-4 h-4" />
              {pitchDeckGenerations.length > 0 ? t('pitchOutline.createNew') : t('pitchOutline.customize')}
            </button>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3 ltr:flex-row">
                <Settings className="w-4 h-4 text-gray-600" />
                <h5 className="font-medium text-gray-900">{t('pitchOutline.customizationOptions')}</h5>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 ltr:text-left rtl:text-right">
                    {t('pitchOutline.templateStyle')}
                  </label>
                  <select 
                    value={deckOptions.template}
                    onChange={(e) => setDeckOptions(prev => ({...prev, template: e.target.value}))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="modern-business">🏢 {t('pitchOutline.modernBusiness')}</option>
                    <option value="minimal">✨ {t('pitchOutline.minimalClean')}</option>
                    <option value="creative">🎨 {t('pitchOutline.creativeBold')}</option>
                    <option value="corporate">🏛️ {t('pitchOutline.corporateProfessional')}</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 ltr:text-left rtl:text-right">
                    {t('pitchOutline.colorScheme')}
                  </label>
                  <select 
                    value={deckOptions.colorScheme}
                    onChange={(e) => setDeckOptions(prev => ({...prev, colorScheme: e.target.value}))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="blue">🔵 {t('pitchOutline.oceanBlue')}</option>
                    <option value="green">🟢 {t('pitchOutline.forestGreen')}</option>
                    <option value="purple">🟣 {t('pitchOutline.royalPurple')}</option>
                    <option value="orange">🟠 {t('pitchOutline.vibrantOrange')}</option>
                    <option value="dark">⚫ {t('pitchOutline.darkMode')}</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 ltr:text-left rtl:text-right">
                    {t('pitchOutline.themeFocus')}
                  </label>
                  <select 
                    value={deckOptions.theme}
                    onChange={(e) => setDeckOptions(prev => ({...prev, theme: e.target.value}))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="professional">💼 {t('pitchOutline.professional')}</option>
                    <option value="startup">🚀 {t('pitchOutline.startupPitch')}</option>
                    <option value="tech">💻 {t('pitchOutline.techInnovation')}</option>
                    <option value="consulting">📊 {t('pitchOutline.consulting')}</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 ltr:text-left rtl:text-right">
                    {t('pitchOutline.typography')}
                  </label>
                  <select 
                    value={deckOptions.fontFamily}
                    onChange={(e) => setDeckOptions(prev => ({...prev, fontFamily: e.target.value}))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="Inter">{t('pitchOutline.interModern')}</option>
                    <option value="Roboto">{t('pitchOutline.robotoClean')}</option>
                    <option value="Arial">{t('pitchOutline.arialClassic')}</option>
                    <option value="Helvetica">{t('pitchOutline.helveticaElegant')}</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                <button
                  onClick={handleGeneratePitchDeck}
                  disabled={isGeneratingDeck}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 to-blue-700 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex-row"
                >
                  {isGeneratingDeck ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('pitchOutline.generating')}
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      {t('pitchOutline.generateDeck')}
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowOptions(false)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors duration-200"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Appendix */}
      {data.appendix && data.appendix.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center flex-row">
            <Presentation className="w-5 h-5 text-gray-600 mr-2" />
            {t('pitchOutline.appendix')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.appendix.map((section, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-2 ltr:text-left rtl:text-right">
                  {typeof section.title === 'string' ? section.title : section.title?.text || section.title?.description || JSON.stringify(section.title)}
                </h4>
                {section.items && Array.isArray(section.items) && section.items.length > 0 && (
                  <ul className="space-y-1">
                    {section.items.map((item, i) => (
                      <li key={i} className="text-xs text-gray-600 flex items-start flex-row">
                        <span className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                        {typeof item === 'string' ? item : item?.text || item?.description || JSON.stringify(item)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}