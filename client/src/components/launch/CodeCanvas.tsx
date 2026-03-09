import { useState, useEffect, useRef } from "react";
import { Play, Square, RefreshCw, AlertCircle, Monitor, FileText, ExternalLink, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MonacoEditor } from "./MonacoEditor";

interface CodeCanvasProps {
  files: Record<string, string>;
  onBuildStatusChange?: (status: 'idle' | 'building' | 'success' | 'error') => void;
  onErrorsChange?: (errors: string[]) => void;
  showPreview?: boolean;
  onToggleView?: () => void;
  selectedFile?: string;
  onFileChange?: (path: string, content: string) => void; // New callback for file edits
  generationStatus?: string; // For live status updates during generation
  deploymentUrl?: string | null; // URL from successful Vercel deployment
  buildStatus?: 'idle' | 'building' | 'success' | 'error'; // Current build status from parent
  onPreviewUrlChange?: (url: string | null) => void; // Callback to pass preview URL to parent
  previewUrl?: string | null; // Preview URL from parent
}

export function CodeCanvas({ files, onBuildStatusChange, onErrorsChange, showPreview = true, onToggleView, selectedFile, onFileChange, generationStatus, deploymentUrl, buildStatus: parentBuildStatus, onPreviewUrlChange, previewUrl }: CodeCanvasProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [buildStatus, setBuildStatus] = useState<'idle' | 'building' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<string[]>([]);

  const updateBuildStatus = (status: 'idle' | 'building' | 'success' | 'error') => {
    setBuildStatus(status);
    onBuildStatusChange?.(status);
  };

  const updateErrors = (newErrors: string[]) => {
    setErrors(newErrors);
    onErrorsChange?.(newErrors);
  };

  // Simple preview URL logging
  useEffect(() => {
    if (previewUrl) {
      console.log('🔗 Preview URL updated:', previewUrl);
      setIsRunning(true);
      updateBuildStatus('success');
    }
  }, [previewUrl]);

  // Simple deployment URL logging
  useEffect(() => {
    if (deploymentUrl) {
      console.log('🚀 Deployment URL updated:', deploymentUrl);
      setIsRunning(true);
      updateBuildStatus('success');
    }
  }, [deploymentUrl]);

  // Auto-run preview when files are ready (supports both React and HTML projects)
  useEffect(() => {
    // If we already have a preview URL from parent, use it instead of creating a new one
    if (previewUrl) {
      console.log('🔗 Using preview URL from parent:', previewUrl);
      return;
    }
    
    const totalFiles = Object.keys(files).length;
    const hasAppFile = 'src/App.jsx' in files;
    const hasIndexFile = 'index.html' in files;
    const appFileLength = files['src/App.jsx']?.length || 0;
    const indexFileLength = files['index.html']?.length || 0;
    
    // Skip if no meaningful files, already running, or has deployment URL
    if (totalFiles === 0 || deploymentUrl) {
      return;
    }
    
    // Check for either React app or HTML files
    const hasValidFiles = (hasAppFile && appFileLength > 50) || (hasIndexFile && indexFileLength > 50);
    
    if (!hasValidFiles || isRunning || buildStatus !== 'idle') {
      return;
    }
    
    console.log('📁 Files ready for preview:', { 
      totalFiles, 
      hasAppFile, 
      hasIndexFile, 
      appFileLength, 
      indexFileLength,
      hasPackageJson: 'package.json' in files 
    });
    
    // Debounce to prevent rapid re-triggering
    const timeoutId = setTimeout(() => {
      // Double-check we're still not running and no deployment URL
      if (!isRunning && buildStatus === 'idle' && !deploymentUrl) {
        console.log('✅ Valid files detected, running preview...');
        runPreview();
      }
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [Object.keys(files).length, files['src/App.jsx']?.length, files['index.html']?.length, isRunning, buildStatus, deploymentUrl]);

  // Listen for real-time preview refresh events during generation
  useEffect(() => {
    const handleRefreshPreview = (event: CustomEvent) => {
      const { previewUrl, newFile } = event.detail;
      if (iframeRef.current && previewUrl) {
        console.log('🔄 SIMPLE: Loading iframe with preview:', previewUrl, 'for file:', newFile);
        
        // Simple direct URL assignment - no complex logic
        iframeRef.current.src = previewUrl;
        setIsRunning(true);
        updateBuildStatus('success');
        
        console.log('✅ IFRAME URL SET:', previewUrl);
      }
    };

    window.addEventListener('refreshPreview', handleRefreshPreview as EventListener);
    
    return () => {
      window.removeEventListener('refreshPreview', handleRefreshPreview as EventListener);
    };
  }, []);

  const generateAdvancedPreviewHTML = () => {
    const appCode = files['src/App.jsx'] || '';
    const cssCode = files['src/index.css'] || '';
    const allComponents = Object.entries(files)
      .filter(([path]) => path.startsWith('src/components/') && path.endsWith('.jsx'))
      .map(([path, code]) => ({ path, code }));
    
    console.log('🔧 Generating advanced preview HTML with files:', Object.keys(files));
    console.log('📄 App.jsx length:', appCode.length);
    console.log('🧩 Components found:', allComponents.length);
    
    if (!appCode.trim()) {
      console.error('❌ App.jsx is missing or empty');
      updateErrors(['App.jsx is missing or empty']);
      return null;
    }

    // Advanced code transformation for browser execution (like FikraHub AI)
    const transformCode = (code: string, componentName: string) => {
      return code
        // Remove all import statements
        .replace(/import[^;]+;/g, '')
        .replace(/import\s+{[^}]+}\s+from\s+['"][^'"]+['"];?/g, '')
        // Remove exports
        .replace(/export\s+default\s+/g, '')
        .replace(/export\s+{[^}]+}/g, '')
        // Remove MUI specific code that doesn't work in browser
        .replace(/const\s+(\w+)\s*=.*?useTheme\(\);?/g, '')
        .replace(/sx=\{[^}]+\}/g, 'style={{}}')
        .replace(/theme\.[^,\s})]*/g, '{}')
        // Replace Helmet with simple title
        .replace(/<Helmet[^>]*>[\s\S]*?<\/Helmet>/g, '')
        // Replace Router-specific components with divs
        .replace(/<Router[^>]*>/g, '<div>')
        .replace(/<\/Router>/g, '</div>')
        .replace(/<Route[^>]*>/g, '<div>')
        .replace(/<\/Route>/g, '</div>')
        // Fix common JSX issues
        .replace(/\s+/g, ' ')
        .replace(/;\s*$/, '')
        // Ensure function declarations work
        .replace(/function\s+(\w+)/g, 'const $1 = function')
        .trim();
    };

    // Process App component
    let appCodeTransformed = transformCode(appCode, 'App');
    
    // Process all other components
    const componentDefinitions = allComponents.map(({ path, code }) => {
      const componentName = path.split('/').pop()?.replace('.jsx', '') || 'Component';
      return transformCode(code, componentName);
    }).join('\n\n');

    // Combine all components
    const combinedCode = `
      ${componentDefinitions}
      
      ${appCodeTransformed}
    `;
    
    console.log('🧹 Transformed code length:', combinedCode.length);
    console.log('✅ Advanced preview HTML generation successful');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Preview</title>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/@mui/material@latest/umd/material-ui.production.min.js"></script>
    <style>
        ${cssCode}
        body { 
          margin: 0; 
          padding: 0; 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }
        .error { 
          padding: 20px; 
          background: #fee; 
          border: 1px solid #fcc; 
          color: #800; 
          margin: 20px; 
        }
    </style>
