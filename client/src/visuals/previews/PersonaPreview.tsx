import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Target, Briefcase, Heart, Zap, Users2 } from 'lucide-react';

// Avatar database
const AVATARS = {
  female: [
    { url: "female/black-long-shirt-35.png", age: 35, color: "black" },
    { url: "female/black-long-shirt-50.png", age: 50, color: "black" },
    { url: "female/blue-long-shirt-25.png", age: 25, color: "blue" },
    { url: "female/blue-long-shirt-35.png", age: 35, color: "blue" },
    { url: "female/blue-t-shirt-20.png", age: 20, color: "blue" },
    { url: "female/blue-t-shirt-30.png", age: 30, color: "blue" },
    { url: "female/blue-t-shirt-35.png", age: 35, color: "blue" },
    { url: "female/blue-t-shirt-40.png", age: 40, color: "blue" },
    { url: "female/blur-green-t-shirt-25.png", age: 25, color: "green" },
    { url: "female/blur-green-t-shirt-35.png", age: 35, color: "green" },
    { url: "female/blur-green-t-shirt-40.png", age: 40, color: "green" },
    { url: "female/blur-green-t-shirt-55.png", age: 55, color: "green" },
    { url: "female/gray-long-shirt-50.png", age: 50, color: "gray" },
    { url: "female/green-t-shirt-25.png", age: 25, color: "green" },
    { url: "female/green-t-shirt-35.png", age: 35, color: "green" },
    { url: "female/green-t-shirt-45.png", age: 45, color: "green" },
    { url: "female/orange-long-shirt-45.png", age: 45, color: "orange" },
    { url: "female/pink-long-shirt-25.png", age: 25, color: "pink" },
    { url: "female/pink-long-shirt-35.png", age: 35, color: "pink" },
    { url: "female/pink-long-shirt-40.png", age: 40, color: "pink" },
    { url: "female/pink-long-shirt-45.png", age: 45, color: "pink" },
    { url: "female/pink-long-shirt-50.png", age: 50, color: "pink" },
    { url: "female/red-long-shirt-35.png", age: 35, color: "red" },
    { url: "female/white-long-shirt-20.png", age: 20, color: "white" },
    { url: "female/white-long-shirt-25.png", age: 25, color: "white" },
    { url: "female/white-long-shirt-35.png", age: 35, color: "white" },
    { url: "female/white-long-shirt-40.png", age: 40, color: "white" },
    { url: "female/white-long-shirt-45.png", age: 45, color: "white" },
    { url: "female/white-long-shirt-50.png", age: 50, color: "white" },
    { url: "female/white-long-shirt-55.png", age: 55, color: "white" }
  ],
  male: [
    { url: "male/black-long-shirt-25.png", age: 25, color: "black" },
    { url: "male/black-long-shirt-35.png", age: 35, color: "black" },
    { url: "male/black-long-shirt-45.png", age: 45, color: "black" },
    { url: "male/black-long-shirt-60.png", age: 60, color: "black" },
    { url: "male/blue-long-shirt-20.png", age: 20, color: "blue" },
    { url: "male/blue-long-shirt-25.png", age: 25, color: "blue" },
    { url: "male/blue-long-shirt-30.png", age: 30, color: "blue" },
    { url: "male/blue-long-shirt-40.png", age: 40, color: "blue" },
    { url: "male/blue-long-shirt-60.png", age: 60, color: "blue" },
    { url: "male/blue-t-shirt-25.png", age: 25, color: "blue" },
    { url: "male/blue-t-shirt-35.png", age: 35, color: "blue" },
    { url: "male/blue-t-shirt-60.png", age: 60, color: "blue" },
    { url: "male/caro-long-shirt-30.png", age: 30, color: "caro" },
    { url: "male/caro-long-shirt-40.png", age: 40, color: "caro" },
    { url: "male/gray-long-shirt-25.png", age: 25, color: "gray" },
    { url: "male/gray-long-shirt-30.png", age: 30, color: "gray" },
    { url: "male/gray-long-shirt-35.png", age: 35, color: "gray" },
    { url: "male/gray-long-shirt-45.png", age: 45, color: "gray" },
    { url: "male/gray-long-shirt-50.png", age: 50, color: "gray" },
    { url: "male/green-long-shirt-30.png", age: 30, color: "green" },
    { url: "male/green-long-shirt-35.png", age: 35, color: "green" },
    { url: "male/green-long-shirt-40.png", age: 40, color: "green" },
    { url: "male/green-long-shirt-60.png", age: 60, color: "green" },
    { url: "male/orange-long-shirt-20.png", age: 20, color: "orange" },
    { url: "male/orange-long-shirt-30.png", age: 30, color: "orange" },
    { url: "male/white-long-shirt-20.png", age: 20, color: "white" },
    { url: "male/white-long-shirt-25.png", age: 25, color: "white" },
    { url: "male/white-long-shirt-35.png", age: 35, color: "white" },
    { url: "male/white-long-shirt-40.png", age: 40, color: "white" },
    { url: "male/white-long-shirt-50.png", age: 50, color: "white" },
    { url: "male/white-long-shirt-60.png", age: 60, color: "white" },
    { url: "male/white-shirt-30.png", age: 30, color: "white" },
    { url: "male/white-shirt-45.png", age: 45, color: "white" },
    { url: "male/white-shirt-50.png", age: 50, color: "white" },
    { url: "male/white-t-shirt-30.png", age: 30, color: "white" },
    { url: "male/white-t-shirt-40.png", age: 40, color: "white" }
  ]
};

