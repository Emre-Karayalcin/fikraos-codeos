import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

interface BrandingContextType {
  logo: string | null;
  darkLogo: string | null;
  primaryColor: string | null;
  radarEnabled: boolean;
  challengesEnabled: boolean;
  expertsEnabled: boolean;
  dashboardEnabled: boolean;
  aiBuilderEnabled: boolean;
  formSubmissionEnabled: boolean;
  manualBuildEnabled: boolean;
  academyEnabled: boolean;
  isLoading: boolean;
  // new organization-level route fields
  defaultRoute?: string | null;
  dashboardNameEn?: string | null;
  dashboardNameAr?: string | null;
  myIdeasNameEn?: string | null;
  myIdeasNameAr?: string | null;
  myIdeasDescEn?: string | null;
  myIdeasDescAr?: string | null;
  challengesNameEn?: string | null;
  challengesNameAr?: string | null;
  challengesDescEn?: string | null;
  challengesDescAr?: string | null;
  radarNameEn?: string | null;
  radarNameAr?: string | null;
  radarDescEn?: string | null;
  radarDescAr?: string | null;
  expertsTitleEn?: string | null;
  expertsTitleAr?: string | null;
  expertsNameEn?: string | null;
  expertsNameAr?: string | null;
  expertsDescEn?: string | null;
  expertsDescAr?: string | null;
}

