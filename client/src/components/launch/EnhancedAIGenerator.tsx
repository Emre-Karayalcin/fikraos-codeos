import { useState } from 'react';

interface GenerationConfig {
  fileCount: number;
  framework: 'react' | 'nextjs';
  style: 'material-ui' | 'tailwind';
}

interface GenerationResult {
  success: boolean;
  files: Record<string, string>;
  error?: string;
  explanation?: string;
}

export class EnhancedAIGenerator {
  private static readonly SYSTEM_PROMPT = `You are a senior full-stack developer with 10+ years of experience creating enterprise-grade applications. Generate sophisticated, production-ready applications that exceed industry standards.

ULTRA-HIGH QUALITY REQUIREMENTS:
1. ARCHITECTURE: Design scalable, maintainable applications with clean separation of concerns
2. CODE QUALITY: Write beautiful, self-documenting code with TypeScript best practices
3. UI/UX: Create stunning, modern interfaces with premium design patterns and smooth animations
4. FUNCTIONALITY: Build comprehensive features with real data handling, not demo content
5. PERFORMANCE: Optimize for speed with lazy loading, memoization, and efficient state management
6. ACCESSIBILITY: Ensure WCAG compliance with proper ARIA labels and keyboard navigation
7. RESPONSIVE: Mobile-first design that works flawlessly across all devices
8. MODERN STACK: Use latest React patterns, custom hooks, and contemporary libraries
9. ERROR HANDLING: Implement robust error boundaries and graceful fallbacks
10. TESTING: Structure code to be easily testable with proper component organization

Generate applications that demonstrate mastery of modern web development. Every component should showcase professional-grade craftsmanship.`;