/**
 * Simple hash function to create a deterministic seed from string
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Seeded random number generator (Linear Congruential Generator)
 * Returns a deterministic "random" number between 0 and 1
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Create a unique identifier for a persona
 */
function getPersonaId(persona: PersonaData): string {
  return `${persona.name || ''}_${persona.age || ''}_${persona.occupation || ''}`;
}

/**
 * Detect gender from persona data
 */
function detectGender(persona: PersonaData, seed: number): 'male' | 'female' {
  const namePattern = persona.name?.toLowerCase() || '';
  const occupationPattern = persona.occupation?.toLowerCase() || '';
  const quotePattern = persona.quote?.toLowerCase() || '';
  
  // Common female indicators (English + Arabic names)
  const femaleIndicators = [
    // English names
    'sarah', 'maria', 'emma', 'sophia', 'olivia', 'ava', 'isabella', 'mia',
    // Arabic female names
    'fatima', 'aisha', 'maryam', 'zainab', 'khadija', 'yasmin', 'layla', 'noor',
    'amina', 'salma', 'huda', 'rania', 'dalia', 'sara', 'lina', 'hana',
    'mariam', 'noura', 'rana', 'sana', 'Jana', 'malak', 'yara', 'leila',
    'zahra', 'hafsa', 'ruqayya', 'sumaya', 'asma', 'safiya', 'khadija', 'amal',
    // Gender pronouns and terms
    'she', 'her', 'herself', 'woman', 'lady', 'girl', 'female',
    'mother', 'mom', 'wife', 'daughter', 'sister'
  ];
  
  // Common male indicators (English + Arabic names)
  const maleIndicators = [
    // English names
    'john', 'david', 'michael', 'james', 'robert', 'william', 'richard', 'joseph',
    // Arabic male names
    'mohammed', 'muhammad', 'ahmad', 'ali', 'omar', 'abdullah', 'khalid', 'hassan',
    'ibrahim', 'youssef', 'kareem', 'tariq', 'faisal', 'rashid', 'samir', 'waleed',
    'mansour', 'nasser', 'hamza', 'zaid', 'malik', 'bilal', 'amin', 'marwan',
    'adam', 'ismail', 'yousef', 'fahad', 'majid', 'sami', 'jamal', 'kamal',
    // Gender pronouns and terms
    'he', 'him', 'himself', 'man', 'guy', 'male', 'gentleman',
    'father', 'dad', 'husband', 'son', 'brother'
  ];
  
  const text = `${namePattern} ${occupationPattern} ${quotePattern}`.toLowerCase();
  
  const femaleScore = femaleIndicators.reduce((score, indicator) => 
    score + (text.includes(indicator) ? 1 : 0), 0
  );
  
  const maleScore = maleIndicators.reduce((score, indicator) => 
    score + (text.includes(indicator) ? 1 : 0), 0
  );
  
  // If no clear indicators, use deterministic "random" based on seed
  if (femaleScore === maleScore) {
    return seededRandom(seed) > 0.5 ? 'female' : 'male';
  }
  
  return femaleScore > maleScore ? 'female' : 'male';
}

/**
 * Select best matching avatar based on age, gender, and avoid duplicates
 */
function selectAvatar(
  persona: PersonaData,
  gender: 'male' | 'female',
  usedAvatars: Set<string>,
  seed: number
): string {
  const age = persona.age || 30; // Default to 30 if no age provided
  const avatarPool = AVATARS[gender];
  
  // Filter out already used avatars
  const availableAvatars = avatarPool.filter(
    avatar => !usedAvatars.has(avatar.url)
  );
  
  if (availableAvatars.length === 0) {
    // If all avatars used, use seed to pick from all avatars deterministically
    const index = Math.floor(seededRandom(seed) * avatarPool.length);
    return avatarPool[index].url;
  }
  
  // Find avatars within ±10 years of target age
  const closeMatches = availableAvatars.filter(
    avatar => Math.abs(avatar.age - age) <= 10
  );
  
  if (closeMatches.length > 0) {
    // Sort by age proximity
    const sorted = closeMatches.sort(
      (a, b) => Math.abs(a.age - age) - Math.abs(b.age - age)
    );
    
    // Get top 3 closest matches
    const topMatches = sorted.slice(0, Math.min(3, sorted.length));
    
    // Deterministically select from top matches using seed
    const index = Math.floor(seededRandom(seed + 1) * topMatches.length);
    return topMatches[index].url;
  }
  
  // Fallback: deterministic selection from available using seed
  const index = Math.floor(seededRandom(seed + 2) * availableAvatars.length);
  return availableAvatars[index].url;
}

