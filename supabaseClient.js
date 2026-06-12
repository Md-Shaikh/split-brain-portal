import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jxkbenrybmuusjniemjm.supabase.co';
const supabaseAnonKey = 'sb_publishable_Y7iRlaO4VlH2LK1yVDK82g_q7NBE9-x';

const isValidUrl = (url) => {
  try {
    new URL(url);
    return url !== 'YOUR_SUPABASE_URL';
  } catch (e) {
    return false;
  }
};

export const supabase = isValidUrl(supabaseUrl)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
