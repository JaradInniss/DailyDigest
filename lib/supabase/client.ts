import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client - uses anon key (public data only)
// This client is safe to use in client components
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
