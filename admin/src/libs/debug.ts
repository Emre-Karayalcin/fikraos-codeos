import { supabase } from './supabase';

/**
 * Debug utility to check Supabase session in localStorage
 * Open browser console and run: checkSupabaseSession()
 */
export const checkSupabaseSession = () => {
  console.log('🔍 Checking localStorage for Supabase session...');
  
  // Get all localStorage keys
  const keys = Object.keys(localStorage);
  const supabaseKeys = keys.filter(key => key.includes('supabase'));
  
  console.log('📦 All localStorage keys:', keys);
  console.log('🔑 Supabase-related keys:', supabaseKeys);
  
  // Try to find and parse the session
  supabaseKeys.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        const parsed = JSON.parse(value);
        console.log(`\n📝 Key: ${key}`);
        console.log('Value:', parsed);
      }
    } catch (e) {
      console.log(`\n📝 Key: ${key}`);
      console.log('Value (unparsed):', localStorage.getItem(key));
    }
  });
};

/**
 * Test Supabase connection and configuration
 * Run: testSupabaseConnection()
 */
export const testSupabaseConnection = async () => {
  console.log('🧪 Testing Supabase connection...');
  console.log('📍 URL:', import.meta.env.VITE_SUPABASE_URL);
  console.log('🔑 Has Anon Key:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
  
  try {
    // Test getting session (should be null if not logged in)
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Error getting session:', error);
    } else {
      console.log('✅ Session check:', session ? 'Has session' : 'No session (not logged in)');
      if (session) {
        console.log('📧 User:', session.user.email);
      }
    }
    
    // Test if Supabase is reachable
    console.log('✅ Supabase client initialized successfully');
    console.log('\n💡 To test login, you need to:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Authentication → Users');
    console.log('3. Add a test user with email and password');
    console.log('4. Set user_metadata with: { "role": "admin" }');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
  }
};

// Make it available globally in development
if (import.meta.env.DEV) {
  (window as any).checkSupabaseSession = checkSupabaseSession;
  (window as any).testSupabaseConnection = testSupabaseConnection;
  console.log('💡 Debug utilities loaded!');
  console.log('  - checkSupabaseSession() : Check session in localStorage');
  console.log('  - testSupabaseConnection() : Test Supabase connection');
}
