import React from 'react';

interface GeneratedFile {
  [filePath: string]: string;
}

interface GenerationConfig {
  mode: 'lite' | 'pro' | 'max';
  fileCount: number;
  complexity: string;
  description: string;
  maxTokens: number;
}

interface GenerationResult {
  success: boolean;
  files: GeneratedFile;
  explanation: string;
  error?: string;
}

/**
 * AI-powered code generator using Claude for FikraHub Launch mode
 * Generates comprehensive React applications with tier-based page limits
 */
export class AICodeGenerator {
  
  /**
   * Main entry point for generating complete React applications
   */
  static async generateApplication(
    prompt: string, 
    generationMode: 'lite' | 'pro' | 'max',
    currentFiles: GeneratedFile = {},
    onPlanUpdate?: (plan: string) => void,
    onFileUpdate?: (filePath: string, content: string) => void
  ): Promise<GenerationResult> {
    try {
      console.log(`🚀 Starting ${generationMode} generation for: "${prompt}"`);
      
      const modeConfig: Record<string, GenerationConfig> = {
        lite: { 
          mode: 'lite', 
          fileCount: 2, 
          complexity: 'simple but comprehensive',
          description: 'Lite Mode: 2 files with rich, production-ready components',
          maxTokens: 4000
        },
        pro: { 
          mode: 'pro', 
          fileCount: 4, 
          complexity: 'professional with multiple interactive sections',
          description: 'Pro Mode: 4 files with advanced features and interactions',
          maxTokens: 4000
        },
        max: { 
          mode: 'max', 
          fileCount: 6, 
          complexity: 'enterprise-grade with advanced features',
          description: 'Max Mode: 6 files with enterprise-level functionality',
          maxTokens: 4000
        }
      };

      const config = modeConfig[generationMode];
      onPlanUpdate?.(`${config.description}\n🎯 Analyzing your request and creating development plan...`);
      
      // PHASE 1: Get development plan from Claude (fast, small response)
      const plan = await this.generateDevelopmentPlan(prompt, config, onPlanUpdate);
      if (!plan) {
        console.log('🔄 Plan generation returned null, using ultra-simple fallback');
        // Use ultra-simple fallback if plan is still null
        const fallbackPlan = JSON.stringify({
          projectName: "React App",
          description: "A modern React application", 
          files: [
            { path: "src/App.jsx", purpose: "Main application component", priority: 1 },
            { path: "src/main.jsx", purpose: "Entry point file", priority: 2 },
            { path: "src/index.css", purpose: "Global styles", priority: 3 }
          ]
        });
        const files = await this.generateFilesFromPlan(fallbackPlan, prompt, currentFiles, config, onFileUpdate, onPlanUpdate);
        return {
          success: true,
          files,
          explanation: `Generated ${Object.keys(files).length} files using fallback plan`
        };
      }
      
      onPlanUpdate?.("📋 Plan ready! Starting file-by-file generation...");
      
      // PHASE 2: Generate files one by one based on the plan (real-time streaming)
      const files = await this.generateFilesFromPlan(plan, prompt, currentFiles, config, onFileUpdate, onPlanUpdate);
      
      return {
        success: true,
        files,
        explanation: `Generated ${Object.keys(files).length} files with ${config.mode} complexity`
      };
      
    } catch (error) {
      console.error('❌ AI Generation failed:', error);
      
      // Return Material UI fallback if everything fails
      const basicFiles: GeneratedFile = {
        'src/App.jsx': this.generateMaterialUIApp(prompt),
        'src/index.css': this.generateMaterialUIStyles()
      };
      
      return {
        success: false,
        files: basicFiles,
        explanation: 'Generated basic fallback files due to AI service error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate development plan using Claude
   */
  private static async generateDevelopmentPlan(prompt: string, config: any, onPlanUpdate?: (plan: string) => void): Promise<string | null> {
    try {
      onPlanUpdate?.("🤖 Asking Claude to create development roadmap...");

      const planningPrompt = `CRITICAL: You must return ONLY valid JSON. No explanations, no markdown, no text - just pure JSON.

Create a development plan for: "${prompt}"

Return exactly this JSON structure (replace the values with your plan):

{
  "projectName": "Brief project name",
  "description": "What this app does", 
  "files": [
    {"path": "src/App.jsx", "purpose": "Main app component", "priority": 1},
    {"path": "src/main.jsx", "purpose": "Entry point file", "priority": 2},
    {"path": "src/index.css", "purpose": "Global styles", "priority": 3}
  ]
}

REQUIREMENTS:
- Plan for EXACTLY ${config.fileCount} files maximum
- Use React + Material UI components (@mui/material)
- Return ONLY the JSON object - no other text
- Make it ${config.complexity}`;

      console.log('🔍 Sending planning prompt to Claude:', planningPrompt.substring(0, 200) + '...');

      const response = await fetch('/api/anthropic/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          messages: [{ role: 'user', content: planningPrompt }],
          model: 'claude-3-5-sonnet-20241022',
          temperature: 0.1,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`Planning API error: ${response.status}`);
      }

      const data = await response.json();
      const planResponse = data.choices?.[0]?.message?.content;
      
      if (!planResponse) {
        console.error('❌ No plan response from Claude');
        return null;
      }

      onPlanUpdate?.("📋 Development plan received! Parsing roadmap...");
      console.log('📋 Plan received from Claude:', planResponse);
      console.log('📋 Full Claude response data:', JSON.stringify(data, null, 2));
      
      // Try to extract JSON from response
      const jsonMatch = planResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const testParse = JSON.parse(jsonMatch[0]);
          console.log('✅ JSON validation successful:', testParse);
          return jsonMatch[0]; // Return just the JSON part
        } catch (parseError) {
          console.warn('⚠️ JSON validation failed:', parseError);
        }
      }
      
      // If no valid JSON found, Claude might have returned text - let's create JSON from it
      console.log('🔄 No valid JSON in response, creating structured plan from text');
      const structuredPlan = {
        projectName: "Custom React App",
        description: `Application for: ${prompt}`,
        files: config.fileCount === 2 ? [
          {"path": "src/App.jsx", "purpose": "Main application", "priority": 1},
          {"path": "src/index.css", "purpose": "Global styles", "priority": 2}
        ] : config.fileCount === 4 ? [
          {"path": "src/App.jsx", "purpose": "Main application", "priority": 1},
          {"path": "src/pages/HomePage.jsx", "purpose": "Homepage", "priority": 2},
          {"path": "src/components/Navigation.jsx", "purpose": "Navigation", "priority": 3},
          {"path": "src/index.css", "purpose": "Global styles", "priority": 4}
        ] : [
          {"path": "src/App.jsx", "purpose": "Main application", "priority": 1},
          {"path": "src/pages/HomePage.jsx", "purpose": "Homepage", "priority": 2},
          {"path": "src/pages/Dashboard.jsx", "purpose": "Dashboard", "priority": 3},
          {"path": "src/components/Navigation.jsx", "purpose": "Navigation", "priority": 4},
          {"path": "src/components/Hero.jsx", "purpose": "Hero section", "priority": 5},
          {"path": "src/index.css", "purpose": "Global styles", "priority": 6}
        ]
      };
      
      return JSON.stringify(structuredPlan);
    } catch (error) {
      console.error('❌ Planning phase failed:', error);
      console.log('🔄 Returning fallback plan due to error');
      // Return a fallback plan instead of null
      const fallbackPlan = {
        projectName: "Fallback App",
        description: `Basic application for: ${prompt}`,
        files: [
          { path: "src/App.jsx", purpose: "Main application component", priority: 1 },
          { path: "src/index.css", purpose: "Global styles", priority: 2 }
        ]
      };
      return JSON.stringify(fallbackPlan);
    }
  }

