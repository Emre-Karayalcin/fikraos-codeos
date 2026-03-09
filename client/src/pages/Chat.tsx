import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useTranslation } from "react-i18next";

interface ChallengeContext {
  challengeId: string;
  challengeName: string;
}

export default function Chat() {
  const { t } = useTranslation();
  const { chatId } = useParams<{ chatId: string }>();
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [challengeContext, setChallengeContext] = useState<ChallengeContext | null>(null);
  
  // Extract challenge context from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const challengeId = urlParams.get('challengeId');
    const challengeName = urlParams.get('challengeName');
    
    if (challengeId && challengeName) {
      setChallengeContext({
        challengeId,
        challengeName: decodeURIComponent(challengeName)
      });
      
      // Store in sessionStorage for persistence across page reloads
      sessionStorage.setItem('challengeContext', JSON.stringify({
        challengeId,
        challengeName: decodeURIComponent(challengeName)
      }));
    } else {
      // Try to restore from sessionStorage
      const stored = sessionStorage.getItem('challengeContext');
      if (stored) {
        try {
          setChallengeContext(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse stored challenge context:', e);
        }
      }
    }
  }, [location]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: t('errors.unauthorized'),
        description: t('chat.unauthorized'),
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading]);

  // Fetch chat data
  const { data: chat, isLoading: chatLoading, error } = useQuery({
    queryKey: ["/api/chats", chatId],
    enabled: !!chatId && isAuthenticated,
    retry: false,
  });

  // Handle errors
  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      toast({
        title: t('errors.unauthorized'),
        description: t('chat.unauthorized'),
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  if (isLoading || chatLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">{t('chat.loading')}</p>
        </div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-primary text-lg mb-2">{t('chat.notFound')}</p>
          <p className="text-text-secondary">{t('chat.notFoundDesc')}</p>
        </div>
      </div>
    );
  }

  return <MainLayout chatId={chatId} challengeContext={challengeContext} onClearChallenge={() => {
    setChallengeContext(null);
    sessionStorage.removeItem('challengeContext');
  }} />;
}