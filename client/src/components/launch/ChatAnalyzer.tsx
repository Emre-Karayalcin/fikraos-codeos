export interface ChatIntent {
  type: 'conversation' | 'edit' | 'generate';
  confidence: number;
  targetArea?: string; // What area to modify (e.g., 'ui', 'functionality', 'style')
  description: string;
}

export class ChatAnalyzer {
  
  // Keywords that indicate editing/modification intent
  private static readonly EDIT_KEYWORDS = [
    'change', 'modify', 'update', 'edit', 'fix', 'improve', 'enhance', 
    'add', 'remove', 'delete', 'replace', 'refactor', 'optimize',
    'make', 'create', 'build', 'implement', 'develop', 'code',
    'style', 'color', 'layout', 'design', 'button', 'form',
    'component', 'feature', 'function', 'page', 'section'
  ];

  // Keywords that indicate conversation intent
  private static readonly CONVERSATION_KEYWORDS = [
    'what', 'how', 'why', 'when', 'where', 'who', 'explain', 'tell me',
    'describe', 'show me', 'help', 'understand', 'learn', 'know',
    'think', 'opinion', 'suggest', 'recommend', 'advice', 'question',
    'wondering', 'curious', 'interested', 'like', 'love', 'amazing',
    'great', 'good', 'bad', 'nice', 'thanks', 'thank you'
  ];

  // Keywords that indicate generation intent
  private static readonly GENERATE_KEYWORDS = [
    'generate', 'create new', 'build me', 'make me', 'develop',
    'new project', 'from scratch', 'start fresh', 'beginning',
    'dashboard', 'website', 'app', 'application', 'system'
  ];

  static analyzeMessage(message: string, hasExistingProject: boolean): ChatIntent {
    const lowerMessage = message.toLowerCase();
    const words = lowerMessage.split(/\s+/);
    
    let editScore = 0;
    let conversationScore = 0;
    let generateScore = 0;

    // Count keyword matches
    this.EDIT_KEYWORDS.forEach(keyword => {
      if (lowerMessage.includes(keyword)) {
        editScore += keyword.length > 4 ? 2 : 1; // Longer keywords get higher weight
      }
    });

    this.CONVERSATION_KEYWORDS.forEach(keyword => {
      if (lowerMessage.includes(keyword)) {
        conversationScore += 1;
      }
    });

    this.GENERATE_KEYWORDS.forEach(keyword => {
      if (lowerMessage.includes(keyword)) {
        generateScore += 2; // Generation keywords get higher weight
      }
    });

    // Analyze sentence structure
    if (lowerMessage.includes('?')) {
      conversationScore += 2;
    }

    // Commands and imperatives tend to be edit requests
    if (this.startsWithImperative(lowerMessage)) {
      editScore += 3;
    }

    // Short messages are more likely to be conversation
    if (words.length < 5) {
      conversationScore += 1;
    }

    // Long detailed messages are more likely to be generation requests
    if (words.length > 20) {
      generateScore += 1;
    }

    // If no existing project, lean towards generation
    if (!hasExistingProject) {
      generateScore += 3;
    }

    // Determine intent based on scores
    const maxScore = Math.max(editScore, conversationScore, generateScore);
    
    if (maxScore === 0) {
      // Default to conversation if no clear intent
      return {
        type: 'conversation',
        confidence: 0.5,
        description: 'No clear intent detected'
      };
    }

    let type: 'conversation' | 'edit' | 'generate';
    let confidence: number;
    
    if (generateScore === maxScore) {
      type = 'generate';
      confidence = Math.min(generateScore / 10, 1);
    } else if (editScore === maxScore) {
      type = 'edit';
      confidence = Math.min(editScore / 8, 1);
    } else {
      type = 'conversation';
      confidence = Math.min(conversationScore / 6, 1);
    }

    return {
      type,
      confidence,
      targetArea: this.detectTargetArea(lowerMessage),
      description: this.generateDescription(type, lowerMessage)
    };
  }

  private static startsWithImperative(message: string): boolean {
    const imperativeStarters = [
      'make', 'create', 'add', 'remove', 'change', 'update', 'fix', 
      'improve', 'enhance', 'modify', 'build', 'generate', 'delete',
      'implement', 'develop', 'style', 'design', 'refactor'
    ];
    
    const firstWord = message.trim().split(' ')[0];
    return imperativeStarters.includes(firstWord);
  }

  private static detectTargetArea(message: string): string | undefined {
    if (message.includes('style') || message.includes('color') || message.includes('design') || message.includes('look')) {
      return 'ui';
    }
    if (message.includes('function') || message.includes('feature') || message.includes('work') || message.includes('logic')) {
      return 'functionality';
    }
    if (message.includes('layout') || message.includes('position') || message.includes('responsive')) {
      return 'layout';
    }
    return undefined;
  }

  private static generateDescription(type: string, message: string): string {
    switch (type) {
      case 'edit':
        return 'User wants to modify existing code or features';
      case 'generate':
        return 'User wants to create something new';
      case 'conversation':
        return 'User is asking questions or having a conversation';
      default:
        return 'Intent unclear';
    }
  }
}