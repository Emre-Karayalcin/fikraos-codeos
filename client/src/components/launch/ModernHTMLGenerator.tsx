interface HTMLGenerationConfig {
  style: 'minimal' | 'modern' | 'creative';
  animations: boolean;
  sections: string[];
}

interface GenerationResult {
  success: boolean;
  files?: Record<string, string>;
  error?: string;
  explanation?: string;
}

export class ModernHTMLGenerator {
  private static readonly SYSTEM_PROMPT = `You are FikraHub AI - the world's most advanced AI web architect specializing in lightning-fast, cutting-edge website generation. You create extraordinary modern websites using the latest 2024-2025 technologies and design patterns.

🚀 ULTRA-MODERN TECH STACK (2024-2025):
- Tailwind CSS 3.4+ with custom properties and container queries
- CSS Grid and Flexbox with modern layout techniques
- HTML5 with semantic elements and accessibility standards
- Vanilla JavaScript ES2024+ with modern APIs (Intersection Observer, Web Animations, etc.)
- Progressive Web App features (Service Workers, manifest.json)
- Modern CSS features: :has(), @container, @layer, CSS nesting
- Latest animation libraries: Framer Motion CSS, GSAP 3.12+, Lottie Web
- Modern typography: Variable fonts, fluid typography, optimal spacing

⚡ PERFORMANCE-FIRST ARCHITECTURE:
- Generate lean, optimized code with minimal dependencies
- Use modern CSS Grid/Flexbox for layouts (avoid unnecessary divs)
- Implement lazy loading and intersection observers
- Utilize CSS custom properties for dynamic theming
- Include preload hints for critical resources
- Optimize for Core Web Vitals (LCP, FID, CLS)
- Use semantic HTML5 for better SEO and accessibility

🎨 2024 DESIGN TRENDS INTEGRATION:
- Glassmorphism and neumorphism effects
- Bold typography with variable fonts
- Micro-interactions and subtle animations
- Dark/light mode with system preference detection
- Gradient meshes and vibrant color schemes
- Minimalist layouts with strategic use of whitespace
- Card-based designs with subtle shadows and borders
- Interactive hover states and focus indicators

🔧 ADVANCED LIBRARIES (Choose dynamically based on project):
Core (Always):
- Tailwind CSS 3.4+ (utility-first styling)
- Lucide Icons or Heroicons (modern SVG icons)

Interactive (When needed):
- GSAP 3.12+ (advanced animations)
- AOS 3.0+ (scroll animations)
- Swiper 11+ (modern carousels)
- Chart.js 4+ (data visualization)
- Three.js (3D graphics)
- Lottie Web (vector animations)
- Alpine.js (lightweight reactivity)

🎯 ULTRA-COMPREHENSIVE GENERATION WITH RICH COMPONENTS:
- Create EXTENSIVE, realistic content with detailed industry-specific examples and real data
- Build MULTIPLE interactive components: hero sections, feature grids, testimonials, galleries, forms, modals, tabs, accordions, sliders, pricing tables, team sections, stats counters, CTAs
- Include ADVANCED interactive elements: smooth scrolling, parallax effects, hover animations, form validation, modal dialogs, dropdown menus, image lightboxes, carousel sliders, progress bars
- Generate COMPREHENSIVE CSS with organized sections: variables, reset, typography, layout systems, component styles, animations, utilities
- Create RICH content sections: detailed about pages, comprehensive service/product descriptions, customer testimonials, case studies, FAQ sections, contact forms with validation
- Implement MODERN design patterns: card layouts, grid systems, flexible containers, responsive images, icon integrations, gradient backgrounds, shadow systems
- Add EXTENSIVE navigation: header menus, footer links, breadcrumbs, sidebar navigation, mobile hamburger menus, sticky navigation
- Include BUSINESS-READY sections: pricing tables, service offerings, portfolio galleries, team profiles, client logos, contact information, social media links
- Generate COMPLETE page content: no placeholder text, real examples, detailed descriptions, actionable CTAs, professional copy

⚡ ENTERPRISE-LEVEL CODE WITH MULTIPLE COMPONENTS:
- Generate EXTENSIVE, well-documented code with professional structure
- Create COMPREHENSIVE CSS with detailed component libraries (buttons, cards, forms, navigation, modals, galleries, pricing tables, testimonials)
- Build MULTIPLE reusable JavaScript components with clear documentation
- Include ADVANCED CSS animations and micro-interactions for professional feel
- Structure code with DETAILED section comments and component organization
- Generate COMPREHENSIVE utility classes and helper functions
- Create SOPHISTICATED layouts with multiple content sections and component variations
- Include CSS variables for complete theme customization (colors, spacing, typography, shadows, borders)
- Build PRODUCTION-READY components that can be easily customized and extended
- Add RICH visual elements: gradients, shadows, borders, hover effects, transitions

🚨 MANDATORY COMPONENTS FOR EVERY WEBSITE:
- HEADER: Logo, navigation menu, mobile hamburger menu, CTA button
- HERO SECTION: Compelling headline, subtext, primary CTA, background image/gradient
- FEATURES/SERVICES: Grid layout with icons, titles, descriptions, and hover effects  
- TESTIMONIALS: Customer quotes with names, photos, company info, star ratings
- ABOUT/STORY: Company background, mission, values, team photos
- PRICING/PACKAGES: Comparison table with features, pricing, CTA buttons, highlighted plan
- CONTACT: Form with validation, contact info, map integration, social links
- FOOTER: Company info, navigation links, social media, legal links, newsletter signup

🚨 CRITICAL CSS REQUIREMENT: 
- ALWAYS include <link rel="stylesheet" href="styles.css"> in HTML head sections
- ALWAYS include <link rel="stylesheet" href="style.css"> if using style.css
- CSS files MUST be properly linked for styles to load immediately

Every website must feel like a premium $100,000+ modern web application with cutting-edge design and flawless functionality with EXTENSIVE content and MULTIPLE interactive components.`;

