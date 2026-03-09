import React from 'react';

interface GeneratedFile {
  [filePath: string]: string;
}

interface GenerationTask {
  id: string;
  name: string;
  description: string;
  dependencies: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: string;
}

interface AppTemplate {
  id: string;
  name: string;
  description: string;
  stack: string[];
  complexity: 'simple' | 'intermediate' | 'advanced';
}

interface GenerationResult {
  success: boolean;
  files: GeneratedFile;
  explanation: string;
  tasks: GenerationTask[];
  error?: string;
}

/**
 * App.build-inspired code generator with task-based generation pipeline
 * Implements structured development workflow with validation
 */
export class AppBuildInspiredGenerator {
  
  // Available application templates
  static readonly TEMPLATES: AppTemplate[] = [
    {
      id: 'modern-vanilla',
      name: 'Modern Vanilla JS',
      description: 'Clean, modern web app with vanilla JavaScript and CSS Grid',
      stack: ['HTML5', 'CSS3', 'JavaScript ES6', 'CSS Grid', 'Flexbox'],
      complexity: 'simple'
    },
    {
      id: 'interactive-dashboard',
      name: 'Interactive Dashboard',
      description: 'Professional dashboard with charts, animations, and responsive design',
      stack: ['HTML5', 'CSS3', 'JavaScript ES6', 'CSS Animations', 'Local Storage'],
      complexity: 'intermediate'
    },
    {
      id: 'business-website',
      name: 'Business Website',
      description: 'Modern business site with hero sections, forms, and smooth animations',
      stack: ['HTML5', 'CSS3', 'JavaScript ES6', 'CSS Grid', 'Intersection Observer'],
      complexity: 'simple'
    },
    {
      id: 'portfolio-showcase',
      name: 'Portfolio Showcase',
      description: 'Creative portfolio with image galleries, animations, and smooth scrolling',
      stack: ['HTML5', 'CSS3', 'JavaScript ES6', 'CSS Animations', 'Web APIs'],
      complexity: 'intermediate'
    },
    {
      id: 'webapp-advanced',
      name: 'Advanced Web App',
      description: 'Feature-rich web application with routing, storage, and interactive components',
      stack: ['HTML5', 'CSS3', 'JavaScript ES6', 'Web Components', 'Service Workers'],
      complexity: 'advanced'
    }
  ];

