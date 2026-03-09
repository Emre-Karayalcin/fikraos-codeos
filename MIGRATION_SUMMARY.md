# Azure OpenAI + GPT Realtime API Migration Summary

## Overview
Successfully migrated FikraOS from standard OpenAI to Azure OpenAI for chat completions, and from Eleven Labs to GPT-4 Realtime API for voice conversations.

## Changes Made

### 1. Backend - Azure OpenAI Integration

#### Updated Files:
- **`/server/openai.ts`** (lines 1-18)
  - Changed from standard OpenAI client to Azure OpenAI
  - Updated environment variables: `AZURE_OPENAI_ENDPOINT_DEV`, `AZURE_OPENAI_API_KEY_DEV`, `AZURE_OPENAI_API_VERSION`, `AZURE_OPENAI_DEPLOYMENT`
  - Deployment: `gpt-4o-fikra-dev` for all requests

- **`/server/routes.ts`** (lines 38-53)
  - Updated OpenAI client initialization to use Azure OpenAI
  - Same configuration pattern as openai.ts

- **`/server/openai-routes.ts`** (lines 13-24)
  - Updated OpenAI client initialization to use Azure OpenAI
  - Maintains hardcoded model reference (now uses deployment name)

### 2. Backend - GPT Realtime API Integration

#### New File:
- **`/server/gpt-realtime.ts`** (NEW)
  - Complete GPT-4 Realtime API integration
  - Functions:
    - `getRealtimeConnection()` - Returns WebSocket URL and session config
    - `endRealtimeConversation()` - Cleanup function
    - `buildExpertPrompt()` - Creates expert-specific system prompts
  - Supports 3 expert types: GTM, Finance, Product
  - Bilingual support: English and Arabic
  - Integrates user's project ideas for personalized advice

#### Updated Routes in `/server/routes.ts`:
- **`/api/elevenlabs/conversation/start`** → **`/api/realtime/conversation/start`** (lines 2563-2622)
  - Returns: `websocketUrl`, `sessionConfig`, `conversationId`
  - Fetches user's projects for context
  - Configures GPT Realtime session with expert prompts

- **`/api/elevenlabs/conversation/end`** → **`/api/realtime/conversation/end`** (lines 2624-2645)
  - Cleanup endpoint for realtime sessions

- **`/api/elevenlabs/text-chat`** → **`/api/experts/text-chat`** (line 2647)
  - Renamed endpoint (functionality unchanged - already used OpenAI)

#### Removed File:
- **`/server/elevenlabs.ts`** (DELETED)

### 3. Frontend - GPT Realtime WebSocket Protocol

#### Updated File: `/client/src/pages/Experts.tsx`

**Key Changes:**
- **Function renamed:** `connectToElevenLabsWebSocket()` → `connectToRealtimeWebSocket()` (line 118)
- **Function renamed:** `sendPCMToElevenLabs()` → `sendPCMToRealtime()` (line 323)

**WebSocket Protocol Updates:**
- **Session initialization:**
  ```typescript
  // OLD (Eleven Labs)
  {
    conversation_initiation_client_data: {
      custom_llm_extra_body: { system: systemPrompt }
    }
  }

  // NEW (GPT Realtime)
  {
    type: 'session.update',
    session: sessionConfig // Pre-configured by backend
  }
  ```

- **Audio input format:**
  ```typescript
  // OLD (Eleven Labs)
  {
    user_audio_chunk: base64Audio
  }

  // NEW (GPT Realtime)
  {
    type: 'input_audio_buffer.append',
    audio: base64Audio
  }
  ```

- **WebSocket message handling:**
  - `session.created` - Session initialization
  - `session.updated` - Config confirmation
  - `response.audio.delta` - Streaming audio chunks
  - `response.audio.done` - Audio completion
  - `conversation.item.input_audio_transcription.completed` - User transcription
  - `response.text.delta` - Agent text (optional)
  - `error` - Error handling

**API Endpoint Updates:**
- `/api/elevenlabs/conversation/start` → `/api/realtime/conversation/start` (line 375)
- `/api/elevenlabs/conversation/end` → `/api/realtime/conversation/end` (in endAudioCall)
- `/api/elevenlabs/text-chat` → `/api/experts/text-chat` (line 538)

### 4. Configuration Updates

#### `.env.example` Updates:
- **Added:**
  ```bash
  # Azure OpenAI for Chat Completions
  AZURE_OPENAI_ENDPOINT_DEV=https://your-azure-endpoint.cognitiveservices.azure.com
  AZURE_OPENAI_API_KEY_DEV=your-azure-openai-api-key-here
  AZURE_OPENAI_API_VERSION=2025-01-01-preview
  AZURE_OPENAI_DEPLOYMENT=gpt-4o-fikra-dev

  # Azure OpenAI Realtime API (for voice conversations)
  AZURE_OPENAI_REALTIME_ENDPOINT=https://your-realtime-endpoint.cognitiveservices.azure.com
  AZURE_OPENAI_REALTIME_API_KEY=your-realtime-api-key-here
  AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-realtime
  AZURE_OPENAI_REALTIME_API_VERSION=2024-10-01-preview
  ```

