import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/contexts/LanguageContext';
import { UnifiedSidebar } from '@/components/layout/UnifiedSidebar';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LogOut, Mic, MessageSquare, Phone, PhoneOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useBranding } from '@/contexts/BrandingContext';

type Expert = 'gtm' | 'finance' | 'product';
type Mode = 'audio' | 'text';

interface LanguageOption {
  code: string;
  name: string;
  nameAr: string;
}

const languageOptions: LanguageOption[] = [
  { code: 'en', name: 'English', nameAr: 'الإنجليزية' },
  { code: 'ar', name: 'العربية', nameAr: 'العربية' }
];

interface ExpertConfig {
  id: Expert;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  colors: {
    from: string;
    to: string;
  };
}

const experts: ExpertConfig[] = [
  {
    id: 'gtm',
    name: 'GTM Expert',
    nameAr: 'خبير التسويق',
    description: 'Go-to-market strategy and growth',
    descriptionAr: 'استراتيجية الدخول للسوق والنمو',
    colors: {
      from: 'from-blue-400',
      to: 'to-green-500'
    }
  },
  {
    id: 'finance',
    name: 'Finance Expert',
    nameAr: 'خبير التمويل',
    description: 'Financial planning and investment',
    descriptionAr: 'التخطيط المالي والاستثمار',
    colors: {
      from: 'from-purple-400',
      to: 'to-indigo-600'
    }
  },
  {
    id: 'product',
    name: 'Product Expert',
    nameAr: 'خبير المنتج',
    description: 'Product strategy and development',
    descriptionAr: 'استراتيجية وتطوير المنتج',
    colors: {
      from: 'from-orange-400',
      to: 'to-rose-500'
    }
  }
];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function Experts() {
  const { t, i18n } = useTranslation();
  const { isRTL } = useLanguage();
  const { user, logout, isAuthenticated } = useAuth();
  const { expertsTitleEn, expertsTitleAr, expertsDescEn, expertsDescAr } = useBranding();
  const lang = i18n?.language?.startsWith('ar') ? 'ar' : 'en';
 
  const [selectedExpert, setSelectedExpert] = useState<Expert>('gtm');
  const [selectedMode, setSelectedMode] = useState<Mode>('audio');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [isCallActive, setIsCallActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'listening' | 'talking'>('idle');
  const callStatusRef = useRef<'idle' | 'connecting' | 'listening' | 'talking'>('idle');
  const [showTextChat, setShowTextChat] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const webSocketRef = useRef<WebSocket | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isPlayingAudioRef = useRef<boolean>(false);
  const audioQueueRef = useRef<Uint8Array[]>([]);

  const currentExpert = experts.find(e => e.id === selectedExpert)!;

  // Connect to GPT Realtime WebSocket for real-time conversation
  const connectToRealtimeWebSocket = async (websocketUrl: string, conversationId: string, sessionConfig: any, language: string = 'en') => {
    try {
      console.log('🔌 Connecting to GPT Realtime WebSocket...');
      console.log('🌐 Language set to:', language);

      const ws = new WebSocket(websocketUrl);
      webSocketRef.current = ws;

      ws.onopen = () => {
        console.log('✅ GPT Realtime WebSocket connected');
        console.log('🎙️ Real-time audio streaming to GPT Realtime started');
        console.log('🎙️ Audio call started with conversation ID:', conversationId);

        // Send session configuration (already prepared by backend)
        const sessionUpdateMessage = {
          type: 'session.update',
          session: sessionConfig
        };

        ws.send(JSON.stringify(sessionUpdateMessage));
        console.log('📤 Sent session configuration to GPT Realtime');
        console.log('📤 Session config:', JSON.stringify(sessionConfig, null, 2));

        // The agent will respond when it receives audio input
        console.log('🎉 Session initialized - setting status to listening');

        // Set status to listening AFTER successful WebSocket connection
        setTimeout(() => {
          setCallStatus('listening');
          callStatusRef.current = 'listening';
          console.log('🎧 Status updated to listening - ready for voice input!');
        }, 100);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📥 Received from GPT Realtime:', data);

          // Handle session creation
          if (data.type === 'session.created') {
            console.log('🎉 Session created:', data.session);
          }

          // Handle session update confirmation
          if (data.type === 'session.updated') {
            console.log('✅ Session updated successfully');
          }

          // Handle audio delta (streaming audio chunks)
          if (data.type === 'response.audio.delta') {
            const audioData = data.delta;
            if (audioData && audioData.length > 0) {
              console.log('🔊 Received audio delta, length:', audioData.length);

              // Queue audio instead of playing immediately
              queueAudioFromBase64(audioData);
            }
          }

          // Handle audio completion
          if (data.type === 'response.audio.done') {
            console.log('✅ Audio response complete');
            // Audio queue will handle transitioning back to listening
          }

          // Handle text transcript deltas (optional, for debugging)
          if (data.type === 'conversation.item.input_audio_transcription.completed') {
            console.log('🎤 User said:', data.transcript);
            // Show visual feedback that speech was detected
            setCallStatus('talking');
            callStatusRef.current = 'talking';
            setTimeout(() => {
              setCallStatus('listening');
              callStatusRef.current = 'listening';
            }, 1000);
          }

          // Handle agent text responses (optional)
          if (data.type === 'response.text.delta') {
            console.log('🤖 Agent text:', data.delta);
          }

          // Handle errors
          if (data.type === 'error') {
            console.error('❌ GPT Realtime error:', data.error);
          }

        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ GPT Realtime WebSocket error:', error);
      };

      ws.onclose = (event) => {
        console.log('🔌 GPT Realtime WebSocket closed:', event.code, event.reason);
        setCallStatus('idle');
      };

    } catch (error) {
      console.error('Failed to connect to GPT Realtime WebSocket:', error);
    }
  };

  // Queue audio from base64 data (prevents multiple streams)
  const queueAudioFromBase64 = (base64Audio: string) => {
    try {
      // Decode base64 to binary
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Add to queue
      audioQueueRef.current.push(bytes);
      
      // Process queue if not already playing
      processAudioQueue();
      
    } catch (error) {
      console.error('❌ Error processing audio:', error);
    }
  };

  // Process audio queue to ensure only one stream plays at a time
  const processAudioQueue = async () => {
    // If already playing audio, don't start another stream
    if (isPlayingAudioRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isPlayingAudioRef.current = true;
    setCallStatus('talking');
    callStatusRef.current = 'talking';

    // Initialize audio context if needed
    if (!audioContextRef.current) {
      // Create AudioContext with 24kHz sample rate to match OpenAI Realtime API output
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000
      });
    }

    try {
      // Get the next audio chunk
      const pcmData = audioQueueRef.current.shift()!;
      
      console.log('🎵 Playing queued PCM audio, remaining in queue:', audioQueueRef.current.length);
      
      // Convert PCM data to 16-bit signed integers
      const samples = new Int16Array(pcmData.buffer);
      
      // Create audio buffer (24kHz, mono channel)
      const sampleRate = 24000;
      const numberOfChannels = 1;
      const audioBuffer = audioContextRef.current.createBuffer(numberOfChannels, samples.length, sampleRate);
      
      // Convert 16-bit PCM to float32 and copy to audio buffer
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) {
        channelData[i] = samples[i] / 32768.0; // Convert to -1.0 to 1.0 range
      }
      
      // Create source and play
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;

      // Adjust playback rate to compensate for AudioContext/buffer sample rate mismatch
      // This ensures audio plays at normal speed regardless of hardware sample rate
      const contextSampleRate = audioContextRef.current.sampleRate;
      const bufferSampleRate = audioBuffer.sampleRate;
      source.playbackRate.value = contextSampleRate / bufferSampleRate;

      console.log(`🎵 Audio playback: Context=${contextSampleRate}Hz, Buffer=${bufferSampleRate}Hz, PlaybackRate=${source.playbackRate.value}`);

      // Add gain control - lower volume to reduce feedback
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = 0.6;

      source.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      source.start();
      console.log('✅ Queued PCM audio playback started');
      
      source.onended = () => {
        console.log('🔇 Queued PCM audio playback ended');
        isPlayingAudioRef.current = false;
        
        // Process next audio in queue
        if (audioQueueRef.current.length > 0) {
          processAudioQueue(); // Immediate - no gap between chunks
        } else {
          setCallStatus('listening');
          callStatusRef.current = 'listening';
        }
      };
      
    } catch (error) {
      console.error('❌ Queued PCM audio playback failed:', error);
      isPlayingAudioRef.current = false;
      setCallStatus('listening');
      callStatusRef.current = 'listening';
      
      // Continue processing queue even if one chunk fails
      if (audioQueueRef.current.length > 0) {
        setTimeout(() => processAudioQueue(), 100);
      }
    }
  };

  // Send PCM audio data directly to GPT Realtime API
  const sendPCMToRealtime = (pcmData: Int16Array) => {
    // Use the ref for real-time status checking
    if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN && callStatusRef.current === 'listening') {
      try {
        // Convert to base64
        const uint8Array = new Uint8Array(pcmData.buffer);
        const base64Audio = btoa(String.fromCharCode(...uint8Array));

        // Send in GPT Realtime API format
        const message = {
          type: 'input_audio_buffer.append',
          audio: base64Audio
        };

        console.log('📤 Sending PCM audio to GPT Realtime, samples:', pcmData.length);
        webSocketRef.current!.send(JSON.stringify(message));
      } catch (error) {
        console.error('❌ Error sending PCM audio:', error);
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedMode === 'text') {
      const timer = setTimeout(() => setShowTextChat(true), 300);
      return () => clearTimeout(timer);
    } else {
      setShowTextChat(false);
    }
  }, [selectedMode]);

  const startAudioCall = async () => {
    try {
      setIsLoading(true);
      setCallStatus('connecting');
      setIsCallActive(true);

      // Start GPT Realtime conversation
      const response = await fetch('/api/realtime/conversation/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          expertType: selectedExpert,
          language: selectedLanguage
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start conversation');
      }

      const data = await response.json();
      console.log('🎯 Received conversation data:', data);
      conversationIdRef.current = data.conversationId;

      // Connect to GPT Realtime WebSocket for real streaming
      if (data.websocketUrl) {
        console.log('🚀 Starting WebSocket connection to GPT Realtime...');
        await connectToRealtimeWebSocket(data.websocketUrl, data.conversationId, data.sessionConfig, selectedLanguage);
      } else {
        console.warn('⚠️ No websocketUrl received, using fallback behavior');
        setCallStatus('listening'); // Fallback to listening mode
      }
      
      // Initialize audio stream for real voice communication
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000,
            channelCount: 1
          } 
        });
        setAudioStream(stream);
        
        // Set up direct PCM audio capture using AudioContext (more reliable than MediaRecorder)
        const audioContext = new AudioContext({ sampleRate: 16000 });
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        
        processor.onaudioprocess = (event) => {
          // Use the current state directly from the React component instead of closure variable
          if (callStatusRef.current === 'listening') {
            const inputData = event.inputBuffer.getChannelData(0);
            
            // Convert float32 PCM to int16 PCM for GPT Realtime
            const int16Array = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              const sample = Math.max(-1, Math.min(1, inputData[i]));
              int16Array[i] = sample * 0x7FFF;
            }

            // Send PCM data to GPT Realtime
            sendPCMToRealtime(int16Array);
          }
        };
        
        source.connect(processor);
        processor.connect(audioContext.destination);
        
        console.log('🎤 Started direct PCM audio capture at 16kHz');
        
        // Set up voice activity detection using the same audioContext
        const analyser = audioContext.createAnalyser();
        source.connect(analyser);
        
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        let isCurrentlySpeaking = false;
        
        // Voice activity detection for UI feedback only
        const detectVoiceActivity = () => {
          analyser.getByteFrequencyData(dataArray);
          
          // Calculate average volume
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          
          // Voice detection threshold - higher for less sensitivity
          const voiceThreshold = 50;
          const isSpeaking = average > voiceThreshold;
          
          if (isSpeaking && !isCurrentlySpeaking) {
            isCurrentlySpeaking = true;
            console.log('🎤 Voice detected - streaming to GPT Realtime');
          } else if (!isSpeaking && isCurrentlySpeaking) {
            isCurrentlySpeaking = false;
            console.log('🤐 Voice ended');
          }
        };

        // Start voice activity detection loop for UI feedback - less frequent
        const detectionInterval = setInterval(detectVoiceActivity, 200);

        // Store references for cleanup
        mediaRecorderRef.current = { audioContext, processor, source, analyser, detectionInterval } as any;

        // Audio setup complete

        console.log('🎙️ Real-time audio streaming to GPT Realtime started');
        
        console.log('🎙️ Audio call started with conversation ID:', data.conversationId);
        
      } catch (audioError) {
        console.error('Failed to access microphone:', audioError);
        // Fall back to simulated behavior if audio access fails
        setTimeout(() => {
          setCallStatus('listening');
          callStatusRef.current = 'listening';
        }, 1500);
      }
      
    } catch (error) {
      console.error('Failed to start audio call:', error);
      setIsCallActive(false);
      setCallStatus('idle');
      callStatusRef.current = 'idle';
    } finally {
      setIsLoading(false);
    }
  };

  const endAudioCall = async () => {
    try {
      // Update UI state
      setIsCallActive(false);
      setCallStatus('idle');
      callStatusRef.current = 'idle';
      conversationIdRef.current = null;

      // 1. Close WebSocket connection
      if (webSocketRef.current) {
        try {
          webSocketRef.current.close();
          console.log('🔌 WebSocket connection closed');
        } catch (err) {
          console.warn('WebSocket close error:', err);
        }
        webSocketRef.current = null;
      }

      // 2. Stop and clean up microphone stream
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
      }

      // 3. Clean up audio processing resources
      if (mediaRecorderRef.current) {
        const { audioContext, processor, source, analyser, detectionInterval } = mediaRecorderRef.current;

        // Clear voice detection interval
        if (detectionInterval) {
          clearInterval(detectionInterval);
        }

        // Disconnect audio nodes
        try {
          if (processor) processor.disconnect();
          if (source) source.disconnect();
          if (analyser) analyser.disconnect();
          if (audioContext && audioContext.state !== 'closed') {
            audioContext.close();
          }
        } catch (err) {
          console.warn('Audio node cleanup error:', err);
        }

        mediaRecorderRef.current = null;
      }

      // 4. Close playback AudioContext
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          await audioContextRef.current.close();
          console.log('🎵 AudioContext closed');
        } catch (err) {
          console.warn('AudioContext close error:', err);
        }
        audioContextRef.current = null;
      }

      // 5. Clear audio queue and reset playback state
      audioQueueRef.current = [];
      isPlayingAudioRef.current = false;  // Reset to allow next call to play audio

      console.log('✅ Audio call ended and all resources cleaned up');

    } catch (error) {
      console.error('Failed to end audio call:', error);
    }
  };

  const sendTextMessage = async () => {
    if (!currentMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/experts/text-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message: currentMessage,
          expertType: selectedExpert,
          language: selectedLanguage
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  };

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Left Sidebar - Hide on mobile when bottom nav is present */}
      <div className="hidden sm:block">
        <UnifiedSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-8 relative min-w-0 pb-20 sm:pb-0">
        {/* Wrapper with proper spacing */}
        <div className="absolute top-4 sm:top-6 ltr:right-4 ltr:sm:right-6 rtl:left-4 rtl:sm:left-6 flex items-center gap-2 sm:gap-3 z-10">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-xl sm:max-w-2xl mx-auto py-8 flex-shrink-0 flex-1 flex flex-col">
          {/* Title */}
          <div>
            <div className="mb-8 sm:mb-12 text-center">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold mb-4 sm:mb-6 text-text-primary leading-tight px-4">
                {(lang === 'ar' ? expertsTitleAr : expertsTitleEn) || t('experts.title')}
              </h1>
              <p className="text-text-secondary text-lg">
                {(lang === 'ar' ? expertsDescAr : expertsDescEn) || t('experts.subtitle')}
              </p>
            </div>
          </div>
          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            {/* Expert Selection */}
            <div className="w-full sm:w-auto">
              <Select value={selectedExpert} onValueChange={(value: Expert) => setSelectedExpert(value)}>
                <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-expert">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {experts.map((expert) => (
                    <SelectItem key={expert.id} value={expert.id}>
                      {isRTL ? expert.nameAr : expert.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mode Selection */}
            <div className="w-full sm:w-auto">
              <Select value={selectedMode} onValueChange={(value: Mode) => setSelectedMode(value)}>
                <SelectTrigger className="w-full sm:w-[120px]" data-testid="select-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="audio">
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4" />
                      {t('experts.modes.audio')}
                    </div>
                  </SelectItem>
                  <SelectItem value="text">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      {t('experts.modes.text')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Language Selection */}
            <div className="w-full sm:w-auto">
              <Select value={selectedLanguage} onValueChange={(value: string) => setSelectedLanguage(value)}>
                <SelectTrigger className="w-full sm:w-[140px]" data-testid="select-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {isRTL ? lang.nameAr : lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Modern Glassy Orb */}
            <div className="relative mb-8">
              <div className="relative">
                {/* Main Orb with Glassy Effect */}
                <motion.div
                  className="w-32 h-32 sm:w-40 sm:h-40 mx-auto rounded-full relative overflow-hidden"
                  style={{
                    background: selectedExpert === 'gtm' 
                      ? `
                        radial-gradient(ellipse at top left, rgba(52, 211, 153, 0.6), transparent 50%),
                        radial-gradient(ellipse at top right, rgba(16, 185, 129, 0.4), transparent 50%),
                        radial-gradient(ellipse at bottom, rgba(6, 182, 212, 0.5), transparent 50%),
                        linear-gradient(135deg, rgba(52, 211, 153, 0.8), rgba(16, 185, 129, 0.9), rgba(6, 182, 212, 0.7))
                      `
                      : selectedExpert === 'finance'
                      ? `
                        radial-gradient(ellipse at top left, rgba(139, 92, 246, 0.6), transparent 50%),
                        radial-gradient(ellipse at top right, rgba(99, 102, 241, 0.4), transparent 50%),
                        radial-gradient(ellipse at bottom, rgba(168, 85, 247, 0.5), transparent 50%),
                        linear-gradient(135deg, rgba(139, 92, 246, 0.8), rgba(99, 102, 241, 0.9), rgba(168, 85, 247, 0.7))
                      `
                      : `
                        radial-gradient(ellipse at top left, rgba(251, 146, 60, 0.6), transparent 50%),
                        radial-gradient(ellipse at top right, rgba(249, 115, 22, 0.4), transparent 50%),
                        radial-gradient(ellipse at bottom, rgba(244, 63, 94, 0.5), transparent 50%),
                        linear-gradient(135deg, rgba(251, 146, 60, 0.8), rgba(249, 115, 22, 0.9), rgba(244, 63, 94, 0.7))
                      `,
                    boxShadow: selectedExpert === 'gtm'
                      ? `0 0 60px rgba(52, 211, 153, 0.4), 0 0 120px rgba(16, 185, 129, 0.2), inset 0 0 60px rgba(255, 255, 255, 0.1)`
                      : selectedExpert === 'finance'
                      ? `0 0 60px rgba(139, 92, 246, 0.4), 0 0 120px rgba(99, 102, 241, 0.2), inset 0 0 60px rgba(255, 255, 255, 0.1)`
                      : `0 0 60px rgba(251, 146, 60, 0.4), 0 0 120px rgba(249, 115, 22, 0.2), inset 0 0 60px rgba(255, 255, 255, 0.1)`,
                    backdropFilter: 'blur(30px)'
                  }}
                  animate={{
                    scale: isCallActive ? [1, 1.05, 1] : [1, 1.02, 1],
                  }}
                  transition={{
                    duration: isCallActive ? 1.5 : 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  {/* Inner Content */}
                  <div className="w-full h-full flex flex-col items-center justify-center relative z-10">
                    {isCallActive && callStatus !== 'idle' ? (
                      <div className="flex flex-col items-center">
                        <div className="text-white text-xs sm:text-sm font-semibold mb-2 drop-shadow-lg">
                          {callStatus === 'connecting' && t('experts.connecting')}
                          {callStatus === 'listening' && t('experts.listening')}
                          {callStatus === 'talking' && t('experts.talking')}
                        </div>
                        <div className="flex space-x-1">
                          <motion.div 
                            className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full shadow-lg"
                            animate={{ 
                              opacity: callStatus === 'talking' ? [0.3, 1, 0.3] : [0.6, 1, 0.6],
                              scale: callStatus === 'talking' ? [1, 1.2, 1] : [1, 1.1, 1]
                            }}
                            transition={{ duration: callStatus === 'talking' ? 0.6 : 1, repeat: Infinity, delay: 0 }}
                          />
                          <motion.div 
                            className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full shadow-lg"
                            animate={{ 
                              opacity: callStatus === 'talking' ? [0.3, 1, 0.3] : [0.6, 1, 0.6],
                              scale: callStatus === 'talking' ? [1, 1.2, 1] : [1, 1.1, 1]
                            }}
                            transition={{ duration: callStatus === 'talking' ? 0.6 : 1, repeat: Infinity, delay: 0.2 }}
                          />
                          <motion.div 
                            className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full shadow-lg"
                            animate={{ 
                              opacity: callStatus === 'talking' ? [0.3, 1, 0.3] : [0.6, 1, 0.6],
                              scale: callStatus === 'talking' ? [1, 1.2, 1] : [1, 1.1, 1]
                            }}
                            transition={{ duration: callStatus === 'talking' ? 0.6 : 1, repeat: Infinity, delay: 0.4 }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white/80 rounded-full shadow-lg"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Animated Glass Reflection */}
                  <motion.div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.1) 30%, transparent 70%, rgba(255, 255, 255, 0.2) 100%)'
                    }}
                    animate={{
                      opacity: isCallActive ? [0.4, 0.8, 0.4] : [0.3, 0.6, 0.3]
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  
                  {/* Subtle Inner Highlight */}
                  <div 
                    className="absolute top-4 left-4 w-6 h-6 sm:top-6 sm:left-6 sm:w-8 sm:h-8 rounded-full pointer-events-none"
                    style={{
                      background: 'radial-gradient(circle, rgba(255, 255, 255, 0.6) 0%, transparent 70%)',
                      filter: 'blur(8px)'
                    }}
                  />
                </motion.div>
              </div>
              
              {/* Expert Info */}
              <div className="mt-4 text-center">
                <h2 className="text-xl font-semibold text-text-primary">
                  {isRTL ? currentExpert.nameAr : currentExpert.name}
                </h2>
                <p className="text-sm text-text-secondary mt-1">
                  {isRTL ? currentExpert.descriptionAr : currentExpert.description}
                </p>
              </div>
            </div>

            {/* Audio Mode Controls */}
            {selectedMode === 'audio' && (
              <div className="flex justify-center mb-8">
                <Button
                  onClick={isCallActive ? endAudioCall : startAudioCall}
                  disabled={isLoading}
                  size="lg"
                  className={`px-8 py-3 text-lg font-medium rounded-full transition-all ${
                    isCallActive 
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : `bg-gradient-to-r ${currentExpert.colors.from} ${currentExpert.colors.to} text-white hover:scale-105`
                  }`}
                  data-testid="button-call-expert"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      {t('experts.connecting')}
                    </div>
                  ) : isCallActive ? (
                    <div className="flex items-center gap-2">
                      <PhoneOff className="w-5 h-5" />
                      {t('experts.endCall')}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Phone className="w-5 h-5" />
                      {t('experts.callExpert')}
                    </div>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Text Mode Chat Panel - FIX HEIGHT */}
          {selectedMode === 'text' && (
            <AnimatePresence>
              {showTextChat && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="w-full mb-8"
                >
                  <Card className="w-full">
              <CardContent className="p-0">
                {/* Messages - Use max-h instead of h */}
                <div className="max-h-[60vh] min-h-[400px] overflow-y-auto p-4 space-y-4 bg-muted/20 rounded-t-lg">
                  <AnimatePresence>
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`flex ${message.role === 'user' ? (isRTL ? 'justify-start' : 'justify-end') : (isRTL ? 'justify-end' : 'justify-start')}`}
                      >
                        <div
                          className={`max-w-[75%] p-3 rounded-2xl ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : `bg-gradient-to-r ${currentExpert.colors.from} ${currentExpert.colors.to} text-white`
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isRTL ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`bg-gradient-to-r ${currentExpert.colors.from} ${currentExpert.colors.to} text-white p-3 rounded-2xl`}>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={t('experts.typeMessage')}
                      disabled={isTyping}
                      className="flex-1"
                      data-testid="input-message"
                    />
                    <Button
                      onClick={sendTextMessage}
                      disabled={!currentMessage.trim() || isTyping}
                      className={`bg-gradient-to-r ${currentExpert.colors.from} ${currentExpert.colors.to} text-white hover:scale-105`}
                      data-testid="button-send-message"
                    >
                      {t('common.send')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
      
      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}