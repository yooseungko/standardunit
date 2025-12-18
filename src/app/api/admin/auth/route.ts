import { NextRequest, NextResponse } from 'next/server';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'standardunit2024';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { password } = body;

        if (password === ADMIN_PASSWORD) {
            // 인증 성공 - 토큰 생성 (간단한 해시)
            const token = Buffer.from(`${ADMIN_PASSWORD}:${Date.now()}`).toString('base64');

            const response = NextResponse.json({ success: true });

            // HttpOnly 쿠키 설정 (7일 유효)
            response.cookies.set('admin_token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7, // 7일
                path: '/',
            });

            return response;
        }

        return NextResponse.json(
            { error: '비밀번호가 일치하지 않습니다.' },
            { status: 401 }
        );
    } catch (error) {
        console.error('Auth error:', error);
        return NextResponse.json(
            { error: '인증 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}

export async function DELETE() {
    const response = NextResponse.json({ success: true });
    response.cookies.delete('admin_token');
    return response;
}
