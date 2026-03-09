import { Router } from 'express';
import { VercelDeployer, type VercelDeployment } from '@shared/vercel-deploy';

const router = Router();

// Deploy a project to Vercel
router.post('/deploy', async (req, res) => {
  try {
    const { name, files, projectSettings } = req.body as VercelDeployment;
    
    if (!name || !files || !Array.isArray(files)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: name, files' 
      });
    }

    // Get Vercel credentials from environment
    const vercelToken = process.env.VERCEL_TOKEN;
    const vercelTeamId = process.env.VERCEL_TEAM_ID;

    if (!vercelToken) {
      return res.status(500).json({ 
        success: false, 
        error: 'Vercel token not configured' 
      });
    }

    console.log(`🚀 Starting Vercel deployment for: ${name}`);
    console.log(`📁 Files to deploy: ${files.length}`);

    const deployer = new VercelDeployer(vercelToken, vercelTeamId);
    const result = await deployer.deployProject({ name, files, projectSettings });

    if (result.success) {
      console.log(`✅ Deployment successful: ${result.url}`);
    } else {
      console.error(`❌ Deployment failed: ${result.error}`);
    }

    res.json(result);

  } catch (error) {
    console.error('Vercel deployment error:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Deployment failed' 
    });
  }
});

// Check deployment status
router.get('/deployment/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    
    const vercelToken = process.env.VERCEL_TOKEN;
    const vercelTeamId = process.env.VERCEL_TEAM_ID;

    if (!vercelToken) {
      return res.status(500).json({ 
        success: false, 
        error: 'Vercel token not configured' 
      });
    }

    const deployer = new VercelDeployer(vercelToken, vercelTeamId);
    const status = await deployer.getDeploymentStatus(id);

    res.json(status);

  } catch (error) {
    console.error('Error checking deployment status:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to check status' 
    });
  }
});

export default router;