  /**
   * Generate files based on the development plan
   */
  private static async generateFilesFromPlan(
    planJson: string, 
    originalPrompt: string, 
    currentFiles: GeneratedFile, 
    config: any, 
    onFileUpdate?: (filePath: string, content: string) => void,
    onPlanUpdate?: (plan: string) => void
  ): Promise<GeneratedFile> {
    try {
      let plan;
      try {
        plan = JSON.parse(planJson);
      } catch (e) {
        console.warn('⚠️ Plan parsing failed, using fallback structure');
        // Create fallback plan structure
        const fallbackFiles = [
          { path: "src/App.jsx", purpose: "Main application component", priority: 1 },
          { path: "src/index.css", purpose: "Global styles", priority: 2 }
        ];
        if (config.fileCount > 2) {
          fallbackFiles.push({ path: "src/pages/HomePage.jsx", purpose: "Homepage component", priority: 3 });
        }
        if (config.fileCount > 3) {
          fallbackFiles.push({ path: "src/components/Navigation.jsx", purpose: "Navigation component", priority: 4 });
        }
        plan = {
          projectName: "React App",
          files: fallbackFiles.slice(0, config.fileCount)
        };
      }

      const allFiles = plan.files || [];
      // ENFORCE file count limit strictly
      const filesToGenerate = allFiles.slice(0, config.fileCount);
      onPlanUpdate?.(`🚀 Generating ${filesToGenerate.length} files (${config.mode} mode limit: ${config.fileCount})...`);
      
      const generatedFiles: GeneratedFile = {};
      
      // Generate files one by one but with speed optimizations
      for (let i = 0; i < filesToGenerate.length; i++) {
        const fileInfo = filesToGenerate[i];
        onPlanUpdate?.(`⚡ Generating ${fileInfo.path} (${i+1}/${filesToGenerate.length})...`);
        
        const fileContent = await this.generateSingleFileFast(
          fileInfo.path, 
          fileInfo.purpose, 
          originalPrompt, 
          plan.projectName || 'React App',
          config
        );
        
        if (fileContent) {
          console.log(`🔥 ORIGINAL content for ${fileInfo.path}:`, fileContent.substring(0, 500) + '...');
          
          let cleanContent = fileContent.trim();
          
          // ULTRA-AGGRESSIVE cleanup to ensure buildable code
          
          // Remove ALL markdown blocks
          cleanContent = cleanContent.replace(/```[a-zA-Z]*\s*/g, '').replace(/```/g, '').trim();
          
          console.log(`🧹 CLEANED content for ${fileInfo.path}:`, cleanContent.substring(0, 500) + '...');
          
          // Remove any lines that aren't valid code
          cleanContent = cleanContent.split('\n').filter(line => {
            const trimmed = line.trim();
            return !(
              // Remove explanatory text
              trimmed.startsWith('This ') ||
              trimmed.startsWith('The ') ||
              trimmed.startsWith('Here ') ||
              trimmed.startsWith('In this ') ||
              trimmed.startsWith('Note:') ||
              trimmed.startsWith('//') ||
              trimmed.startsWith('/*') ||
              trimmed.includes('codebase') ||
              trimmed.includes('explanation') ||
              trimmed.includes('Let me') ||
              trimmed.includes('I will') ||
              trimmed.includes('This code') ||
              // Remove invalid syntax
              trimmed.includes('jsx') && !trimmed.includes('.jsx') ||
              trimmed === '' && cleanContent.split('\n').indexOf(line) < 3
            );
          }).join('\n').trim();
          
          // Remove all backticks and ensure proper structure
          cleanContent = cleanContent.replace(/`{1,3}/g, '').trim();
          
          // For JSX files, ensure proper import/export structure
          if (fileInfo.path.endsWith('.jsx')) {
            if (!cleanContent.includes('import React')) {
              cleanContent = "import React from 'react';\n\n" + cleanContent;
            }
            if (!cleanContent.includes('export default')) {
              // Find function name and add export
              const functionMatch = cleanContent.match(/function\s+(\w+)/);
              const functionName = functionMatch ? functionMatch[1] : 'App';
              cleanContent = cleanContent + `\n\nexport default ${functionName};`;
            }
          }
          
          generatedFiles[fileInfo.path] = cleanContent;
          onFileUpdate?.(fileInfo.path, cleanContent);
          
          onPlanUpdate?.(`✅ ${fileInfo.path} completed (${cleanContent.length} chars)`);
        } else {
          onPlanUpdate?.(`⚠️ ${fileInfo.path} failed, skipping...`);
        }
        
        // Minimal delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return generatedFiles;
    } catch (error) {
      console.error('❌ Individual generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate a single file with Claude AI
   */
  private static async generateSingleFileFast(filePath: string, purpose: string, originalPrompt: string, projectName: string, config: any): Promise<string | null> {
    try {
      console.log(`🤖 Generating ${filePath} with Claude...`);
      
      // Create specific prompts for each file type that generate REAL code
      let filePrompt = '';
      
      if (filePath === 'src/App.jsx') {
        filePrompt = `Generate ONLY the React code for src/App.jsx for: "${originalPrompt}"

Requirements:
- Create a complete, functional React application 
- Use modern React hooks (useState, useEffect)
- Include real functionality relevant to "${originalPrompt}"
- Use Material UI (@mui/material) for styling
- Make it responsive and professional
- Include interactive elements
- NO explanations, NO markdown - just pure React code
- Must be production-ready and error-free

Return ONLY the JSX code, nothing else.`;
      } else if (filePath.includes('pages/')) {
        const pageName = filePath.split('/').pop()?.replace('.jsx', '') || 'Page';
        filePrompt = `Generate ONLY the React code for ${filePath} for: "${originalPrompt}"

Requirements:
- Create a ${pageName} component relevant to "${originalPrompt}"
- Use Material UI (@mui/material) for styling
- Include real functionality and content
- Make it responsive and interactive
- NO explanations, NO markdown - just pure React code
- Must export the component as default

Return ONLY the JSX code, nothing else.`;
      } else if (filePath.includes('components/')) {
        const componentName = filePath.split('/').pop()?.replace('.jsx', '') || 'Component';
        filePrompt = `Generate ONLY the React code for ${filePath} for: "${originalPrompt}"

Requirements:
- Create a ${componentName} component relevant to "${originalPrompt}"
- Use Material UI (@mui/material) for styling
- Include real functionality and interactivity
- Make it reusable and well-designed
- NO explanations, NO markdown - just pure React code
- Must export the component as default

Return ONLY the JSX code, nothing else.`;
      } else if (filePath === 'src/index.css') {
        filePrompt = `Generate ONLY the CSS code for src/index.css for: "${originalPrompt}"

Requirements:
- Create comprehensive Material UI compatible styles
- Include custom components and animations
- Make it professional and modern
- Include responsive design utilities
- NO explanations, NO markdown - just pure CSS
- Must work with the React app for "${originalPrompt}"

Return ONLY the CSS code, nothing else.`;
      } else if (filePath === 'src/main.jsx') {
        filePrompt = `Generate ONLY the React entry point code for src/main.jsx:

Requirements:
- Import React, ReactDOM/client, App component, and index.css
- Use ReactDOM.createRoot for React 18
- Include React.StrictMode wrapper
- NO explanations, NO markdown - just pure JavaScript
- Must be production-ready

Return ONLY the entry point code, nothing else.`;
      } else {
        // Generic file generation
        const fileName = filePath.split('/').pop() || 'file';
        filePrompt = `Generate ONLY the code for ${filePath} for: "${originalPrompt}"

Purpose: ${purpose}
Requirements:
- Create functional code relevant to "${originalPrompt}"
- Follow modern best practices
- NO explanations, NO markdown - just pure code
- Must be production-ready

Return ONLY the code, nothing else.`;
      }

      const response = await fetch('/api/anthropic/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          messages: [{ role: 'user', content: filePrompt }],
          model: 'claude-3-5-sonnet-20241022',
          temperature: 0.3,
          max_tokens: config.maxTokens
        })
      });

      if (!response.ok) {
        throw new Error(`File generation error: ${response.status}`);
      }

      const data = await response.json();
      const generatedCode = data.choices?.[0]?.message?.content;
      
      console.log(`🔍 Claude response for ${filePath}:`, JSON.stringify(data, null, 2));
      console.log(`📄 Generated code for ${filePath}:`, generatedCode);
      
      if (!generatedCode) {
        console.error(`❌ No code generated for ${filePath}`);
        return null;
      }
      
      console.log(`✅ Generated ${filePath} (${generatedCode.length} chars)`);
      return generatedCode;
      
    } catch (error) {
      console.error(`❌ Failed to generate ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Generate Material UI-based React application
   */
  static generateMaterialUIApp(prompt: string): string {
    const appTypes = {
      'crm': {
        title: 'AI-Powered CRM',
        features: ['Customer Management', 'Lead Tracking', 'Analytics Dashboard', 'Communication Hub'],
        primaryColor: 'primary'
      },
      'dashboard': {
        title: 'Analytics Dashboard', 
        features: ['Real-time Analytics', 'Data Visualization', 'Performance Metrics', 'Reporting'],
        primaryColor: 'info'
      },
      'ecommerce': {
        title: 'E-Commerce Platform',
        features: ['Product Catalog', 'Shopping Cart', 'Order Management', 'Payment Processing'],
        primaryColor: 'success'
      },
      'default': {
        title: 'Modern Web Application',
        features: ['User Dashboard', 'Interactive Components', 'Real-time Updates', 'Responsive Design'],
        primaryColor: 'primary'
      }
    };

    const appType = Object.keys(appTypes).find(type => 
      prompt.toLowerCase().includes(type)
    ) || 'default';
    
    const config = appTypes[appType as keyof typeof appTypes];

    return `import React, { useState, useEffect } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Box,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Fab,
  Badge,
  LinearProgress,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Dashboard,
  People,
  Analytics,
  Settings,
  Add,
  Notifications,
  MoreVert,
  TrendingUp,
  AccountCircle
} from '@mui/icons-material';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
});

function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    // Simulate data loading
    setTimeout(() => {
      setData([
        { id: 1, title: '${config.features[0]}', value: '1,234', trend: '+12%' },
        { id: 2, title: '${config.features[1]}', value: '5,678', trend: '+8%' },
        { id: 3, title: '${config.features[2]}', value: '9,012', trend: '+15%' },
        { id: 4, title: '${config.features[3]}', value: '3,456', trend: '+5%' },
      ]);
      setLoading(false);
    }, 2000);
  }, []);

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAction = (action) => {
    setSnackbar({ open: true, message: \`\${action} completed successfully!\` });
    handleMenuClose();
  };

  const menuItems = [
    { icon: <Dashboard />, text: 'Dashboard', id: 0 },
    { icon: <People />, text: 'Users', id: 1 },
    { icon: <Analytics />, text: 'Analytics', id: 2 },
    { icon: <Settings />, text: 'Settings', id: 3 },
  ];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {/* App Bar */}
        <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              ${config.title}
            </Typography>
            <IconButton color="inherit">
              <Badge badgeContent={4} color="secondary">
                <Notifications />
              </Badge>
            </IconButton>
            <IconButton color="inherit" onClick={handleMenuClick}>
              <AccountCircle />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={() => handleAction('Profile Update')}>Profile</MenuItem>
              <MenuItem onClick={() => handleAction('Settings Update')}>Settings</MenuItem>
              <MenuItem onClick={() => handleAction('Logout')}>Logout</MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Sidebar */}
        <Drawer
          variant="permanent"
          sx={{
            width: 240,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 240,
              boxSizing: 'border-box',
            },
          }}
        >
          <Toolbar />
          <Box sx={{ overflow: 'auto' }}>
            <List>
              {menuItems.map((item) => (
                <ListItem
                  button
                  key={item.id}
                  selected={selectedTab === item.id}
                  onClick={() => setSelectedTab(item.id)}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItem>
              ))}
            </List>
          </Box>
        </Drawer>

        {/* Main Content */}
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <Toolbar />
          <Container maxWidth="lg">
            {loading ? (
              <Box sx={{ mb: 3 }}>
                <LinearProgress />
                <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
                  Loading ${config.title}...
                </Typography>
              </Box>
            ) : (
              <>
                <Typography variant="h4" component="h1" gutterBottom>
                  Welcome to ${config.title}
                </Typography>
                
                <Alert severity="info" sx={{ mb: 3 }}>
                  This is a fully functional Material UI application with real-time features!
                </Alert>

                <Grid container spacing={3}>
                  {data.map((item) => (
                    <Grid item xs={12} sm={6} md={3} key={item.id}>
                      <Card elevation={3}>
                        <CardContent>
                          <Typography variant="h6" color="text.secondary" gutterBottom>
                            {item.title}
                          </Typography>
                          <Typography variant="h4" component="div">
                            {item.value}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <TrendingUp color="success" fontSize="small" />
                            <Chip
                              label={item.trend}
                              color="success"
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          </Box>
                        </CardContent>
                        <CardActions>
                          <Button size="small" onClick={() => handleAction(\`View \${item.title}\`)}>View Details</Button>
                          <IconButton size="small">
                            <MoreVert />
                          </IconButton>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                <Box sx={{ mt: 4 }}>
                  <Typography variant="h5" gutterBottom>
                    Quick Actions
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item>
                      <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => handleAction('Create New Item')}
                      >
                        Create New
                      </Button>
                    </Grid>
                    <Grid item>
                      <Button
                        variant="outlined"
                        startIcon={<Analytics />}
                        onClick={() => handleAction('Generate Report')}
                      >
                        Generate Report
                      </Button>
                    </Grid>
                    <Grid item>
                      <Button
                        variant="outlined"
                        startIcon={<Settings />}
                        onClick={() => handleAction('Open Settings')}
                      >
                        Settings
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              </>
            )}
          </Container>
        </Box>

        {/* Floating Action Button */}
        <Fab
          color="${config.primaryColor}"
          aria-label="add"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => handleAction('Quick Add')}
        >
          <Add />
        </Fab>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity="success"
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

export default App;`;
  }

  /**
   * Generate Material UI-compatible styles
   */
  static generateMaterialUIStyles(): string {
    return `/* Material UI Global Styles */
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
@import url('https://fonts.googleapis.com/icon?family=Material+Icons');

body {
  margin: 0;
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #fafafa;
}

* {
  box-sizing: border-box;
}

#root {
  min-height: 100vh;
}

/* Custom scrollbar for better Material UI integration */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Animation for smooth interactions */
.MuiCard-root {
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.MuiCard-root:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.12);
}

/* Custom loading animation */
@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.loading {
  animation: pulse 1.5s ease-in-out infinite;
}`;
  }
}