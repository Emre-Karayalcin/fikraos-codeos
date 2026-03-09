import React from 'react';

// Dynamic visualization loader
export const loadVisualization = async (assetKind: string) => {
  try {
    let component;
    switch (assetKind) {
      case 'LEAN_CANVAS':
        component = await import('./LeanCanvas');
        break;
      case 'SWOT':
        component = await import('./SwotAnalysis');
        break;
      case 'PERSONA':
        component = await import('./UserPersonas');
        break;
      case 'USER_STORIES':
        component = await import('./UserStories');
        break;
      case 'INTERVIEW_QUESTIONS':
        component = await import('./InterviewQuestions');
        break;
      case 'MARKETING_PLAN':
        component = await import('./MarketingPlan');
        break;
      case 'BRAND_WHEEL':
        component = await import('./BrandWheel');
        break;
      case 'BRAND_IDENTITY':
        component = await import('./BrandIdentity');
        break;
      case 'TAM_SAM_SOM':
        component = await import('./TamSamSom');
        break;
      case 'TEAM_ROLES':
        component = await import('./TeamRoles');
        break;
      case 'PITCH_OUTLINE':
        component = await import('./PitchOutline');
        break;
      case 'JOURNEY_MAP':
        component = await import('./JourneyMap');
        break;
      case 'COMPETITOR_MAP':
        component = await import('./CompetitorMap');
        break;
      case 'BRAND_GUIDELINES':
        component = await import('./GenericAsset');
        break;
      case 'LAUNCH_ROADMAP':
        component = await import('./GenericAsset');
        break;
      case 'FINANCIAL_PROJECTIONS':
        component = await import('./GenericAsset');
        break;
      case 'RISK_ASSESSMENT':
        component = await import('./GenericAsset');
        break;
      case 'GTM_STRATEGY':
        component = await import('./GenericAsset');
        break;
      case 'PRODUCT_ROADMAP':
        component = await import('./GenericAsset');
        break;
      case 'TEAM_STRUCTURE':
        component = await import('./GenericAsset');
        break;
      case 'FUNDING_STRATEGY':
        component = await import('./GenericAsset');
        break;
      default:
        // Generic component for other asset types
        component = await import('./GenericAsset');
        break;
    }
    return component.default;
  } catch (error) {
    console.error(`Failed to load visualization for ${assetKind}:`, error);
    return null;
  }
};

// Fallback component for when visualizations aren't available
export const VisualizationFallback = ({ data, title }: { data: any, title: string }) => {
  const renderValue = (obj: any): string => {
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
    if (Array.isArray(obj)) return obj.map(item => renderValue(item)).join(', ');
    if (typeof obj === 'object' && obj !== null) {
      return Object.entries(obj)
        .map(([key, value]) => `${key}: ${renderValue(value)}`)
        .join('; ');
    }
    return String(obj || 'N/A');
  };

  return (
    <div className="p-4 sm:p-6 bg-background border border-border rounded-lg">
      <h3 className="text-lg font-semibold mb-4 text-foreground">{title}</h3>
      <div className="bg-muted p-4 rounded border overflow-auto max-h-96">
        <div className="text-sm text-foreground space-y-2">
          {typeof data === 'object' && data !== null ? (
            Object.entries(data).map(([key, value]) => (
              <div key={key} className="border-b border-border/20 pb-2 last:border-b-0">
                <strong className="text-primary capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </strong>
                <span className="ml-2 text-muted-foreground">{renderValue(value)}</span>
              </div>
            ))
          ) : (
            <div>{renderValue(data)}</div>
          )}
        </div>
      </div>
    </div>
  );
};