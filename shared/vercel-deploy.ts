export interface VercelFile {
  file: string;
  data: string;
}

export interface VercelDeployment {
  name: string;
  files: VercelFile[];
  projectSettings?: {
    framework?: 'react' | 'nextjs' | 'vite' | 'static';
    buildCommand?: string;
    outputDirectory?: string;
    installCommand?: string;
  };
}

export interface VercelDeploymentResult {
  success: boolean;
  url?: string;
  error?: string;
  deploymentId?: string;
}

export class VercelDeployer {
  private token: string;
  private teamId?: string;

  constructor(token: string, teamId?: string) {
    this.token = token;
    this.teamId = teamId;
  }

  async deployProject(deployment: VercelDeployment): Promise<VercelDeploymentResult> {
    try {
      // Convert project files to Vercel format (plain text, not base64)
      const files = deployment.files.map(file => ({
        file: file.file,
        data: file.data // Keep as plain text for Vercel API
      }));

      // Add package.json if not present
      if (!files.find(f => f.file === 'package.json')) {
        files.push({
          file: 'package.json',
          data: JSON.stringify({
            name: deployment.name,
            version: "1.0.0",
            private: true,
            scripts: {
              dev: "vite",
              build: "vite build",
              preview: "vite preview"
            },
            dependencies: {
              react: "^18.2.0",
              "react-dom": "^18.2.0",
              "react-router-dom": "^6.22.0",
              "react-icons": "^5.0.1",
              clsx: "^2.1.0",
              "lucide-react": "^0.344.0"
            },
            devDependencies: {
              "@vitejs/plugin-react": "^4.0.3",
              vite: "^4.4.5",
              tailwindcss: "^3.3.0",
              autoprefixer: "^10.4.14",
              postcss: "^8.4.24"
            }
          }, null, 2)
        });
      }

      // Add Vite config if not present
      if (!files.find(f => f.file === 'vite.config.js')) {
        files.push({
          file: 'vite.config.js',
          data: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist'
  }
})`
        });
      }

      // Add index.html in root if not present (Vite standard)
      if (!files.find(f => f.file === 'index.html')) {
        files.push({
          file: 'index.html',
          data: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${deployment.name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`
        });
      }
      
      // Also add public/vite.svg for favicon
      if (!files.find(f => f.file === 'public/vite.svg')) {
        files.push({
          file: 'public/vite.svg',
          data: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="31.88" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 257"><defs><linearGradient id="IconifyId1813088fe1fbc01fb466" x1="-.828%" x2="57.636%" y1="7.652%" y2="78.411%"><stop offset="0%" stop-color="#41D1FF"></stop><stop offset="100%" stop-color="#BD34FE"></stop></linearGradient><linearGradient id="IconifyId1813088fe1fbc01fb467" x1="43.376%" x2="50.316%" y1="2.242%" y2="89.03%"><stop offset="0%" stop-color="#FFEA83"></stop><stop offset="8.333%" stop-color="#FFDD35"></stop><stop offset="100%" stop-color="#FFA800"></stop></linearGradient></defs><path fill="url(#IconifyId1813088fe1fbc01fb466)" d="M255.153 37.938L134.897 252.976c-2.483 4.44-8.862 4.466-11.382.048L.875 37.958c-2.746-4.814 1.371-10.646 6.827-9.67l120.385 21.517a6.537 6.537 0 0 0 2.322-.004l117.867-21.483c5.438-.991 9.574 4.796 6.877 9.62Z"></path><path fill="url(#IconifyId1813088fe1fbc01fb467)" d="M185.432.063L96.44 17.501a3.268 3.268 0 0 0-2.634 3.014l-5.474 92.456a3.268 3.268 0 0 0 3.997 3.378l24.777-5.718c2.318-.535 4.413 1.507 3.936 3.838l-7.361 36.047c-.495 2.426 1.782 4.5 4.151 3.78l15.304-4.649c2.372-.72 4.652 1.36 4.15 3.788l-11.698 56.621c-.732 3.542 3.979 5.473 5.943 2.437l1.313-2.028l72.516-144.72c1.215-2.423-.88-5.186-3.54-4.672l-25.505 4.922c-2.396.462-4.435-1.77-3.759-4.114l16.646-57.705c.677-2.35-1.37-4.583-3.769-4.113Z"></path></svg>`
        });
      }

      // Add src/main.jsx if not present (CRITICAL for Vite builds)
      if (!files.find(f => f.file === 'src/main.jsx')) {
        files.push({
          file: 'src/main.jsx',
          data: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`
        });
      }

      // Add Tailwind config
      if (!files.find(f => f.file === 'tailwind.config.js')) {
        files.push({
          file: 'tailwind.config.js',
          data: `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`
        });
      }

      // Add PostCSS config
      if (!files.find(f => f.file === 'postcss.config.js')) {
        files.push({
          file: 'postcss.config.js',
          data: `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`
        });
      }

      // Convert files to the correct Vercel API v6 format (array of objects)
      const deploymentFiles = files.map(file => ({
        file: file.file,
        data: file.data
      }));

      const deploymentPayload = {
        name: deployment.name,
        files: deploymentFiles,
        projectSettings: {
          framework: 'vite',
          buildCommand: 'npm install && npm run build',
          outputDirectory: 'dist',
          installCommand: 'npm install',
          nodeVersion: '22.x'
        }
      };

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      };

      if (this.teamId) {
        headers['X-Vercel-Team-Id'] = this.teamId;
      }

      console.log('🔍 Deploying to Vercel with payload:', {
        name: deploymentPayload.name,
        fileCount: deploymentPayload.files.length,
        files: deploymentPayload.files.map(f => f.file)
      });

      const response = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers,
        body: JSON.stringify(deploymentPayload)
      });

      console.log('📡 Vercel API response status:', response.status);
      
      let result;
      try {
        const responseText = await response.text();
        console.log('📄 Raw response:', responseText.substring(0, 500));
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse Vercel response as JSON:', parseError);
        return {
          success: false,
          error: `API returned invalid JSON. Status: ${response.status}. Check your Vercel token.`
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: result.error?.message || 'Deployment failed'
        };
      }

      // Return deployment URL
      return {
        success: true,
        url: `https://${result.url}`,
        deploymentId: result.id
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getDeploymentStatus(deploymentId: string): Promise<{
    state: 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED';
    url?: string;
  }> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.token}`
    };

    if (this.teamId) {
      headers['X-Vercel-Team-Id'] = this.teamId;
    }

    const response = await fetch(`https://api.vercel.com/v6/deployments/${deploymentId}`, {
      headers
    });

    const result = await response.json();
    
    return {
      state: result.readyState,
      url: result.url ? `https://${result.url}` : undefined
    };
  }
}