  static async generateEnhancedApplication(
    prompt: string,
    config: GenerationConfig,
    existingFiles: Record<string, string> = {},
    onProgress?: (update: string) => void,
    onFileUpdate?: (filePath: string, content: string) => void
  ): Promise<GenerationResult> {
    try {
      onProgress?.('🧠 Analyzing requirements and planning application structure...');
      
      // First, generate the development plan with enhanced context
      const plan = await this.generateEnhancedPlan(prompt, config, existingFiles);
      if (!plan) {
        throw new Error('Failed to generate development plan');
      }

      onProgress?.('📋 Development plan created, starting file generation...');

      // Generate files with full application context
      const files = await this.generateFilesWithContext(
        prompt, 
        plan, 
        config, 
        existingFiles,
        onProgress,
        onFileUpdate
      );

      return {
        success: true,
        files,
        explanation: 'Enhanced application generated successfully with complete functionality and modern patterns.'
      };

    } catch (error) {
      console.error('Enhanced generation error:', error);
      return {
        success: false,
        files: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private static async generateEnhancedPlan(
    prompt: string,
    config: GenerationConfig,
    existingFiles: Record<string, string>
  ): Promise<any> {
    const existingContext = Object.keys(existingFiles).length > 0 
      ? `\n\nExisting files context:\n${JSON.stringify(existingFiles, null, 2)}`
      : '';

    const planningPrompt = `${this.SYSTEM_PROMPT}

Create a comprehensive development plan for: "${prompt}"

${existingContext}

Configuration:
- Framework: ${config.framework}
- Styling: ${config.style}
- Max files: ${config.fileCount}

IMPORTANT: Generate a COMPLETE project with ALL necessary files for deployment including:
- React components (src/App.jsx, etc.)
- Build configuration (package.json, vite.config.js)  
- HTML entry point (index.html)
- Styling setup (src/index.css, tailwind.config.js if using Tailwind)
- All supporting files for a production-ready application

Generate a JSON plan with this structure:
{
  "projectName": "Brief descriptive name",
  "description": "What this application does and its key features",
  "architecture": {
    "framework": "${config.framework}",
    "styling": "${config.style}",
    "patterns": ["list of key patterns to use"]
  },
  "files": [
    {
      "path": "src/App.jsx",
      "purpose": "Main application component with routing and layout",
      "priority": 1,
      "dependencies": []
    },
    {
      "path": "src/main.jsx", 
      "purpose": "Application entry point",
      "priority": 2,
      "dependencies": ["src/App.jsx", "src/index.css"]
    },
    {
      "path": "src/index.css",
      "purpose": "Global styles and CSS imports",
      "priority": 3,
      "dependencies": []
    },
    {
      "path": "package.json",
      "purpose": "Project dependencies and build configuration",
      "priority": 4,
      "dependencies": []
    },
    {
      "path": "vite.config.js",
      "purpose": "Vite build configuration",
      "priority": 5,
      "dependencies": []
    },
    {
      "path": "index.html",
      "purpose": "HTML entry point",
      "priority": 6,
      "dependencies": []
    },
    {
      "path": "tailwind.config.js",
      "purpose": "Tailwind CSS configuration (if using Tailwind)",
      "priority": 7,
      "dependencies": []
    },
    {
      "path": "postcss.config.js", 
      "purpose": "PostCSS configuration (if using Tailwind)",
      "priority": 8,
      "dependencies": []
    }
  ],
  "features": ["list of key features to implement"],
  "dataFlow": "How data flows through the application"
}

Return ONLY valid JSON, no explanations.`;

    const response = await fetch('/api/anthropic/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        messages: [{ role: 'user', content: planningPrompt }]
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate plan');
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No plan content received');
    }

    try {
      return JSON.parse(content);
    } catch {
      // If JSON parsing fails, extract JSON from the content
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Invalid plan format received');
    }
  }

  private static async generateFilesWithContext(
    originalPrompt: string,
    plan: any,
    config: GenerationConfig,
    existingFiles: Record<string, string>,
    onProgress?: (update: string) => void,
    onFileUpdate?: (filePath: string, content: string) => void
  ): Promise<Record<string, string>> {
    const files: Record<string, string> = { ...existingFiles };
    let filesToGenerate = plan.files || [];

    // Ensure we always have essential files for a complete project
    const essentialFiles = [
      { path: 'package.json', purpose: 'Project dependencies and build scripts', priority: 1 },
      { path: 'vite.config.js', purpose: 'Vite build configuration', priority: 2 },
      { path: 'index.html', purpose: 'HTML entry point', priority: 3 },
      { path: 'src/index.css', purpose: 'Global styles', priority: 4 },
      { path: 'src/main.jsx', purpose: 'React application entry point', priority: 5 },
      { path: 'src/App.jsx', purpose: 'Main React component', priority: 6 }
    ];

    // Add Tailwind files if using Tailwind
    if (config.style === 'tailwind') {
      essentialFiles.push(
        { path: 'tailwind.config.js', purpose: 'Tailwind CSS configuration', priority: 7 },
        { path: 'postcss.config.js', purpose: 'PostCSS configuration', priority: 8 }
      );
    }

    // Always add vercel.json for proper deployment
    essentialFiles.push(
      { path: 'vercel.json', purpose: 'Vercel deployment configuration', priority: 9 }
    );

    // Merge with planned files, ensuring all essentials are included
    const allFiles = [...essentialFiles];
    for (const planFile of filesToGenerate) {
      if (!essentialFiles.find(f => f.path === planFile.path)) {
        allFiles.push(planFile);
      }
    }

    filesToGenerate = allFiles;

    // Sort files by priority for proper generation order
    filesToGenerate.sort((a: any, b: any) => (a.priority || 999) - (b.priority || 999));

    onProgress?.(`📋 Generating ${filesToGenerate.length} files for complete project...`);

    for (const fileInfo of filesToGenerate) {
      const filePath = fileInfo.path;
      onProgress?.(`🔧 Generating ${filePath}...`);

      try {
        const fileContent = await this.generateFileWithFullContext(
          originalPrompt,
          filePath,
          fileInfo,
          plan,
          files,
          config
        );

        files[filePath] = fileContent;
        onFileUpdate?.(filePath, fileContent);
        onProgress?.(`✅ Generated ${filePath}`);

        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`Error generating ${filePath}:`, error);
        onProgress?.(`⚠️ Error generating ${filePath}, using fallback...`);
        
        // Generate fallback content for essential files
        const fallbackContent = this.generateFallbackContent(filePath, fileInfo, config);
        if (fallbackContent && fallbackContent.trim()) {
          files[filePath] = fallbackContent;
          onFileUpdate?.(filePath, files[filePath]);
          onProgress?.(`✅ Generated ${filePath} (fallback)`);
        } else {
          onProgress?.(`❌ Could not generate ${filePath}`);
        }
      }
    }

    return files;
  }

  private static async generateFileWithFullContext(
    originalPrompt: string,
    filePath: string,
    fileInfo: any,
    plan: any,
    existingFiles: Record<string, string>,
    config: GenerationConfig
  ): Promise<string> {
    // For certain config files, use fallback directly to avoid API delays
    if (filePath === 'vercel.json') {
      console.log('📁 Using fallback for vercel.json to avoid hang');
      return this.generateVercelConfig();
    }
    
    if (filePath === 'package.json') {
      console.log('📁 Using fallback for package.json to avoid hang');
      return this.generatePackageJson(config);
    }
    
    if (filePath === 'vite.config.js') {
      console.log('📁 Using fallback for vite.config.js to avoid hang');
      return this.generateViteConfig();
    }

    const contextualPrompt = this.buildContextualPrompt(
      originalPrompt,
      filePath,
      fileInfo,
      plan,
      existingFiles,
      config
    );

    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const response = await fetch('/api/anthropic/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({
          messages: [{ role: 'user', content: contextualPrompt }]
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to generate ${filePath}: ${response.status}`);
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error(`No content received for ${filePath}`);
      }

      // Extract code from markdown if present
      const codeMatch = content.match(/```(?:jsx?|tsx?|css|html)?\n([\s\S]*?)\n```/);
      return codeMatch ? codeMatch[1].trim() : content.trim();
      
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Generation timeout for ${filePath}`);
      }
      throw error;
    }
  }

