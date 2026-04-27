import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ymfxvnldvjketboyuqva.supabase.co';
const supabaseAnonKey = 'sb_publishable_F7Mk-QKztERlTObZORPwdw_a8QUH9y_';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
