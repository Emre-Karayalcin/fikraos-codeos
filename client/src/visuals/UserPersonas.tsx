import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Target, Heart, Smartphone } from 'lucide-react';

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
function getPersonaId(persona: Persona): string {
  return `${persona.name || ''}_${persona.age || ''}_${persona.occupation || ''}`;
}

/**
 * Detect gender from persona data
 */
function detectGender(persona: Persona, seed: number): 'male' | 'female' {
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
    'mariam', 'noura', 'rana', 'sana', 'jana', 'malak', 'yara', 'leila',
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
 * Now uses deterministic selection based on persona hash
 */
function selectAvatar(
  persona: Persona,
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

// Helper function to render complex objects in a readable format
const renderComplexItem = (item: any): string => {
  if (typeof item === 'string') {
    return item;
  }
  
  if (typeof item === 'object' && item !== null) {
    if (item.goal) {
      const parts = [item.goal];
      if (item.priority) parts.push(`(Priority: ${item.priority})`);
      if (item.timeline) parts.push(`(Timeline: ${item.timeline})`);
      return parts.join(' ');
    }
    
    if (item.pain) {
      const parts = [item.pain];
      if (item.intensity) parts.push(`(Intensity: ${item.intensity})`);
      if (item.frequency) parts.push(`(Frequency: ${item.frequency})`);
      return parts.join(' ');
    }
    
    if (item.behavior) {
      return item.context ? `${item.behavior} - ${item.context}` : item.behavior;
    }
    
    if (item.task) {
      const parts = [item.task];
      if (item.description) parts.push(`- ${item.description}`);
      if (item.deadline) parts.push(`(Due: ${item.deadline})`);
      return parts.join(' ');
    }
    
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

interface Persona {
  name?: string;
  age?: number;
  occupation?: string;
  goals?: (string | any)[];
  painPoints?: (string | any)[];
  behaviors?: (string | any)[];
  techUsage?: {
    proficiency?: string;
    dailyTools?: string[];
    platforms?: string[];
    adoptionStyle?: string;
    decisionInfluence?: string;
  } | string;
  quote?: string;
}

interface UserPersonasProps {
  data: Persona[];
}

export default function UserPersonas({ data }: UserPersonasProps) {
  const { t } = useTranslation();
  const personas: Persona[] = Array.isArray(data) ? data : (data as any)?.personas || [];

  // Generate avatar assignments once and memoize
  // Now deterministic based on persona data
  const personaAvatars = useMemo(() => {
    const usedAvatars = new Set<string>();
    const assignments = new Map<number, string>();
    
    personas.forEach((persona, index) => {
      // Create a deterministic seed from persona data
      const personaId = getPersonaId(persona);
      const seed = hashString(personaId + index.toString());
      
      const gender = detectGender(persona, seed);
      const avatarUrl = selectAvatar(persona, gender, usedAvatars, seed);
      usedAvatars.add(avatarUrl);
      assignments.set(index, `/avatars/${avatarUrl}`);
    });
    
    return assignments;
  }, [personas]);

  if (!personas || personas?.length === 0) {
    return (
      <div className="p-6 bg-gradient-to-br from-slate-50 to-gray-100 min-h-full">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 ltr:text-left rtl:text-right">
            {t('personas.title')}
          </h2>
          <p className="text-gray-600 ltr:text-left rtl:text-right">
            {t('personas.subtitle')}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <User className="w-16 h-16 text-gray-400 mb-4" />
          <p className="text-gray-500">{t('personas.noData')}</p>
        </div>
      </div>
    );
  }

  const PersonaCard = ({ persona, index }: { persona: Persona; index: number }) => {
    const avatarUrl = personaAvatars.get(index);

    return (
      <div className="bg-white rounded-lg border-2 border-[#4588f5] p-6 shadow-sm">
        <div className="flex items-center mb-4 ltr:flex-row">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mr-4 overflow-hidden bg-gray-100 border-2 border-[#4588f5]">
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt={persona.name || t('personas.avatar')}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // SECURITY: Safely fallback to icon if image fails to load
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const fallbackDiv = document.createElement('div');
                    fallbackDiv.className = 'w-full h-full bg-[#4588f5] flex items-center justify-center';

                    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.setAttribute('class', 'w-8 h-8 text-white');
                    svg.setAttribute('fill', 'none');
                    svg.setAttribute('stroke', 'currentColor');
                    svg.setAttribute('viewBox', '0 0 24 24');

                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute('stroke-linecap', 'round');
                    path.setAttribute('stroke-linejoin', 'round');
                    path.setAttribute('stroke-width', '2');
                    path.setAttribute('d', 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z');

                    svg.appendChild(path);
                    fallbackDiv.appendChild(svg);
                    parent.appendChild(fallbackDiv);
                  }
                }}
              />
            ) : (
              <User className="w-8 h-8 text-[#4588f5]" />
            )}
          </div>
          <div className="ltr:text-left rtl:text-right">
            <h3 className="font-semibold text-gray-900 text-lg">{persona.name}</h3>
            <p className="text-gray-600 text-sm">
              {persona.age && `${persona.age} ${t('personas.yearsOld')}`} {persona.occupation}
            </p>
          </div>
        </div>

        {persona.quote && (
          <blockquote className="italic text-gray-700 mb-4 p-3 bg-gray-50 rounded ltr:border-l-4 rtl:border-r-4 border-[#4588f5] ltr:text-left rtl:text-right">
            "{persona.quote}"
          </blockquote>
        )}

        <div className="space-y-4">
          {persona.goals && (
            <div>
              <div className="flex items-center mb-2 ltr:flex-row">
                <Target className="w-4 h-4 text-[#4588f5] mr-2" />
                <h4 className="font-medium text-gray-900">{t('personas.goals')}</h4>
              </div>
              <ul className="text-sm text-gray-700 space-y-1 ltr:ml-6 rtl:mr-6">
                {persona.goals.map((goal, idx) => (
                  <li key={idx} className="flex items-start ltr:flex-row">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    {renderComplexItem(goal)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {persona.painPoints && (
            <div>
              <div className="flex items-center mb-2 ltr:flex-row">
                <Heart className="w-4 h-4 text-[#4588f5] mr-2" />
                <h4 className="font-medium text-gray-900">{t('personas.painPoints')}</h4>
              </div>
              <ul className="text-sm text-gray-700 space-y-1 ltr:ml-6 rtl:mr-6">
                {persona.painPoints.map((pain, idx) => (
                  <li key={idx} className="flex items-start ltr:flex-row">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    {renderComplexItem(pain)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {persona.behaviors && (
            <div>
              <div className="flex items-center mb-2 ltr:flex-row">
                <Smartphone className="w-4 h-4 text-[#4588f5] mr-2" />
                <h4 className="font-medium text-gray-900">{t('personas.behaviors')}</h4>
              </div>
              <ul className="text-sm text-gray-700 space-y-1 ltr:ml-6 rtl:mr-6">
                {persona.behaviors.map((behavior, idx) => (
                  <li key={idx} className="flex items-start ltr:flex-row">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    {renderComplexItem(behavior)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {persona.techUsage && (
            <div>
              <div className="flex items-center mb-2 ltr:flex-row">
                <Smartphone className="w-4 h-4 text-[#4588f5] mr-2" />
                <h4 className="font-medium text-gray-900">{t('personas.techUsage')}</h4>
              </div>
              <div className="text-sm text-gray-700 space-y-2 ltr:ml-6 rtl:mr-6 ltr:text-left rtl:text-right">
                {typeof persona.techUsage === 'string' ? (
                  <p>{persona.techUsage}</p>
                ) : (
                  <div className="space-y-1">
                    {persona.techUsage.proficiency && (
                      <div><strong>{t('personas.proficiency')}:</strong> {persona.techUsage.proficiency}</div>
                    )}
                    {persona.techUsage.dailyTools && persona.techUsage.dailyTools.length > 0 && (
                      <div><strong>{t('personas.dailyTools')}:</strong> {Array.isArray(persona.techUsage.dailyTools) ? persona.techUsage.dailyTools.join(', ') : persona.techUsage.dailyTools}</div>
                    )}
                    {persona.techUsage.platforms && persona.techUsage.platforms.length > 0 && (
                      <div><strong>{t('personas.platforms')}:</strong> {Array.isArray(persona.techUsage.platforms) ? persona.techUsage.platforms.join(', ') : persona.techUsage.platforms}</div>
                    )}
                    {persona.techUsage.adoptionStyle && (
                      <div><strong>{t('personas.adoptionStyle')}:</strong> {persona.techUsage.adoptionStyle}</div>
                    )}
                    {persona.techUsage.decisionInfluence && (
                      <div><strong>{t('personas.decisionInfluence')}:</strong> {persona.techUsage.decisionInfluence}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-gray-100 min-h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 ltr:text-left rtl:text-right">
          {t('personas.title')}
        </h2>
        <p className="text-gray-600 ltr:text-left rtl:text-right">
          {t('personas.subtitle')}
        </p>
      </div>
      
      <div className="grid gap-6">
        {personas.map((persona, index) => (
          <PersonaCard key={index} persona={persona} index={index} />
        ))}
      </div>
    </div>
  );
}