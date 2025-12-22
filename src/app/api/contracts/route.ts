import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 계약번호 생성
function generateContractNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `CT-${year}-${random}`;
}

// 접근코드 생성 (6자리 숫자)
function generateAccessCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// 계약서 목록 조회 / 단일 조회
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const status = searchParams.get('status');
        const accessCode = searchParams.get('access_code');

        // 접근코드로 조회 (고객용)
        if (accessCode) {
            const { data: contract, error } = await supabase
                .from('contracts')
                .select('*')
                .eq('access_code', accessCode)
                .single();

            if (error || !contract) {
                return NextResponse.json(
                    { success: false, error: '계약서를 찾을 수 없습니다.' },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                success: true,
                data: contract,
            });
        }

        // 단일 계약서 조회 (관리자용)
        if (id) {
            const { data: contract, error } = await supabase
                .from('contracts')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                return NextResponse.json(
                    { success: false, error: '계약서를 찾을 수 없습니다.' },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                success: true,
                data: contract,
            });
        }

        // 목록 조회
        let query = supabase
            .from('contracts')
            .select('*')
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data: contracts, error } = await query;

        if (error) {
            console.error('Contracts query error:', error);
            return NextResponse.json(
                { success: false, error: '데이터 조회 실패' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: contracts,
        });

    } catch (error) {
        console.error('Contracts GET error:', error);
        return NextResponse.json(
            { success: false, error: '서버 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}

// 계약서 생성
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // 계약번호와 접근코드 생성
        const contractNumber = generateContractNumber();
        const accessCode = generateAccessCode();

        // 기본 계약 조항 텍스트 (contractexample.md 전체 내용)
        const defaultContractContent = `계약 일반조건
General Terms and Conditions

제1조 【공사시공 등】
① 을은 이 계약 일반조건과 설계도서(도면, 시방서, 공사내역서 등)에 의하여 시공한다.
② 을은 공사예정 공정표를 작성하여 계약체결 후 갑의 승인을 받아야 하며, 필요한 경우 산출내역서를 제출한다.
③ 공사에 사용할 재료의 품질 및 규격은 설계서와 일치되어야 한다. 다만, 설계서에 품질과 품명이 명확히 규정되지 아니하거나 해당 재료가 품절인 경우 상호 협의하여 결정할 수 있으며, 이러한 합의가 없는 경우 공사에 사용할 재료는 그에 상당하는 재료로 갑과 협의하여 계약의 목적을 달성하는데 가장 적합한 것으로 한다.

제2조 【관련 공사와의 조정】
① 갑은 도급공사를 원활히 수행하기 위하여 이 공사와 관련이 있는 공사(이하 "관련공사")와의 조정이 필요한 경우에 을과 협의하여 이 공사의 공사기간, 공사내용, 계약금액 등을 변경할 수 있다.
② 을은 관련공사의 시공자와 긴밀히 연락 협조하여 도급공사의 원활한 완성에 협력한다.

제3조 【계약이행 및 공사대금지급보증】
① 갑과 을은 필요시 다음 각호의 1의 방법으로 계약이행 및 공사대금의 지급을 상호 보증한다.
1. 필요시 을은 갑에게 계약금액의 10%에 해당하는 금액의 계약이행보증
2. 필요시 갑은 을에게 '하도급거래 공정화에 관한 법률' 제13조의2제1항에 따른 공사대금 지급보증을 해야 한다. 다만, 동법 시행령 제3조의3의 규정에 의거 하도급대금지급 보증이 면제된 경우 또는 도급계약의 경우에는 그러하지 아니하다.
② 제1항의 규정에 의한 갑과 을 상호간의 보증은 현금의 납부 또는 다음 각호의 1에 의한 보증서 등의 교부에 의한다.
1. 건설공제조합, 전문건설공제조합 또는 보증보험회사 등 이와 동등한 보증기관이 발행하는 보증서
2. 국채 또는 지방채
3. 금융기관의 지급보증서 또는 예금증서

제4조 【부적합한 공사】
갑은 을이 시공한 공사 중 설계서에 적합하지 아니한 부분이 있을 때에는 이에 대한 시정을 요청할 수 있으며, 을은 지체 없이 이에 응한다. 이 경우 을은 계약금액의 증액 또는 공기의 연장을 요청할 수 없다. 다만, 그 부적합한 시공이 갑의 요청 또는 시공에 의하거나 기타 을의 책임으로 돌릴 수 없는 사유로 인한 때에는 그러하지 아니한다.

제5조 【공사의 중지】
① 갑은 필요하다고 인정하거나 발주자의 요청에 의하여 공사의 전부나 일부에 대한 시공을 일시중지를 통지할 수 있으며, 이로 인하여 공사기간의 단축 또는 연장이 필요하다고 객관적으로 인정될 때에는 이에 상당하는 조치를 취하고 제8조의 규정에 정한 바에 따라 계약금액을 조정하여야 한다.
② 갑이 계약조건에 의한 선급금과 공사대금을 지급하지 않는 경우로서 을이 기한을 정하여 그 지급을 독촉하였음에도 불구하고, 갑이 이를 지급하지 아니하면 을은 공사중지기간을 정하여 갑에게 통보하고 공사의 전부 또는 일부를 일시 중지할 수 있다.
③ 제1항 및 제2항의 공사중지에 따른 기간은 제10조의 규정에 의한 지체상금 산정 시 지체일수에서 제외한다.

제6조 【설계변경으로 인한 계약금액의 조정】
① 갑은 발주자의 요청 혹은 자신의 설계변경(설계서의 변경) 등에 의하여 공사량의 증감이 발생한 경우에는 당해 계약금액을 조정하여야 한다.
② 제1항의 규정에 의한 계약금액의 조정은 다음 각호의 기준에 의한다.
1. 산출내역서에 기재된 비목 또는 품목으로써 증감된 공사의 단가는 제1조 제2항의 규정에 의한 산출내역서상의 단가(이하 "계약단가")로 한다.
2. 산출내역서에 기재되지 아니한 신규비목의 단가는 설계변경 당시를 기준으로 산정한 단가에 낙찰율을 곱한 금액으로 한다.
③ 계약금액의 증감분에 대한 일반관리비 및 이윤은 계약체결 당시의 율에 의한다.

제7조 【물가변동으로 인한 계약금액의 변경】
① 갑은 계약체결 이후 품목의 가격 또는 요금변동 등의 이유로 발주자로부터 계약금액의 조정을 받은 경우 그 내용과 비율에 따라 을에게 계약금액을 조정하여 지급한다.
② 갑은 발주자로부터 계약금액의 조정을 받지 않은 경우에도 산출내역서에 포함되어 있는 품목의 가격 또는 요금의 급격한 변동이 있는 경우 상호 협의하여 계약금액을 조정할 수 있다.

제8조 【기타 계약내용의 변경으로 인한 계약금액의 조정】
① 을은 공사의 원활한 진행 및 계약목적의 효율적 달성을 위해 공사내용 및 공법의 변경을 갑에게 요청할 수 있다.
② 갑은 공사계약에 있어서 제6조의 규정에 의한 경우 외에 공사기간/운반거리 등 계약내용의 변경으로 계약금액을 조정하여야 할 필요가 있는 경우에는 그 변경된 내용에 따라 실비를 초과하지 아니하는 범위 안에서 이를 조정한다.

제9조 【계약기간의 연장】
① 을은 다음 각호의 1의 사유가 계약기간 내에 발생한 경우에는 지체 없이 수정공정표를 첨부하여 갑에게 서면으로 계약기간의 연장을 청구하여야 한다.
1. 태풍, 홍수, 기타 악천후, 전쟁 또는 사변, 지진, 화재, 폭동, 항만봉쇄, 방역 및 보안상 출입제한 등 불가항력의 사유에 의한 경우
2. 중요 지급자재 등의 공급이 지연되어 공사의 진행이 불가능하였을 경우
3. 갑의 책임으로 착공이 지연되거나 시공이 중단되었을 경우
4. 설계변경으로 인하여 준공기한 내에 계약을 이행할 수 없을 경우
5. 기타 을의 책임에 속하지 아니하는 사유로 인하여 지체된 경우

제10조 【지체상금】
① 을은 준공 기한 내에 공사를 완성하지 못하였을 때에는 매 지체일수마다 당사자간 합의에 의해 정한 지체상금율에 계약금액을 곱하여 산출한 금액을 갑에게 지급하여야 한다. 다만, 당사자간 합의가 없는 경우 지체상금율은 1,000분의 2/일로 한다.
② 갑의 요구에 의한 설계변경 및 기타 갑의 책임에 의한 공사지연의 경우에는 지체상금을 면제한다.

제11조 【계약의 해제 또는 해지】
① 갑 또는 을은 다음 각 호의 1에 해당하는 경우 서면으로 계약의 이행을 위한 기간을 정하여 최고한 후 동 기간내에 계약이 이행되지 아니하는 때에는 당해 계약의 일부 또는 전부를 해제 또는 해지할 수 있다.
1. 갑 또는 을이 기타 계약내용을 위반하여 계약의 목적을 달성할 수 없다고 인정될 경우
2. 을이 정당한 사유 없이 약정한 착공기일을 경과하고도 착공을 지연시킬 경우
3. 을의 명백한 귀책사유로 인해 공기 내에 공사를 완성시킬 수 없다고 인정될 경우
4. 갑의 명백한 귀책사유로 인해 공기 내에 공사를 완성시킬 수 없다고 인정될 경우
② 제1항의 규정에 의하여 계약이 해제 또는 해지될 경우 책임이 있는 일방은 상대방의 손해를 배상할 책임이 있다. 단, 천재지변 등 불가항력 사유로 인한 경우에는 배상책임을 면제한다.

③ 단순변심에 의한 일방적인 계약해지의 경우 소비자분쟁해결기준에 의거 다음의 해결 기준을 따른다.
1. 갑의 일방적인 계약해지 경우
  1) 공사 시작 전(계약 이후) : 계약금을 위약금으로 한다.
  2) 공사 시작 전(실측 및 디자인 진행 이후) : 계약금 및 총 시공비의 10% 한도 내 배상
  3) 공사 착수 후 : 실 손해액 배상
2. 을의 일방적인 계약해지 경우
  1) 공사 시작 전 : 계약금 환급
  2) 공사 착수 후 : 대금 정산 이후 계약금 및 총 시공비의 10% 한도로 배상

제12조 【공사의 완공】
① 을은 공사의 완공과 동시에 갑에게 통지하여 갑 또는 갑이 지정한 대리인과 완공 현장을 "갑"과 "을" 모두 검수하고 완료되면 "갑"과 "을"의 서명 혹은 날인으로 공사완료확인서를 작성한다.
② "갑"과 "을" 모두의 서명 혹은 날인이 기재된 공사완료확인서 작성이 완료된 경우 공사가 완공된 것으로 한다.

제13조 【대금 지급】
① 갑은 목적물인수일로부터 계약에서 정한 지급기일까지 을에게 대금을 지급하여야 한다.
② 갑은 공사대금을 물품 또는 대물로 지급하여서는 아니 된다.

제15조 【하자보수 및 하자담보】
① 을은 공사 완료 후 계약에서 별도로 정한 기한 내에 발생한 일부 또는 전부 하자에 대해 보수할 책임이 있다. 다만 당사자간에 별도 기한에 대한 합의가 없는 경우에는 1년으로 정한다.
② 하자가 "을"의 귀책사유로 인한 경우 "을"은 즉시 "갑"의 요청에 따라 보수를 한다. 다만 "갑"의 귀책사유 혹은 과실로 인한 하자일 경우 "을"은 면책된다.

제16조 【권리 및 의무의 양도】
을은 계약된 공사의 일부 또는 전부를 제3자에게 양도 또는 하도급 할 수 없다. 다만, 공사의 편의 및 공정의 특수성이 있는 때 또는 갑의 동의가 있는 경우에는 그러하지 아니하다.

제17조 【기타 사항】
① 갑은 을이 당해 공사를 원활하게 진행할 수 있도록 필요한 제반 조치(주민 동의서, 엘레베이터 사용료, 건축허가 등 주무관청의 인허가, 민원해결 등)에 협조하여야 하며, 이와 관련된 제반비용을 부담하여야 한다.
② 갑과 을은 상호 협의하여 본 계약서를 변경 또는 수정할 수 있다.
③ 본 계약서에 규정하지 않은 사항에 대해서는 갑과 을이 대등한 지위에서 합의하여 특약으로 정할 수 있다.

제18조 【분쟁의 해결】
본 계약에서 발생한 분쟁은 합의에 의하여 해결함을 원칙으로 하고, 당사자 사이에 해결되지 않는 분쟁은 대한상사중재원의 중재에 의해 최종 해결한다.

제19조 【특약사항】
상기 계약일반사항 이외에 갑과 을은 아래 내용을 특약사항으로 정하며, 특약사항이 본문과 상충되는 경우에는 특약사항이 우선하여 적용된다.`;

        const contractData = {
            ...body,
            contract_number: contractNumber,
            access_code: accessCode,
            contract_content: body.contract_content || defaultContractContent,
            status: 'pending',
        };

        const { data: contract, error } = await supabase
            .from('contracts')
            .insert(contractData)
            .select()
            .single();

        if (error) {
            console.error('Contract create error:', error);
            return NextResponse.json(
                { success: false, error: '계약서 생성 실패: ' + error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: contract,
            message: `계약서가 생성되었습니다. 접근코드: ${accessCode}`,
        });

    } catch (error) {
        console.error('Contract POST error:', error);
        return NextResponse.json(
            { success: false, error: '서버 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}

// 계약서 수정
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID가 필요합니다.' },
                { status: 400 }
            );
        }

        // 업데이트 시간 추가
        updateData.updated_at = new Date().toISOString();

        const { data: contract, error } = await supabase
            .from('contracts')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Contract update error:', error);
            return NextResponse.json(
                { success: false, error: '계약서 수정 실패: ' + error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: contract,
        });

    } catch (error) {
        console.error('Contract PUT error:', error);
        return NextResponse.json(
            { success: false, error: '서버 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}

// 계약서 삭제
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

        const { error } = await supabase
            .from('contracts')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Contract delete error:', error);
            return NextResponse.json(
                { success: false, error: '삭제 실패: ' + error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: '계약서가 삭제되었습니다.',
        });

    } catch (error) {
        console.error('Contract DELETE error:', error);
        return NextResponse.json(
            { success: false, error: '서버 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
