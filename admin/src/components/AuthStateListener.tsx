import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/libs/supabase';
import { QueryKeysEnum } from '@/types/queryKeyEnum';

/**
 * Component to listen to Supabase auth state changes
 * and invalidate the user query when auth state changes
 */
export const AuthStateListener: React.FC = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state changed:', event);
      console.log('📧 User:', session?.user?.email);
      console.log('🎫 Has session:', !!session);

      if (event === 'INITIAL_SESSION') {
        // Session loaded from storage on page load
        if (session) {
          console.log('✅ Session restored from storage');
          queryClient.invalidateQueries({ queryKey: [QueryKeysEnum.GET_ME] });
        } else {
          console.log('⚠️ No session found in storage');
        }
      } else if (event === 'SIGNED_IN') {
        console.log('✅ User signed in successfully');
        queryClient.invalidateQueries({ queryKey: [QueryKeysEnum.GET_ME] });
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Token refreshed');
        queryClient.invalidateQueries({ queryKey: [QueryKeysEnum.GET_ME] });
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        queryClient.clear();
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return null;
};
