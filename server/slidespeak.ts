import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

interface SlideContent {
  title: string;
  content: string[];
  keyPoints?: string[];
  speakerNotes?: string;
}

interface PitchDeckData {
  slides: SlideContent[];
  title?: string;
  overview?: string;
  keyMessages?: string[];
  callToAction?: string;
}

interface SlidesSpeakResponse {
  success: boolean;
  taskId?: string;
  downloadUrl?: string;
  pptxUrl?: string;
  pdfUrl?: string;
  message?: string;
  error?: string;
  status?: string;
}

export async function generatePitchDeckFile(pitchData: PitchDeckData): Promise<SlidesSpeakResponse> {
  const apiKey = process.env.SLIDESPEAK_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️ SlideSpeak API key not configured');
    return {
      success: false,
      error: 'SlideSpeak API key not configured. Please set SLIDESPEAK_API_KEY environment variable.'
    };
  }

  try {
    console.log('🎨 Generating pitch deck with SlideSpeak...');
    
    // Create simple, clean content that SlideSpeak can definitely process
    const plainTextContent = pitchData.slides.map((slide, index) => {
      const title = slide.title || `Slide ${index + 1}`;
      const content = Array.isArray(slide.content) 
        ? slide.content.join(' ') 
        : String(slide.content || '');
      return `${title}\n${content}`;
    }).join('\n\n');

    // SlideSpeak only supports 'default' and 'gradient' templates
    const theme = (pitchData as any).theme || 'professional';
    const template = (pitchData as any).template || 'modern-business';
    
    console.log('🔍 Debug - Theme:', theme, 'Template:', template);
    
    // Always use 'default' template - it's the most reliable
    const validTemplate = 'default';

    const slideCount = Math.max(3, Math.min(pitchData.slides.length, 15));
    
    const requestPayload = {
      plain_text: plainTextContent,
      length: slideCount,
      template: validTemplate
    };
    
    console.log('🔍 Final template being sent:', validTemplate);

    console.log(`📤 Sending request to SlideSpeak with ${pitchData.slides.length} slides`);
    console.log('📋 Request payload:', JSON.stringify(requestPayload, null, 2));

    const response = await fetch('https://api.slidespeak.co/api/v1/presentation/generate', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });

    const responseText = await response.text();
    console.log('📥 SlideSpeak response status:', response.status);
    console.log('📥 SlideSpeak response body:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = { error: responseText };
    }

    if (!response.ok) {
      throw new Error(`SlideSpeak API error: ${response.status} - ${data.message || 'Unknown error'}`);
    }

    if (response.ok && data.task_id) {
      console.log('✅ Pitch deck generation started! Task ID:', data.task_id);
      return {
        success: true,
        taskId: data.task_id,
        message: `Pitch deck generation started! Task ID: ${data.task_id}`
      };
    } else {
      console.error('❌ SlideSpeak generation failed:', data);
      return {
        success: false,
        error: data.error || data.message || 'Failed to generate pitch deck'
      };
    }

  } catch (error) {
    console.error('❌ SlideSpeak API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function checkSlidesSpeakStatus(taskId: string): Promise<SlidesSpeakResponse> {
  const apiKey = process.env.SLIDESPEAK_API_KEY;
  
  if (!apiKey) {
    return {
      success: false,
      error: 'SlideSpeak API key not configured'
    };
  }

  try {
    // Step 1: Poll task status
    const statusResponse = await fetch(`https://api.slidespeak.co/api/v1/task_status/${taskId}`, {
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json'
      }
    });

    const data = await statusResponse.json() as any;
    console.log('📋 Task status response:', data);

    if (!statusResponse.ok) {
      throw new Error(`SlideSpeak API error: ${statusResponse.status}`);
    }

    const taskStatus: string = data.task_status;

    // Not done yet — return current status so caller can keep polling
    if (taskStatus !== 'SUCCESS') {
      return {
        success: false,
        status: taskStatus,
        message: taskStatus,
        error: taskStatus === 'FAILURE' ? 'SlideSpeak generation failed.' : undefined,
        taskId
      };
    }

    // Step 2: Extract request_id from task_result
    const requestId = data.task_result?.request_id;
    if (!requestId) {
      throw new Error('Missing request_id in task_result after SUCCESS');
    }
    console.log('🔗 Fetching download URL for request_id:', requestId);

    // Step 3: Get temporary download URL from SlideSpeak
    const downloadEndpointResponse = await fetch(
      `https://api.slidespeak.co/api/v1/presentation/download/${requestId}`,
      {
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json'
        }
      }
    );

    const downloadData = await downloadEndpointResponse.json() as any;
    console.log('📥 Download endpoint response:', downloadData);

    if (!downloadEndpointResponse.ok || !downloadData.url) {
      throw new Error('Failed to fetch download URL from SlideSpeak');
    }

    const tempUrl: string = downloadData.url;

    // Step 4: Download the PPTX binary and save locally
    console.log('⬇️ Downloading PPTX from temp URL...');
    const pptxResponse = await fetch(tempUrl);
    console.log('📦 PPTX download status:', pptxResponse.status, pptxResponse.statusText);
    console.log('📦 PPTX content-type:', pptxResponse.headers.get('content-type'));
    console.log('📦 PPTX content-length:', pptxResponse.headers.get('content-length'));

    if (!pptxResponse.ok) {
      const errBody = await pptxResponse.text();
      throw new Error(`Failed to download PPTX file: ${pptxResponse.status} - ${errBody.slice(0, 200)}`);
    }

    // node-fetch v2 uses .buffer() (not .arrayBuffer()) to get a Node.js Buffer
    const pptxBuffer = await (pptxResponse as any).buffer() as Buffer;
    console.log('📦 PPTX buffer size:', pptxBuffer.length, 'bytes');

    // Validate it's a ZIP/PPTX file (starts with PK magic bytes 0x50 0x4B)
    if (pptxBuffer.length < 4 || pptxBuffer[0] !== 0x50 || pptxBuffer[1] !== 0x4B) {
      const preview = pptxBuffer.slice(0, 200).toString('utf8');
      throw new Error(`Downloaded content is not a valid PPTX file. Preview: ${preview}`);
    }

    const pptxDir = path.join(process.cwd(), 'uploads', 'pitch');
    if (!fs.existsSync(pptxDir)) {
      fs.mkdirSync(pptxDir, { recursive: true });
    }

    const pptxFilename = `pitch-${Date.now()}-${taskId.slice(0, 8)}.pptx`;
    const pptxLocalPath = path.join(pptxDir, pptxFilename);
    fs.writeFileSync(pptxLocalPath, pptxBuffer);
    console.log('✅ PPTX saved locally:', pptxLocalPath);

    const localPptxUrl = `/uploads/pitch/${pptxFilename}`;

    return {
      success: true,
      status: 'SUCCESS',
      downloadUrl: localPptxUrl,
      pptxUrl: localPptxUrl,
      message: 'SUCCESS',
      taskId
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}