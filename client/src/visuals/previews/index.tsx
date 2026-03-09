import React from 'react';

// Dynamic preview loader
export const loadPreview = async (assetKind: string) => {
  try {
    let component;
    switch (assetKind) {
      case 'LEAN_CANVAS':
        component = await import('./LeanCanvasPreview');
        break;
      case 'SWOT':
        component = await import('./SwotPreview');
        break;
      case 'PERSONA':
        component = await import('./PersonaPreview');
        break;
      case 'USER_STORIES':
        component = await import('./UserStoriesPreview');
        break;
      case 'INTERVIEW_QUESTIONS':
        component = await import('./InterviewQuestionsPreview');
        break;
      case 'MARKETING_PLAN':
        component = await import('./MarketingPlanPreview');
        break;
      case 'BRAND_WHEEL':
        component = await import('./BrandWheelPreview');
        break;
      case 'BRAND_IDENTITY':
        component = await import('./BrandIdentityPreview');
        break;
      case 'TEAM_ROLES':
        component = await import('./TeamRolesPreview');
        break;
      case 'TAM_SAM_SOM':
        component = await import('./TamSamSomPreview');
        break;
      case 'JOURNEY_MAP':
        component = await import('./JourneyMapPreview');
        break;
      case 'COMPETITOR_MAP':
        component = await import('./CompetitorMapPreview');
        break;
      case 'PITCH_OUTLINE':
        component = await import('./PitchOutlinePreview');
        break;
      default:
        // Generic preview for other asset types
        return GenericPreview;
    }
    return component.default;
  } catch (error) {
    console.error(`Failed to load preview for ${assetKind}:`, error);
    return GenericPreview;
  }
};

// Generic preview component with enhanced styling
export const GenericPreview = ({ data, title }: { data: any, title: string }) => (
  <div className="w-full h-full p-3 bg-gradient-to-br from-slate-50 to-gray-100">
    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
      <div className="w-4 h-4 bg-gradient-to-br from-blue-400 to-purple-500 rounded animate-pulse" />
      {title}
    </h3>
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-3 h-20 flex items-center justify-center shadow-sm">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mx-auto flex items-center justify-center">
          <div className="w-4 h-4 bg-gradient-to-br from-blue-400 to-purple-500 rounded animate-spin" />
        </div>
        <div className="text-xs text-gray-600 font-medium">Business Asset</div>
        <div className="text-xs text-gray-500">Click to view details</div>
      </div>
    </div>
  </div>
);