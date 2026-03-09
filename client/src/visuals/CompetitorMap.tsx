import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  AlertTriangle, 
  Star,
  Building2,
  DollarSign,
  Users,
  Zap,
  Award,
  Activity
} from 'lucide-react';

// Helper function to render complex objects in a readable format
const renderComplexItem = (item: any): string => {
  if (typeof item === 'string') return item;
  
  if (typeof item === 'object' && item !== null) {
    if (item.text) return item.text;
    if (item.description) return item.description;
    if (item.name) return item.name;
    if (item.title) return item.title;
    
    const entries = Object.entries(item).filter(([_, value]) => value != null);
    if (entries.length <= 3) {
      return entries.map(([key, value]) => `${key}: ${value}`).join(', ');
    }
  }
  
  return String(item);
};

interface Competitor {
  name: string | any;
  description?: string | any;
  marketPosition?: string | any;
  strengths?: (string | any)[];
  weaknesses?: (string | any)[];
  marketShare?: string | any;
  pricing?: string | any;
  targetAudience?: string | any;
  keyProducts?: (string | any)[];
  threats?: (string | any)[];
  opportunities?: (string | any)[];
  competitiveAdvantage?: (string | any)[];
}

interface CompetitorMapData {
  overview?: string;
  competitors?: Competitor[];
  marketGaps?: string[];
  competitiveAdvantages?: string[];
  threats?: string[];
  recommendations?: string[];
}

interface CompetitorMapProps {
  data: CompetitorMapData;
}

export default function CompetitorMap({ data }: CompetitorMapProps) {
  const { t } = useTranslation();

  const getPositionColor = (position: string) => {
    const lower = position?.toLowerCase() || '';
    if (lower.includes('leader') || lower.includes('dominant')) {
      return 'bg-red-100 text-red-900 border-red-200';
    }
    if (lower.includes('challenger') || lower.includes('strong')) {
      return 'bg-yellow-100 text-yellow-900 border-yellow-200';
    }
    if (lower.includes('follower') || lower.includes('weak')) {
      return 'bg-gray-100 text-gray-900 border-gray-200';
    }
    if (lower.includes('niche') || lower.includes('specialized')) {
      return 'bg-blue-100 text-blue-900 border-blue-200';
    }
    return 'bg-gray-100 text-gray-900 border-gray-200';
  };

  const CompetitorCard = ({ competitor }: { competitor: Competitor }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center flex-row">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div className="ltr:text-left rtl:text-right">
            <h3 className="font-semibold text-gray-900 text-lg">{competitor.name}</h3>
            {competitor.marketPosition && (
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getPositionColor(competitor.marketPosition)}`}>
                {competitor.marketPosition}
              </span>
            )}
          </div>
        </div>
        {competitor.marketShare && (
          <div className="ltr:text-right rtl:text-left">
            <div className="text-xs text-gray-500">{t('competitorMap.marketShare')}</div>
            <div className="text-sm font-semibold text-gray-900">{competitor.marketShare}</div>
          </div>
        )}
      </div>

      {competitor.description && (
        <p className="text-gray-700 mb-4 text-sm ltr:text-left rtl:text-right">{competitor.description}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Strengths */}
        {competitor.strengths && competitor.strengths.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-800 mb-2 flex items-center ltr:flex-row">
              <Shield className="w-4 h-4 text-green-600 mr-2" />
              {t('competitorMap.strengths')}
            </h4>
            <ul className="space-y-1">
              {competitor.strengths.map((strength, index) => (
                <li key={index} className="text-xs text-gray-600 flex items-start ltr:flex-row">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                  {renderComplexItem(strength)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weaknesses */}
        {competitor.weaknesses && competitor.weaknesses.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-800 mb-2 flex items-center ltr:flex-row">
              <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
              {t('competitorMap.weaknesses')}
            </h4>
            <ul className="space-y-1">
              {competitor.weaknesses.map((weakness, index) => (
                <li key={index} className="text-xs text-gray-600 flex items-start ltr:flex-row">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                  {renderComplexItem(weakness)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Key Products */}
        {competitor.keyProducts && competitor.keyProducts.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-800 mb-2 flex items-center ltr:flex-row">
              <Zap className="w-4 h-4 text-purple-600 mr-2" />
              {t('competitorMap.keyProducts')}
            </h4>
            <ul className="space-y-1">
              {competitor.keyProducts.map((product, index) => (
                <li key={index} className="text-xs text-gray-600 flex items-start ltr:flex-row">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                  {renderComplexItem(product)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Additional Info Row */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-xs">
          {competitor.pricing && (
            <div className="ltr:text-left rtl:text-right">
              <span className="text-gray-500">{t('competitorMap.pricing')}:</span>
              <span className="ltr:ml-2 rtl:mr-2 font-medium text-gray-900">{competitor.pricing}</span>
            </div>
          )}
          {competitor.targetAudience && (
            <div className="ltr:text-left rtl:text-right">
              <span className="text-gray-500">{t('competitorMap.target')}:</span>
              <span className="ltr:ml-2 rtl:mr-2 font-medium text-gray-900">{competitor.targetAudience}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 ltr:text-left rtl:text-right">{t('competitorMap.title')}</h2>
        <p className="text-gray-600 ltr:text-left rtl:text-right">{t('competitorMap.subtitle')}</p>
        
        {data.overview && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-blue-800 ltr:text-left rtl:text-right">{data.overview}</p>
          </div>
        )}
      </div>

      {/* Competitors Grid */}
      {data.competitors && data.competitors.length > 0 && (
        <div className="space-y-6 mb-8">
          {data.competitors.map((competitor, index) => (
            <CompetitorCard key={index} competitor={competitor} />
          ))}
        </div>
      )}

      {/* Analysis Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Gaps & Opportunities */}
        {data.marketGaps && data.marketGaps.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center flex-row">
              <Target className="w-5 h-5 text-green-600 mr-2" />
              {t('competitorMap.marketGaps')}
            </h3>
            <ul className="space-y-2">
              {data.marketGaps.map((gap, index) => (
                <li key={index} className="text-gray-700 flex items-start ltr:flex-row">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  {gap}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Our Competitive Advantages */}
        {data.competitiveAdvantages && data.competitiveAdvantages.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center flex-row">
              <Award className="w-5 h-5 text-blue-600 mr-2" />
              {t('competitorMap.ourAdvantages')}
            </h3>
            <ul className="space-y-2">
              {data.competitiveAdvantages.map((advantage, index) => (
                <li key={index} className="text-gray-700 flex items-start ltr:flex-row">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  {advantage}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Threats */}
        {data.threats && data.threats.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center flex-row">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              {t('competitorMap.competitiveThreats')}
            </h3>
            <ul className="space-y-2">
              {data.threats.map((threat, index) => (
                <li key={index} className="text-gray-700 flex items-start ltr:flex-row">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  {threat}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {data.recommendations && data.recommendations.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center flex-row">
              <TrendingUp className="w-5 h-5 text-purple-600 mr-2" />
              {t('competitorMap.strategicRecommendations')}
            </h3>
            <ul className="space-y-2">
              {data.recommendations.map((recommendation, index) => (
                <li key={index} className="text-gray-700 flex items-start ltr:flex-row">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  {recommendation}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}