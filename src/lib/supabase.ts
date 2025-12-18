import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Supabase 클라이언트 생성 (환경 변수가 있을 때만)
export const supabase: SupabaseClient | null =
    supabaseUrl && supabaseAnonKey
        ? createClient(supabaseUrl, supabaseAnonKey)
        : null;

// Supabase 연결 여부 확인
export const isSupabaseConfigured = !!supabase;

// 견적 요청 타입
export interface EstimateRequest {
    id?: number;
    complex_name: string;
    size: string;
    floor_type?: string | null;
    name: string;
    phone: string;
    email?: string | null;
    wants_construction?: boolean;
    status: 'pending' | 'contacted' | 'completed' | 'cancelled';
    created_at?: string;
    notes?: string | null;
}

// 로컬 스토리지 키 (Supabase 없을 때 사용)
export const LOCAL_STORAGE_KEY = 'standard_unit_estimates';
