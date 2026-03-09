import express from 'express';
import { nanoid } from 'nanoid';
import { ReactBuilder } from './react-builder';

const previewApps = new Map<string, Record<string, string>>();
const reactBuilds = new Map<string, string>(); // previewId -> buildPath
const previewTimestamps = new Map<string, number>(); // previewId -> creation timestamp

export class PreviewServer {
  static async createPreview(files: Record<string, string>, projectId?: string): Promise<string> {
    const previewId = nanoid();
    
    console.log('🎯 Creating preview:', previewId, 'for project:', projectId);
    console.log('📄 Files in preview:', Object.keys(files));
    
    // Check if this is a React app
    if (ReactBuilder.isReactApp(files)) {
      console.log('⚡ Detected React app - building for preview...');
      
      // Build the React app
      const buildResult = await ReactBuilder.buildReactApp(files);
      
      if (buildResult.success && buildResult.buildPath) {
        console.log('🎉 React app built successfully!');
        
        // Get the built files
        const builtFiles = await ReactBuilder.getBuiltFiles(buildResult.buildPath);
        
        // Store both original files and built files
        previewApps.set(previewId, builtFiles);
        reactBuilds.set(previewId, buildResult.buildPath);
        
        console.log('📦 Built files:', Object.keys(builtFiles).slice(0, 10)); // Show first 10 files
      } else {
        console.error('❌ React build failed:', buildResult.error);
        // Fall back to serving raw files
        previewApps.set(previewId, files);
      }
    } else {
      console.log('📄 Standard web files - serving directly');
      previewApps.set(previewId, files);
    }
    
    // Store creation timestamp for this preview
    previewTimestamps.set(previewId, Date.now());
    
    // Clean up old previews and builds (keep max 100 recent previews, cleanup only previews older than 10 minutes)
    if (previewApps.size > 100) {
      const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
      
      // Find old previews to clean up (older than 10 minutes)
      const keysToDelete = [];
      for (const [key, timestamp] of previewTimestamps.entries()) {
        if (timestamp < tenMinutesAgo) {
          keysToDelete.push(key);
        }
      }
      
      // Clean up old previews
      for (const key of keysToDelete.slice(0, 20)) { // Clean up max 20 at a time
        previewApps.delete(key);
        previewTimestamps.delete(key);
        
        // Clean up associated React build
        const buildPath = reactBuilds.get(key);
        if (buildPath) {
          reactBuilds.delete(key);
        }
        
        console.log(`🗑️ Cleaned up old preview (10+ min old): ${key}`);
      }
      
      // If still too many previews after cleaning old ones, clean up oldest remaining ones
      if (previewApps.size > 100) {
        const sortedEntries = Array.from(previewTimestamps.entries())
          .sort(([,a], [,b]) => a - b);
        
        const toDelete = sortedEntries.slice(0, previewApps.size - 80); // Keep most recent 80
        
        for (const [key] of toDelete) {
          previewApps.delete(key);
          previewTimestamps.delete(key);
          reactBuilds.delete(key);
          console.log(`🗑️ Cleaned up excess preview: ${key}`);
        }
      }
      
      // Trigger background cleanup of build directories
      ReactBuilder.cleanupOldBuilds().catch(console.warn);
    }
    
    return previewId;
  }

