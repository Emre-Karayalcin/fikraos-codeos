import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Users, Briefcase, CheckCircle } from 'lucide-react';

interface InterviewQuestionsData {
  inDepth?: {
    question_1?: string;
    question_2?: string;
    question_3?: string;
    question_4?: string;
    question_5?: string;
    question_6?: string;
    question_7?: string;
    question_8?: string;
    question_9?: string;
    question_10?: string;
  };
  demographic?: {
    question_11?: string;
    question_12?: string;
    question_13?: string;
  };
  wrapUp?: {
    question_14?: string;
    question_15?: string;
    question_16?: string;
  };
}

interface InterviewQuestionsPreviewProps {
  data: InterviewQuestionsData;
  title?: string;
}

export default function InterviewQuestionsPreview({ data, title }: InterviewQuestionsPreviewProps) {
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState(0);

  // Convert data to arrays for easier handling
  const inDepthQuestions = data?.inDepth ? Object.values(data.inDepth).filter(Boolean) : [];
  const demographicQuestions = data?.demographic ? Object.values(data.demographic).filter(Boolean) : [];
  const wrapUpQuestions = data?.wrapUp ? Object.values(data.wrapUp).filter(Boolean) : [];

  const totalQuestions = inDepthQuestions.length + demographicQuestions.length + wrapUpQuestions.length;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentView(prev => (prev + 1) % 3); // Rotate through 3 categories
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const views = [
    {
      title: t('interviewQuestionsPreview.inDepth'),
      icon: Briefcase,
      questions: inDepthQuestions,
      color: 'text-[#4588f5]',
      bgColor: 'bg-[#4588f5]'
    },
    {
      title: t('interviewQuestionsPreview.demographic'),
      icon: Users,
      questions: demographicQuestions,
      color: 'text-[#4588f5]',
      bgColor: 'bg-[#4588f5]'
    },
    {
      title: t('interviewQuestionsPreview.wrapUp'),
      icon: CheckCircle,
      questions: wrapUpQuestions,
      color: 'text-[#4588f5]',
      bgColor: 'bg-[#4588f5]'
    }
  ];

  const currentViewData = views[currentView];
  const ViewIcon = currentViewData.icon;

  return (
    <div className="w-full h-full p-3 bg-gradient-to-br from-slate-50 to-gray-100">
      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2 flex-row">
        <MessageCircle className="w-4 h-4 text-[#4588f5]" />
        {title || t('interviewQuestionsPreview.title')}
      </h3>
      
      <div className="h-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-white rounded-xl border-2 border-[#4588f5] p-3 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-row">
              <div className={`w-8 h-8 ${currentViewData.bgColor} rounded-full flex items-center justify-center`}>
                <ViewIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900 ltr:text-left rtl:text-right">
                  {currentViewData.title}
                </div>
                <div className="text-xs text-gray-500 ltr:text-left rtl:text-right">
                  {t('interviewQuestionsPreview.questionsCount', { count: currentViewData.questions.length })}
                </div>
              </div>
            </div>
            <div className="text-xs font-medium text-gray-400">
              {currentView + 1}/3
            </div>
          </div>
          
          {/* Questions Preview */}
          <div className="space-y-1.5 overflow-y-auto max-h-16">
            {currentViewData.questions.length > 0 ? (
              currentViewData.questions.slice(0, 2).map((question, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-gray-50 rounded-lg p-2 flex-row">
                  <div className="w-1 h-1 rounded-full bg-[#4588f5] mt-1.5 flex-shrink-0" />
                  <div className="text-xs text-gray-700 leading-tight line-clamp-2 flex-1 ltr:text-left rtl:text-right">
                    {question}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-400 text-center py-2">
                {t('interviewQuestionsPreview.noQuestions')}
              </div>
            )}
            {currentViewData.questions.length > 2 && (
              <div className="text-xs text-gray-500 text-center pt-1">
                {t('interviewQuestionsPreview.moreQuestions', { count: currentViewData.questions.length - 2 })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Navigation */}
      <div className="mt-2 flex justify-center gap-2">
        {views.map((view, index) => {
          const Icon = view.icon;
          return (
            <button
              key={index}
              className={`p-1.5 rounded-lg transition-all duration-300 ${
                currentView === index 
                  ? `${view.bgColor} text-white scale-110` 
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              onClick={() => setCurrentView(index)}
            >
              <Icon className="w-3 h-3" />
            </button>
          );
        })}
      </div>

      {/* Total Questions Count */}
      <div className="mt-2 text-center">
        <div className="text-xs text-gray-600">
          <span className="font-semibold text-[#4588f5]">{totalQuestions}</span> {t('interviewQuestionsPreview.totalQuestions')}
        </div>
      </div>

      {/* Progress indicator */}
      <div className="mt-1 flex justify-center">
        <div className="flex gap-1">
          {views.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                currentView === i ? 'bg-[#4588f5] scale-125' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}