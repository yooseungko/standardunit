import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured, DetailedEstimateForm } from '@/lib/supabase';

// 로컬 저장소 (Supabase 없을 때)
const localDetailedForms: DetailedEstimateForm[] = [];

// GET: 정밀 견적 폼 조회 (estimate_id 또는 token으로)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const estimateId = searchParams.get('estimate_id');
        const token = searchParams.get('token');

        if (isSupabaseConfigured && supabase) {
            let query = supabase.from('detailed_estimate_forms').select('*');

            if (estimateId) {
                query = query.eq('estimate_id', parseInt(estimateId));
            } else if (token) {
                // 토큰으로 estimate_id 찾기
                const { data: estimateData } = await supabase
                    .from('estimate_requests')
                    .select('id, complex_name, size, name, email')
                    .eq('detailed_form_token', token)
                    .single();

                if (!estimateData) {
                    return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
                }

                // 해당 estimate의 폼 데이터 조회
                const { data: formData } = await supabase
                    .from('detailed_estimate_forms')
                    .select('*')
                    .eq('estimate_id', estimateData.id)
                    .single();

                return NextResponse.json({
                    success: true,
                    estimate: estimateData,
                    form: formData || null,
                });
            }

            const { data, error } = await query;

            if (error) {
                console.error('Supabase error:', error);
                return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
            }

            return NextResponse.json({ success: true, data });
        }

        // 데모 모드
        if (estimateId) {
            const form = localDetailedForms.find(f => f.estimate_id === parseInt(estimateId));
            return NextResponse.json({ success: true, data: form || null });
        }

        return NextResponse.json({ success: true, data: localDetailedForms });
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// POST: 정밀 견적 폼 저장
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { token, formData } = body;

        if (!token || !formData) {
            return NextResponse.json({ error: 'Token and formData are required' }, { status: 400 });
        }

        if (isSupabaseConfigured && supabase) {
            // 토큰으로 estimate 찾기
            const { data: estimateData, error: estimateError } = await supabase
                .from('estimate_requests')
                .select('id')
                .eq('detailed_form_token', token)
                .single();

            if (estimateError || !estimateData) {
                return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
            }

            // 기존 폼 데이터가 있는지 확인
            const { data: existingForm } = await supabase
                .from('detailed_estimate_forms')
                .select('id')
                .eq('estimate_id', estimateData.id)
                .single();

            if (existingForm) {
                // 업데이트
                const { error: updateError } = await supabase
                    .from('detailed_estimate_forms')
                    .update({
                        ...formData,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existingForm.id);

                if (updateError) {
                    console.error('Update error:', updateError);
                    return NextResponse.json({ error: 'Failed to update form' }, { status: 500 });
                }
            } else {
                // 새로 생성
                const { error: insertError } = await supabase
                    .from('detailed_estimate_forms')
                    .insert([{
                        estimate_id: estimateData.id,
                        ...formData,
                        created_at: new Date().toISOString(),
                    }]);

                if (insertError) {
                    console.error('Insert error:', insertError);
                    return NextResponse.json({ error: 'Failed to save form' }, { status: 500 });
                }
            }

            // estimate_requests 상태 업데이트
            await supabase
                .from('estimate_requests')
                .update({ detailed_form_status: 'completed' })
                .eq('id', estimateData.id);

            return NextResponse.json({ success: true });
        }

        // 데모 모드
        const newForm: DetailedEstimateForm = {
            id: Date.now(),
            estimate_id: 1, // 데모용
            ...formData,
            created_at: new Date().toISOString(),
        };
        localDetailedForms.push(newForm);

        return NextResponse.json({ success: true, data: newForm });
    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
