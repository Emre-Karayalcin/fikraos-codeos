import React, { useState, useEffect } from 'react';
import { Check, Loader2 } from "lucide-react";

interface FileProgress {
  path: string;
  status: 'pending' | 'generating' | 'completed';
  size?: number;
}

interface AgentStatusProps {
  isActive: boolean;
  phase: 'planning' | 'generating' | 'deploying' | 'completed' | 'idle';
  currentStep: string;
  progress: number;
  files: FileProgress[];
  estimatedTime?: string;
}

interface TaskStep {
  id: string;
  title: string;
  status: 'completed' | 'in-progress' | 'pending';
}

export function AgentStatus({ 
  isActive, 
  phase, 
  currentStep, 
  progress, 
  files, 
  estimatedTime 
}: AgentStatusProps) {
  if (!isActive && phase === 'idle') {
    return null;
  }

  // Define the standard steps like in Replit
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  
  const steps = [
    'Data Schema',
    'UI Components', 
    'Styling & Theme',
    'Integration & Logic',
    'Testing & Validation'
  ];

  // Simulate step progression based on progress
  useEffect(() => {
    if (progress > 0) {
      const stepsToComplete = Math.floor((progress / 100) * steps.length);
      const newCompleted = new Set<number>();
      
      // Mark steps as completed
      for (let i = 0; i < stepsToComplete; i++) {
        newCompleted.add(i);
      }
      
      setCompletedSteps(newCompleted);
      setCurrentStepIndex(Math.min(stepsToComplete, steps.length - 1));
    }
  }, [progress]);

  // Rotating messages like Replit
  const [messageIndex, setMessageIndex] = useState(0);

  const getRotatingMessages = () => {
    const allMessages = [
      'Working on your request...',
      'Analyzing requirements...',
      'Planning architecture...',
      'Creating components...',
      'Building interface...',
      'Adding functionality...',
      'Styling elements...',
      'Testing features...',
      'Finalizing details...'
    ];
    
    if (phase === 'completed') {
      return ['Task completed'];
    }
    
    return allMessages;
  };

  // Rotate messages every 3 seconds like Replit
  useEffect(() => {
    if (phase === 'completed' || phase === 'idle') return;
    
    const messages = getRotatingMessages();
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [phase]);

  const getRotatingMessage = () => {
    const messages = getRotatingMessages();
    return messages[messageIndex] || messages[0];
  };

  const getStepStatus = (index: number): 'completed' | 'in-progress' | 'pending' => {
    if (completedSteps.has(index)) return 'completed';
    if (index === currentStepIndex && phase !== 'completed') return 'in-progress';
    return 'pending';
  };

  const getStepIcon = (status: 'completed' | 'in-progress' | 'pending') => {
    switch (status) {
      case 'completed':
        return <Check className="w-4 h-4 text-green-400" />;
      case 'in-progress':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'pending':
        return <div className="w-4 h-4 rounded-full border-2 border-gray-600" />;
    }
  };

  return (
    <div className="bg-gray-900/80 backdrop-blur-sm rounded px-4 py-3 space-y-3">
      {/* Step-by-step progress like in screenshot */}
      <div className="space-y-2">
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          return (
            <div key={index} className="flex items-center gap-3">
              {getStepIcon(status)}
              <span 
                className={`text-sm ${
                  status === 'completed' ? 'text-green-400' :
                  status === 'in-progress' ? 'text-blue-400' : 
                  'text-gray-400'
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>

      {/* Processing status at bottom like in screenshot */}
      {phase !== 'completed' && (
        <div className="border-t border-gray-700 pt-3">
          <div className="bg-gray-800/50 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              <div>
                <div className="text-sm font-medium text-white">Processing...</div>
                <div className="text-xs text-gray-400 mt-0.5">{getRotatingMessage()}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completion status */}
      {phase === 'completed' && (
        <div className="border-t border-gray-700 pt-3">
          <div className="bg-green-900/30 border border-green-600/30 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              <div className="text-sm text-green-400">All steps completed!</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}