</head>
<body>
    <div id="root">
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
            <div style="text-align: center; color: #6b7280;">
                <div style="width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top: 3px solid #4588f5; border-radius: 50%; margin: 0 auto 16px; animation: spin 1s linear infinite;"></div>
                <p>Loading preview...</p>
            </div>
        </div>
        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    </div>
    <script>
        const { useState, useEffect } = React;
        
        try {
          ${combinedCode}
          
          const root = ReactDOM.createRoot(document.getElementById('root'));
          root.render(React.createElement(App || (() => 
            React.createElement('div', {className: 'p-8'}, 
              React.createElement('h1', {className: 'text-4xl font-bold'}, 'App Generated'),
              React.createElement('p', {className: 'text-gray-600'}, 'Your React app is ready!')
            )
          )));
          console.log('✅ Preview rendered successfully');
        } catch (error) {
          console.error('❌ Preview error:', error);
          // SECURITY: Safely display error without innerHTML injection
          const root = document.getElementById('root');
          if (root) {
            root.innerHTML = ''; // Clear existing content
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error';
            const h2 = document.createElement('h2');
            h2.textContent = 'Preview Error';
            const p = document.createElement('p');
            p.textContent = error.toString();
            errorDiv.appendChild(h2);
            errorDiv.appendChild(p);
            root.appendChild(errorDiv);
          }
        }
    </script>
