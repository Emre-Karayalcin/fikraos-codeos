import { useState, useEffect } from "react";
import { Search, Globe, FileText, CheckCircle, Loader2, Clock, Eye, TrendingUp, AlertCircle } from "lucide-react";

export type AgentState = 
  | 'IDLE' 
  | 'PLANNING' 
  | 'EXPANDING' 
  | 'SEARCHING' 
  | 'VISITING' 
  | 'EXTRACTING' 
  | 'CROSSCHECK' 
  | 'SYNTHESIZING' 
  | 'DRAFTING' 
  | 'DONE' 
  | 'ERROR';

interface ResearchAgentProps {
  state: AgentState;
  currentStep?: string;
  progress?: number;
}

const agentSteps = [
  { state: 'PLANNING', label: 'Planning query', icon: Clock },
  { state: 'EXPANDING', label: 'Expanding sub-questions', icon: TrendingUp },
  { state: 'SEARCHING', label: 'Searching', icon: Search },
  { state: 'VISITING', label: 'Visiting sites', icon: Globe },
  { state: 'EXTRACTING', label: 'Extracting facts', icon: FileText },
  { state: 'CROSSCHECK', label: 'Cross-checking', icon: Eye },
  { state: 'SYNTHESIZING', label: 'Synthesizing', icon: TrendingUp },
  { state: 'DRAFTING', label: 'Drafting answer', icon: FileText },
] as const;

export function ResearchAgent({ state, currentStep, progress = 0 }: ResearchAgentProps) {
  if (state === 'IDLE') return null;

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-800/50 rounded-lg">
          <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">Research Agent</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {currentStep || 'Analyzing your query...'}
          </p>
        </div>
        {state === 'ERROR' ? (
          <AlertCircle className="w-5 h-5 text-red-500" />
        ) : state === 'DONE' ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
        )}
      </div>

      {/* Progress Steps */}
      <div className="space-y-2">
        {agentSteps.map((step, index) => {
          const isActive = state === step.state;
          const isCompleted = agentSteps.findIndex(s => s.state === state) > index;
          const Icon = step.icon;

          return (
            <div
              key={step.state}
              className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                isActive 
                  ? 'bg-blue-100 dark:bg-blue-800/50 text-blue-900 dark:text-blue-100' 
                  : isCompleted
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-400 dark:text-gray-600'
              }`}
            >
              {isCompleted ? (
                <CheckCircle className="w-4 h-4" />
              ) : isActive ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Icon className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">{step.label}</span>
              {isActive && currentStep?.includes('domain') && (
                <span className="text-xs text-blue-600 dark:text-blue-400 ml-auto">
                  {currentStep}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      {progress > 0 && progress < 100 && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}