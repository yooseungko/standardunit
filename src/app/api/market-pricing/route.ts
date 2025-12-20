import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// 로컬 데이터 (Supabase 미연결 시)
let localExtractedItems: Record<string, unknown>[] = [];
let localPriceRecords: Record<string, unknown>[] = [];

// GET - 시장 단가 데이터 조회
export async function GET() {
    try {
        if (isSupabaseConfigured && supabase) {
            // 추출된 견적 항목 조회
            const { data: extractedData, error: extractedError } = await supabase
                .from('extracted_estimate_items')
                .select(`
          *,
          estimate_files (
            file_name,
            apartment_name,
            apartment_size
          )
        `)
                .order('created_at', { ascending: false })
                .limit(200);

            if (extractedError) {
                console.error('추출 항목 조회 오류:', extractedError);
            }

            // 가격 기록 조회
            const { data: recordsData, error: recordsError } = await supabase
                .from('price_records')
                .select(`
          *,
          standard_items (
            category,
            sub_category,
            normalized_name
          )
        `)
                .order('created_at', { ascending: false })
                .limit(200);

            if (recordsError) {
                console.error('가격 기록 조회 오류:', recordsError);
            }

            return NextResponse.json({
                success: true,
                data: {
                    extracted: extractedData || [],
                    records: recordsData || [],
                },
            });
        } else {
            // 로컬 데이터 반환
            return NextResponse.json({
                success: true,
                data: {
                    extracted: localExtractedItems,
                    records: localPriceRecords,
                },
                message: 'Supabase 미연결 - 로컬 데이터 사용',
            });
        }
    } catch (error) {
        console.error('시장 단가 조회 오류:', error);

        // 오류 시 빈 데이터 반환
        return NextResponse.json({
            success: true,
            data: {
                extracted: [],
                records: [],
            },
            message: 'DB 조회 오류 - 빈 데이터 반환',
        });
    }
}

// DELETE - 시장 단가 항목 삭제
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'id가 필요합니다.' },
                { status: 400 }
            );
        }

        if (isSupabaseConfigured && supabase) {
            const { error } = await supabase
                .from('extracted_estimate_items')
                .delete()
                .eq('id', id);

            if (error) {
                throw error;
            }

            return NextResponse.json({
                success: true,
                message: '항목이 삭제되었습니다.',
            });
        } else {
            // 로컬 데이터에서 삭제
            localExtractedItems = localExtractedItems.filter(
                item => item.id !== id
            );
            return NextResponse.json({
                success: true,
                message: '로컬 데이터에서 삭제되었습니다.',
            });
        }
    } catch (error) {
        console.error('시장 단가 삭제 오류:', error);
        return NextResponse.json(
            { success: false, error: '삭제에 실패했습니다.' },
            { status: 500 }
        );
    }
}

// PUT - 시장 단가 항목 수정
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'id가 필요합니다.' },
                { status: 400 }
            );
        }

        if (isSupabaseConfigured && supabase) {
            const { error } = await supabase
                .from('extracted_estimate_items')
                .update({
                    ...updateData,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id);

            if (error) {
                throw error;
            }

            return NextResponse.json({
                success: true,
                message: '항목이 수정되었습니다.',
            });
        } else {
            // 로컬 데이터에서 수정
            const index = localExtractedItems.findIndex(
                item => item.id === id
            );
            if (index !== -1) {
                localExtractedItems[index] = {
                    ...localExtractedItems[index],
                    ...updateData,
                };
            }
            return NextResponse.json({
                success: true,
                message: '로컬 데이터에서 수정되었습니다.',
            });
        }
    } catch (error) {
        console.error('시장 단가 수정 오류:', error);
        return NextResponse.json(
            { success: false, error: '수정에 실패했습니다.' },
            { status: 500 }
        );
    }
}
