// lib/db.js
const { createClient } = require('@supabase/supabase-js');

let supabase = null;

function getSupabaseClient() {
    if (!supabase) {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
            throw new Error('SUPABASE_URL and SUPABASE_KEY must be set in environment variables');
        }
        supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    }
    return supabase;
}

module.exports = {
  getSupabaseClient
};
