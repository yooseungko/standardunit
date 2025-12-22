import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 계약서 서명 처리
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { contract_id, signature_data } = body;

        if (!contract_id || !signature_data) {
            return NextResponse.json(
                { success: false, error: '계약서 ID와 서명 데이터가 필요합니다.' },
                { status: 400 }
            );
        }

        // 계약서 조회
        const { data: contract, error: fetchError } = await supabase
            .from('contracts')
            .select('*')
            .eq('id', contract_id)
            .single();

        if (fetchError || !contract) {
            return NextResponse.json(
                { success: false, error: '계약서를 찾을 수 없습니다.' },
                { status: 404 }
            );
        }

        // 이미 서명된 계약서인지 확인
        if (contract.status === 'signed') {
            return NextResponse.json(
                { success: false, error: '이미 서명된 계약서입니다.' },
                { status: 400 }
            );
        }

        // 서명 이미지를 Supabase Storage에 업로드
        const signatureBuffer = Buffer.from(signature_data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        const fileName = `signatures/${contract_id}_${Date.now()}.png`;

        const { error: uploadError } = await supabase.storage
            .from('contracts')
            .upload(fileName, signatureBuffer, {
                contentType: 'image/png',
                upsert: true,
            });

        let signatureUrl = signature_data; // 업로드 실패 시 base64 그대로 저장

        if (!uploadError) {
            const { data: publicUrl } = supabase.storage
                .from('contracts')
                .getPublicUrl(fileName);
            signatureUrl = publicUrl.publicUrl;
        } else {
            console.warn('Signature upload failed, using base64:', uploadError);
        }

        // 계약서 상태 업데이트
        const { data: updatedContract, error: updateError } = await supabase
            .from('contracts')
            .update({
                status: 'signed',
                signed_at: new Date().toISOString(),
                customer_signature_url: signatureUrl,
                updated_at: new Date().toISOString(),
            })
            .eq('id', contract_id)
            .select()
            .single();

        if (updateError) {
            console.error('Contract sign update error:', updateError);
            return NextResponse.json(
                { success: false, error: '서명 저장 실패: ' + updateError.message },
                { status: 500 }
            );
        }

        // 버전 히스토리에 저장
        await supabase.from('contract_versions').insert({
            contract_id: contract_id,
            version_number: 1, // 서명 시점의 버전
            quote_id: updatedContract.quote_id,
            contract_number: updatedContract.contract_number,
            customer_name: updatedContract.customer_name,
            customer_phone: updatedContract.customer_phone,
            customer_email: updatedContract.customer_email,
            customer_address: updatedContract.customer_address,
            property_address: updatedContract.property_address,
            construction_start_date: updatedContract.construction_start_date,
            construction_end_date: updatedContract.construction_end_date,
            total_amount: updatedContract.total_amount,
            deposit_amount: updatedContract.deposit_amount,
            deposit_due_date: updatedContract.deposit_due_date,
            mid_payment_1: updatedContract.mid_payment_1,
            mid_payment_1_due_date: updatedContract.mid_payment_1_due_date,
            mid_payment_2: updatedContract.mid_payment_2,
            mid_payment_2_due_date: updatedContract.mid_payment_2_due_date,
            final_payment: updatedContract.final_payment,
            final_payment_due_date: updatedContract.final_payment_due_date,
            status: updatedContract.status,
            signed_at: updatedContract.signed_at,
            customer_signature_url: signatureUrl,
            contract_content: updatedContract.contract_content,
            special_terms: updatedContract.special_terms,
            saved_reason: '고객 서명 완료',
        });

        return NextResponse.json({
            success: true,
            data: updatedContract,
            message: '계약서 서명이 완료되었습니다.',
        });

    } catch (error) {
        console.error('Contract sign error:', error);
        return NextResponse.json(
            { success: false, error: '서버 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