  private static buildContextualPrompt(
    originalPrompt: string,
    filePath: string,
    fileInfo: any,
    plan: any,
    existingFiles: Record<string, string>,
    config: GenerationConfig
  ): string {
    const fileType = this.getFileType(filePath);
    const existingContext = Object.keys(existingFiles).length > 0
      ? `\n\nExisting files in project:\n${Object.entries(existingFiles)
          .map(([path, content]) => `=== ${path} ===\n${content.substring(0, 1000)}${content.length > 1000 ? '...' : ''}`)
          .join('\n\n')}`
      : '';

    return `${this.SYSTEM_PROMPT}

Generate ONLY the code for: ${filePath}

Original request: "${originalPrompt}"

File purpose: ${fileInfo.purpose}
File type: ${fileType}
Framework: ${config.framework}
Styling: ${config.style}

Project architecture:
${JSON.stringify(plan.architecture, null, 2)}

Key features to implement:
${plan.features?.join(', ') || 'Core functionality'}

${existingContext}

REQUIREMENTS for ${filePath}:
${this.getFileRequirements(filePath, fileInfo, config)}

Return ONLY the code, no explanations, no markdown formatting.`;
  }

  private static getFileType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jsx':
      case 'tsx': return 'React component';
      case 'js':
      case 'ts': return 'JavaScript module';
      case 'css': return 'CSS stylesheet';
      case 'html': return 'HTML document';
      default: return 'file';
    }
  }

  private static getFileRequirements(filePath: string, fileInfo: any, config: GenerationConfig): string {
    if (filePath.includes('App.jsx') || filePath.includes('App.tsx')) {
      return `- Main application component with routing and layout
- Use ${config.style === 'material-ui' ? 'Material UI components (@mui/material)' : 'Tailwind CSS for styling'}
- Include proper navigation and page structure
- Implement real functionality, not placeholders
- Use modern React patterns with hooks
- Make it responsive and accessible`;
    }

    if (filePath.includes('main.jsx') || filePath.includes('main.tsx')) {
      return `- React 18 application entry point
- Use ReactDOM.createRoot for rendering
- Import App component and global styles
- Include React.StrictMode wrapper`;
    }

    if (filePath.includes('.css')) {
      return `- Global styles and design system
- ${config.style === 'material-ui' ? 'Material UI compatible styles' : 'Tailwind CSS imports and custom styles'}
- Professional styling with consistent design
- Responsive design utilities`;
    }

    return `- Implement ${fileInfo.purpose}
- Follow modern React patterns
- Use ${config.style === 'material-ui' ? 'Material UI components' : 'Tailwind CSS'}
- Include proper functionality and interactivity`;
  }

  private static generateFallbackContent(filePath: string, fileInfo: any, config: GenerationConfig): string {
    if (filePath.includes('App.jsx')) {
      return config.style === 'material-ui' 
        ? this.getMaterialUIAppFallback()
        : this.getTailwindAppFallback();
    }

    if (filePath.includes('main.jsx')) {
      return `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`;
    }

    if (filePath.includes('.css')) {
      return config.style === 'material-ui'
        ? `body { margin: 0; font-family: 'Roboto', sans-serif; }`
        : `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\nbody { margin: 0; }`;
    }

    if (filePath === 'package.json') {
      return this.generatePackageJson(config);
    }

    if (filePath === 'vite.config.js') {
      return this.generateViteConfig();
    }

    if (filePath === 'index.html') {
      return this.generateIndexHTML();
    }

    if (filePath.includes('tailwind.config.js')) {
      return this.generateTailwindConfig();
    }

    if (filePath.includes('postcss.config.js')) {
      return this.generatePostCSSConfig();
    }

    if (filePath === 'vercel.json') {
      return this.generateVercelConfig();
    }

    return `// ${fileInfo.purpose}\nexport default function Component() {\n  return <div>Component placeholder</div>;\n}`;
  }

  private static getMaterialUIAppFallback(): string {
    return `import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Container, AppBar, Toolbar, Typography, Box } from '@mui/material';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            My Application
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box textAlign="center">
          <Typography variant="h2" gutterBottom>
            Welcome to Your App
          </Typography>
          <Typography variant="body1">
            This is a professional Material UI application ready for customization.
          </Typography>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;`;
  }

  private static generatePackageJson(config: GenerationConfig): string {
    const isMaterialUI = config.style === 'material-ui';
    
    return JSON.stringify({
      "name": "generated-app",
      "private": true,
      "version": "0.0.0",
      "type": "module",
      "scripts": {
        "dev": "vite",
        "build": "vite build",
        "preview": "vite preview",
        "start": "vite"
      },
      "dependencies": {
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        ...(isMaterialUI ? {
          "@mui/material": "^5.15.0",
          "@emotion/react": "^11.11.0",
          "@emotion/styled": "^11.11.0"
        } : {})
      },
      "devDependencies": {
        "@types/react": "^18.2.43",
        "@types/react-dom": "^18.2.17",
        "@vitejs/plugin-react": "^4.2.1",
        "vite": "^5.0.8",
        ...(config.style === 'tailwind' ? {
          "tailwindcss": "^3.4.0",
          "postcss": "^8.4.32",
          "autoprefixer": "^10.4.16"
        } : {})
      }
    }, null, 2);
  }

  private static generateViteConfig(): string {
    return `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: './',
  server: {
    host: '0.0.0.0',
    port: 5000
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html')
    }
  }
})`;
  }

  private static generateIndexHTML(): string {
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Generated App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;
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

  private static generatePostCSSConfig(): string {
    return `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;
  }

  private static generateVercelConfig(): string {
    return JSON.stringify({
      "version": 2,
      "buildCommand": "npm run build",
      "outputDirectory": "dist",
      "framework": "vite",
      "routes": [
        {
          "src": "/(.*)",
          "dest": "/index.html"
        }
      ]
    }, null, 2);
  }

  private static getTailwindAppFallback(): string {
    return `import React from 'react';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">My Application</h1>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
              Welcome to Your App
            </h2>
            <p className="text-xl text-gray-600">
              This is a professional Tailwind CSS application ready for customization.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;`;
  }
}