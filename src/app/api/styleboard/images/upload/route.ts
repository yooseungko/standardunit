import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// POST: 이미지 업로드
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const space = formData.get('space') as string;
        const subCategory = formData.get('subCategory') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        if (!space || !subCategory) {
            return NextResponse.json({ error: 'Space and subCategory are required' }, { status: 400 });
        }

        // 파일 버퍼 읽기
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // 저장 경로 생성
        const uploadDir = path.join(process.cwd(), 'public', 'styleboard', space, subCategory);
        await mkdir(uploadDir, { recursive: true });

        // 파일명 생성 (중복 방지를 위해 타임스탬프 추가)
        const timestamp = Date.now();
        const originalName = file.name.replace(/\s+/g, '_');
        const ext = path.extname(originalName);
        const baseName = path.basename(originalName, ext);
        const fileName = `${baseName}_${timestamp}${ext}`;
        const filePath = path.join(uploadDir, fileName);

        // 파일 저장
        await writeFile(filePath, buffer);

        // 공개 URL 생성
        const publicPath = `/styleboard/${space}/${subCategory}/${fileName}`;

        return NextResponse.json({
            success: true,
            filePath: publicPath,
            fileName,
        });
    } catch (error) {
        console.error('Image upload error:', error);
        return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
    }
}
