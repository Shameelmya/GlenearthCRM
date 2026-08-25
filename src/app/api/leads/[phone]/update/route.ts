import { NextResponse } from 'next/server';
import { fetchN8n } from '@/lib/api';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;
    const body = await request.json();
    const data = await fetchN8n('gleanearth-dashboard-update-lead', {
      method: 'POST',
      body: JSON.stringify({
        ...body,
        phone: phone,
      }),
    });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
