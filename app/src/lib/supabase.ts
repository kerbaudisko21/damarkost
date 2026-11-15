import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
// Supabase baru menyebutnya "publishable key"; proyek lama "anon key". Keduanya aman untuk browser (dilindungi RLS).
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined

/** null = belum dikonfigurasi (.env.local kosong) → aplikasi berjalan dalam mode demo. */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } }) : null
export const hasSupabase = supabase !== null
