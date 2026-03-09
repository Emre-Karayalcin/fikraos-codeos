import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, CheckCircle, User, Zap } from 'lucide-react';

interface UserStory {
  userStory: string | any;
  acceptanceCriteria: string | any;
}

interface UserStoriesData {
  stories?: UserStory[];
}

interface UserStoriesPreviewProps {
  data: UserStoriesData;
  title?: string;
}

export default function UserStoriesPreview({ data, title }: UserStoriesPreviewProps) {
  const { t } = useTranslation();
  const [currentStory, setCurrentStory] = useState(0);

  useEffect(() => {
    if (data && data.stories && data.stories.length > 1) {
      const timer = setInterval(() => {
        setCurrentStory(prev => (prev + 1) % data.stories!.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [data]);

  const getCurrentStory = () => {
    if (!data || !data.stories || data.stories.length === 0) return null;
    const story = data.stories[currentStory];
    if (!story) return null;
    return story;
  };

  const story = getCurrentStory();

  // Helper to extract role from user story
  const extractRole = (userStory: string): string => {
    const match = userStory.match(/As (?:a |an )?([^,]+)/i);
    return match ? match[1].trim() : t('userStories.defaultRole');
  };

  // Helper to count acceptance criteria
  const countCriteria = (criteria: string): number => {
    if (!criteria) return 0;
    const sentences = criteria.split(/[.!?]/).filter(s => s.trim().length > 0);
    return sentences.length;
  };
  
  return (
    <div className="w-full h-full p-3 bg-gradient-to-br from-slate-50 to-gray-100">
      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2 flex-row">
        <FileText className="w-4 h-4 text-[#4588f5]" />
        {title || t('userStories.title')}
      </h3>
      
      <div className="relative h-48 overflow-hidden">
        {story ? (
          <div className="absolute inset-0 transition-opacity duration-500">
            <div className="bg-white border-2 border-[#4588f5] rounded-xl p-3 h-full shadow-sm">
              <div className="flex items-start gap-3 flex-row">
                {/* Icon */}
                <div className="w-12 h-12 bg-[#4588f5] rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                  <User className="w-6 h-6 text-white" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Role Badge */}
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#4588f5]/10 rounded-full mb-2 flex-row">
                    <Zap className="w-3 h-3 text-[#4588f5]" />
                    <span className="text-xs font-medium text-[#4588f5]">
                      {extractRole(story.userStory)}
                    </span>
                  </div>

                  {/* User Story */}
                  <div className="text-sm text-gray-900 font-medium leading-tight mb-2 line-clamp-2 ltr:text-left rtl:text-right">
                    {story.userStory}
                  </div>

                  {/* Acceptance Criteria Count */}
                  <div className="flex items-center gap-2 flex-row">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-gray-600">
                      {t('userStories.criteriaCount', { count: countCriteria(story.acceptanceCriteria) })}
                    </span>
                  </div>

                  {/* Preview of first criteria */}
                  <div className="mt-2 bg-gray-50 rounded-lg p-2 ltr:border-l-2 rtl:border-r-2 border-[#4588f5]">
                    <div className="text-xs text-gray-700 leading-tight line-clamp-2 ltr:text-left rtl:text-right">
                      {story.acceptanceCriteria.substring(0, 80)}...
                    </div>
                  </div>
                </div>
              </div>

              {/* Story Number Indicator */}
              <div className="absolute bottom-2 ltr:right-2 rtl:left-2 text-xs font-medium text-gray-500">
                {t('userStories.storyCount', { current: currentStory + 1, total: data.stories?.length || 0 })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-xs text-gray-500 text-center">
              <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              {t('userStories.loading')}
            </div>
          </div>
        )}
      </div>
      
      {/* Navigation Dots */}
      {data && data.stories && data.stories.length > 1 && (
        <div className="flex justify-center gap-1 mt-2">
          {data.stories.map((_, index) => (
            <div
              key={index}
              className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all duration-300 ${
                currentStory === index ? 'bg-[#4588f5] scale-125' : 'bg-gray-300'
              }`}
              onClick={() => setCurrentStory(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}