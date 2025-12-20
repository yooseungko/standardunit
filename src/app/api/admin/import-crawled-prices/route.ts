import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface CrawledProduct {
    category: string;
    subCategory?: string;
    name: string;
    price: number;
    unit: string;
    size?: string;
    originalUrl: string;
    imageUrl?: string;
    description?: string;
    brand?: string;
}

// 등급 추정 (가격 기반)
function estimateGrade(price: number, category: string): string {
    // 카테고리별 가격 기준
    const thresholds: Record<string, { mid: number; high: number }> = {
        '욕실': { mid: 300000, high: 600000 },
        '바닥': { mid: 50000, high: 100000 },
        '벽지': { mid: 15000, high: 25000 },
        '타일': { mid: 50000, high: 100000 },
        '전기': { mid: 80000, high: 150000 },
        '문': { mid: 350000, high: 500000 },
        '창호': { mid: 300000, high: 500000 },
        default: { mid: 100000, high: 300000 },
    };

    const { mid, high } = thresholds[category] || thresholds.default;

    if (price >= high) return '고급';
    if (price >= mid) return '중급';
    return '일반';
}

export async function POST(request: NextRequest) {
    try {
        const { products } = await request.json() as { products: CrawledProduct[] };

        if (!products || products.length === 0) {
            return NextResponse.json(
                { success: false, error: '추가할 제품이 없습니다.' },
                { status: 400 }
            );
        }

        let imported = 0;
        let skipped = 0;
        const errors: string[] = [];

        console.log(`[Import] Received ${products.length} products to import`);

        for (const product of products) {
            try {
                // 중복 체크
                const { data: existing } = await supabase
                    .from('material_prices')
                    .select('id')
                    .eq('product_name', product.name)
                    .single();

                if (existing) {
                    // 이미 존재하면 가격과 사이즈 업데이트
                    const { error: updateError } = await supabase
                        .from('material_prices')
                        .update({
                            unit_price: product.price,
                            size: product.size || null,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', existing.id);

                    if (updateError) {
                        errors.push(`업데이트 실패: ${product.name} - ${updateError.message}`);
                    } else {
                        imported++;
                    }
                } else {
                    // 새로 추가
                    const grade = estimateGrade(product.price, product.category);

                    console.log(`[Import] Inserting: ${product.name}, category: ${product.category}, price: ${product.price}`);

                    const { error: insertError } = await supabase
                        .from('material_prices')
                        .insert({
                            category: product.category,
                            sub_category: product.subCategory || null,
                            product_name: product.name,
                            brand: product.brand || null,
                            unit_price: product.price,
                            unit: product.unit || '개',
                            size: product.size || null,
                            product_grade: grade,
                            notes: '출처: 오하우스 인테리어',
                            price_includes_install: false,
                            price_date: new Date().toISOString().split('T')[0],
                            is_active: true,
                            is_verified: false,
                        });

                    if (insertError) {
                        console.error(`[Import] Insert error for ${product.name}:`, insertError);
                        errors.push(`추가 실패: ${product.name} - ${insertError.message}`);
                        skipped++;
                    } else {
                        console.log(`[Import] Inserted: ${product.name}`);
                        imported++;
                    }
                }
            } catch (err) {
                errors.push(`오류: ${product.name} - ${err instanceof Error ? err.message : String(err)}`);
                skipped++;
            }
        }

        return NextResponse.json({
            success: true,
            imported,
            skipped,
            errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // 최대 10개 에러만 반환
            message: `${imported}개 제품 추가/업데이트, ${skipped}개 건너뜀`,
        });

    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : '서버 오류' },
            { status: 500 }
        );
    }
}
