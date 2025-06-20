// supabaseClient.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types_db';

let supabaseInstance: SupabaseClient<Database> | null = null;
let misconfigurationMessage: string | null = null;

// Ambil variabel dari import.meta.env yang disediakan oleh Vite
const S_URL = import.meta.env.VITE_SUPABASE_URL;
const S_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validasi URL dan Key
if (typeof S_URL !== 'string' || S_URL.trim() === '' ||
    typeof S_KEY !== 'string' || S_KEY.trim() === '') {
      
  misconfigurationMessage = "Supabase URL atau Anon Key tidak ditemukan. Pastikan variabel VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY sudah diatur dengan benar di file .env Anda.";
  console.error("CRITICAL CONFIGURATION ERROR: " + misconfigurationMessage);

} else {
  try {
    // Jika kredensial valid, coba buat client
    supabaseInstance = createClient<Database>(S_URL, S_KEY);
  } catch (e: any) {
    misconfigurationMessage = `Error saat inisialisasi Supabase client: ${e.message}. Mohon periksa kembali URL dan Key Anda.`;
    console.error("CRITICAL CONFIGURATION ERROR: " + misconfigurationMessage, e);
    supabaseInstance = null; // Pastikan client null jika gagal
  }
}

export const supabase = supabaseInstance;
export const supabaseMisconfigurationError = misconfigurationMessage;