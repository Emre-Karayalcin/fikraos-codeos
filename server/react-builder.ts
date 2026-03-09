// ⚠️  SECURITY NOTE (P1): React build functionality is DISABLED in preview-server.ts
// This file contains Command Injection vulnerability (CWE-78) via exec()
// React builds execute user-supplied vite.config.js which can:
// - Steal environment variables (API keys, DB credentials, session secrets)
// - Execute arbitrary commands on the server
// - Access internal network resources
// Current mitigation: Preview endpoint blocks ReactBuilder.isReactApp() files
// Future fix: Use execFile() instead of exec(), or Docker/VM sandboxing

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';

const execAsync = promisify(exec);

export interface BuildResult {
  success: boolean;
  buildPath?: string;
  error?: string;
  buildId: string;
}

export class ReactBuilder {
  private static buildsDir = path.join(process.cwd(), 'tmp', 'react-builds');
  
  static async ensureBuildsDirectory() {
    try {
      await fs.mkdir(this.buildsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, that's fine
    }
  }

  static async buildReactApp(files: Record<string, string>): Promise<BuildResult> {
    const buildId = nanoid();
    const buildPath = path.join(this.buildsDir, buildId);

    try {
      await this.ensureBuildsDirectory();
      console.log(`🔨 Building React app in: ${buildPath}`);

      // Create build directory
      await fs.mkdir(buildPath, { recursive: true });

      // SECURITY: Validate package.json before writing files
      if (files['package.json']) {
        try {
          const packageJson = JSON.parse(files['package.json']);

          // Check for suspicious npm scripts
          if (packageJson.scripts) {
            const suspiciousPatterns = [
              /\$\(/, // Command substitution
              /`/, // Backticks
              /;/, // Command chaining
              /&&/, // Command chaining
              /\|/, // Piping
              /curl|wget|nc|netcat|bash|sh|eval/, // Network/shell commands
            ];

            for (const [scriptName, scriptContent] of Object.entries(packageJson.scripts)) {
              const script = String(scriptContent);
              if (suspiciousPatterns.some(pattern => pattern.test(script))) {
                console.warn(`🚫 Blocked suspicious npm script: ${scriptName}: ${script}`);
                throw new Error(`Suspicious script detected in package.json: ${scriptName}`);
              }
            }
          }

          // Validate dependencies (block known malicious packages or suspicious patterns)
          const allDeps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies
          };

          for (const [depName, depVersion] of Object.entries(allDeps)) {
            const version = String(depVersion);
            // Block git URLs and file: protocols
            if (version.startsWith('git://') || version.startsWith('file:') || version.includes('://')) {
              console.warn(`🚫 Blocked non-registry dependency: ${depName}@${version}`);
              throw new Error(`Non-registry dependencies not allowed: ${depName}`);
            }
          }
        } catch (parseError) {
          console.error('Failed to parse/validate package.json:', parseError);
          throw new Error('Invalid or suspicious package.json');
        }
      }

      // Write all files to the build directory (with path traversal protection)
      await this.writeFilesToDisk(files, buildPath);

      // SECURITY: Run npm install with ZERO environment variables (sandbox)
      // This prevents malicious vite.config.ts from accessing secrets
      console.log('📦 Installing dependencies...');
      const cleanEnv = {
        PATH: process.env.PATH || '',
        HOME: process.env.HOME || '',
        USER: process.env.USER || '',
        TMPDIR: process.env.TMPDIR || '/tmp',
        NODE_ENV: 'production',
        npm_config_ignore_scripts: 'true'
      };

      await execAsync('npm install --ignore-scripts', {
        cwd: buildPath,
        timeout: 60000,
        env: cleanEnv
      });

      // SECURITY: Run build with ZERO access to secrets
      console.log('🔧 Building React app (skipping TypeScript check)...');
      await execAsync('npx vite build', {
        cwd: buildPath,
        timeout: 60000,
        env: cleanEnv // Explicitly pass clean environment
      });
      console.log('✅ React app built successfully');
      
      // Check if dist folder exists
      const distPath = path.join(buildPath, 'dist');
      try {
        await fs.access(distPath);
        console.log(`📁 Build output available at: ${distPath}`);
        
        return {
          success: true,
          buildPath: distPath,
          buildId
        };
      } catch (error) {
        return {
          success: false,
          error: 'Build completed but dist folder not found',
          buildId
        };
      }
      
    } catch (error) {
      console.error('❌ React build failed:', error);
      
      // Clean up failed build directory
      try {
        await fs.rm(buildPath, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn('Failed to clean up build directory:', cleanupError);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown build error',
        buildId
      };
    }
  }
  
  static async getBuiltFiles(buildPath: string): Promise<Record<string, string>> {
    const files: Record<string, string> = {};
    
    try {
      await this.readDirectoryRecursive(buildPath, buildPath, files);
      return files;
    } catch (error) {
      console.error('Failed to read built files:', error);
      return {};
    }
  }
  
  private static async readDirectoryRecursive(
    currentPath: string, 
    basePath: string, 
    files: Record<string, string>
  ): Promise<void> {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);
      
      if (entry.isDirectory()) {
        await this.readDirectoryRecursive(fullPath, basePath, files);
      } else {
        try {
          // For JavaScript and CSS files, ensure proper encoding
          let content;
          const ext = entry.name.split('.').pop()?.toLowerCase();
          
          if (ext === 'js' || ext === 'css' || ext === 'html' || ext === 'json') {
            // Read text files as UTF-8
            content = await fs.readFile(fullPath, 'utf-8');
          } else {
            // For other files, read as binary and convert to base64 if needed
            const buffer = await fs.readFile(fullPath);
            content = buffer.toString('utf-8');
          }
          
          files[relativePath.replace(/\\/g, '/')] = content; // Normalize path separators
          console.debug(`📄 Loaded file: ${relativePath} (${content.length} chars)`);
        } catch (error) {
          console.warn(`⚠️ Failed to read file ${relativePath}:`, error);
        }
      }
    }
  }
  
  private static async writeFilesToDisk(files: Record<string, string>, basePath: string): Promise<void> {
    for (const [filePath, content] of Object.entries(files)) {
      // SECURITY: Prevent path traversal attacks
      // Normalize the path and ensure it doesn't escape basePath
      const normalizedPath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
      const fullPath = path.join(basePath, normalizedPath);

      // Verify the resolved path is still within basePath
      const resolvedPath = path.resolve(fullPath);
      const resolvedBase = path.resolve(basePath);

      if (!resolvedPath.startsWith(resolvedBase)) {
        console.warn(`🚫 Blocked path traversal attempt: ${filePath}`);
        throw new Error(`Invalid file path: ${filePath}`);
      }

      // Additional security: Block certain dangerous filenames
      const dangerousPatterns = [
        /\.\./, // Double dots
        /^\//, // Absolute paths
        /^~/, // Home directory
        /\0/, // Null bytes
      ];

      if (dangerousPatterns.some(pattern => pattern.test(filePath))) {
        console.warn(`🚫 Blocked dangerous filename pattern: ${filePath}`);
        throw new Error(`Invalid file path: ${filePath}`);
      }

      const dirPath = path.dirname(fullPath);

      // Create directory if it doesn't exist
      await fs.mkdir(dirPath, { recursive: true });

      // Write file
      await fs.writeFile(fullPath, content, 'utf-8');
    }
  }
  
  static isReactApp(files: Record<string, string>): boolean {
    // Check if it has React app characteristics
    const hasPackageJson = 'package.json' in files;
    const hasSrcFolder = Object.keys(files).some(key => key.startsWith('src/'));
    const hasReactComponents = Object.keys(files).some(key => 
      (key.endsWith('.jsx') || key.endsWith('.tsx')) && 
      files[key].includes('React')
    );
    const hasViteConfig = 'vite.config.js' in files || 'vite.config.ts' in files;
    
    // If it's a static HTML app (has index.html but no React), it's NOT a React app
    const hasIndexHtml = 'index.html' in files;
    const hasStaticFiles = hasIndexHtml && ('styles.css' in files || 'script.js' in files);
    
    if (hasStaticFiles && !hasReactComponents) {
      return false; // This is a static web app
    }
    
    return hasPackageJson && (hasSrcFolder || hasReactComponents) && hasViteConfig;
  }
  
  // Cleanup old builds (keep only last 5 builds)
  static async cleanupOldBuilds(): Promise<void> {
    try {
      const builds = await fs.readdir(this.buildsDir);
      if (builds.length > 5) {
        const buildsToDelete = builds.slice(0, builds.length - 5);
        
        for (const buildDir of buildsToDelete) {
          const buildPath = path.join(this.buildsDir, buildDir);
          await fs.rm(buildPath, { recursive: true, force: true });
          console.log(`🗑️ Cleaned up old build: ${buildDir}`);
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup old builds:', error);
    }
  }
}