import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Ensure .env is configured.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

export type UserRole = 'admin' | 'employee';

export interface StrikeEmployee {
  employee_id: string;
  name: string;
  department?: string;
  monthly_late_count: number;
  strike_level: number;
  last_warning_date: string;
  month_year: string;
  excused: string | null;
  behaviour_analysis: string | null;
  excuse_provided?: string | null;
}

export interface LeaveBalance {
  employee_id: string;
  employee_name: string;
  department: string;
  designation: string;
  month_year: string;

  // Raw accurate counts from Excel
  present_days: number;
  absent_days: number;
  lc_days: number;

  // Leave breakdown (sl + cl + el = absent_days)
  sl_taken: number;
  cl_taken: number;
  el_taken: number;
  sl_left: number;
  cl_left: number;
  el_left: number;
}