const BrandingContext = createContext<BrandingContextType>({
  logo: null,
  darkLogo: null,
  primaryColor: null,
  radarEnabled: false,
  challengesEnabled: false,
  expertsEnabled: false,
  dashboardEnabled: false,
  aiBuilderEnabled: false,
  formSubmissionEnabled: false,
  manualBuildEnabled: false,
  academyEnabled: true,
  isLoading: true
  // defaults for new fields
  , defaultRoute: null,
  dashboardNameEn: null,
  dashboardNameAr: null,
  myIdeasNameEn: null,
  myIdeasNameAr: null,
  myIdeasDescEn: null,
  myIdeasDescAr: null,
  challengesNameEn: null,
  challengesNameAr: null,
  challengesDescEn: null,
  challengesDescAr: null,
  radarNameEn: null,
  radarNameAr: null,
  radarDescEn: null,
  radarDescAr: null,
  expertsTitleEn: null,
  expertsTitleAr: null,
  expertsNameEn: null,
  expertsNameAr: null,
  expertsDescEn: null,
  expertsDescAr: null
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [appliedColor, setAppliedColor] = useState<string | null>(null);

  // Fetch organization branding
  const { data: branding, isLoading } = useQuery({
    queryKey: ['organization-branding', user?.primaryOrgId],
    queryFn: async () => {
      if (!user?.primaryOrgId) return null;
      
      const response = await fetch(`/api/organizations/${user.primaryOrgId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      // include new route/default fields returned by server (if present)
      return {
        logo: data.logoUrl || null,
        darkLogo: data.darkLogoUrl || null,
        primaryColor: data.primaryColor || null,
        radarEnabled: data.radarEnabled ?? false,
        challengesEnabled: data.challengesEnabled ?? false,
        expertsEnabled: data.expertsEnabled ?? false,
        dashboardEnabled: data.dashboardEnabled ?? false,
        aiBuilderEnabled: data.aiBuilderEnabled ?? false,
        formSubmissionEnabled: data.formSubmissionEnabled ?? false,
        manualBuildEnabled: data.manualBuildEnabled ?? true,
        academyEnabled: data.academyEnabled ?? true,
        defaultRoute: data.defaultRoute ?? null,
        dashboardNameEn: data.dashboardNameEn ?? null,
        dashboardNameAr: data.dashboardNameAr ?? null,
        myIdeasNameEn: data.myIdeasNameEn ?? null,
        myIdeasNameAr: data.myIdeasNameAr ?? null,
        myIdeasDescEn: data.myIdeasDescEn ?? null,
        myIdeasDescAr: data.myIdeasDescAr ?? null,
        challengesNameEn: data.challengesNameEn ?? null,
        challengesNameAr: data.challengesNameAr ?? null,
        challengesDescEn: data.challengesDescEn ?? null,
        challengesDescAr: data.challengesDescAr ?? null,
        radarNameEn: data.radarNameEn ?? null,
        radarNameAr: data.radarNameAr ?? null,
        radarDescEn: data.radarDescEn ?? null,
        radarDescAr: data.radarDescAr ?? null,
        expertsTitleEn: data.expertsTitleEn ?? null,
        expertsTitleAr: data.expertsTitleAr ?? null,
        expertsNameEn: data.expertsNameEn ?? null,
        expertsNameAr: data.expertsNameAr ?? null,
        expertsDescEn: data.expertsDescEn ?? null,
        expertsDescAr: data.expertsDescAr ?? null
      };
    },
    enabled: !!user?.primaryOrgId
  });

  // Apply primary color to CSS variables when branding changes
  useEffect(() => {
    if (branding?.primaryColor && branding.primaryColor !== appliedColor) {
      const hsl = hexToHSL(branding.primaryColor);
      console.log('Applying organization primary color:', branding.primaryColor, 'as HSL:', hsl);
      document.documentElement.style.setProperty('--primary', `hsl(${hsl})`);
      document.documentElement.style.setProperty('--ring', `hsl(${hsl})`);
      
      setAppliedColor(branding.primaryColor);
      
      console.log('✅ Applied organization primary color:', branding.primaryColor);
    }
  }, [branding?.primaryColor, appliedColor]);

  // Reset to default when user logs out or changes org
  useEffect(() => {
    return () => {
      if (!user?.primaryOrgId) {
        document.documentElement.style.setProperty('--primary', 'hsl(217, 90%, 62%)');
        document.documentElement.style.setProperty('--ring', 'hsl(217, 90%, 62%)');
        setAppliedColor(null);
      }
    };
  }, [user?.primaryOrgId]);

  return (
    <BrandingContext.Provider
      value={{
        logo: branding?.logo || null,
        darkLogo: branding?.darkLogo || null,
        primaryColor: branding?.primaryColor || null,
        radarEnabled: branding?.radarEnabled ?? false,
        challengesEnabled: branding?.challengesEnabled ?? false,
        expertsEnabled: branding?.expertsEnabled ?? false,
        dashboardEnabled: branding?.dashboardEnabled ?? false,
        aiBuilderEnabled: branding?.aiBuilderEnabled ?? false,
        formSubmissionEnabled: branding?.formSubmissionEnabled ?? false,
        manualBuildEnabled: branding?.manualBuildEnabled ?? true,
        academyEnabled: branding?.academyEnabled ?? true,
        isLoading,
        // expose new fields to consumers
        defaultRoute: branding?.defaultRoute ?? null,
        dashboardNameEn: branding?.dashboardNameEn ?? null,
        dashboardNameAr: branding?.dashboardNameAr ?? null,
        myIdeasNameEn: branding?.myIdeasNameEn ?? null,
        myIdeasNameAr: branding?.myIdeasNameAr ?? null,
        myIdeasDescEn: branding?.myIdeasDescEn ?? null,
        myIdeasDescAr: branding?.myIdeasDescAr ?? null,
        challengesNameEn: branding?.challengesNameEn ?? null,
        challengesNameAr: branding?.challengesNameAr ?? null,
        challengesDescEn: branding?.challengesDescEn ?? null,
        challengesDescAr: branding?.challengesDescAr ?? null,
        radarNameEn: branding?.radarNameEn ?? null,
        radarNameAr: branding?.radarNameAr ?? null,
        radarDescEn: branding?.radarDescEn ?? null,
        radarDescAr: branding?.radarDescAr ?? null,
        expertsTitleEn: branding?.expertsTitleEn ?? null,
        expertsTitleAr: branding?.expertsTitleAr ?? null,
        expertsNameEn: branding?.expertsNameEn ?? null,
        expertsNameAr: branding?.expertsNameAr ?? null,
        expertsDescEn: branding?.expertsDescEn ?? null,
        expertsDescAr: branding?.expertsDescAr ?? null
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within BrandingProvider');
  }
  return context;
}

// Helper: Convert HEX to HSL
function hexToHSL(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  const lPercent = Math.round(l * 100);
  
  return `${h}, ${s}%, ${lPercent}%`;
}