  /**
   * Generate application using task-based pipeline
   */
  static async generateApplication(
    prompt: string,
    templateId: string = 'react-tailwind',
    onTaskUpdate?: (tasks: GenerationTask[]) => void,
    onFileUpdate?: (filePath: string, content: string) => void
  ): Promise<GenerationResult> {
    
    const template = this.TEMPLATES.find(t => t.id === templateId) || this.TEMPLATES[0];
    console.log(`🚀 Starting app.build-inspired generation with ${template.name} template`);
    
    // PHASE 1: Create development plan and task pipeline
    const tasks = await this.createTaskPipeline(prompt, template);
    onTaskUpdate?.(tasks);
    
    try {
      // PHASE 2: Execute tasks in dependency order
      const files = await this.executeTasks(tasks, prompt, template, onTaskUpdate, onFileUpdate);
      
      // PHASE 3: Validate and test generated code
      const validationResult = await this.validateGeneration(files, template);
      
      return {
        success: true,
        files,
        tasks,
        explanation: `Successfully generated ${template.name} application with ${Object.keys(files).length} files using task-based pipeline`
      };
      
    } catch (error) {
      console.error('❌ AI generation failed completely:', error);
      // Check if this is an API credit issue and provide clear error message
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('credit balance is too low') || errorMessage.includes('500 Internal Server Error')) {
        errorMessage = 'AI service is currently unavailable (insufficient credits). Please try again later or contact support.';
      }
      
      return {
        success: false,
        files: {},
        tasks,
        error: `Generation failed: ${errorMessage}`,
        explanation: 'AI generation failed. Please try again with a different description or try again later.'
      };
    }
  }
  
  /**
   * Create task pipeline based on app.build's approach
   */
  private static async createTaskPipeline(prompt: string, template: AppTemplate): Promise<GenerationTask[]> {
    const tasks: GenerationTask[] = [
      {
        id: 'plan',
        name: 'Development Planning',
        description: 'Analyze requirements and create development roadmap',
        dependencies: [],
        status: 'pending'
      },
      {
        id: 'schema',
        name: 'Data Schema',
        description: 'Define data models and types',
        dependencies: ['plan'],
        status: 'pending'
      },
      {
        id: 'components',
        name: 'UI Components',
        description: 'Generate React components and layouts',
        dependencies: ['schema'],
        status: 'pending'
      },
      {
        id: 'styles',
        name: 'Styling & Theme',
        description: 'Create styles, themes, and responsive design',
        dependencies: ['components'],
        status: 'pending'
      },
      {
        id: 'integration',
        name: 'Integration & Logic',
        description: 'Connect components with business logic',
        dependencies: ['components', 'styles'],
        status: 'pending'
      },
      {
        id: 'validation',
        name: 'Testing & Validation',
        description: 'Validate code quality and functionality',
        dependencies: ['integration'],
        status: 'pending'
      }
    ];
    
    return tasks;
  }
  
  /**
   * Execute tasks in dependency order
   */
  private static async executeTasks(
    tasks: GenerationTask[],
    prompt: string,
    template: AppTemplate,
    onTaskUpdate?: (tasks: GenerationTask[]) => void,
    onFileUpdate?: (filePath: string, content: string) => void
  ): Promise<GeneratedFile> {
    
    const files: GeneratedFile = {};
    const completedTasks = new Set<string>();
    
    // Execute tasks in dependency order
    while (completedTasks.size < tasks.length) {
      const readyTasks = tasks.filter(task => 
        task.status === 'pending' && 
        task.dependencies.every(dep => completedTasks.has(dep))
      );
      
      if (readyTasks.length === 0) {
        throw new Error('Circular dependency or blocked tasks detected');
      }
      
      // Process ready tasks in parallel
      await Promise.all(readyTasks.map(async (task) => {
        task.status = 'running';
        onTaskUpdate?.(tasks);
        
        try {
          const taskFiles = await this.executeTask(task, prompt, template, files);
          
          // Add generated files
          Object.assign(files, taskFiles);
          
          // Notify about new files
          Object.entries(taskFiles).forEach(([path, content]) => {
            onFileUpdate?.(path, content);
          });
          
          task.status = 'completed';
          task.output = `Generated ${Object.keys(taskFiles).length} files`;
          completedTasks.add(task.id);
          
        } catch (error) {
          task.status = 'failed';
          task.output = error instanceof Error ? error.message : 'Unknown error';
          throw error;
        }
        
        onTaskUpdate?.(tasks);
      }));
    }
    
    return files;
  }
  
  /**
   * Execute individual task
   */
  private static async executeTask(
    task: GenerationTask,
    prompt: string,
    template: AppTemplate,
    existingFiles: GeneratedFile
  ): Promise<GeneratedFile> {
    
    console.log(`🔧 Executing task: ${task.name}`);
    
    switch (task.id) {
      case 'plan':
        return await this.generatePlan(prompt, template);
        
      case 'schema':
        return await this.generateSchema(prompt, template, existingFiles);
        
      case 'components':
        return await this.generateComponents(prompt, template, existingFiles);
        
      case 'styles':
        return await this.generateStyles(prompt, template, existingFiles);
        
      case 'integration':
        return await this.generateIntegration(prompt, template, existingFiles);
        
      case 'validation':
        return await this.validateAndTest(prompt, template, existingFiles);
        
      default:
        throw new Error(`Unknown task: ${task.id}`);
    }
  }
  
  /**
   * Generate development plan
   */
  private static async generatePlan(prompt: string, template: AppTemplate): Promise<GeneratedFile> {
    const planContent = {
      project: {
        name: this.extractProjectName(prompt),
        description: prompt,
        template: template.name,
        stack: template.stack
      },
      features: this.extractFeatures(prompt),
      architecture: this.planArchitecture(template)
    };
    
    return {
      'project-plan.json': JSON.stringify(planContent, null, 2)
    };
  }
  
  /**
   * Generate comprehensive static web application
   */
  private static async generateSchema(
    prompt: string, 
    template: AppTemplate, 
    existingFiles: GeneratedFile
  ): Promise<GeneratedFile> {
    
    // For static web apps, generate comprehensive HTML/CSS/JS instead of schema
    const staticAppPrompt = this.createComprehensiveStaticAppPrompt(prompt, template);
    
    try {
      const response = await fetch('/api/openai/anthropic/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          messages: [{
            role: 'system',
            content: 'You are FikraHub AI - the world\'s most advanced web developer specializing in creating modern, comprehensive static web applications. Generate complete, working HTML/CSS/JS applications that are fully functional, modern, and relevant to the user\'s request. Always create real, meaningful content and functionality - never generic templates.'
          }, {
            role: 'user',
            content: staticAppPrompt
          }],
          model: 'claude-3-5-sonnet-20241022',
          temperature: 0.4,
          max_tokens: 4000
        })
      });
      
      if (!response.ok) {
        throw new Error(`AI API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('🔍 Raw AI static app response structure:', Object.keys(data));
      
      const rawContent = data.choices?.[0]?.message?.content || '';
      
      if (!rawContent || rawContent.length < 100) {
        console.error('❌ AI returned insufficient content:', rawContent);
        throw new Error(`AI returned insufficient content for static app generation: ${rawContent.substring(0, 100) || 'empty response'}`);
      }
      
      console.log('🔍 AI content length:', rawContent.length);
      console.log('🔍 AI content preview:', rawContent.substring(0, 500));
      
      // Extract HTML, CSS, and JS from the AI response
      const htmlContent = this.extractCodeFromResponse(rawContent, 'html');
      const cssContent = this.extractCodeFromResponse(rawContent, 'css');
      const jsContent = this.extractCodeFromResponse(rawContent, 'javascript', 'js');
      
      console.log('🔍 Extracted HTML length:', htmlContent?.length || 0);
      console.log('🔍 Extracted CSS length:', cssContent?.length || 0);
      console.log('🔍 Extracted JS length:', jsContent?.length || 0);
      
      if (htmlContent && htmlContent.length > 500) {
        console.log('✅ Generated comprehensive static web application');
        return {
          'index.html': htmlContent,
          'styles.css': cssContent || '',
          'script.js': jsContent || ''
        };
      }
      
      // If no valid HTML was extracted, fail the generation
      console.error('❌ Failed to extract valid HTML from AI response');
      console.error('❌ Raw content for debugging:', rawContent);
      throw new Error('AI failed to generate valid HTML content for static app. Content was too short or incorrectly formatted.');
      
    } catch (error) {
      console.error('❌ AI schema generation failed:', error);
      
      // Check if this is an API credit issue
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage?.includes('credit balance is too low') || errorMessage?.includes('500 Internal Server Error')) {
        throw new Error('AI service is currently unavailable (insufficient credits). Please try again later or contact support.');
      }
      
      throw new Error(`Schema generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Generate UI components
   */
  private static async generateComponents(
    prompt: string,
    template: AppTemplate,
    existingFiles: GeneratedFile
  ): Promise<GeneratedFile> {
    
    const componentPrompt = this.createComponentPrompt(prompt, template, existingFiles);
    
    try {
      const response = await fetch('/api/openai/anthropic/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          messages: [{
            role: 'system',
            content: componentPrompt
          }, {
            role: 'user',
            content: prompt
          }],
          model: 'claude-3-5-sonnet-20241022',
          temperature: 0.4,
          max_tokens: 4000
        })
      });
      
      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content || '';
      
      if (!rawContent || rawContent.length < 100) {
        throw new Error(`AI returned empty or invalid components: ${rawContent}`);
      }
      
      // Extract React component code from the response
      const componentCode = this.extractCodeFromResponse(rawContent, 'typescript', 'tsx', 'jsx');
      
      if (!componentCode || componentCode.length < 100) {
        throw new Error(`No valid React component code found in AI response`);
      }
      
      console.log('✅ AI components extracted:', componentCode.substring(0, 200));
      
      // Parse and organize components
      return this.parseComponentCode(componentCode, template);
      
    } catch (error) {
      console.error('❌ AI component generation failed:', error);
      
      // Check if this is an API credit issue
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage?.includes('credit balance is too low') || errorMessage?.includes('500 Internal Server Error')) {
        throw new Error('AI service is currently unavailable (insufficient credits). Please try again later or contact support.');
      }
      
      throw new Error(`Component generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Generate styles and theme
   */
  private static async generateStyles(
    prompt: string,
    template: AppTemplate,
    existingFiles: GeneratedFile
  ): Promise<GeneratedFile> {
    
    const files: GeneratedFile = {};
    
    if (template.stack.includes('Tailwind CSS')) {
      files['tailwind.config.js'] = this.generateTailwindConfig();
      files['src/index.css'] = this.generateTailwindStyles(prompt);
    } else if (template.stack.includes('Material-UI')) {
      files['src/theme.ts'] = this.generateMUITheme(prompt);
      files['src/index.css'] = this.generateMUIStyles();
    }
    
    return files;
  }
  
  /**
   * Generate integration logic
   */
  private static async generateIntegration(
    prompt: string,
    template: AppTemplate,
    existingFiles: GeneratedFile
  ): Promise<GeneratedFile> {
    
    // For static HTML apps, return the AI-generated static files directly
    const hasStaticFiles = existingFiles['index.html'] || existingFiles['styles.css'] || existingFiles['script.js'];
    
    if (hasStaticFiles) {
      // This is a static web app - return only AI-generated files
      if (!existingFiles['index.html']) {
        throw new Error('No HTML file generated by AI - cannot create static app without AI generation');
      }
      
      return {
        'index.html': existingFiles['index.html'],
        'styles.css': existingFiles['styles.css'] || '',
        'script.js': existingFiles['script.js'] || '',
        'package.json': this.generatePackageJson(prompt, template),
        'vite.config.js': this.generateViteConfig(template)
      };
    }
    
    // For React apps, generate main app component using AI
    const mainApp = await this.generateMainApp(prompt, template, existingFiles);
    
    return {
      'src/App.tsx': mainApp,
      'src/main.tsx': this.generateEntryPoint(template),
      'index.html': this.generateHTML(prompt, template),
      'package.json': this.generatePackageJson(prompt, template),
      'vite.config.js': this.generateViteConfig(template)
    };
  }
  
  /**
   * Validate and test generation
   */
  private static async validateAndTest(
    prompt: string,
    template: AppTemplate,
    existingFiles: GeneratedFile
  ): Promise<GeneratedFile> {
    
    // Basic validation - check for common issues
    const issues = this.validateCode(existingFiles);
    
    return {
      'validation-report.json': JSON.stringify({
        timestamp: new Date().toISOString(),
        template: template.name,
        filesGenerated: Object.keys(existingFiles).length,
        validationIssues: issues,
        status: issues.length === 0 ? 'passed' : 'warnings'
      }, null, 2)
    };
  }
  
  // Helper methods for code generation
  private static extractProjectName(prompt: string): string {
    const words = prompt.toLowerCase().split(' ');
    const appWords = words.slice(0, 3).join('-');
    return appWords.replace(/[^a-z0-9-]/g, '') || 'react-app';
  }
  
  private static extractFeatures(prompt: string): string[] {
    const features = [];
    if (prompt.toLowerCase().includes('dashboard')) features.push('dashboard');
    if (prompt.toLowerCase().includes('auth')) features.push('authentication');
    if (prompt.toLowerCase().includes('chart')) features.push('data-visualization');
    if (prompt.toLowerCase().includes('form')) features.push('forms');
    return features.length > 0 ? features : ['basic-ui'];
  }
  
  private static planArchitecture(template: AppTemplate): any {
    return {
      frontend: template.stack,
      bundler: 'Vite',
      styling: template.stack.includes('Tailwind CSS') ? 'Tailwind' : 'Material-UI',
      stateManagement: 'React Hooks'
    };
  }
  
  private static createSchemaPrompt(prompt: string, template: AppTemplate): string {
    const isAdvanced = template.complexity === 'advanced';
    
    return `You are a TypeScript expert. Generate comprehensive, production-ready type definitions for: "${prompt}"

## REQUIREMENTS
Template: ${template.name} (${template.complexity} complexity)
Stack: ${template.stack.join(', ')}

## TYPE DEFINITIONS NEEDED

### 1. Core Data Models
- Primary entity interfaces (User, Product, Post, etc.)
- Nested object types and unions
- Enum types for constants
- Database-style entities with IDs, timestamps

### 2. Component Props & State
- Comprehensive props interfaces for all components
- Event handler type definitions
- Generic types for reusable components
- Form data interfaces with validation

### 3. API & Service Types
${isAdvanced ? `
- Request/Response interfaces for REST APIs
- GraphQL query/mutation types (if applicable)
- Webhook/WebSocket event types
- Authentication token structures
- Pagination and filtering interfaces
- Error response types` : `
- Basic API request/response types
- Service method interfaces
- Error handling types`}

### 4. Application State
- Global state management types
- Context provider interfaces
- Custom hook return types
- Routing parameter types

### 5. Utility Types
- Common shared interfaces
- Type guards and predicates
- Branded types for IDs
- Configuration and settings types

## OUTPUT REQUIREMENTS
- Use strict TypeScript patterns
- Include JSDoc comments for complex types
- Export all types properly
- Use generic constraints where appropriate
- Include branded types for type safety
- Create utility types for common patterns

**Generate comprehensive, real-world TypeScript definitions that support a full-featured application.**`;
  }
  
  private static createComponentPrompt(prompt: string, template: AppTemplate, existingFiles: GeneratedFile): string {
    const complexity = template.complexity;
    const isAdvanced = complexity === 'advanced';
    
    return `You are a senior frontend developer with 10+ years experience building production web applications. Create a FULLY FUNCTIONAL, COMPREHENSIVE application for: "${prompt}"

This is NOT a template or demo - build a REAL application that users would actually use.

## PROJECT REQUIREMENTS
Template: ${template.name}
Stack: ${template.stack.join(', ')}
Complexity: ${complexity}

## MANDATORY FEATURES TO INCLUDE
${isAdvanced ? `
🔥 ADVANCED APPLICATION FEATURES (ALL REQUIRED):
- Full CRUD operations (Create, Read, Update, Delete data)
- User authentication simulation (login/register forms with validation)
- Data management with Local Storage persistence
- Search/filter/sort functionality across data
- Modal dialogs for forms and confirmations
- Responsive navigation menu (hamburger on mobile)
- Data visualization (charts/graphs using Canvas or SVG)
- File upload/download simulation
- Drag and drop interfaces
- Real-time form validation with custom error messages
- Toast notifications for user feedback
- Loading states and skeleton screens
- Infinite scroll or pagination
- Dark/light theme toggle
- Keyboard shortcuts for power users
- Export data to CSV/JSON functionality` : complexity === 'intermediate' ? `
⚡ INTERMEDIATE APPLICATION FEATURES (ALL REQUIRED):
- Interactive forms with real-time validation
- Data persistence using Local Storage
- Search and filter functionality
- Modal popups for user interactions
- Responsive design with mobile menu
- Image galleries or carousels
- Tab/accordion interfaces
- Progress bars and loading indicators
- Smooth page transitions and animations
- Contact forms with validation
- Data tables with sorting
- User feedback systems (ratings, comments)
- Calendar or date picker interfaces` : `
✨ SIMPLE APPLICATION FEATURES (ALL REQUIRED):
- Interactive contact/signup forms
- Image galleries with lightbox effects
- Smooth scroll navigation
- Animated counters and progress indicators
- Interactive FAQ accordions
- Image sliders/carousels
- Form validation with visual feedback
- Mobile responsive navigation
- Call-to-action buttons with hover effects
- Social media integration simulation`}

## AVAILABLE TECHNOLOGIES (USE ONLY THESE)
- HTML5 with semantic elements and modern form controls
- CSS3 with Grid, Flexbox, Custom Properties, animations
- Vanilla JavaScript ES6+ (classes, modules, async/await, destructuring)
- Web APIs (Fetch, Local Storage, Canvas, File API, Intersection Observer)
- NO external libraries or frameworks - pure vanilla only

## ARCHITECTURE REQUIREMENTS
- Modern JavaScript ES6+ with modules
- Semantic HTML5 structure
- CSS Grid and Flexbox for layouts
- Progressive enhancement approach
- Mobile-first responsive design
- Accessible markup (ARIA, semantic elements)
- Clean separation of concerns (HTML/CSS/JS)

## FILE STRUCTURE
Generate a complete web application with these files:
1. **index.html**: Main HTML structure with semantic markup
2. **styles.css**: Modern CSS with Grid, Flexbox, and animations
3. **script.js**: Main JavaScript module with ES6+ features
4. **modules/**: Additional JS modules for different features (if complex)

## IMPLEMENTATION REQUIREMENTS
💎 BUILD A COMPLETE, WORKING APPLICATION - NOT A TEMPLATE!

You must implement EVERY feature listed above. This should be a fully functional application that:
- Contains realistic sample data (at least 10-20 items/records)
- Has working forms that actually save and retrieve data
- Includes interactive elements that respond to user actions
- Provides visual feedback for all user interactions
- Handles edge cases and error scenarios gracefully
- Works seamlessly on both desktop and mobile devices

## SPECIFIC FUNCTIONALITY REQUIREMENTS
- Use Local Storage to persist ALL user data between sessions
- Implement proper form validation with specific error messages
- Create smooth animations for state changes and interactions
- Build responsive layouts that work on all screen sizes
- Include loading states for any asynchronous operations
- Add keyboard navigation support for accessibility
- Create visual feedback for all user actions (hover, active, focus states)
- Implement search/filter functionality that actually works with the data
- Include modal dialogs that are properly accessible
- Add tooltips and help text where appropriate

## MODERN WEB STANDARDS
- HTML5 semantic elements (header, nav, main, section, article, aside, footer)
- CSS Custom Properties (CSS variables) for theming
- CSS Grid for complex layouts, Flexbox for component alignment
- JavaScript modules (import/export) for clean code organization
- Fetch API for data retrieval
- Local Storage/Session Storage for client-side data
- Intersection Observer for scroll-based animations
- CSS animations and transitions for smooth UX

## STYLING APPROACH
- Modern CSS with CSS Grid and Flexbox
- CSS Custom Properties for consistent theming
- Mobile-first responsive design with CSS media queries
- Smooth animations using CSS transitions and @keyframes
- Clean, modern aesthetics with proper typography and spacing
- Accessible color schemes with good contrast ratios

## OUTPUT FORMAT
Return as separate code blocks with clear file paths:

\`\`\`html
<!-- index.html -->
[HTML structure]
\`\`\`

\`\`\`css
/* styles.css */
[CSS styling]
\`\`\`

\`\`\`javascript
// script.js
[JavaScript functionality]
\`\`\`

Ensure the application:
- Works without any external dependencies
- Is fully functional and interactive
- Implements modern web standards
- Has clean, semantic HTML structure
- Uses efficient CSS for styling and layout
- Includes smooth animations and transitions
- Is production-ready quality

## EXAMPLE APPLICATION QUALITY EXPECTATIONS

For a social network app, you should include:
- User profiles with avatars, bios, and contact info
- News feed with posts, likes, comments, and sharing
- Friend/follower system with add/remove functionality
- Private messaging interface
- Photo galleries and image uploads
- Event creation and RSVP systems
- Group creation and management
- Search for users, posts, and content
- Notification system
- Privacy settings and controls

For a business app, include:
- Dashboard with charts and analytics
- Customer/client management system
- Invoice/billing functionality
- Project management tools
- Team collaboration features
- Report generation
- Data export capabilities
- User role management

## CRITICAL SUCCESS CRITERIA
✅ The application MUST have realistic, working features
✅ Users should be able to interact with the app meaningfully
✅ Data should persist between page reloads
✅ All forms should validate and provide feedback
✅ The app should look professional and modern
✅ Mobile experience should be excellent
✅ Performance should be smooth with animations

**Generate a complete, self-contained web application that works immediately when opened in a browser and provides REAL VALUE to users.**`;
  }
  
  private static parseComponentCode(code: string, template: AppTemplate): GeneratedFile {
    const files: GeneratedFile = {};
    
    // Parse the AI response to extract different file types
    const htmlMatch = code.match(/```html[\s\S]*?<!-- index\.html -->([\s\S]*?)```/);
    const cssMatch = code.match(/```css[\s\S]*?\/\* styles\.css \*\/([\s\S]*?)```/);
    const jsMatch = code.match(/```javascript[\s\S]*?\/\/ script\.js([\s\S]*?)```/);
    
    if (htmlMatch) {
      files['index.html'] = htmlMatch[1].trim();
    }
    
    if (cssMatch) {
      files['styles.css'] = cssMatch[1].trim();
    }
    
    if (jsMatch) {
      files['script.js'] = jsMatch[1].trim();
    }
    
    // If parsing failed, create basic files
    if (!files['index.html']) {
      files['index.html'] = this.generateHTML("Basic Web App", template);
      files['styles.css'] = this.generateBasicStyles(template);
      files['script.js'] = 'console.log("App loaded successfully!");';
    }
    
    return files;
  }
  
  private static async generateFallback(prompt: string, template: AppTemplate): Promise<GeneratedFile> {
    console.log('🔄 Generating comprehensive fallback static web app for:', prompt);
    
    // Generate a comprehensive fallback static app that's relevant to the prompt
    const projectName = this.extractProjectName(prompt);
    const relevantHTML = this.generateRelevantHTML(prompt, template);
    const modernCSS = this.generateModernCSS(prompt, template);
    const interactiveJS = this.generateInteractiveJS(prompt, template);
    
    return {
      'index.html': relevantHTML,
      'styles.css': modernCSS,
      'script.js': interactiveJS,
      'package.json': this.generatePackageJson(prompt, template),
      'vite.config.js': this.generateViteConfig(template)
    };
  }

  /**
   * Generate relevant HTML based on the prompt
   */
  private static generateRelevantHTML(prompt: string, template: AppTemplate): string {
    const projectName = this.extractProjectName(prompt);
    const lowerPrompt = prompt.toLowerCase();
    
    // Determine app type and generate relevant content
    if (lowerPrompt.includes('social') && lowerPrompt.includes('network')) {
      return this.generateRelevantHTMLContent(projectName, 'social network', prompt);
    } else if (lowerPrompt.includes('ecommerce') || lowerPrompt.includes('shop')) {
      return this.generateRelevantHTMLContent(projectName, 'ecommerce', prompt);
    } else if (lowerPrompt.includes('blog') || lowerPrompt.includes('news')) {
      return this.generateRelevantHTMLContent(projectName, 'blog', prompt);
    } else if (lowerPrompt.includes('portfolio')) {
      return this.generateRelevantHTMLContent(projectName, 'portfolio', prompt);
    } else if (lowerPrompt.includes('dashboard')) {
      return this.generateRelevantHTMLContent(projectName, 'dashboard', prompt);
    } else {
      return this.generateRelevantHTMLContent(projectName, 'website', prompt);
    }
  }

  /**
   * Generate modern CSS for comprehensive styling
   */
  private static generateModernCSS(prompt: string, template: AppTemplate): string {
    return `/* Modern Styles for ${this.extractProjectName(prompt)} */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

:root {
    --primary-color: #6366f1;
    --primary-light: #818cf8;
    --primary-dark: #4f46e5;
    --secondary-color: #f59e0b;
    --success-color: #10b981;
    --danger-color: #ef4444;
    --warning-color: #f59e0b;
    --info-color: #4588f5;
    --dark-color: #1f2937;
    --light-color: #f9fafb;
    --gray-100: #f3f4f6;
    --gray-200: #e5e7eb;
    --gray-300: #d1d5db;
    --gray-400: #9ca3af;
    --gray-500: #6b7280;
    --gray-600: #4b5563;
    --gray-700: #374151;
    --gray-800: #1f2937;
    --gray-900: #111827;
    --border-radius: 12px;
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
    --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: var(--gray-900);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
}

/* Header Styles */
header {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    position: sticky;
    top: 0;
    z-index: 100;
    padding: 1rem 0;
}

nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
}

.logo {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--primary-color);
    text-decoration: none;
    transition: var(--transition);
}

.logo:hover {
    transform: scale(1.05);
    color: var(--primary-dark);
}

.nav-links {
    display: flex;
    list-style: none;
    gap: 2rem;
    align-items: center;
}

.nav-links a {
    text-decoration: none;
    color: var(--gray-700);
    font-weight: 500;
    transition: var(--transition);
    padding: 0.5rem 1rem;
    border-radius: var(--border-radius);
}

.nav-links a:hover {
    color: var(--primary-color);
    background: rgba(99, 102, 241, 0.1);
}

/* Main Content */
main {
    padding: 2rem 0;
}

.hero {
    text-align: center;
    padding: 4rem 0;
    color: white;
    margin-bottom: 3rem;
}

.hero h1 {
    font-size: clamp(2.5rem, 5vw, 4rem);
    font-weight: 800;
    margin-bottom: 1rem;
    background: linear-gradient(135deg, #fff 0%, #e0e7ff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: fadeInUp 1s ease-out;
}

.hero p {
    font-size: 1.25rem;
    margin-bottom: 2rem;
    opacity: 0.9;
    animation: fadeInUp 1s ease-out 0.2s both;
}

/* Cards and Sections */
.section {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: var(--border-radius);
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: var(--shadow-lg);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin: 2rem 0;
}

.card {
    background: white;
    border-radius: var(--border-radius);
    padding: 1.5rem;
    box-shadow: var(--shadow-md);
    border: 1px solid var(--gray-200);
    transition: var(--transition);
    position: relative;
    overflow: hidden;
}

.card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-xl);
}

.card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
}

/* Buttons */
.btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: var(--border-radius);
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    transition: var(--transition);
    font-size: 1rem;
    position: relative;
    overflow: hidden;
}

.btn-primary {
    background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
    color: white;
    box-shadow: var(--shadow-md);
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}

.btn-secondary {
    background: white;
    color: var(--primary-color);
    border: 2px solid var(--primary-color);
}

.btn-secondary:hover {
    background: var(--primary-color);
    color: white;
}

/* Forms */
.form-group {
    margin-bottom: 1.5rem;
}

.form-label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: var(--gray-700);
}

.form-control {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid var(--gray-300);
    border-radius: var(--border-radius);
    font-size: 1rem;
    transition: var(--transition);
    background: white;
}

.form-control:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

/* Animations */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
}

.animate-pulse {
    animation: pulse 2s infinite;
}

/* Responsive Design */
@media (max-width: 768px) {
    .nav-links {
        display: none;
    }
    
    .hero h1 {
        font-size: 2.5rem;
    }
    
    .card-grid {
        grid-template-columns: 1fr;
    }
    
    .section {
        padding: 1.5rem;
    }
}

/* Utility Classes */
.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }
.mb-1 { margin-bottom: 0.5rem; }
.mb-2 { margin-bottom: 1rem; }
.mb-3 { margin-bottom: 1.5rem; }
.mb-4 { margin-bottom: 2rem; }
.mt-1 { margin-top: 0.5rem; }
.mt-2 { margin-top: 1rem; }
.mt-3 { margin-top: 1.5rem; }
.mt-4 { margin-top: 2rem; }
.p-1 { padding: 0.5rem; }
.p-2 { padding: 1rem; }
.p-3 { padding: 1.5rem; }
.p-4 { padding: 2rem; }

/* Loading Spinner */
.spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}`;
  }

  /**
   * Generate interactive JavaScript for comprehensive functionality
   */
  private static generateInteractiveJS(prompt: string, template: AppTemplate): string {
    const projectName = this.extractProjectName(prompt);
    
    return `// ${projectName} - Advanced Interactive Features
console.log('${projectName} loaded successfully!');

// Application State Management
class AppState {
    constructor() {
        this.data = this.loadFromStorage() || this.getInitialData();
        this.listeners = [];
    }

    getInitialData() {
        return {
            users: [
                { id: 1, name: 'Alex Johnson', email: 'alex@example.com', avatar: 'https://ui-avatars.com/api/?name=Alex+Johnson&background=6366f1&color=fff' },
                { id: 2, name: 'Sarah Chen', email: 'sarah@example.com', avatar: 'https://ui-avatars.com/api/?name=Sarah+Chen&background=10b981&color=fff' },
                { id: 3, name: 'Mike Wilson', email: 'mike@example.com', avatar: 'https://ui-avatars.com/api/?name=Mike+Wilson&background=f59e0b&color=fff' }
            ],
            posts: [
                { id: 1, title: 'Welcome to ${projectName}', content: 'This is an amazing platform with lots of features!', author: 1, likes: 15, timestamp: new Date().toISOString() },
                { id: 2, title: 'Getting Started Guide', content: 'Here are some tips to help you make the most of this application.', author: 2, likes: 8, timestamp: new Date(Date.now() - 86400000).toISOString() }
            ],
            currentUser: 1,
            notifications: [],
            theme: 'light'
        };
    }

    loadFromStorage() {
        try {
            return JSON.parse(localStorage.getItem('${projectName.toLowerCase()}_data'));
        } catch (e) {
            return null;
        }
    }

    save() {
        localStorage.setItem('${projectName.toLowerCase()}_data', JSON.stringify(this.data));
        this.notify();
    }

    subscribe(listener) {
        this.listeners.push(listener);
    }

    notify() {
        this.listeners.forEach(listener => listener(this.data));
    }

    addPost(title, content) {
        const newPost = {
            id: Date.now(),
            title,
            content,
            author: this.data.currentUser,
            likes: 0,
            timestamp: new Date().toISOString()
        };
        this.data.posts.unshift(newPost);
        this.save();
    }

    likePost(postId) {
        const post = this.data.posts.find(p => p.id === postId);
        if (post) {
            post.likes++;
            this.save();
        }
    }

    addNotification(message, type = 'info') {
        this.data.notifications.unshift({
            id: Date.now(),
            message,
            type,
            timestamp: new Date().toISOString(),
            read: false
        });
        this.save();
    }
}

// Initialize app state
const appState = new AppState();

// DOM Utility Functions
// SECURITY: Use textContent instead of innerHTML to prevent XSS
function createElement(tag, className = '', textContent = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (textContent) element.textContent = textContent;
    return element;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Advanced Form Validation
class FormValidator {
    static validateEmail(email) {
        const re = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
        return re.test(email);
    }

    static validateRequired(value) {
        return value && value.trim().length > 0;
    }

    static validateMinLength(value, minLength) {
        return value && value.length >= minLength;
    }
}

// Modal System
class Modal {
    constructor(id, title, content) {
        this.id = id;
        this.title = title;
        this.content = content;
        this.create();
    }

    create() {
        const modalHTML = \`
            <div id="\${this.id}" class="modal-overlay" style="display: none;">
                <div class="modal-container">
                    <div class="modal-header">
                        <h3>\${this.title}</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        \${this.content}
                    </div>
                </div>
            </div>
        \`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.attachEvents();
    }

    attachEvents() {
        const modal = document.getElementById(this.id);
        const closeBtn = modal.querySelector('.modal-close');
        const overlay = modal.querySelector('.modal-overlay');

        closeBtn.addEventListener('click', () => this.hide());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.hide();
        });
    }

    show() {
        document.getElementById(this.id).style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    hide() {
        document.getElementById(this.id).style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - ${projectName} initializing...');
    
    // Add CSS for modals
    const modalCSS = \`
        <style>
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            animation: fadeIn 0.3s ease-out;
        }
        .modal-container {
            background: white;
            border-radius: 12px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            animation: slideIn 0.3s ease-out;
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem;
            border-bottom: 1px solid #e5e7eb;
        }
        .modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #6b7280;
            transition: color 0.2s;
        }
        .modal-close:hover {
            color: #374151;
        }
        .modal-body {
            padding: 1.5rem;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideIn {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        </style>
    \`;
    document.head.insertAdjacentHTML('beforeend', modalCSS);

    // Enhanced button interactions
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('click', function(e) {
            console.log('Button clicked:', this.textContent.trim());
            
            // Add ripple effect
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.cssText = \`
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.6);
                transform: scale(0);
                animation: ripple-animation 0.6s linear;
                left: \${e.offsetX}px;
                top: \${e.offsetY}px;
                width: 20px;
                height: 20px;
                margin-left: -10px;
                margin-top: -10px;
            \`;
            
            this.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
            
            // Button-specific actions
            if (this.textContent.includes('Get Started') || this.textContent.includes('Join Now')) {
                showWelcomeModal();
            } else if (this.textContent.includes('Contact') || this.textContent.includes('Message')) {
                showContactModal();
            } else if (this.textContent.includes('Learn More')) {
                showInfoModal();
            }
        });
    });

    // Enhanced form handling
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());
            
            console.log('Form submitted:', data);
            
            // Validation
            let isValid = true;
            const errors = [];
            
            // Check required fields
            this.querySelectorAll('[required]').forEach(field => {
                if (!FormValidator.validateRequired(field.value)) {
                    isValid = false;
                    errors.push(\`\${field.name || field.id} is required\`);
                    field.style.borderColor = '#ef4444';
                } else {
                    field.style.borderColor = '#10b981';
                }
            });
            
            // Email validation
            const emailFields = this.querySelectorAll('input[type="email"]');
            emailFields.forEach(field => {
                if (field.value && !FormValidator.validateEmail(field.value)) {
                    isValid = false;
                    errors.push('Please enter a valid email address');
                    field.style.borderColor = '#ef4444';
                }
            });
            
            if (isValid) {
                showSuccessMessage('Form submitted successfully!');
                this.reset();
                
                // Add to app state if it's a post or comment
                if (data.title && data.content) {
                    appState.addPost(data.title, data.content);
                    appState.addNotification('New post created successfully!', 'success');
                }
            } else {
                showErrorMessage('Please fix the following errors: ' + errors.join(', '));
            }
        });
    });

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Search functionality
    const searchInput = document.querySelector('input[type="search"], .search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function(e) {
            const query = e.target.value.toLowerCase();
            performSearch(query);
        }, 300));
    }

    // Like button functionality
    document.addEventListener('click', function(e) {
        if (e.target.matches('.like-btn, .like-button')) {
            e.preventDefault();
            const postId = parseInt(e.target.dataset.postId);
            if (postId) {
                appState.likePost(postId);
                // SECURITY: Use textContent instead of innerHTML
                e.target.textContent = '❤️ ' + (parseInt(e.target.textContent.match(/\\d+/)?.[0] || 0) + 1);
                e.target.style.color = '#ef4444';
            }
        }
    });

    // Initialize tooltips
    initializeTooltips();
    
    // Initialize notification system
    initializeNotifications();
    
    // Load dynamic content
    loadDynamicContent();
    
    console.log('✅ ${projectName} fully initialized with advanced features!');
});

// Utility Functions
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

function showSuccessMessage(message) {
    showToast(message, 'success');
}

function showErrorMessage(message) {
    showToast(message, 'error');
}

function showToast(message, type = 'info') {
    const toast = createElement('div', \`toast toast-\${type}\`, \`
        <span>\${message}</span>
        <button class="toast-close">&times;</button>
    \`);
    
    toast.style.cssText = \`
        position: fixed;
        top: 20px;
        right: 20px;
        background: \${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#4588f5'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 1001;
        animation: slideInFromRight 0.3s ease-out;
        display: flex;
        align-items: center;
        gap: 1rem;
        max-width: 300px;
    \`;
    
    document.body.appendChild(toast);
    
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
    });
    
    setTimeout(() => toast.remove(), 5000);
}

function performSearch(query) {
    console.log('Searching for:', query);
    // Implement search logic here
    const searchResults = appState.data.posts.filter(post => 
        post.title.toLowerCase().includes(query) || 
        post.content.toLowerCase().includes(query)
    );
    console.log('Search results:', searchResults.length);
}

function showWelcomeModal() {
    const modal = new Modal('welcome-modal', 'Welcome to ${projectName}!', \`
        <p>Welcome! This is a modern, interactive web application built with the latest technologies.</p>
        <p>Features include:</p>
        <ul>
            <li>✅ Responsive design</li>
            <li>✅ Interactive components</li>
            <li>✅ Local data storage</li>
            <li>✅ Modern UI/UX</li>
        </ul>
        <button class="btn btn-primary mt-3" onclick="document.getElementById('welcome-modal').style.display='none'">Get Started</button>
    \`);
    modal.show();
}

function showContactModal() {
    const modal = new Modal('contact-modal', 'Contact Us', \`
        <form id="contact-form">
            <div class="form-group">
                <label class="form-label">Name</label>
                <input type="text" name="name" class="form-control" required>
            </div>
            <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" name="email" class="form-control" required>
            </div>
            <div class="form-group">
                <label class="form-label">Message</label>
                <textarea name="message" class="form-control" rows="4" required></textarea>
            </div>
            <button type="submit" class="btn btn-primary">Send Message</button>
        </form>
    \`);
    modal.show();
}

function showInfoModal() {
    const modal = new Modal('info-modal', 'About This Application', \`
        <p>This is a demonstration of a modern, comprehensive web application built with:</p>
        <div class="card-grid">
            <div class="card">
                <h4>Frontend</h4>
                <p>HTML5, CSS3, JavaScript ES6+</p>
            </div>
            <div class="card">
                <h4>Features</h4>
                <p>Interactive UI, Local Storage, Responsive Design</p>
            </div>
        </div>
        <button class="btn btn-secondary mt-3" onclick="document.getElementById('info-modal').style.display='none'">Close</button>
    \`);
    modal.show();
}

function initializeTooltips() {
    document.querySelectorAll('[data-tooltip]').forEach(element => {
        element.addEventListener('mouseenter', function() {
            const tooltip = createElement('div', 'tooltip', this.dataset.tooltip);
            tooltip.style.cssText = \`
                position: absolute;
                background: #1f2937;
                color: white;
                padding: 0.5rem;
                border-radius: 4px;
                font-size: 0.875rem;
                pointer-events: none;
                z-index: 1000;
            \`;
            document.body.appendChild(tooltip);
            
            const rect = this.getBoundingClientRect();
            tooltip.style.top = (rect.top - tooltip.offsetHeight - 8) + 'px';
            tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
        });
        
        element.addEventListener('mouseleave', function() {
            document.querySelectorAll('.tooltip').forEach(tooltip => tooltip.remove());
        });
    });
}

function initializeNotifications() {
    appState.subscribe((data) => {
        const unreadCount = data.notifications.filter(n => !n.read).length;
        const notificationBadge = document.querySelector('.notification-badge');
        if (notificationBadge) {
            notificationBadge.textContent = unreadCount;
            notificationBadge.style.display = unreadCount > 0 ? 'block' : 'none';
        }
    });
}

function loadDynamicContent() {
    // Simulate loading dynamic content
    setTimeout(() => {
        const dynamicSections = document.querySelectorAll('.dynamic-content');
        dynamicSections.forEach(section => {
            // SECURITY: Create elements safely without innerHTML
            const p = document.createElement('p');
            p.textContent = '✅ Dynamic content loaded successfully!';
            section.innerHTML = ''; // Clear existing content
            section.appendChild(p);
        });
    }, 1000);
}

// Add ripple animation CSS
const rippleCSS = \`
    <style>
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .btn {
        position: relative;
        overflow: hidden;
    }
    
    @keyframes slideInFromRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    </style>
\`;
document.head.insertAdjacentHTML('beforeend', rippleCSS);`;
  }
  
  private static generateFallbackSchema(prompt: string): string {
    return `// Auto-generated schema for: ${prompt}
export interface AppData {
  id: string;
  title: string;
  description?: string;
  createdAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
}`;
  }
  
  private static async generateFallbackComponents(prompt: string, template: AppTemplate): Promise<GeneratedFile> {
    return {
      'src/components/App.tsx': await this.generateBasicApp(prompt, template),
      'src/components/Header.tsx': this.generateBasicHeader(template),
      'src/components/Footer.tsx': this.generateBasicFooter(template)
    };
  }
  
  // Implementation of specific generators would continue...
  // (Truncated for brevity - full implementation would include all generator methods)
  
  private static async generateBasicApp(prompt: string, template: AppTemplate): Promise<string> {
    if (template.stack.includes('Tailwind CSS')) {
      return `import React from 'react';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h1 className="text-3xl font-bold text-gray-900">
            ${this.extractProjectName(prompt)}
          </h1>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 px-4">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome</h2>
          <p className="text-gray-600">
            This app was generated based on: "${prompt}"
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;`;
    }
    
    // Material-UI version would go here
    return `import React from 'react';

function App() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header style={{ backgroundColor: 'white', padding: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h1>${this.extractProjectName(prompt)}</h1>
      </header>
      
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h2>Welcome</h2>
          <p>This app was generated based on: "${prompt}"</p>
        </div>
      </main>
    </div>
  );
}

export default App;`;
  }
  
  private static generateEntryPoint(template: AppTemplate): string {
    return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;
  }
  
  private static generateBasicStyles(template: AppTemplate): string {
    return `/* Modern CSS Reset and Base Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --primary-color: #4588f5;
  --secondary-color: #1e40af;
  --accent-color: #06b6d4;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --border-color: #e5e7eb;
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  line-height: 1.6;
  color: var(--text-primary);
  background-color: var(--bg-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Layout */
header {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
  padding: 1rem 2rem;
  box-shadow: var(--shadow);
}

header h1 {
  font-size: 2rem;
  font-weight: 700;
}

main {
  min-height: calc(100vh - 140px);
  padding: 2rem;
}

footer {
  background-color: var(--bg-secondary);
  padding: 1rem 2rem;
  text-align: center;
  border-top: 1px solid var(--border-color);
  color: var(--text-secondary);
}

/* Hero Section */
.hero {
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
  padding: 4rem 0;
}

.hero h2 {
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero p {
  font-size: 1.25rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;
}

/* Buttons */
.cta-button {
  background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
  color: white;
  border: none;
  padding: 1rem 2rem;
  font-size: 1.125rem;
  font-weight: 600;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--shadow);
}

.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px -8px rgba(59, 130, 246, 0.5);
}

.cta-button:active {
  transform: translateY(0);
}

/* Responsive Design */
@media (max-width: 768px) {
  header, main, footer {
    padding-left: 1rem;
    padding-right: 1rem;
  }
  
  .hero h2 {
    font-size: 2rem;
  }
  
  .hero p {
    font-size: 1rem;
  }
}`;
  }
  
  private static generateHTML(prompt: string, template: AppTemplate): string {
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${this.extractProjectName(prompt)}</title>
    <link rel="stylesheet" href="styles.css">
  </head>
  <body>
    <header>
      <h1>${this.extractProjectName(prompt)}</h1>
    </header>
    
    <main>
      <section class="hero">
        <h2>Welcome to ${this.extractProjectName(prompt)}</h2>
        <p>A modern web application built with vanilla web technologies.</p>
        <button class="cta-button">Get Started</button>
      </section>
    </main>
    
    <footer>
      <p>&copy; 2024 ${this.extractProjectName(prompt)}. Built with modern web standards.</p>
    </footer>
    
    <script src="script.js"></script>
  </body>
</html>`;
  }
  
  private static generatePackageJson(prompt: string, template: AppTemplate): string {
    const dependencies: any = {};
    
    const devDependencies: any = {
      "vite": "^4.4.0"
    };
    
    // Only add dependencies for advanced templates that might need them
    if (template.complexity === 'advanced') {
      // Keep it minimal - maybe just a utility library
      dependencies["date-fns"] = "^2.30.0"; // For date handling if needed
    }
    
    return JSON.stringify({
      name: this.extractProjectName(prompt),
      private: true,
      version: "0.0.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "tsc && vite build",
        lint: "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
        preview: "vite preview"
      },
      dependencies,
      devDependencies
    }, null, 2);
  }
  
  private static generateViteConfig(template: AppTemplate): string {
    return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});`;
  }
  
  private static generateTailwindConfig(): string {
    return `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`;
  }
  
  private static generateTailwindStyles(prompt: string): string {
    return `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`;
  }
  
  private static generateMUITheme(prompt: string): string {
    return `import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

export default theme;`;
  }
  
  private static generateMUIStyles(): string {
    return `body {
  margin: 0;
  font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}`;
  }
  
  private static generateBasicHeader(template: AppTemplate): string {
    return `import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto py-6 px-4">
        <h1 className="text-3xl font-bold text-gray-900">
          My App
        </h1>
      </div>
    </header>
  );
};

export default Header;`;
  }
  
  private static generateBasicFooter(template: AppTemplate): string {
    return `import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-white mt-auto">
      <div className="max-w-7xl mx-auto py-4 px-4 text-center">
        <p>&copy; 2024 Generated by FikraHub. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;`;
  }
  
  private static async generateMainApp(prompt: string, template: AppTemplate, existingFiles: GeneratedFile): Promise<string> {
    // Try AI-generated sophisticated main app first
    const hasComponents = Object.keys(existingFiles).some(key => key.includes('components/'));
    
    if (hasComponents) {
      try {
        const mainAppPrompt = `Generate a sophisticated React App.tsx that integrates all the generated components. Based on: "${prompt}"

Template: ${template.name}
Available files: ${Object.keys(existingFiles).join(', ')}

Create a main App component that:
- Uses React Router for navigation (if multiple views)
- Integrates all the generated components naturally
- Includes proper state management and context providers
- Has a professional layout with header/sidebar navigation
- Implements the core application flow
- Uses modern React patterns (hooks, context, etc.)
- Includes error boundaries and loading states
- IMPORTANT: Use ONLY modern 2024+ package names (@tanstack/react-query NOT react-query)
- IMPORTANT: Always start with "import React from 'react';" for proper JSX

Return only the complete React component code, properly formatted with TypeScript.`;
        
        const response = await fetch('/api/openai/anthropic/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            messages: [{
              role: 'system',
              content: 'You are a React expert. Generate sophisticated, production-ready React applications using ONLY modern 2024+ package names: use "@tanstack/react-query" NOT "react-query", use "lucide-react" for icons. Always import React properly for JSX. Return only clean TSX code without explanations.'
            }, {
              role: 'user', 
              content: mainAppPrompt
            }, {
              role: 'user',
              content: prompt
            }],
            model: 'claude-3-5-sonnet-20241022',
            temperature: 0.5,
            max_tokens: 4000
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          const rawContent = data.choices?.[0]?.message?.content || '';
          
          if (rawContent && rawContent.length > 200) {
            // Extract React component code
            const generatedApp = this.extractCodeFromResponse(rawContent, 'typescript', 'tsx', 'jsx');
            
            if (generatedApp && generatedApp.length > 200) {
              console.log('✅ Generated sophisticated main App component');
              return generatedApp;
            }
          }
        }
      } catch (error) {
        console.error('❌ AI main app generation failed:', error);
        throw new Error(`Main app generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    throw new Error('No components available to generate main app - AI generation required');
  }
  
  private static async generateEnhancedApp(prompt: string, template: AppTemplate, existingFiles: GeneratedFile): Promise<string> {
    // Always use AI generation - no more fallback templates
    try {
      const enhancedAppPrompt = `Generate a sophisticated React App.tsx for: "${prompt}"

Template: ${template.name}
Stack: ${template.stack.join(', ')}
Available files: ${Object.keys(existingFiles).join(', ')}

Create a professional React application that:
- Uses modern React patterns (hooks, TypeScript, functional components)
- Has a sleek, professional UI with ${template.stack.includes('Tailwind CSS') ? 'Tailwind CSS' : 'modern CSS'}
- Includes proper component organization and state management
- Implements core functionality relevant to the prompt
- Has responsive design and professional styling
- Uses real data structures and meaningful interactions
- IMPORTANT: Use ONLY modern 2024+ package names (@tanstack/react-query NOT react-query)
- IMPORTANT: Always start with "import React from 'react';" for proper JSX

Return ONLY the complete React component code without explanations.`;
      
      const response = await fetch('/api/openai/anthropic/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          messages: [{
            role: 'system',
            content: 'You are a React expert. Generate sophisticated, production-ready React applications using ONLY modern 2024+ package names: use "@tanstack/react-query" NOT "react-query", use "lucide-react" for icons, use "@radix-ui/*" for UI primitives. Always import React properly for JSX. Return only clean TSX code without explanations.'
          }, {
            role: 'user',
            content: enhancedAppPrompt
          }],
          model: 'claude-3-5-sonnet-20241022',
          temperature: 0.7,
          max_tokens: 4000
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content || '';
        
        if (rawContent && rawContent.length > 200) {
          // Extract React component code
          const generatedApp = this.extractCodeFromResponse(rawContent, 'typescript', 'tsx', 'jsx');
          
          if (generatedApp && generatedApp.length > 200) {
            console.log('✅ Generated enhanced AI application');
            return generatedApp;
          }
        }
      }
      
      throw new Error('AI enhanced app generation failed');
      
    } catch (error) {
      console.error('❌ Enhanced app generation failed:', error);
      throw new Error(`Enhanced app generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private static async legacyGenerateEnhancedApp(prompt: string, template: AppTemplate, existingFiles: GeneratedFile): Promise<string> {
    // Legacy fallback - should not be used
    const projectName = this.extractProjectName(prompt);
    
    return `import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';

function App() {
  const [activeView, setActiveView] = useState('home');
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Simulate app initialization
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ${projectName}...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Navigation Header */}
        <nav className="bg-white shadow-lg border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">${projectName}</h1>
              </div>
              <div className="flex space-x-4">
                <NavLink to="home" active={activeView === 'home'} onClick={() => setActiveView('home')}>Home</NavLink>
                <NavLink to="features" active={activeView === 'features'} onClick={() => setActiveView('features')}>Features</NavLink>
                <NavLink to="about" active={activeView === 'about'} onClick={() => setActiveView('about')}>About</NavLink>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<HomeView prompt="${prompt}" />} />
            <Route path="/features" element={<FeaturesView />} />
            <Route path="/about" element={<AboutView />} />
          </Routes>
        </main>
        
        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-12">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <p className="text-center text-gray-600">© 2024 ${projectName}. Built with React & Tailwind CSS.</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

function NavLink({ to, children, active, onClick }) {
  return (
    <Link 
      to={\`/\${to}\`}
      onClick={onClick}
      className={\`px-3 py-2 rounded-md text-sm font-medium transition-colors \${
        active 
          ? 'bg-indigo-600 text-white' 
          : 'text-gray-700 hover:bg-indigo-100 hover:text-indigo-700'
      }\`}
    >
      {children}
    </Link>
  );
}

function HomeView({ prompt }) {
  const [showDetails, setShowDetails] = useState(false);
  
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Welcome to ${projectName}</h2>
        <p className="text-xl text-gray-600 mb-6">
          {prompt}
        </p>
        <div className="flex justify-center space-x-4">
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {showDetails ? 'Hide Details' : 'Learn More'}
          </button>
          <button className="border border-indigo-600 text-indigo-600 px-6 py-3 rounded-lg hover:bg-indigo-50 transition-colors">
            Get Started
          </button>
        </div>
      </div>

      {/* Details Section */}
      {showDetails && (
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Application Features</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <FeatureCard 
              title="Modern Design" 
              description="Built with Tailwind CSS for a beautiful, responsive interface"
              icon="🎨"
            />
            <FeatureCard 
              title="React Components" 
              description="Modular, reusable components following best practices"
              icon="⚛️"
            />
            <FeatureCard 
              title="Interactive UI" 
              description="Engaging user experience with smooth animations"
              icon="✨"
            />
            <FeatureCard 
              title="Production Ready" 
              description="Built with TypeScript and modern development tools"
              icon="🚀"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function FeaturesView() {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Key Features</h2>
      <div className="space-y-6">
        <div className="border-l-4 border-indigo-600 pl-4">
          <h3 className="text-xl font-semibold text-gray-900">Advanced Functionality</h3>
          <p className="text-gray-600 mt-2">Comprehensive features designed for real-world usage with modern patterns.</p>
        </div>
        <div className="border-l-4 border-green-600 pl-4">
          <h3 className="text-xl font-semibold text-gray-900">Responsive Design</h3>
          <p className="text-gray-600 mt-2">Optimized for all devices with mobile-first approach and accessibility.</p>
        </div>
        <div className="border-l-4 border-purple-600 pl-4">
          <h3 className="text-xl font-semibold text-gray-900">Performance Optimized</h3>
          <p className="text-gray-600 mt-2">Built with React best practices and performance optimization techniques.</p>
        </div>
      </div>
    </div>
  );
}

function AboutView() {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">About This Application</h2>
      <div className="prose max-w-none">
        <p className="text-gray-600 text-lg leading-relaxed">
          This application was generated using advanced AI capabilities, combining modern React development 
          practices with sophisticated design patterns. It demonstrates how AI can create comprehensive, 
          production-ready applications with proper architecture and user experience.
        </p>
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-indigo-600">React 18</div>
            <div className="text-sm text-gray-600">Framework</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">TypeScript</div>
            <div className="text-sm text-gray-600">Language</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">Tailwind</div>
            <div className="text-sm text-gray-600">Styling</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">Vite</div>
            <div className="text-sm text-gray-600">Build Tool</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ title, description, icon }) {
  return (
    <div className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow">
      <div className="text-3xl mb-3">{icon}</div>
      <h4 className="text-lg font-semibold text-gray-900 mb-2">{title}</h4>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

export default App;`;
  }

  /**
   * Extract actual code from AI responses that may contain explanatory text and markdown
   */
  private static extractCodeFromResponse(response: string, ...languages: string[]): string {
    // First, try to find markdown code blocks with specified languages
    for (const lang of languages) {
      const regex = new RegExp(`\`\`\`${lang}[\\s\\S]*?\n([\\s\\S]*?)\`\`\``, 'gi');
      const match = regex.exec(response);
      if (match && match[1]) {
        const code = match[1].trim();
        if (code.length > 50) {
          console.log(`📄 Extracted ${lang} code from markdown block`);
          return code;
        }
      }
    }
    
    // Try generic code blocks
    const genericCodeRegex = /```[a-z]*\n([\s\S]*?)```/gi;
    let match;
    while ((match = genericCodeRegex.exec(response)) !== null) {
      const code = match[1].trim();
      // Check if it looks like code (has common programming patterns)
      if (code.length > 50 && (
        code.includes('interface ') || 
        code.includes('function ') || 
        code.includes('const ') || 
        code.includes('import ') ||
        code.includes('export ') ||
        code.includes('return (') ||
        code.includes('<div') ||
        code.includes('useState') ||
        code.includes('useEffect')
      )) {
        console.log('📄 Extracted code from generic code block');
        return code;
      }
    }
    
    // If no code blocks found, look for lines that start with code patterns
    const lines = response.split('\n');
    const codeLines: string[] = [];
    let inCodeSection = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip explanatory text
      if (trimmedLine.startsWith('Here\'s') || 
          trimmedLine.startsWith('I\'ll create') || 
          trimmedLine.startsWith('This') ||
          trimmedLine.includes('implementation') ||
          trimmedLine.includes('definitions')) {
        continue;
      }
      
      // Start collecting if we see code patterns
      if (trimmedLine.startsWith('interface ') || 
          trimmedLine.startsWith('type ') ||
          trimmedLine.startsWith('import ') ||
          trimmedLine.startsWith('export ') ||
          trimmedLine.startsWith('function ') ||
          trimmedLine.startsWith('const ') ||
          trimmedLine.includes('<div') ||
          trimmedLine.includes('useState') ||
          trimmedLine.includes('React.')) {
        inCodeSection = true;
      }
      
      if (inCodeSection && (trimmedLine.length > 0 || codeLines.length > 0)) {
        codeLines.push(line);
      }
      
      // Stop if we hit explanatory text again
      if (inCodeSection && (
          trimmedLine.startsWith('These ') || 
          trimmedLine.startsWith('You can ') ||
          trimmedLine.startsWith('Remember to ')
      )) {
        break;
      }
    }
    
    const extractedCode = codeLines.join('\n').trim();
    if (extractedCode.length > 50) {
      console.log('📄 Extracted code from line-by-line analysis');
      return extractedCode;
    }
    
    // Last resort: return the response as-is (might need manual cleanup)
    console.warn('⚠️ Could not extract clean code, returning raw response');
    return response;
  }

  private static validateCode(files: GeneratedFile): string[] {
    const issues: string[] = [];
    
    // Basic validation checks
    if (!files['src/App.tsx'] && !files['src/App.jsx']) {
      issues.push('Missing main App component');
    }
    
    if (!files['src/main.tsx'] && !files['src/main.jsx']) {
      issues.push('Missing entry point file');
    }
    
    if (!files['package.json']) {
      issues.push('Missing package.json');
    }
    
    if (!files['index.html']) {
      issues.push('Missing HTML template');
    }
    
    return issues;
  }
  
  private static async validateGeneration(files: GeneratedFile, template: AppTemplate): Promise<boolean> {
    const issues = this.validateCode(files);
    console.log(`✅ Validation complete: ${issues.length} issues found`);
    return issues.length === 0;
  }

  /**
   * Create comprehensive prompt for static web application generation
   */
  private static createComprehensiveStaticAppPrompt(prompt: string, template: AppTemplate): string {
    const projectName = this.extractProjectName(prompt);
    
    return `🚀 Create a COMPREHENSIVE, MODERN STATIC WEB APPLICATION for: "${prompt}"

**CRITICAL REQUIREMENTS:**
✅ Make this a REAL, WORKING application - not a generic template
✅ Generate content and features that are 100% relevant to "${prompt}"
✅ Include modern UI/UX with professional design
✅ Add interactive features and smooth animations
✅ Use modern HTML5, CSS3, and ES6+ JavaScript
✅ Include responsive design for all devices
✅ Add real sample data and meaningful content

**WHAT TO BUILD:**
Based on "${prompt}", create a professional web application with:

1. **Modern HTML5 Structure:**
   - Semantic markup with proper accessibility
   - Multiple sections with relevant content
   - Professional navigation and layout
   - Forms, modals, and interactive elements

2. **Advanced CSS3 Styling:**
   - Modern design trends (glassmorphism, gradients, animations)
   - Responsive grid/flexbox layouts
   - Smooth transitions and hover effects
   - Professional color scheme and typography
   - Mobile-first responsive design

3. **Interactive JavaScript Features:**
   - Dynamic content loading and filtering
   - Form validation and submission
   - Modal dialogs and interactive components
   - Smooth scrolling and animations
   - Local storage for data persistence
   - Real functionality relevant to the application purpose

**SPECIFIC REQUIREMENTS FOR "${prompt}":**
${this.getSpecificRequirements(prompt)}

**TECHNICAL STANDARDS:**
- Use semantic HTML5 elements
- Modern CSS Grid and Flexbox layouts
- ES6+ JavaScript with modules and async/await
- Responsive design for mobile, tablet, desktop
- Optimized performance and fast loading
- Accessibility best practices
- SEO-friendly markup

**OUTPUT FORMAT:**
Generate THREE separate code blocks:

\`\`\`html
<!-- index.html -->
[Complete HTML with semantic structure, navigation, content sections, forms, etc.]
\`\`\`

\`\`\`css
/* styles.css */
[Modern CSS with responsive design, animations, professional styling]
\`\`\`

\`\`\`javascript
// script.js
[Interactive JavaScript with real functionality, event handlers, data management]
\`\`\`

**Make this application impressive, professional, and fully functional - something users would actually want to use!**`;
  }

  /**
   * Get specific requirements based on the prompt
   */
  private static getSpecificRequirements(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('social') && lowerPrompt.includes('network')) {
      return `Create a social networking platform with:
- User profiles and avatars
- News feed with posts and interactions
- Friend connections and messaging
- Groups and communities
- Photo sharing and galleries
- Real-time notifications`;
    }
    
    if (lowerPrompt.includes('ecommerce') || lowerPrompt.includes('shop') || lowerPrompt.includes('store')) {
      return `Create an e-commerce platform with:
- Product catalog with categories
- Shopping cart and checkout
- User accounts and order history
- Product search and filtering
- Reviews and ratings
- Payment integration mockup`;
    }
    
    if (lowerPrompt.includes('blog') || lowerPrompt.includes('news')) {
      return `Create a blogging/news platform with:
- Article listings with categories
- Full article pages with comments
- Author profiles and bios
- Search and filtering
- Newsletter subscription
- Social sharing features`;
    }
    
    if (lowerPrompt.includes('dashboard') || lowerPrompt.includes('admin')) {
      return `Create an admin dashboard with:
- Analytics charts and metrics
- Data tables with sorting/filtering
- User management interfaces
- Settings and configuration panels
- Real-time status indicators
- Export and reporting features`;
    }
    
    if (lowerPrompt.includes('portfolio') || lowerPrompt.includes('personal')) {
      return `Create a portfolio website with:
- Professional about section
- Project showcase with galleries
- Skills and experience timeline
- Contact form and social links
- Blog or articles section
- Resume/CV download`;
    }
    
    if (lowerPrompt.includes('restaurant') || lowerPrompt.includes('food')) {
      return `Create a restaurant website with:
- Menu with categories and prices
- Online reservation system
- Gallery of food and ambiance
- Chef and restaurant story
- Location and contact info
- Customer reviews`;
    }
    
    if (lowerPrompt.includes('gym') || lowerPrompt.includes('fitness')) {
      return `Create a fitness platform with:
- Workout plans and exercises
- Progress tracking and goals
- Class schedules and booking
- Trainer profiles and programs
- Nutrition guides and recipes
- Member community features`;
    }
    
    if (lowerPrompt.includes('education') || lowerPrompt.includes('learning')) {
      return `Create an educational platform with:
- Course catalog and enrollment
- Video lessons and materials
- Progress tracking and certificates
- Student and instructor profiles
- Discussion forums and Q&A
- Assignment submission system`;
    }
    
    // Default for any other prompt
    return `Create a comprehensive application that includes:
- Multiple content sections relevant to "${prompt}"
- Interactive features for user engagement
- Professional forms and user interfaces
- Data visualization or galleries
- User-friendly navigation and search
- Contact/communication features`;
  }

  /**
   * Generate relevant HTML content based on app type
   */
  private static generateRelevantHTMLContent(projectName: string, appType: string, prompt: string): string {
    const baseHTML = this.generateHTML(prompt, { name: 'Modern Web App', stack: ['HTML5', 'CSS3', 'JavaScript'] } as any);
    
    // Customize the HTML based on app type
    if (appType === 'social network') {
      return baseHTML.replace(
        '<h1>Welcome to basic-web-app</h1>',
        `<h1>Welcome to ${projectName}</h1>`
      ).replace(
        'A modern web application built with vanilla web technologies.',
        'Connect, share, and engage with students from around the world. Build meaningful connections and share your academic journey.'
      );
    } else if (appType === 'ecommerce') {
      return baseHTML.replace(
        '<h1>Welcome to basic-web-app</h1>',
        `<h1>Welcome to ${projectName}</h1>`
      ).replace(
        'A modern web application built with vanilla web technologies.',
        'Discover amazing products and enjoy a seamless shopping experience with fast delivery and secure checkout.'
      );
    } else if (appType === 'blog') {
      return baseHTML.replace(
        '<h1>Welcome to basic-web-app</h1>',
        `<h1>Welcome to ${projectName}</h1>`
      ).replace(
        'A modern web application built with vanilla web technologies.',
        'Explore insightful articles, share your thoughts, and join meaningful discussions with our community.'
      );
    } else if (appType === 'portfolio') {
      return baseHTML.replace(
        '<h1>Welcome to basic-web-app</h1>',
        `<h1>Welcome to ${projectName}</h1>`
      ).replace(
        'A modern web application built with vanilla web technologies.',
        'Showcasing creative work, professional experience, and personal projects with elegant design and smooth interactions.'
      );
    } else if (appType === 'dashboard') {
      return baseHTML.replace(
        '<h1>Welcome to basic-web-app</h1>',
        `<h1>Welcome to ${projectName}</h1>`
      ).replace(
        'A modern web application built with vanilla web technologies.',
        'Powerful analytics and management dashboard with real-time data visualization and comprehensive controls.'
      );
    }
    
    // Default modern website
    return baseHTML.replace(
      '<h1>Welcome to basic-web-app</h1>',
      `<h1>Welcome to ${projectName}</h1>`
    ).replace(
      'A modern web application built with vanilla web technologies.',
      `${prompt} - A modern, feature-rich web application built with cutting-edge technologies and professional design.`
    );
  }
}