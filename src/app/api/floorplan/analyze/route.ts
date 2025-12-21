import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FloorplanAnalysisResult, RoomAnalysis, DEFAULT_WALL_HEIGHT } from '@/types/quote';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const genAI = new GoogleGenerativeAI(geminiApiKey);

// 도면 이미지를 base64로 변환
async function fetchImageAsBase64(url: string): Promise<string> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString('base64');
}

// Gemini Vision을 사용한 도면 분석
async function analyzeFloorplanWithGemini(imageUrl: string): Promise<FloorplanAnalysisResult> {
    const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-preview' });

    // 이미지를 base64로 변환
    let imageData: string;
    let mimeType = 'image/png';

    if (imageUrl.startsWith('data:')) {
        // Base64 데이터 URL인 경우
        const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
            mimeType = matches[1];
            imageData = matches[2];
        } else {
            throw new Error('Invalid data URL format');
        }
    } else {
        // URL인 경우 fetch
        imageData = await fetchImageAsBase64(imageUrl);
        if (imageUrl.includes('.jpg') || imageUrl.includes('.jpeg')) {
            mimeType = 'image/jpeg';
        } else if (imageUrl.includes('.webp')) {
            mimeType = 'image/webp';
        }
    }

    // DB에서 표준 단가 데이터 조회 (프롬프트에 포함시키기 위해)
    const [laborResult, materialResult, compositeResult] = await Promise.all([
        supabase.from('labor_costs').select('labor_type, daily_rate, description'),
        supabase.from('material_prices').select('category, sub_category, product_name, unit'),
        supabase.from('composite_costs').select('cost_name, category, unit'),
    ]);

    const pricingData = {
        labor: laborResult.data || [],
        material: materialResult.data || [],
        composite: compositeResult.data || [],
    };

    // 프롬프트 생성 (별도 모듈에서 가져오기)
    const { buildFloorplanAnalysisPrompt } = await import('@/lib/prompts/floorplanAnalysis');
    const prompt = buildFloorplanAnalysisPrompt(pricingData);

    console.log('📋 Gemini 프롬프트 길이:', prompt.length, '자');

    const result = await model.generateContent([
        {
            inlineData: {
                mimeType,
                data: imageData,
            },
        },
        prompt,
    ]);

    const response = await result.response;
    const text = response.text();

    // JSON 추출
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('분석 결과를 파싱할 수 없습니다.');
    }

    const analysisData = JSON.parse(jsonMatch[0]);

    // 분석 결과를 표준 형식으로 변환
    const rooms: RoomAnalysis[] = (analysisData.rooms || []).map((room: Record<string, unknown>) => ({
        name: room.name as string,
        type: room.type as RoomAnalysis['type'],
        width: room.width as number,
        height: room.height as number,
        area: room.area as number,
        wallHeight: DEFAULT_WALL_HEIGHT,
    }));

    // 자재 수량 자동 계산
    const estimatedMaterials = calculateEstimatedMaterials(rooms, analysisData.calculations);

    const analysisResult: FloorplanAnalysisResult = {
        totalArea: analysisData.totalArea || rooms.reduce((sum: number, r: RoomAnalysis) => sum + r.area, 0),
        rooms,
        calculations: {
            floorArea: analysisData.calculations?.floorArea || analysisData.totalArea,
            wallArea: analysisData.calculations?.wallArea || 0,
            ceilingArea: analysisData.calculations?.ceilingArea || analysisData.totalArea,
            wallLength: analysisData.calculations?.wallLength || 0,
            windowCount: analysisData.calculations?.windowCount || analysisData.fixtures?.windows || 0,
            doorCount: analysisData.calculations?.doorCount || 0,
        },
        // Gemini가 계산한 설비 수량
        fixtures: analysisData.fixtures ? {
            toilet: analysisData.fixtures.toilet || 0,
            sink: analysisData.fixtures.sink || 0,
            bathroomFaucet: analysisData.fixtures.bathroomFaucet || 0,
            kitchenFaucet: analysisData.fixtures.kitchenFaucet || 0,
            showerSet: analysisData.fixtures.showerSet || 0,
            lights: {
                living: analysisData.fixtures.lights?.living || 0,
                bedroom: analysisData.fixtures.lights?.bedroom || 0,
                bathroom: analysisData.fixtures.lights?.bathroom || 0,
                kitchen: analysisData.fixtures.lights?.kitchen || 0,
                hallway: analysisData.fixtures.lights?.hallway || 0,
                balcony: analysisData.fixtures.lights?.balcony || 0,
            },
            doors: {
                room: analysisData.fixtures.doors?.room || 0,
                entrance: analysisData.fixtures.doors?.entrance || 0,
            },
            windows: analysisData.fixtures.windows || 0,
        } : undefined,
        estimatedMaterials,
        confidence: analysisData.confidence || 0.7,
        analysisNotes: analysisData.analysisNotes,
    };

    return analysisResult;
}

