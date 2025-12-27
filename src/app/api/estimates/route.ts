import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured, EstimateRequest, LOCAL_STORAGE_KEY } from '@/lib/supabase';
import { sendAdminNotification } from '@/lib/email';

// 로컬 저장소 (Supabase 없을 때 메모리에 저장)
const localEstimates: EstimateRequest[] = [];

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const { complexName, size, floorType, name, phone, email, wantsConstruction, constructionScope, additionalNotes, preferredConstructionDate } = body;

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
            notes: additionalNotes || null,
            construction_scope: constructionScope || [],
            preferred_construction_date: preferredConstructionDate || null,
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
                    construction_scope: constructionScope || [],
                    notes: additionalNotes || null,
                    preferred_construction_date: preferredConstructionDate || null,
                }])
                .select();

            if (error) {
                console.error('Supabase error:', error);
                return NextResponse.json(
                    { error: '견적 요청 저장에 실패했습니다.' },
                    { status: 500 }
                );
            }

            // 관리자에게 알림 이메일 발송
            const savedEstimate = data[0];
            console.log('Attempting to send admin notification for:', savedEstimate.complex_name);

            try {
                const emailResult = await sendAdminNotification({
                    complex_name: savedEstimate.complex_name,
                    size: savedEstimate.size,
                    floor_type: savedEstimate.floor_type,
                    name: savedEstimate.name,
                    phone: savedEstimate.phone,
                    email: savedEstimate.email,
                    wants_construction: savedEstimate.wants_construction ?? false,
                    created_at: savedEstimate.created_at || new Date().toISOString(),
                    construction_scope: savedEstimate.construction_scope || [],
                    notes: savedEstimate.notes,
                });
                console.log('Admin notification result:', emailResult);
            } catch (emailError) {
                console.error('Failed to send admin notification:', emailError);
            }

            return NextResponse.json(
                { success: true, data: savedEstimate },
                { status: 201 }
            );
        }

        // Supabase 없을 때 - 로컬 메모리에 저장
        localEstimates.unshift(newEstimate);

        // 관리자에게 알림 이메일 발송 (비동기, 실패해도 견적 저장은 성공)
        sendAdminNotification({
            complex_name: newEstimate.complex_name,
            size: newEstimate.size,
            floor_type: newEstimate.floor_type,
            name: newEstimate.name,
            phone: newEstimate.phone,
            email: newEstimate.email,
            wants_construction: newEstimate.wants_construction ?? false,
            created_at: newEstimate.created_at ?? new Date().toISOString(),
            construction_scope: newEstimate.construction_scope || [],
            notes: newEstimate.notes,
        }).catch(err => console.error('Failed to send admin notification:', err));

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

            return NextResponse.json({ success: true, data, isSupabaseConfigured: true });
        }

        // Supabase 없을 때 - 로컬 메모리에서 조회
        return NextResponse.json({
            success: true,
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
