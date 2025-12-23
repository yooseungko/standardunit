import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// 임시 메모리 저장소 참조 (실제로는 route.ts와 공유해야 함)
// 이 부분은 실제 구현에서는 별도의 저장소 모듈로 분리하는 것이 좋습니다

// GET: 특정 스타일보드 조회 (비밀번호 검증 포함)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const password = request.nextUrl.searchParams.get('password');

    try {
        if (isSupabaseConfigured && supabase) {
            const { data, error } = await supabase
                .from('customer_styleboards')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !data) {
                return NextResponse.json(
                    { success: false, error: '스타일보드를 찾을 수 없습니다.' },
                    { status: 404 }
                );
            }

            // 비밀번호 검증 (고객 접근 시)
            if (password !== undefined && data.password !== password) {
                return NextResponse.json(
                    { success: false, error: '비밀번호가 일치하지 않습니다.' },
                    { status: 401 }
                );
            }

            // 비밀번호가 없는 경우 (관리자 조회)는 전체 데이터 반환
            // 비밀번호가 있는 경우 (고객 조회)는 비밀번호 제외하고 반환
            if (password !== undefined) {
                const { password: _, ...safeData } = data;
                return NextResponse.json({
                    success: true,
                    data: safeData,
                });
            }

            return NextResponse.json({
                success: true,
                data,
            });
        }

        // 로컬 모드는 나중에 구현
        return NextResponse.json(
            { success: false, error: 'Supabase가 설정되지 않았습니다.' },
            { status: 500 }
        );
    } catch (error) {
        console.error('스타일보드 조회 오류:', error);
        return NextResponse.json(
            { success: false, error: '스타일보드 조회에 실패했습니다.' },
            { status: 500 }
        );
    }
}

// PATCH: 스타일보드 업데이트 (선택 이미지 저장 등)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const body = await request.json();

        if (isSupabaseConfigured && supabase) {
            // 비밀번호 검증
            if (body.password) {
                const { data: existing } = await supabase
                    .from('customer_styleboards')
                    .select('password')
                    .eq('id', id)
                    .single();

                if (!existing || existing.password !== body.password) {
                    return NextResponse.json(
                        { success: false, error: '비밀번호가 일치하지 않습니다.' },
                        { status: 401 }
                    );
                }
            }

            const updateData: Record<string, unknown> = {};

            // 선택 이미지 업데이트
            if (body.selected_images) {
                // 각 카테고리별 최대 5장 제한 검증
                for (const [category, images] of Object.entries(body.selected_images)) {
                    if (Array.isArray(images) && images.length > 5) {
                        return NextResponse.json(
                            { success: false, error: `${category} 카테고리는 최대 5장까지 선택 가능합니다.` },
                            { status: 400 }
                        );
                    }
                }
                updateData.selected_images = body.selected_images;
                updateData.last_modified_at = new Date().toISOString();
            }

            // 저장 시 saved_at 업데이트
            if (body.save) {
                updateData.saved_at = new Date().toISOString();
            }

            // 링크 발송 상태 업데이트
            if (body.link_sent !== undefined) {
                updateData.link_sent = body.link_sent;
                if (body.link_sent) {
                    updateData.link_sent_at = new Date().toISOString();
                }
            }

            const { data, error } = await supabase
                .from('customer_styleboards')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                throw new Error(error.message);
            }

            return NextResponse.json({
                success: true,
                data,
            });
        }

        return NextResponse.json(
            { success: false, error: 'Supabase가 설정되지 않았습니다.' },
            { status: 500 }
        );
    } catch (error) {
        console.error('스타일보드 업데이트 오류:', error);
        return NextResponse.json(
            { success: false, error: '스타일보드 업데이트에 실패했습니다.' },
            { status: 500 }
        );
    }
}

// DELETE: 스타일보드 삭제
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        if (isSupabaseConfigured && supabase) {
            const { error } = await supabase
                .from('customer_styleboards')
                .delete()
                .eq('id', id);

            if (error) {
                throw new Error(error.message);
            }

            return NextResponse.json({
                success: true,
                message: '스타일보드가 삭제되었습니다.',
            });
        }

        return NextResponse.json(
            { success: false, error: 'Supabase가 설정되지 않았습니다.' },
            { status: 500 }
        );
    } catch (error) {
        console.error('스타일보드 삭제 오류:', error);
        return NextResponse.json(
            { success: false, error: '스타일보드 삭제에 실패했습니다.' },
            { status: 500 }
        );
    }
}
