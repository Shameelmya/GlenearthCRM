import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const correctPassword = process.env.STAFF_PASSWORD;

    if (!correctPassword) {
      console.error('STAFF_PASSWORD environment variable is missing.');
      return NextResponse.json({ success: false, error: 'Server configuration error.' }, { status: 500 });
    }

    if (password === correctPassword) {
      const response = NextResponse.json({ success: true });
      response.cookies.set('crm_auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 1 week
      });
      return response;
    } else {
      return NextResponse.json({ success: false, error: 'Incorrect password' }, { status: 401 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
