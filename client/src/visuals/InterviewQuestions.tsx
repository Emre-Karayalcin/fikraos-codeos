import { Card } from "@/components/ui/card";
import { Flag, Users, Briefcase, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

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

interface Section {
  title: string;
  icon: typeof Flag;
  questions: string[];
  color: string;
  bgColor: string;
  description?: string;
}

export default function InterviewQuestions({ data }: { data: InterviewQuestionsData }) {
  const { t } = useTranslation();
  console.log("InterviewQuestions data:", data);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNarrow, setIsNarrow] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    disclaimers: true,
    demographic: true,
    inDepth: true,
    wrapUp: true
  });

  useEffect(() => {
    const observeWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setIsNarrow(width < 768);
      }
    };

    observeWidth();

    const resizeObserver = new ResizeObserver(observeWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Convert data to arrays
  const inDepthQuestions = data?.inDepth ? Object.values(data.inDepth).filter(Boolean) : [];
  const demographicQuestions = data?.demographic ? Object.values(data.demographic).filter(Boolean) : [];
  const wrapUpQuestions = data?.wrapUp ? Object.values(data.wrapUp).filter(Boolean) : [];

  const totalQuestions = inDepthQuestions.length + demographicQuestions.length + wrapUpQuestions.length;

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const sections: Section[] = [
    {
      title: t('interviewQuestions.disclaimers'),
      icon: Flag,
      questions: [],
      color: 'text-[#4588f5]',
      bgColor: 'bg-[#4588f5]',
      description: t('interviewQuestions.disclaimersContent')
    },
    {
      title: t('interviewQuestions.demographic'),
      icon: Users,
      questions: demographicQuestions,
      color: 'text-[#4588f5]',
      bgColor: 'bg-[#4588f5]'
    },
    {
      title: t('interviewQuestions.inDepth'),
      icon: Briefcase,
      questions: inDepthQuestions,
      color: 'text-[#4588f5]',
      bgColor: 'bg-[#4588f5]'
    },
    {
      title: t('interviewQuestions.wrapUp'),
      icon: CheckCircle,
      questions: wrapUpQuestions,
      color: 'text-[#4588f5]',
      bgColor: 'bg-[#4588f5]'
    }
  ];

  if (totalQuestions === 0 && !data) {
    return (
      <div className="text-center text-gray-400 py-8">
        <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>{t('interviewQuestions.noQuestions')}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full max-w-5xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3 flex-row">
          <div className="w-10 h-10 bg-[#4588f5] rounded-full flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          {t('interviewQuestions.title')}
        </h2>
        <p className="text-gray-600 mt-2 ltr:ml-[52px] rtl:mr-[52px] ltr:text-left rtl:text-right">
          {t('interviewQuestions.questionsCount', { 
            count: totalQuestions,
            categories: sections.filter(s => s.questions.length > 0 || s.description).length 
          })}
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section, sectionIdx) => {
          const SectionIcon = section.icon;
          const isExpanded = expandedSections[section.title.toLowerCase().replace('-', '')];
          const hasContent = section.questions.length > 0 || section.description;

          if (!hasContent) return null;

          return (
            <Card
              key={sectionIdx}
              className="overflow-hidden rounded-2xl bg-white border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.title.toLowerCase().replace('-', ''))}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-row">
                  <div className={`w-10 h-10 ${section.bgColor} rounded-full flex items-center justify-center`}>
                    <SectionIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="ltr:text-left rtl:text-right">
                    <h3 className={`font-bold text-lg ${section.color}`}>
                      {section.title}
                    </h3>
                    {section.questions.length > 0 && (
                      <p className="text-sm text-gray-500">
                        {t('interviewQuestions.questionCount', { count: section.questions.length })}
                      </p>
                    )}
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Section Content */}
              {isExpanded && (
                <div className="px-6 pb-6">
                  {/* Description for Disclaimers */}
                  {section.description && (
                    <div className="bg-gray-50 rounded-lg p-4 ltr:border-l-4 rtl:border-r-4 border-[#4588f5]">
                      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line ltr:text-left rtl:text-right">
                        {section.description}
                      </div>
                    </div>
                  )}

                  {/* Questions List */}
                  {section.questions.length > 0 && (
                    <div className="space-y-3">
                      {section.questions.map((question, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors flex-row"
                        >
                          <div className="w-6 h-6 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-medium text-gray-600">
                              {idx + 1}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-base text-gray-700 leading-relaxed ltr:text-left rtl:text-right">
                              {question}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}