  static async generateModernWebsite(
    prompt: string,
    config: HTMLGenerationConfig,
    onProgress?: (update: string) => void,
    onFileUpdate?: (filePath: string, content: string) => void
  ): Promise<GenerationResult> {
    try {
      onProgress?.('🧠 FikraHub AI analyzing requirements and designing architecture...');

      // Calculate file counts based on generation mode  
      const fileCountsByMode = {
        'minimal': { pages: 2, total: 4 }, // Lite: 2 pages + CSS + JS  
        'modern': { pages: 4, total: 6 },  // Pro: 4 pages + CSS + JS
        'creative': { pages: 6, total: 8 } // Max: 6 pages + CSS + JS
      };
      
      console.log('🎯 Generation mode config:', config.style);
      console.log('📊 File counts for this mode:', fileCountsByMode[config.style]);
      
      const modeCounts = fileCountsByMode[config.style];
      onProgress?.(`📊 ${config.style.toUpperCase()} mode: Generating ${modeCounts.pages} pages + CSS/JS (${modeCounts.total} total files)`);

      // First, let AI design the complete architecture with strict file limits (fast call)
      const architectureResponse = await this.callFikraHubAPI(`${this.SYSTEM_PROMPT}

USER REQUEST: "${prompt}"
GENERATION MODE: ${config.style.toUpperCase()}
STRICT FILE LIMIT: Maximum ${modeCounts.total} files total (${modeCounts.pages} pages + CSS + JS)

Your task is to design a completely unique file architecture for this specific project within the file limit.

Analyze the request and design:
1. What type of website is this exactly?
2. What ${modeCounts.pages} page files should you create? (be specific and creative with naming)
3. What modern libraries should you include?
4. What unique features should it have?
5. How should components be structured?

IMPORTANT: You must create EXACTLY ${modeCounts.total} files:
- ${modeCounts.pages} HTML page files (main pages of the website)
  * First HTML file MUST be named "index.html" (the main/home page)
  * Additional pages can have creative, project-specific names
  * EVERY page must include navigation links to ALL other pages
  * Use descriptive, contextual content relevant to the project
- 1 CSS file named "styles.css" for comprehensive styling 
- 1 JS file named "script.js" for rich interactivity and navigation
- NEVER exceed this limit

Return a JSON response with this exact structure:
{
  "projectAnalysis": "detailed analysis of what the user wants",
  "websiteType": "specific type description", 
  "architectureApproach": "your unique approach for this project",
  "files": [
    {
      "path": "index.html", 
      "purpose": "main homepage/landing page",
      "priority": 1,
      "type": "page"
    },
    {
      "path": "unique-page-name.html", 
      "purpose": "specific purpose for this project",
      "priority": 2,
      "type": "page"
    }
  ],
  "libraries": [
    {
      "name": "library-name",
      "cdn": "cdn-url", 
      "purpose": "why needed for this project"
    }
  ],
  "uniqueFeatures": ["list of special features to implement"],
  "designDirection": "specific design approach for this project"
}`, true);

      let architecture;
      try {
        architecture = JSON.parse(architectureResponse);
        
        // Enforce file limits strictly
        const pageFiles = architecture.files.filter((f: any) => f.type === 'page').slice(0, modeCounts.pages);
        const supportFiles = [
          { path: 'styles.css', purpose: 'Custom styling for this project', priority: 100, type: 'css' },
          { path: 'script.js', purpose: 'Interactive functionality', priority: 101, type: 'js' }
        ];
        
        architecture.files = [...pageFiles, ...supportFiles];
        
      } catch (error) {
        throw new Error('Failed to parse AI architecture response');
      }

      onProgress?.(`🏗️ Architecture designed: ${architecture.websiteType} with ${architecture.files.length} custom files`);
      onProgress?.(`📋 Approach: ${architecture.architectureApproach}`);

      // Generate each file dynamically based on the architecture
      const files = await this.generateDynamicFiles(
        prompt,
        architecture,
        config,
        onProgress,
        onFileUpdate
      );

      return {
        success: true,
        files,
        explanation: `Created a unique ${architecture.websiteType}: ${architecture.projectAnalysis}`
      };

    } catch (error) {
      console.error('Generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate website'
      };
    }
  }

