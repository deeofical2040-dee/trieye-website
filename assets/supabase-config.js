// Trieye Studio - Supabase Configuration & Client Provider
// ==========================================================
// Instructions:
// Enter your project's URL and Publishable (anon) API key below.
// Never add your service_role (secret) key here.

const SUPABASE_CONFIG = {
  url: 'https://dqvhuxrezcreporxmghi.supabase.co', // normalized base project URL
  publishableKey: 'sb_publishable_nBix8MKCg2HpWlWGXeDLJg_uqhmpsGz'
};

// Initialize Supabase Client if configured & library loaded
let supabaseClient = null;

function initSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  
  const rawUrl = SUPABASE_CONFIG.url ? SUPABASE_CONFIG.url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '') : '';
  const key = SUPABASE_CONFIG.publishableKey;

  if (typeof supabase !== 'undefined' && rawUrl && !rawUrl.includes('YOUR_SUPABASE') && key && !key.includes('YOUR_SUPABASE')) {
    try {
      supabaseClient = supabase.createClient(rawUrl, key);
      console.log('⚡ [Trieye] Supabase client initialized successfully.');
      return supabaseClient;
    } catch (err) {
      console.warn('⚠️ [Trieye] Failed to initialize Supabase client:', err);
    }
  }
  return null;
}

// Attempt immediate init
if (typeof supabase !== 'undefined') {
  initSupabaseClient();
} else {
  // Try on DOM load if script tag was deferred
  window.addEventListener('DOMContentLoaded', () => {
    initSupabaseClient();
  });
}

// Global accessor
window.getTrieyeSupabase = function () {
  return supabaseClient;
};
