import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 도면 업로드
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const estimateId = formData.get('estimate_id') as string;

        if (!file) {
            return NextResponse.json(
                { success: false, error: '파일이 필요합니다.' },
                { status: 400 }
            );
        }

        if (!estimateId) {
            return NextResponse.json(
                { success: false, error: '견적 ID가 필요합니다.' },
                { status: 400 }
            );
        }

        // 파일 확장자 검증
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { success: false, error: '지원하지 않는 파일 형식입니다. (PNG, JPG, WEBP, PDF만 가능)' },
                { status: 400 }
            );
        }

        // 파일 크기 제한 (10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json(
                { success: false, error: '파일 크기는 10MB를 초과할 수 없습니다.' },
                { status: 400 }
            );
        }

        // 파일명 생성
        const timestamp = Date.now();
        const extension = file.name.split('.').pop();
        const fileName = `${estimateId}/${timestamp}.${extension}`;

        // Supabase Storage에 업로드
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('floorplans')
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            console.error('Storage upload error:', uploadError);

            // 스토리지 버킷이 없는 경우 로컬 저장으로 폴백
            // 실제 운영에서는 Supabase 버킷을 먼저 생성해야 함
            return NextResponse.json(
                { success: false, error: '파일 업로드 실패: ' + uploadError.message },
                { status: 500 }
            );
        }

        // public URL 생성
        const { data: urlData } = supabase.storage
            .from('floorplans')
            .getPublicUrl(fileName);

        // 데이터베이스에 도면 정보 저장
        const { data: floorplan, error: dbError } = await supabase
            .from('floorplans')
            .insert({
                estimate_id: parseInt(estimateId),
                file_url: urlData.publicUrl,
                file_name: file.name,
                file_size: file.size,
                mime_type: file.type,
                analysis_status: 'pending',
            })
            .select()
            .single();

        if (dbError) {
            console.error('Database insert error:', dbError);
            return NextResponse.json(
                { success: false, error: '데이터베이스 저장 실패: ' + dbError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: floorplan,
        });

    } catch (error) {
        console.error('Floorplan upload error:', error);
        return NextResponse.json(
            { success: false, error: '서버 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}

// 도면 목록 조회
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const estimateId = searchParams.get('estimate_id');

        let query = supabase
            .from('floorplans')
            .select('*')
            .order('created_at', { ascending: false });

        if (estimateId) {
            query = query.eq('estimate_id', parseInt(estimateId));
        }

        const { data, error } = await query;

        if (error) {
            console.error('Database query error:', error);
            return NextResponse.json(
                { success: false, error: '데이터 조회 실패' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data,
        });

    } catch (error) {
        console.error('Floorplan list error:', error);
        return NextResponse.json(
            { success: false, error: '서버 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}

// 도면 삭제
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID가 필요합니다.' },
                { status: 400 }
            );
        }

        // 먼저 도면 정보 조회
        const { data: floorplan, error: fetchError } = await supabase
            .from('floorplans')
            .select('file_url')
            .eq('id', id)
            .single();

        if (fetchError) {
            return NextResponse.json(
                { success: false, error: '도면을 찾을 수 없습니다.' },
                { status: 404 }
            );
        }

        // 스토리지에서 파일 삭제
        if (floorplan.file_url) {
            const filePath = floorplan.file_url.split('/floorplans/')[1];
            if (filePath) {
                await supabase.storage.from('floorplans').remove([filePath]);
            }
        }

        // 데이터베이스에서 삭제
        const { error: deleteError } = await supabase
            .from('floorplans')
            .delete()
            .eq('id', id);

        if (deleteError) {
            return NextResponse.json(
                { success: false, error: '삭제 실패: ' + deleteError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: '도면이 삭제되었습니다.',
        });

    } catch (error) {
        console.error('Floorplan delete error:', error);
        return NextResponse.json(
            { success: false, error: '서버 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
