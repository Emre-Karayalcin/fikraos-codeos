import { supabase } from '@/libs/supabase';
import {
  type User,
  type LoginPayload,
  type LoginResponse,
  RoleEnum,
} from './types';

// Load debug utilities in development
if (import.meta.env.DEV) {
  import('@/libs/debug');
}

export const getMe = async (): Promise<User | null> => {
  try {
    console.log('🔍 getMe: Checking for session...');
    
    // First, try to get the current session from storage
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ getMe: Session error:', sessionError);
      return null;
    }
    
    // If there's no session, user is not authenticated
    if (!session) {
      console.log('⚠️ getMe: No active session found in storage');
      return null;
    }

    console.log('✅ getMe: Session found, getting user details...');

    // Now get the user details with the active session
    // This call includes the session token automatically
    const { data: { user: supabaseUser }, error: userError } = await supabase.auth.getUser(session.access_token);
    
    if (userError) {
      console.error('❌ getMe: Error getting user:', userError);
      // If token is invalid or expired, clear the session
      console.log('🗑️ getMe: Clearing invalid session...');
      await supabase.auth.signOut();
      return null;
    }

    if (!supabaseUser) {
      console.log('⚠️ getMe: No authenticated user found');
      return null;
    }

    console.log('✅ getMe: User loaded:', supabaseUser);

    // Map Supabase user to your User type
    const role = supabaseUser.user_metadata?.role || supabaseUser.app_metadata?.role || RoleEnum.USER;

    return {
      id: supabaseUser.id,
      first_name: supabaseUser.user_metadata?.first_name || '',
      last_name: supabaseUser.user_metadata?.last_name || '',
      email: supabaseUser.email || '',
      role: role as RoleEnum,
    };
  } catch (error) {
    console.error('❌ getMe: Unexpected error:', error);
    return null;
  }
};

export const login = async (payload: LoginPayload): Promise<LoginResponse> => {
  try {
    console.log('🔐 Login attempt:', payload.username);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: payload.username, // Assuming username is actually email
      password: payload.password,
    });

    if (error) {
      console.error('❌ Login failed:', error.message);
      throw error;
    }

    if (!data.session) {
      console.error('❌ No session returned from login');
      throw new Error('No session returned from login');
    }

    console.log('✅ Login successful!');
    console.log('📧 User:', data.user?.email);
    console.log('🎫 Session expires at:', new Date(data.session.expires_at! * 1000).toLocaleString());
    console.log('💾 Session should be saved to localStorage automatically by Supabase');

    return {
      access_token: data.session.access_token,
      token_type: 'Bearer',
    };
  } catch (error) {
    console.error('❌ Login error:', error);
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};
