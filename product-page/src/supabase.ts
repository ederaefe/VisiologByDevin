import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zniqpkpehbbeuocvabwv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuaXFwa3BlaGJiZXVvY3ZhYnd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2OTMxNDIsImV4cCI6MjA5NjI2OTE0Mn0.ZoXEN2Rft3eOGH_r2zdl8MmMVrNpeB1UCQg52NfO0H0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