- **Deprecated (commented out):**
  ```bash
  # OPENAI_API_KEY=sk-your-openai-key-here
  # ELEVENLABS_API_KEY=your-elevenlabs-key-here
  ```

## Environment Variables Required on Railway

Make sure these variables are set on Railway:

### Chat Completions (Azure OpenAI):
- `AZURE_OPENAI_ENDPOINT_DEV` = `https://aif-infp-dev-swc-01.cognitiveservices.azure.com`
- `AZURE_OPENAI_API_KEY_DEV` = `<your-azure-openai-api-key>`
- `AZURE_OPENAI_API_VERSION` = `2025-01-01-preview`
- `AZURE_OPENAI_DEPLOYMENT` = `gpt-4o-fikra-dev`

### Realtime API (GPT-4 Realtime):
- `AZURE_OPENAI_REALTIME_ENDPOINT` = `https://matou-mj67zwfe-centralus.cognitiveservices.azure.com`
- `AZURE_OPENAI_REALTIME_API_KEY` = `<your-azure-realtime-api-key>`
- `AZURE_OPENAI_REALTIME_DEPLOYMENT` = `gpt-realtime`
- `AZURE_OPENAI_REALTIME_API_VERSION` = `2024-10-01-preview`

### Variables to Remove:
- `OPENAI_API_KEY` (deprecated)
- `ELEVENLABS_API_KEY` (deprecated)

## Technical Details

### Azure OpenAI Configuration
- **SDK:** OpenAI SDK v5.20.0 (already installed)
- **Base URL Format:** `{endpoint}/openai/deployments/{deployment}`
- **Headers:** Uses `api-key` instead of `Authorization: Bearer`
- **API Version:** Specified in query parameters
- **Deployment:** `gpt-4o-fikra-dev` used for all requests (gpt-4 and gpt-4o)

### GPT Realtime API Configuration
- **Protocol:** WebSocket (wss://)
- **Audio Format:** PCM16, 16kHz, mono
- **Session Config:** Sent via `session.update` message
- **Features:**
  - Server-side Voice Activity Detection (VAD)
  - Streaming audio in delta chunks
  - Automatic transcription
  - Bilingual support (EN/AR)
  - Expert system prompts (GTM, Finance, Product)
  - User context integration (project ideas)

## Testing Checklist

Once deployed to Railway:

- [ ] **Chat Completions**
  - [ ] Business asset generation (all types)
  - [ ] Chat modes (fast, balanced, advanced)
  - [ ] Bilingual support (English/Arabic)

- [ ] **Voice Conversations (Realtime API)**
  - [ ] WebSocket connection establishment
  - [ ] Audio input (microphone capture)
  - [ ] Audio output (agent responses)
  - [ ] All expert types (GTM, Finance, Product)
  - [ ] Language switching (English/Arabic)
  - [ ] Graceful disconnection

- [ ] **Text Chat**
  - [ ] Expert text chat (all types)
  - [ ] Bilingual support
  - [ ] User context integration

## Potential Issues & Solutions

### 1. WebSocket Connection Issues
- **Symptom:** Can't connect to realtime endpoint
- **Check:** API key included in WebSocket URL query params
- **Verify:** Endpoint URL format is correct

### 2. Audio Format Issues
- **Symptom:** No audio playback or garbled audio
- **Check:** Audio format set to `pcm16` in session config
- **Verify:** Sample rate is 16kHz (matching frontend)

### 3. Session Configuration
- **Symptom:** Agent doesn't respond or wrong language
- **Check:** Session config sent after WebSocket connection opens
- **Verify:** System prompts include language instructions

### 4. CORS Issues
- **Symptom:** WebSocket connection blocked
- **Solution:** Already handled server-side, but verify CORS headers if issues persist

## Files Modified

### Backend:
- `/server/openai.ts` ✅
- `/server/routes.ts` ✅
- `/server/openai-routes.ts` ✅
- `/server/gpt-realtime.ts` ✅ (NEW)
- `/server/elevenlabs.ts` ❌ (DELETED)

### Frontend:
- `/client/src/pages/Experts.tsx` ✅

### Configuration:
- `/.env.example` ✅

## Migration Complete ✅

All code changes are complete and ready for deployment. The application will use:
- **Azure OpenAI** for all chat completions and business asset generation
- **GPT-4 Realtime API** for voice conversations with experts
- Same user experience with improved performance and reliability
