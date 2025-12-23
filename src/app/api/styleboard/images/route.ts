import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { SpaceCategory, spaceCategoryLabels, spaceCategoryMap, StyleboardImage, SpaceSubCategories } from '@/types/styleboard';

// 스타일보드 이미지 폴더 경로
const STYLEBOARD_IMAGES_DIR = path.join(process.cwd(), 'public', 'styleboard');

// 지원되는 이미지 확장자
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

// GET: 스타일보드 이미지 목록 조회 (2단계 폴더 구조)
export async function GET(request: NextRequest) {
    try {
        const spaceFilter = request.nextUrl.searchParams.get('space');
        const subFilter = request.nextUrl.searchParams.get('sub');

        // 이미지 폴더가 없으면 생성
        if (!fs.existsSync(STYLEBOARD_IMAGES_DIR)) {
            fs.mkdirSync(STYLEBOARD_IMAGES_DIR, { recursive: true });
        }

        const images: StyleboardImage[] = [];
        const spaceSubCategories: SpaceSubCategories[] = [];

        // 1단계: 공간 폴더 읽기
        const spaceFolders = fs.readdirSync(STYLEBOARD_IMAGES_DIR, { withFileTypes: true });

        for (const spaceFolder of spaceFolders) {
            if (!spaceFolder.isDirectory()) continue;

            const spaceFolderName = spaceFolder.name;
            const mappedSpace = spaceCategoryMap[spaceFolderName];

            if (!mappedSpace) continue;

            // 특정 공간만 필터링
            if (spaceFilter && mappedSpace !== spaceFilter) continue;

            const spacePath = path.join(STYLEBOARD_IMAGES_DIR, spaceFolderName);
            const subFolders = fs.readdirSync(spacePath, { withFileTypes: true });

            const subCategoriesInfo: { name: string; label: string; count: number }[] = [];

            // 2단계: 하위 카테고리 폴더 읽기
            for (const subFolder of subFolders) {
                if (!subFolder.isDirectory()) continue;

                const subFolderName = subFolder.name;

                // 특정 하위 카테고리만 필터링
                if (subFilter && subFolderName !== subFilter) continue;

                const subPath = path.join(spacePath, subFolderName);
                const files = fs.readdirSync(subPath);

                let subCount = 0;

                for (const file of files) {
                    const ext = path.extname(file).toLowerCase();
                    if (!SUPPORTED_EXTENSIONS.includes(ext)) continue;

                    images.push({
                        id: `${mappedSpace}_${subFolderName}_${file}`,
                        space_category: mappedSpace,
                        space_label: spaceCategoryLabels[mappedSpace],
                        sub_category: subFolderName,
                        sub_label: subFolderName, // 폴더명 그대로 사용
                        file_path: `/styleboard/${spaceFolderName}/${subFolderName}/${file}`,
                        file_name: file,
                    });

                    subCount++;
                }

                if (subCount > 0) {
                    subCategoriesInfo.push({
                        name: subFolderName,
                        label: subFolderName,
                        count: subCount,
                    });
                }
            }

            // 공간에 이미지가 있는 경우만 추가
            const totalCount = subCategoriesInfo.reduce((acc, sub) => acc + sub.count, 0);
            if (totalCount > 0) {
                spaceSubCategories.push({
                    space: mappedSpace,
                    space_label: spaceCategoryLabels[mappedSpace],
                    sub_categories: subCategoriesInfo,
                    total_count: totalCount,
                });
            }
        }

        // 공간별, 하위 카테고리별로 그룹화
        const grouped: Record<SpaceCategory, Record<string, StyleboardImage[]>> = {
            living: {},
            bedroom: {},
            bathroom: {},
            kitchen: {},
            entrance: {},
            study: {},
            kids: {},
        };

        images.forEach(img => {
            if (!grouped[img.space_category][img.sub_category]) {
                grouped[img.space_category][img.sub_category] = [];
            }
            grouped[img.space_category][img.sub_category].push(img);
        });

        return NextResponse.json({
            success: true,
            data: {
                images,
                grouped,
                spaces: spaceSubCategories,
                total: images.length,
            },
        });
    } catch (error) {
        console.error('스타일보드 이미지 조회 오류:', error);
        return NextResponse.json(
            { success: false, error: '이미지 조회에 실패했습니다.' },
            { status: 500 }
        );
    }
}