  static setupPreviewRoutes(app: express.Application, isAuthenticated: any, fileUploadLimiter: any) {
    // Serve preview files
    app.get('/preview/:previewId/*', async (req, res) => {
      try {
        const { previewId } = req.params;
        const filePath = (req.params as any)[0] || 'index.html';
        
        const files = previewApps.get(previewId);
        if (!files) {
          return res.status(404).send('Preview not found');
        }

        // Handle index.html - serve generated HTML content
        if (filePath === '' || filePath === 'index.html') {
          let indexContent;
          
          // If we have a generated HTML file, use it
          if (files['index.html']) {
            console.log('🎯 Serving built React app HTML directly');
            indexContent = files['index.html'];
            
            // Check if this is a built React app (has assets/ folder)
            const hasBuiltAssets = Object.keys(files).some(key => key.startsWith('assets/'));
            
            if (hasBuiltAssets) {
              console.log('🚀 Serving pre-built React app with compiled assets');
              
              // Fix asset paths: convert absolute paths to relative paths for preview
              let fixedHtml = indexContent;
              fixedHtml = fixedHtml.replace(/src="\/assets\//g, 'src="assets/');
              fixedHtml = fixedHtml.replace(/href="\/assets\//g, 'href="assets/');
              
              console.log('📄 Fixed asset paths in HTML for preview serving');
              
              // For built React apps, serve the fixed index.html
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.setHeader('X-Frame-Options', 'SAMEORIGIN');
              res.setHeader('Content-Security-Policy', 'default-src \'self\' \'unsafe-inline\' \'unsafe-eval\' https: data: blob:;');
              res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
              return res.send(fixedHtml);
            }
            
            // For non-built apps, do the old CSS/JS injection
            console.log('🎨 Checking for CSS files to inject for standard web app...');
            
            if (files['styles.css']) {
              console.log('🎨 Injecting styles.css link');
              if (!indexContent.includes('styles.css')) {
                indexContent = indexContent.replace(
                  /<\/head>/i, 
                  `  <link rel="stylesheet" href="styles.css">\n</head>`
                );
              }
            }
            
            if (files['style.css']) {
              console.log('🎨 Injecting style.css link');
              if (!indexContent.includes('style.css')) {
                indexContent = indexContent.replace(
                  /<\/head>/i, 
                  `  <link rel="stylesheet" href="style.css">\n</head>`
                );
              }
            }
            
            if (files['script.js']) {
              console.log('📜 Injecting script.js link');
              if (!indexContent.includes('script.js')) {
                indexContent = indexContent.replace(
                  /<\/body>/i, 
                  `  <script src="script.js"></script>\n</body>`
                );
              }
            }
            
            if (files['main.js']) {
              console.log('📜 Injecting main.js link');
              if (!indexContent.includes('main.js')) {
                indexContent = indexContent.replace(
                  /<\/body>/i, 
                  `  <script src="main.js"></script>\n</body>`
                );
              }
            }
            
            console.log('✅ Asset injection complete');
            
            // Add navigation links for other HTML pages
            const htmlFiles = Object.keys(files).filter(f => f.endsWith('.html') && f !== 'index.html');
            if (htmlFiles.length > 0) {
              const navLinks = htmlFiles.map(f => `<a href="${f}" style="margin: 0 10px; color: #2563eb; text-decoration: underline;">${f.replace('.html', '')}</a>`).join('');
              const navBar = `<div style="position: fixed; top: 0; left: 0; right: 0; background: rgba(255,255,255,0.95); padding: 10px; border-bottom: 1px solid #e5e7eb; z-index: 1000;">
                <strong>Pages:</strong> <a href="index.html" style="margin: 0 10px; color: #2563eb; text-decoration: underline;">Home</a>${navLinks}
              </div><div style="height: 60px;"></div>`;
              
              indexContent = indexContent.replace(
                /(<body[^>]*>)/i,
                `$1${navBar}`
              );
            }
          } else {
            console.log('🔧 No index.html found - creating minimal fallback');
            indexContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview</title>
    <style>
      body { font-family: system-ui, sans-serif; padding: 2rem; }
      .message { text-align: center; color: #666; }
    </style>
</head>
<body>
    <div class="message">
        <h2>🔧 Preview Loading</h2>
        <p>Processing generated files...</p>
    </div>
</body>
</html>`;
          }
          
          // Set headers to allow JavaScript execution and live updates
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('X-Frame-Options', 'SAMEORIGIN');
          res.setHeader('Content-Security-Policy', 'default-src \'self\' \'unsafe-inline\' \'unsafe-eval\' https: data: blob:;');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          
          return res.send(indexContent);
        }

        // Handle built React assets (e.g., assets/index-abc123.css)
        if (filePath.startsWith('assets/') && files[filePath]) {
          console.log(`🎯 Serving React asset: ${filePath}`);
          if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
          } else if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
          }
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          return res.send(files[filePath]);
        }

        // Handle CSS files (handle both style.css and styles.css) for standard web apps
        if ((filePath === 'style.css' && files['style.css']) || (filePath === 'styles.css' && files['styles.css'])) {
          res.setHeader('Content-Type', 'text/css');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          return res.send(files[filePath]);
        }

        // Handle JavaScript files (script.js only - bundle.js removed for React apps)
        // React apps use built assets from assets/ folder instead
        
        if (filePath === 'script.js' && files['script.js']) {
          res.setHeader('Content-Type', 'application/javascript');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          return res.send(files['script.js']);
        }

        // Handle other files
        const fileContent = files[filePath];
        if (!fileContent) {
          return res.status(404).send('File not found');
        }

        // Set appropriate content type and cache headers based on file extension
        if (filePath.endsWith('.html')) {
          // Serve ALL HTML files as proper HTML with security headers and live update support
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('X-Frame-Options', 'SAMEORIGIN');
          res.setHeader('Content-Security-Policy', 'default-src \'self\' \'unsafe-inline\' \'unsafe-eval\' https: data: blob:;');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        } else if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
          res.setHeader('Content-Type', 'application/javascript');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (filePath.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (filePath.endsWith('.json')) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else {
          res.setHeader('Content-Type', 'text/plain');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }

        res.send(fileContent);
      } catch (error) {
        console.error('Preview serve error:', error);
        res.status(500).send('Internal server error');
      }
    });

    // ✅ SECURITY FIX (P0): API endpoint to create preview
    // - Authentication required (prevents anonymous RCE)
    // - Rate limited to 10 uploads/hour (prevents abuse)
    // - React builds DISABLED (prevents npm install + vite build RCE)
    // - Only simple HTML/CSS/JS previews allowed
    app.post('/api/preview/create', isAuthenticated, fileUploadLimiter, async (req: any, res) => {
      try {
        const { files } = req.body;

        if (!files || typeof files !== 'object') {
          return res.status(400).json({ error: 'Files object required' });
        }

        // ✅ SECURITY FIX (P0): Block React apps to prevent RCE
        // React builds execute npm install + vite build which runs user-supplied vite.config.js
        // This allows stealing environment variables (API keys, DB credentials, session secrets)
        if (ReactBuilder.isReactApp(files)) {
          console.warn(`⚠️  React app preview blocked for user ${req.user.id} - security policy`);
          return res.status(400).json({
            error: 'React app previews are disabled for security',
            message: 'Only HTML, CSS, and JavaScript files are supported. React builds are not allowed.',
            suggestion: 'Please use static HTML/CSS/JS or deploy your React app separately.'
          });
        }

        // Log for accountability
        console.log(`📝 Preview created by authenticated user: ${req.user.id}`);

        const previewId = await this.createPreview(files);
        const previewUrl = `/preview/${previewId}/`;
        const fullUrl = `${req.protocol}://${req.get('host')}/preview/${previewId}/`;

        console.log(`✅ Preview created: ${previewId}`);
        console.log(`🔗 Full preview URL: ${fullUrl}`);

        res.json({
          success: true,
          previewId,
          previewUrl,
          fullUrl
        });
      } catch (error) {
        console.error('Preview creation error:', error);
        res.status(500).json({ error: 'Failed to create preview' });
      }
    });
  }
}
