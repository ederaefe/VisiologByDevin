import { createClient } from '@supabase/supabase-js';

export function createSupabaseClient({ useServiceRole = false } = {}) {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

    if (!url) {
        throw new Error('Supabase URL missing. Check VITE_SUPABASE_URL.');
    }
    if (useServiceRole) {
        if (!serviceRoleKey) {
            throw new Error('Service role key missing. Set SUPABASE_SERVICE_ROLE_KEY in the server environment.');
        }
        return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
    }
    if (!anonKey) {
        throw new Error('Supabase anon key missing. Check VITE_SUPABASE_ANON_KEY.');
    }
    return createClient(url, anonKey, { auth: { persistSession: false } });
}