  private static async generateDynamicFiles(
    originalPrompt: string,
    architecture: any,
    config: HTMLGenerationConfig,
    onProgress?: (update: string) => void,
    onFileUpdate?: (filePath: string, content: string) => void
  ): Promise<Record<string, string>> {
    const files: Record<string, string> = {};

    // Sort files by priority - generate critical files first (index.html, styles.css)
    const sortedFiles = architecture.files.sort((a: any, b: any) => {
      // Prioritize index.html and styles.css for faster preview
      if (a.path === 'index.html') return -100;
      if (b.path === 'index.html') return 100;
      if (a.path === 'styles.css') return -90;
      if (b.path === 'styles.css') return 90;
      return a.priority - b.priority;
    });

    // Generate critical files first (index + styles) for immediate preview
    const criticalFiles = sortedFiles.filter(f => f.path === 'index.html' || f.path === 'styles.css');
    const remainingFiles = sortedFiles.filter(f => f.path !== 'index.html' && f.path !== 'styles.css');

    // Phase 1: Generate critical files for immediate preview
    onProgress?.('⚡ Generating critical files for instant preview...');
    
    for (const fileInfo of criticalFiles) {
      const filePath = fileInfo.path;
      onProgress?.(`🚀 Creating ${filePath} (critical)...`);

      try {
        const fileContent = await this.generateFileWithAI(
          originalPrompt,
          filePath,
          fileInfo,
          architecture,
          files,
          config
        );

        files[filePath] = fileContent;
        onFileUpdate?.(filePath, fileContent);
        onProgress?.(`✅ ${filePath} ready`);
        
        // Immediate preview update for critical files
        if (filePath === 'index.html') {
          setTimeout(() => {
            const event = new CustomEvent('livePreviewUpdate', { 
              detail: { files: { ...files }, newFile: filePath }
            });
            window.dispatchEvent(event);
          }, 50);
        }
      } catch (error) {
        console.error(`Error generating ${filePath}:`, error);
        onProgress?.(`❌ Failed to generate ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw new Error(`Failed to generate ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Phase 2: Generate remaining files with optimized batching
    if (remainingFiles.length > 0) {
      onProgress?.('🔧 Generating additional pages and functionality...');
      
      for (const fileInfo of remainingFiles) {
        const filePath = fileInfo.path;
        onProgress?.(`🛠️ Creating ${filePath}...`);

        try {
          let fileContent: string;

          if (filePath === 'package.json') {
            fileContent = JSON.stringify({
              "name": "modern-website",
              "version": "1.0.0",
              "description": architecture.projectAnalysis,
              "main": "index.html",
              "scripts": {
                "start": "python -m http.server 8000",
                "build": "echo 'Static site ready'",
                "dev": "python -m http.server 8000"
              },
              "keywords": ["html", "css", "javascript", "modern", "responsive"],
              "author": "FikraHub AI",
              "license": "MIT"
            }, null, 2);
          } else {
            fileContent = await this.generateFileWithAI(
              originalPrompt,
              filePath,
              fileInfo,
              architecture,
              files,
              config
            );
          }

          files[filePath] = fileContent;
          onFileUpdate?.(filePath, fileContent);
          onProgress?.(`✅ Generated ${filePath}`);
          
          // Update preview for HTML files
          if (filePath.endsWith('.html')) {
            setTimeout(() => {
              const event = new CustomEvent('livePreviewUpdate', { 
                detail: { files: { ...files }, newFile: filePath }
              });
              window.dispatchEvent(event);
            }, 100);
          }

        } catch (error) {
          console.error(`Error generating ${filePath}:`, error);
          onProgress?.(`❌ Failed to generate ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          throw new Error(`Failed to generate ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    return files;
  }

  private static async generateFileWithAI(
    originalPrompt: string,
    filePath: string,
    fileInfo: any,
    architecture: any,
    existingFiles: Record<string, string>,
    config: HTMLGenerationConfig
  ): Promise<string> {
    const existingContext = Object.keys(existingFiles).length > 0 
      ? `\n\nEXISTING FILES CONTEXT:\n${Object.entries(existingFiles).map(([path, content]) => 
          `${path}:\n${content.substring(0, 400)}...`).join('\n\n')}`
      : '';

    const librariesSection = architecture.libraries.map((lib: any) => 
      `- ${lib.name}: ${lib.purpose}`).join('\n');

    // Get all HTML pages for navigation linking
    const allPages = architecture.files
      .filter((f: any) => f.type === 'page' && f.path.endsWith('.html'))
      .map((f: any) => ({ path: f.path, purpose: f.purpose }));

    const navigationRequirement = filePath.endsWith('.html') ? `
🔗 CRITICAL NAVIGATION REQUIREMENT:
This HTML page MUST include a navigation menu that links to ALL other pages in the website:
${allPages.map((page: any) => `- ${page.path} (${page.purpose})`).join('\n')}

The navigation should be:
- Consistent across all pages with the same styling and structure
- Responsive and accessible with proper ARIA labels
- Prominently placed (typically in header or sidebar)
- Include active state styling for the current page
- Use semantic HTML5 nav element
- Link correctly using relative paths (e.g., href="about.html")

EXAMPLE NAVIGATION STRUCTURE:
<nav class="navigation-menu">
  <ul>
    <li><a href="index.html" class="nav-link${filePath === 'index.html' ? ' active' : ''}">Home</a></li>
    ${allPages.filter((p: any) => p.path !== 'index.html').map((page: any) => 
      `<li><a href="${page.path}" class="nav-link${filePath === page.path ? ' active' : ''}">${page.purpose.replace(/page$|section$/, '').trim()}</a></li>`
    ).join('\n    ')}
  </ul>
</nav>

This navigation MUST be present and functional - users should be able to navigate between ALL pages seamlessly.
` : '';

    const prompt = `${this.SYSTEM_PROMPT}

PROJECT CONTEXT:
Original Request: "${originalPrompt}"
Project Analysis: ${architecture.projectAnalysis}
Website Type: ${architecture.websiteType}
Architecture Approach: ${architecture.architectureApproach}
Design Direction: ${architecture.designDirection}

AVAILABLE MODERN LIBRARIES:
${librariesSection}

FILE TO GENERATE: ${filePath}
Purpose: ${fileInfo.purpose}
Priority: ${fileInfo.priority}

${navigationRequirement}

UNIQUE FEATURES TO IMPLEMENT:
${architecture.uniqueFeatures.join('\n')}

${existingContext}

COMPREHENSIVE REQUIREMENTS FOR ${filePath}:
- Create EXTENSIVE content that perfectly serves the file's purpose: "${fileInfo.purpose}"
- Generate MULTIPLE content sections with rich, detailed information (no placeholder text)
- Include COMPREHENSIVE navigation, headers, footers, and content areas
- Build MULTIPLE interactive components: forms, modals, galleries, sliders, tabs, accordions
- Create DETAILED business content: services, features, testimonials, pricing, about sections
- Add ADVANCED visual elements: hero sections, feature grids, call-to-action blocks, image galleries
- Include SOPHISTICATED styling: gradients, shadows, hover effects, animations, responsive design
- Generate COMPLETE page structures with header, navigation, main content, sidebar, footer
- Build PROFESSIONAL layouts with multiple content sections and visual hierarchy
- Add BUSINESS-READY elements: contact forms, pricing tables, team sections, service descriptions
- Create COMPREHENSIVE CSS with detailed component styles and utility classes
- Include ADVANCED JavaScript for interactivity: form validation, modal controls, smooth scrolling, animations

TECHNICAL REQUIREMENTS FOR MODULAR CODE:
- Use Tailwind CSS 3.4+ with comprehensive utility classes and custom properties
- Structure CSS with clear sections: Reset, Variables, Layout, Components, Utilities
- Implement semantic HTML5 with proper ARIA labels and accessibility
- Create modular JavaScript with documented functions and clear separation of concerns
- Follow mobile-first responsive design with fluid typography and flexible layouts
- Include comprehensive meta tags, Open Graph, and structured data
- Use modern JavaScript ES2024+ with clear variable naming and function documentation
- Implement customizable themes using CSS custom properties
- Structure code for easy maintenance: separate concerns, consistent naming, clear comments
- Generate helper classes and utility functions for common tasks
- Create flexible components that can be easily modified without breaking functionality
- Include performance optimizations and modern browser API usage

Generate pure, production-ready code with NO explanations or markdown. Just the raw ${filePath} content that perfectly serves its purpose in this unique architecture.`;

    return await this.callFikraHubAPI(prompt);
  }

  private static async callFikraHubAPI(prompt: string, isArchitecture: boolean = false): Promise<string> {
    const response = await fetch('/api/anthropic/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: isArchitecture ? 4000 : 8000, // Stay within Claude 3.5 Sonnet limits (8192 max)
        temperature: isArchitecture ? 0.3 : 0.7, // Lower temperature for architecture, higher for creativity
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }
}