import { NextResponse } from 'next/server';
import { fetchN8n } from '@/lib/api';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;
    const body = await request.json();
    const data = await fetchN8n('gleanearth-dashboard-send', {
      method: 'POST',
      body: JSON.stringify({
        phone: phone,
        channel: body.channel,
        message: body.message,
      }),
    });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
