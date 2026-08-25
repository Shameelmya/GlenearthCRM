import { NextResponse } from 'next/server';
import { fetchN8n } from '@/lib/api';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;
    const body = await request.json();
    const data = await fetchN8n('gleanearth-dashboard-action', {
      method: 'POST',
      body: JSON.stringify({
        phone: phone,
        ai_paused: body.ai_paused,
      }),
    });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