// 자재 수량 계산
function calculateEstimatedMaterials(
    rooms: RoomAnalysis[],
    calculations: FloorplanAnalysisResult['calculations']
) {
    const materials: FloorplanAnalysisResult['estimatedMaterials'] = [];
    const floorArea = calculations.floorArea || rooms.reduce((sum, r) => sum + r.area, 0);
    const wallArea = calculations.wallArea || floorArea * 2.5; // 벽면적 추정
    const ceilingArea = calculations.ceilingArea || floorArea;

    // 침실, 거실 바닥 (마루)
    const livingSpaces = rooms.filter(r => ['bedroom', 'living'].includes(r.type));
    const livingFloorArea = livingSpaces.reduce((sum, r) => sum + r.area, 0);
    if (livingFloorArea > 0) {
        materials.push({
            category: '바닥',
            subCategory: '마루',
            item: '강마루',
            quantity: Math.ceil(livingFloorArea * 1.1), // 10% 로스 포함
            unit: '㎡',
            notes: '로스율 10% 포함',
        });
    }

    // 주방 바닥 (타일)
    const kitchen = rooms.find(r => r.type === 'kitchen');
    if (kitchen) {
        materials.push({
            category: '바닥',
            subCategory: '타일',
            item: '주방 바닥타일',
            quantity: Math.ceil(kitchen.area * 1.1),
            unit: '㎡',
        });
    }

    // 화장실
    const bathrooms = rooms.filter(r => r.type === 'bathroom');
    bathrooms.forEach((bathroom, index) => {
        const name = bathrooms.length > 1 ? `화장실${index + 1}` : '화장실';
        materials.push({
            category: '타일',
            subCategory: '욕실',
            item: `${name} 바닥타일`,
            quantity: Math.ceil(bathroom.area * 1.1),
            unit: '㎡',
        });
        materials.push({
            category: '타일',
            subCategory: '욕실',
            item: `${name} 벽타일`,
            quantity: Math.ceil(bathroom.area * 4 * 1.1), // 벽면적 추정
            unit: '㎡',
        });
    });

    // 도배 (천장 + 벽면)
    const wallpaperArea = wallArea + ceilingArea;
    materials.push({
        category: '도배',
        item: '실크벽지',
        quantity: Math.ceil(wallpaperArea * 1.05),
        unit: '㎡',
        notes: '로스율 5% 포함',
    });

    // 페인트 (발코니)
    const balconies = rooms.filter(r => r.type === 'balcony');
    if (balconies.length > 0) {
        const balconyArea = balconies.reduce((sum, r) => sum + r.area, 0);
        materials.push({
            category: '페인트',
            item: '발코니 페인트',
            quantity: Math.ceil(balconyArea * 3), // 천장 + 벽면
            unit: '㎡',
        });
    }

    // 전기 (콘센트, 조명)
    materials.push({
        category: '전기',
        item: '조명 교체',
        quantity: rooms.length,
        unit: '개',
        notes: '방 당 1개 기준',
    });

    // 철거
    materials.push({
        category: '철거',
        item: '전체 철거',
        quantity: Math.ceil(floorArea),
        unit: '㎡',
    });

    // 폐기물 처리
    materials.push({
        category: '기타',
        item: '폐기물 처리',
        quantity: Math.ceil(floorArea / 10), // 10㎡당 1톤 추정
        unit: '톤',
    });

    return materials;
}

// 도면 분석 API
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { floorplan_id, image_url } = body;

        if (!floorplan_id && !image_url) {
            return NextResponse.json(
                { success: false, error: 'floorplan_id 또는 image_url이 필요합니다.' },
                { status: 400 }
            );
        }

        let imageUrl = image_url;
        const floorplanId = floorplan_id;

        // floorplan_id가 제공된 경우 DB에서 URL 조회
        if (floorplan_id && !image_url) {
            const { data: floorplan, error } = await supabase
                .from('floorplans')
                .select('file_url')
                .eq('id', floorplan_id)
                .single();

            if (error || !floorplan) {
                return NextResponse.json(
                    { success: false, error: '도면을 찾을 수 없습니다.' },
                    { status: 404 }
                );
            }

            imageUrl = floorplan.file_url;
        }

        // 분석 상태 업데이트
        if (floorplanId) {
            await supabase
                .from('floorplans')
                .update({ analysis_status: 'analyzing' })
                .eq('id', floorplanId);
        }

        try {
            // Gemini Vision으로 분석
            const analysisResult = await analyzeFloorplanWithGemini(imageUrl);

            // 분석 결과 저장
            if (floorplanId) {
                await supabase
                    .from('floorplans')
                    .update({
                        analysis_status: 'completed',
                        analysis_result: analysisResult,
                        analysis_error: null,
                    })
                    .eq('id', floorplanId);
            }

            return NextResponse.json({
                success: true,
                data: analysisResult,
            });

        } catch (analysisError) {
            console.error('Analysis error:', analysisError);

            // 분석 실패 상태 업데이트
            if (floorplanId) {
                await supabase
                    .from('floorplans')
                    .update({
                        analysis_status: 'failed',
                        analysis_error: analysisError instanceof Error ? analysisError.message : '분석 실패',
                    })
                    .eq('id', floorplanId);
            }

            return NextResponse.json(
                { success: false, error: '도면 분석에 실패했습니다: ' + (analysisError instanceof Error ? analysisError.message : '알 수 없는 오류') },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Floorplan analyze error:', error);
        return NextResponse.json(
            { success: false, error: '서버 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
