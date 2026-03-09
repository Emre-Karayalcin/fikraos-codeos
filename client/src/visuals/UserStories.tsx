import { Card } from "@/components/ui/card";
import { FileText, CheckCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface UserStory {
  userStory: string | any;
  acceptanceCriteria: string | any;
}

interface UserStoriesData {
  stories?: UserStory[];
}

export default function UserStories({ data }: { data: UserStoriesData | UserStory[] }) {
  const { t } = useTranslation();
  console.log("UserStories data:", data);
  const stories = Array.isArray(data) ? data : (data.stories || []);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNarrow, setIsNarrow] = useState(false);

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

  if (!Array.isArray(stories) || stories.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>{t('userStories.noStories')}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full max-w-5xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3 flex-row">
          <div className="w-10 h-10 bg-[#4588f5] rounded-full flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          {t('userStories.title')}
        </h2>
        <p className="text-gray-600 mt-2 ltr:ml-[52px] rtl:mr-[52px]">
          {t('userStories.storiesCount', { count: stories.length })}
        </p>
      </div>

      <div className="space-y-6">
        {stories.map((story, idx) => (
          <Card
            key={idx}
            className="p-8 rounded-2xl bg-white border-2 border-[#4588f5] shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={`flex ${isNarrow ? 'flex-col' : 'flex-row'} gap-6`}>
              {/* User Story Section */}
              <div className="flex flex-col flex-1">
                <div className="flex items-center gap-3 mb-4 ltr:flex-row">
                  <div className="w-10 h-10 bg-[#4588f5] rounded-full flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900">{t('userStories.storyLabel')}</h3>
                </div>
                <div className="ltr:pl-[52px] rtl:pr-[52px]">
                  <p className="text-gray-700 leading-relaxed text-base ltr:text-left rtl:text-right">
                    {story.userStory}
                  </p>
                </div>
              </div>

              {/* Divider - Vertical or Horizontal based on width */}
              {isNarrow ? (
                <div className="h-px bg-gray-200"></div>
              ) : (
                <div className="w-px bg-gray-200"></div>
              )}

              {/* Acceptance Criteria Section */}
              <div className="flex flex-col flex-1">
                <div className="flex items-center gap-3 mb-4 ltr:flex-row">
                  <div className="w-10 h-10 bg-[#4588f5] rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900">{t('userStories.acceptanceCriteria')}</h3>
                </div>
                <div className="ltr:pl-[52px] rtl:pr-[52px]">
                  <div className="text-gray-700 leading-relaxed text-base whitespace-pre-line ltr:text-left rtl:text-right">
                    {story.acceptanceCriteria}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}