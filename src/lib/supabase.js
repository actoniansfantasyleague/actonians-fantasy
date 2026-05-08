import { createClient } from '@supabase/supabase-js'

// Replace these with your actual Supabase project values
// Found at: supabase.com → your project → Settings → API
const SUPABASE_URL = 'https://rkhkcsgmgibhmleowmpl.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJraGtjc2dtZ2liaG1sZW93bXBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNTQyNzMsImV4cCI6MjA5MzgzMDI3M30.aD0bzvUz0xDCONXWjlrbf-SkAtuOJ_3-yTd8voz5nkg'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
