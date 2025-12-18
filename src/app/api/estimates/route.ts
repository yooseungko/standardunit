import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured, EstimateRequest, LOCAL_STORAGE_KEY } from '@/lib/supabase';

// 로컬 저장소 (Supabase 없을 때 메모리에 저장)
let localEstimates: EstimateRequest[] = [];

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const { complexName, size, floorType, name, phone, email, wantsConstruction } = body;

        // 필수 필드 검증
        if (!complexName || !size || !name || !phone || !email) {
            return NextResponse.json(
                { error: '필수 정보를 모두 입력해주세요.' },
                { status: 400 }
            );
        }

        const newEstimate: EstimateRequest = {
            id: Date.now(),
            complex_name: complexName,
            size: size,
            floor_type: floorType || null,
            name: name,
            phone: phone,
            email: email || null,
            wants_construction: wantsConstruction || false,
            status: 'pending',
            created_at: new Date().toISOString(),
            notes: null,
        };

        // Supabase가 설정된 경우
        if (isSupabaseConfigured && supabase) {
            const { data, error } = await supabase
                .from('estimate_requests')
                .insert([{
                    complex_name: complexName,
                    size: size,
                    floor_type: floorType || null,
                    name: name,
                    phone: phone,
                    email: email || null,
                    wants_construction: wantsConstruction || false,
                    status: 'pending',
                }])
                .select();

            if (error) {
                console.error('Supabase error:', error);
                return NextResponse.json(
                    { error: '견적 요청 저장에 실패했습니다.' },
                    { status: 500 }
                );
            }

            return NextResponse.json(
                { success: true, data: data[0] },
                { status: 201 }
            );
        }

        // Supabase 없을 때 - 로컬 메모리에 저장
        localEstimates.unshift(newEstimate);

        return NextResponse.json(
            { success: true, data: newEstimate },
            { status: 201 }
        );
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { error: '서버 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        // Supabase가 설정된 경우
        if (isSupabaseConfigured && supabase) {
            const { data, error } = await supabase
                .from('estimate_requests')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Supabase error:', error);
                return NextResponse.json(
                    { error: '데이터 조회에 실패했습니다.' },
                    { status: 500 }
                );
            }

            return NextResponse.json({ data, isSupabaseConfigured: true });
        }

        // Supabase 없을 때 - 로컬 메모리에서 조회
        return NextResponse.json({
            data: localEstimates,
            isSupabaseConfigured: false,
            message: 'Supabase가 설정되지 않았습니다. 데모 모드로 실행 중입니다.'
        });
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { error: '서버 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