</body>
</html>`;
  };

  const runPreview = async () => {
    if (Object.keys(files).length === 0) {
      updateBuildStatus('error');
      updateErrors(['No files to preview']);
      return;
    }

    console.log('🚀 Simple preview generation...');
    updateBuildStatus('building');
    updateErrors([]);
    
    try {      
      // Create hosted preview
      const response = await fetch('/api/preview/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ files })
      });

      if (!response.ok) {
        throw new Error(`Preview API failed: ${response.status}`);
      }

      const data = await response.json();
      const fullUrl = data.fullUrl;
      
      console.log('✅ Preview created:', fullUrl);

      if (iframeRef.current && fullUrl) {
        // Simple direct assignment
        iframeRef.current.src = fullUrl;
        setIsRunning(true);
        updateBuildStatus('success');
        
        // Pass the preview URL back to parent component
        onPreviewUrlChange?.(fullUrl);
        
        console.log('✅ IFRAME loaded:', fullUrl);
      }
      
    } catch (error) {
      console.error('❌ Preview error:', error);
      updateBuildStatus('error');
      updateErrors([error instanceof Error ? error.message : 'Preview failed']);
      setIsRunning(false);
    }
  };

  const stopPreview = () => {
    if (iframeRef.current) {
      iframeRef.current.src = 'about:blank';
    }
    setIsRunning(false);
    updateBuildStatus('idle');
    
    // Clear the preview URL when stopping
    onPreviewUrlChange?.(null);
  };

  const refreshPreview = () => {
    if (deploymentUrl) {
      // Force refresh the live Vercel deployment
      console.log('🔄 Refreshing live deployment:', deploymentUrl);
      if (iframeRef.current) {
        const timestamp = Date.now();
        iframeRef.current.src = `${deploymentUrl}?_refresh=${timestamp}`;
      }
    } else if (isRunning) {
      // Refresh local preview
      runPreview();
    }
  };

  // Check Vercel build status periodically when deployment URL exists but build is in progress
  useEffect(() => {
    let statusCheckInterval: NodeJS.Timeout;
    
    if (deploymentUrl && parentBuildStatus === 'building') {
      console.log('🔍 Starting periodic Vercel build status check...');
      
      statusCheckInterval = setInterval(async () => {
        try {
          // Try to fetch the deployment URL to see if it's live
          const response = await fetch(deploymentUrl, { method: 'HEAD' });
          if (response.ok) {
            console.log('✅ Vercel build completed, showing live site');
            if (iframeRef.current) {
              iframeRef.current.src = deploymentUrl;
            }
            setIsRunning(true);
            updateBuildStatus('success');
            clearInterval(statusCheckInterval);
          }
        } catch (error) {
          // Build still in progress, continue checking
          console.log('⏳ Vercel build still in progress...');
        }
      }, 2000); // Check every 2 seconds
    }
    
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [deploymentUrl, parentBuildStatus]);

  if (!showPreview) {
    return (
      <div className="flex-1 border rounded-lg bg-card">
        <div className="h-12 border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">Files</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onToggleView}
            data-testid="toggle-preview"
          >
            <Play className="w-4 h-4 mr-2" />
            Show Preview
          </Button>
        </div>
        
        <div className="flex-1 p-0 overflow-hidden">
          {selectedFile && files[selectedFile] ? (
            <MonacoEditor
              files={files}
              selectedFile={selectedFile}
              onFileChange={onFileChange || (() => {})}
              className="h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a file from the tree to edit its code</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 border rounded-lg bg-card">

      {/* Preview Content */}
      <div className="flex-1 relative bg-white h-full min-h-0">
        {/* Show deployment success notification */}
        {deploymentUrl && (
          <div className="absolute top-4 left-4 right-4 bg-green-50 border border-green-200 rounded-lg p-3 z-10 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                🚀
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-700">Successfully deployed!</p>
                <p className="text-xs text-green-600 truncate">{deploymentUrl}</p>
              </div>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => window.open(deploymentUrl, '_blank')}
                className="text-green-700 border-green-300 hover:bg-green-100 flex-shrink-0"
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Vercel Build Loading Overlay */}
        {deploymentUrl && parentBuildStatus === 'building' && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-gradient-to-br from-blue-50 to-purple-50 backdrop-blur-sm">
            <div className="text-center p-8 max-w-md">
              <div className="w-16 h-16 mx-auto mb-6 relative">
                <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-pulse" />
                <div className="absolute inset-2 border-4 border-purple-300 border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Globe className="w-4 h-4 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Building Your App
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                🔨 Vercel is building your React app...
              </p>
              <div className="space-y-3">
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full animate-pulse" style={{width: '75%'}} />
                </div>
                <p className="text-xs text-gray-500">
                  This usually takes 30-60 seconds. Your live site will appear automatically when ready!
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Generation Status Overlay */}
        {generationStatus && buildStatus === 'building' && !deploymentUrl && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-background/95 backdrop-blur-sm">
            <div className="text-center p-6 max-w-md">
              <div className="w-12 h-12 mx-auto mb-4 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <h3 className="text-lg font-semibold mb-2">Generating Preview</h3>
              <p className="text-sm text-muted-foreground">
                {generationStatus.includes('⚡') || generationStatus.includes('🚀') || generationStatus.includes('💎') 
                  ? generationStatus 
                  : `🔨 ${generationStatus}`}
              </p>
              <div className="mt-4 space-y-1">
                <div className="w-full bg-secondary/30 rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full animate-pulse" style={{width: '60%'}} />
                </div>
                <p className="text-xs text-muted-foreground">Preview will update automatically as files are created</p>
              </div>
            </div>
          </div>
        )}
        
        {buildStatus === 'error' && errors.length > 0 && (
          <div className="absolute top-4 left-4 right-4 bg-destructive/10 border border-destructive/50 rounded-lg p-4 z-10">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-destructive">Preview Errors</h4>
                <ul className="mt-1 text-xs text-destructive/80 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        
        <iframe
          src={deploymentUrl || previewUrl || "about:blank"}
          className="w-full h-full border-0 min-h-full absolute inset-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          title={deploymentUrl ? "Live Site" : "Live Preview"}
          data-testid="preview-iframe"
          onLoad={() => {
            const currentSrc = deploymentUrl || previewUrl;
            if (currentSrc && currentSrc !== "about:blank") {
              console.log('✅ Iframe loaded successfully:', currentSrc);
              setIsRunning(true);
              updateBuildStatus('success');
            }
          }}
        />
      </div>
    </div>
  );
}