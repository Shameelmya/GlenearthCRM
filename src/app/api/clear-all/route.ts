import { NextResponse } from 'next/server';
import { fetchN8n } from '@/lib/api';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await fetchN8n('gleanearth-dashboard-clear-all', {
      method: 'POST',
      body: JSON.stringify({
        confirmation: body.confirmation,
      }),
    });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
