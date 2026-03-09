interface CodeChange {
  file: string;
  oldContent?: string;
  newContent: string;
  changeType: 'create' | 'modify' | 'delete';
  description?: string;
}

interface DiffResult {
  success: boolean;
  changes: CodeChange[];
  errors: string[];
}

export class CodeDiffer {
  /**
   * Apply incremental changes to project files
   */
  static applyChanges(
    currentFiles: Record<string, string>,
    changes: CodeChange[]
  ): { files: Record<string, string>; errors: string[] } {
    const newFiles = { ...currentFiles };
    const errors: string[] = [];

    for (const change of changes) {
      try {
        switch (change.changeType) {
          case 'create':
            if (newFiles[change.file]) {
              errors.push(`File ${change.file} already exists`);
            } else {
              newFiles[change.file] = change.newContent;
            }
            break;

          case 'modify':
            if (!newFiles[change.file]) {
              errors.push(`File ${change.file} does not exist`);
            } else {
              newFiles[change.file] = change.newContent;
            }
            break;

          case 'delete':
            if (!newFiles[change.file]) {
              errors.push(`File ${change.file} does not exist`);
            } else {
              delete newFiles[change.file];
            }
            break;
        }
      } catch (error) {
        errors.push(`Error applying change to ${change.file}: ${error}`);
      }
    }

    return { files: newFiles, errors };
  }

  /**
   * Generate a simple diff view for changes
   */
  static generateDiffView(oldContent: string, newContent: string): string {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    
    const maxLines = Math.max(oldLines.length, newLines.length);
    const diffLines: string[] = [];

    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';

      if (oldLine === newLine) {
        diffLines.push(`  ${newLine}`);
      } else if (oldLine && !newLine) {
        diffLines.push(`- ${oldLine}`);
      } else if (!oldLine && newLine) {
        diffLines.push(`+ ${newLine}`);
      } else {
        diffLines.push(`- ${oldLine}`);
        diffLines.push(`+ ${newLine}`);
      }
    }

    return diffLines.join('\n');
  }

  /**
   * Parse AI response to extract code changes
   */
  static parseAIResponse(response: string, currentFiles: Record<string, string>): DiffResult {
    const changes: CodeChange[] = [];
    const errors: string[] = [];

    try {
      // Look for code blocks in the response
      const codeBlockRegex = /```(\w+)?\s*(?:\/\/ File: (.+?)\n)?([\s\S]*?)```/g;
      let match;

      while ((match = codeBlockRegex.exec(response)) !== null) {
        const [, language, filePath, content] = match;
        
        if (filePath && content) {
          const trimmedContent = content.trim();
          const normalizedPath = filePath.trim();
          
          const changeType = currentFiles[normalizedPath] ? 'modify' : 'create';
          
          changes.push({
            file: normalizedPath,
            oldContent: currentFiles[normalizedPath],
            newContent: trimmedContent,
            changeType,
            description: `${changeType === 'create' ? 'Created' : 'Modified'} ${normalizedPath}`
          });
        }
      }

      // Look for file creation/modification patterns
      const filePatterns = [
        /(?:create|add|new)\s+file\s+["`']([^"`']+)["`']/gi,
        /(?:update|modify|edit)\s+["`']([^"`']+)["`']/gi,
        /(?:delete|remove)\s+["`']([^"`']+)["`']/gi
      ];

      filePatterns.forEach((pattern, index) => {
        let match;
        while ((match = pattern.exec(response)) !== null) {
          const filePath = match[1];
          const changeType = index === 0 ? 'create' : index === 1 ? 'modify' : 'delete';
          
          // Only add if we don't already have this file in changes
          if (!changes.some(change => change.file === filePath)) {
            changes.push({
              file: filePath,
              oldContent: currentFiles[filePath],
              newContent: changeType === 'delete' ? '' : (currentFiles[filePath] || ''),
              changeType: changeType as 'create' | 'modify' | 'delete',
              description: `${changeType === 'create' ? 'Created' : changeType === 'modify' ? 'Modified' : 'Deleted'} ${filePath}`
            });
          }
        }
      });

    } catch (error) {
      errors.push(`Error parsing AI response: ${error}`);
    }

    return {
      success: errors.length === 0 && changes.length > 0,
      changes,
      errors
    };
  }

  /**
   * Apply smart code modifications based on natural language instructions
   */
  static applySmartModification(
    filePath: string,
    currentContent: string,
    instruction: string
  ): { newContent: string; success: boolean; error?: string } {
    try {
      // Simple pattern-based modifications
      let newContent = currentContent;

      // Color changes
      if (instruction.toLowerCase().includes('color') || instruction.toLowerCase().includes('colour')) {
        const colorRegex = /(bg-|text-|border-)(\w+)-(\d+)/g;
        
        if (instruction.includes('blue')) {
          newContent = newContent.replace(colorRegex, (match, prefix, color, shade) => {
            if (color !== 'blue') {
              return `${prefix}blue-${shade}`;
            }
            return match;
          });
        } else if (instruction.includes('red')) {
          newContent = newContent.replace(colorRegex, (match, prefix, color, shade) => {
            if (color !== 'red') {
              return `${prefix}red-${shade}`;
            }
            return match;
          });
        } else if (instruction.includes('green')) {
          newContent = newContent.replace(colorRegex, (match, prefix, color, shade) => {
            if (color !== 'green') {
              return `${prefix}green-${shade}`;
            }
            return match;
          });
        }
      }

      // Text changes
      if (instruction.toLowerCase().includes('title') || instruction.toLowerCase().includes('heading')) {
        const titleRegex = /<h1[^>]*>(.*?)<\/h1>/g;
        const match = instruction.match(/(?:title|heading)\s+(?:to\s+)?["`']([^"`']+)["`']/i);
        
        if (match && match[1]) {
          newContent = newContent.replace(titleRegex, `<h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">${match[1]}</h1>`);
        }
      }

      // Button text changes
      if (instruction.toLowerCase().includes('button')) {
        const buttonMatch = instruction.match(/button\s+(?:text\s+)?(?:to\s+)?["`']([^"`']+)["`']/i);
        
        if (buttonMatch && buttonMatch[1]) {
          // Simple button text replacement
          newContent = newContent.replace(
            /(>)\s*(Get Started|Start Free Trial|Sign Up|Learn More)\s*(<)/g,
            `$1${buttonMatch[1]}$3`
          );
        }
      }

      return {
        newContent,
        success: newContent !== currentContent,
        error: newContent === currentContent ? 'No changes applied' : undefined
      };

    } catch (error) {
      return {
        newContent: currentContent,
        success: false,
        error: `Error applying modification: ${error}`
      };
    }
  }
}