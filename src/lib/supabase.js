import { createClient } from '@supabase/supabase-js'

// Replace these with your actual Supabase project values
// Found at: supabase.com → your project → Settings → API
const SUPABASE_URL = 'YOUR_SUPABASE_URL'
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