interface PersonaData {
  name: string;
  age: number;
  occupation: string;
  company: string;
  location: string;
  avatar: string;
  demographics: {
    income: string;
    education: string;
    experience: string;
    teamSize: string;
  };
  goals: Array<{ goal: string; priority: string; timeline: string }>;
  painPoints: Array<{ pain: string; intensity: string; frequency: string; cost: string }>;
  behaviors: Array<{ behavior: string; context: string }>;
  techUsage: {
    proficiency: string;
    dailyTools: string[];
    platforms: string[];
    adoptionStyle: string;
    decisionInfluence: string;
  };
  buyingJourney: {
    awareness: string;
    consideration: string;
    decision: string;
    timeline: string;
    budget: string;
  };
  quote: string;
  messaging: {
    hooks: string[];
    channels: string[];
    tone: string;
  };
}

interface PersonaPreviewProps {
  data: { personas: PersonaData[] };
  title: string;
}

export default function PersonaPreview({ data, title }: PersonaPreviewProps) {
  const { t } = useTranslation();
  const [currentPersona, setCurrentPersona] = useState(0);

  // Generate avatar assignments once and memoize
  const personaAvatars = useMemo(() => {
    if (!data || !data.personas || data.personas.length === 0) {
      return new Map<number, string>();
    }

    const usedAvatars = new Set<string>();
    const assignments = new Map<number, string>();
    
    data?.personas?.forEach((persona, index) => {
      // Create a deterministic seed from persona data
      const personaId = getPersonaId(persona);
      const seed = hashString(personaId + index.toString());
      
      const gender = detectGender(persona, seed);
      const avatarUrl = selectAvatar(persona, gender, usedAvatars, seed);
      usedAvatars.add(avatarUrl);
      assignments.set(index, `/avatars/${avatarUrl}`);
    });
    
    return assignments;
  }, [data]);

  useEffect(() => {
    if (data && data?.personas?.length > 1) {
      const timer = setInterval(() => {
        setCurrentPersona(prev => (prev + 1) % data?.personas.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [data]);

  const getCurrentPersona = () => {
    if (!data || data?.personas?.length === 0) return null;
    const persona = data?.personas[currentPersona];
    if (!persona) return null;
    return persona;
  };

  const persona = getCurrentPersona();
  const avatarUrl = persona ? personaAvatars.get(currentPersona) : null;
  
  return (
    <div className="w-full h-full p-3 bg-gradient-to-br from-slate-50 to-gray-100">
      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2 flex-row">
        <Users2 className="w-4 h-4 text-[#4588f5]" />
        {title || t('personas.title')}
      </h3>
      
      <div className="relative h-40 overflow-hidden">
        {persona ? (
          <div className="absolute inset-0 transition-opacity duration-500">
            <div className="bg-white border-2 border-[#4588f5] rounded-xl p-3 h-full shadow-sm">
              <div className="flex items-start gap-3 flex-row">
                {/* Avatar - Now with smart selection */}
                <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-md flex-shrink-0 overflow-hidden bg-gray-100 border-2 border-[#4588f5]">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt={persona.name || t('personas.defaultName')}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // SECURITY: Safely fallback to emoji if image fails to load
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.parentElement) {
                          const fallbackDiv = document.createElement('div');
                          fallbackDiv.className = 'w-full h-full bg-[#4588f5] flex items-center justify-center text-2xl';
                          fallbackDiv.textContent = persona.avatar || "👤";
                          e.currentTarget.parentElement.appendChild(fallbackDiv);
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-[#4588f5] flex items-center justify-center text-2xl">
                      {persona.avatar || "👤"}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-900 truncate ltr:text-left rtl:text-right">
                    {persona.name || t('personas.defaultName')}
                  </div>

                  <div className="text-xs text-gray-600 mb-2 ltr:text-left rtl:text-right">
                    {persona.occupation || t('personas.defaultOccupation')} {persona.age ? `• ${t('personas.age', { age: persona.age })}` : ''}
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="flex items-center gap-1 flex-row">
                      <Target className="w-3 h-3 text-[#4588f5]" />
                      <span className="text-xs text-gray-700">
                        {t('personas.goals', { count: persona.goals?.length || 0 })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-row">
                      <Zap className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-700">
                        {t('personas.painPoints', { count: persona.painPoints?.length || 0 })}
                      </span>
                    </div>
                  </div>

                  {/* Quote Preview */}
                  {persona.quote && (
                    <div className="bg-gray-50 rounded-lg p-2 ltr:border-l-2 rtl:border-r-2 border-[#4588f5]">
                      <div className="text-xs text-gray-700 italic leading-tight line-clamp-2 ltr:text-left rtl:text-right">
                        "{persona.quote.substring(0, 80)}..."
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-xs text-gray-500 text-center">
              <Users2 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              {t('personas.loading')}
            </div>
          </div>
        )}
      </div>
      
      {/* Navigation Dots */}
      {data && data?.personas?.length > 1 && (
        <div className="flex justify-center gap-1 mt-2">
          {data?.personas?.map((_, index) => (
            <div
              key={index}
              className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all duration-300 ${
                currentPersona === index ? 'bg-[#4588f5] scale-125' : 'bg-gray-300'
              }`}
              onClick={() => setCurrentPersona(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}