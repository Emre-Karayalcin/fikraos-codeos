import { Search, Globe, FileText, ExternalLink, Clock } from "lucide-react";

export interface ActivityItem {
  id: string;
  type: 'query' | 'visit' | 'extract';
  timestamp: Date;
  content: string;
  url?: string;
  domain?: string;
  reason?: string;
  snippet?: string;
  favicon?: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Research activity will appear here...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Activity Feed</h4>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: ActivityItem }) {
  const getIcon = () => {
    switch (activity.type) {
      case 'query': return Search;
      case 'visit': return Globe;
      case 'extract': return FileText;
      default: return Search;
    }
  };

  const Icon = getIcon();

  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
      <div className="p-1.5 bg-white dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
        <Icon className="w-3 h-3 text-gray-600 dark:text-gray-400" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {activity.type === 'visit' && activity.favicon && (
            <img 
              src={activity.favicon} 
              alt=""
              className="w-4 h-4"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {activity.type === 'query' && 'Searched for:'}
            {activity.type === 'visit' && (activity.domain || 'Visiting site')}
            {activity.type === 'extract' && 'Extracted content'}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
            {activity.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
        
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
          {activity.content}
        </p>
        
        {activity.reason && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {activity.reason}
          </p>
        )}
        
        {activity.snippet && (
          <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-2 rounded border-l-2 border-gray-300 dark:border-gray-600">
            "{activity.snippet}"
          </p>
        )}
        
        {activity.url && (
          <a 
            href={activity.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mt-1"
          >
            <ExternalLink className="w-3 h-3" />
            Visit source
          </a>
        )}
      </div>
    </div>
  );
}