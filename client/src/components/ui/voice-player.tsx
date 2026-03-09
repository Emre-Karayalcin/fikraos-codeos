import { useState, useRef } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Button } from './button';
import { apiRequest } from '@/lib/queryClient';

interface VoicePlayerProps {
  text: string;
  className?: string;
}

export function VoicePlayer({ text, className = "" }: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const synthesizeAndPlay = async () => {
    // Voice synthesis temporarily disabled due to API rate limits
    console.log('Voice synthesis disabled - API rate limited');
    return;
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={synthesizeAndPlay}
      className={`p-2 h-8 w-8 ${className} opacity-30`}
      disabled={true}
      data-testid="button-voice-play"
      title="Voice synthesis temporarily disabled"
    >
      <Volume2 className="w-4 h-4" />
    </Button>
  );
}